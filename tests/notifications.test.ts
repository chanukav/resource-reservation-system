/**
 * Real-Time Notification & Admin Approval Feedback Test Suite
 *
 * Verifies that:
 * 1. Database persistence: Notifications are properly saved and indexed in PostgreSQL.
 * 2. Unread counting: Queries return accurate unread badge counts.
 * 3. Read receipt transitions: Individual and bulk "mark as read" actions function correctly.
 * 4. Inbox clearing: Users can cleanly clear their notifications inbox.
 * 5. Event dispatching: Real-time emitter sends events across the user-specific channel.
 * 6. Admin Approval integration: When an admin approves a reservation, the user gets an APPROVAL notification.
 * 7. Admin Rejection integration: When an admin rejects a reservation, the user gets a REJECTION notification with reason.
 */

import { prisma } from "../src/lib/prisma";
import {
  createAndDispatchNotification,
  notificationEmitter,
  type NotificationPayload,
} from "../src/lib/notifications";
import {
  getNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  clearAllNotificationsAction,
  broadcastNotificationAction,
} from "../src/actions/notifications";
import {
  createReservationAction,
  updateReservationStatusAction,
} from "../src/actions/reservations";
import { ReservationStatus } from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runNotificationTests() {
  console.log("\n🔔 Starting Real-Time Notification & Admin Approval Test Suite...\n");

  // Step 0: Ensure intern and admin users are seeded
  const intern = await prisma.user.findUnique({
    where: { email: "intern@primewave.com" },
  });
  const admin = await prisma.user.findUnique({
    where: { email: "admin@primewave.com" },
  });

  assert(!!intern, "Intern user must exist in database");
  assert(!!admin, "Admin user must exist in database");

  // Clean up any existing notifications for test users
  await prisma.notification.deleteMany({
    where: { userId: { in: [intern!.id, admin!.id] } },
  });

  // Switch to INTERN persona
  process.env.TEST_AUTH_AS = "INTERN";

  // =========================================================================
  // Group 1: Database Persistence & Unread Querying
  // =========================================================================
  console.log("Group 1: Database Persistence & Unread Querying");

  let sseReceivedPayload: any = null;
  const channelListener = (payload: any) => {
    sseReceivedPayload = payload;
  };
  notificationEmitter.on(`user:${intern!.id}`, channelListener);

  const createdNotification = await createAndDispatchNotification({
    userId: intern!.id,
    title: "System Welcome",
    message: "Welcome to PrimeWave Reserve notification hub.",
    type: "SYSTEM",
  });

  assert(!!createdNotification, "Notification record should be created");
  assert(createdNotification!.userId === intern!.id, "Notification should belong to intern");
  assert(createdNotification!.isRead === false, "New notification should be unread");
  assert(
    !!sseReceivedPayload && sseReceivedPayload.id === createdNotification!.id,
    "Real-time event emitter should dispatch payload to user channel"
  );
  console.log("  ✅ PASS: Notification created and dispatched via real-time channel");

  const getRes = await getNotificationsAction();
  assert(getRes.success === true, "getNotificationsAction should succeed");
  assert(getRes.data?.unreadCount === 1, "Unread count should be exactly 1");
  assert(getRes.data?.notifications.length === 1, "Notifications list should contain 1 item");
  console.log("  ✅ PASS: getNotificationsAction returns accurate notifications and unread badge count");

  // =========================================================================
  // Group 2: Mark As Read & Inbox Operations
  // =========================================================================
  console.log("\nGroup 2: Mark As Read & Inbox Operations");

  const markRes = await markNotificationAsReadAction(createdNotification!.id);
  assert(markRes.success === true, "markNotificationAsReadAction should succeed");

  const postReadRes = await getNotificationsAction();
  assert(postReadRes.data?.unreadCount === 0, "Unread count should drop to 0 after marking as read");
  assert(postReadRes.data?.notifications[0].isRead === true, "Notification item should have isRead: true");
  console.log("  ✅ PASS: markNotificationAsReadAction marks single notification as read");

  // Create two more unread notifications
  await createAndDispatchNotification({
    userId: intern!.id,
    title: "Equipment Reminder",
    message: "Oscilloscope calibration due next week.",
    type: "SYSTEM",
  });
  await createAndDispatchNotification({
    userId: intern!.id,
    title: "Security Notice",
    message: "Account login from campus lab terminal.",
    type: "SYSTEM",
  });

  const twoUnreadRes = await getNotificationsAction();
  assert(twoUnreadRes.data?.unreadCount === 2, "Unread count should be 2");

  const markAllRes = await markAllNotificationsAsReadAction();
  assert(markAllRes.success === true, "markAllNotificationsAsReadAction should succeed");

  const postMarkAll = await getNotificationsAction();
  assert(postMarkAll.data?.unreadCount === 0, "All notifications should now be marked as read");
  console.log("  ✅ PASS: markAllNotificationsAsReadAction marks entire inbox as read");

  const clearRes = await clearAllNotificationsAction();
  assert(clearRes.success === true, "clearAllNotificationsAction should succeed");

  const emptyRes = await getNotificationsAction();
  assert(emptyRes.data?.notifications.length === 0, "Inbox should be completely empty after clear");
  console.log("  ✅ PASS: clearAllNotificationsAction purges user notifications cleanly");

  notificationEmitter.off(`user:${intern!.id}`, channelListener);

  // =========================================================================
  // Group 3: Real-Time Admin Approval Notification Delivery
  // =========================================================================
  console.log("\nGroup 3: Real-Time Admin Approval & Rejection Notifications");

  // Find a resource that requires approval (or set requiresApproval: true temporarily)
  let targetResource = await prisma.resource.findFirst({
    where: { status: "AVAILABLE" },
  });
  assert(!!targetResource, "A test resource must exist in the database");

  // Ensure target resource requires approval
  await prisma.resource.update({
    where: { id: targetResource!.id },
    data: { requiresApproval: true },
  });

  // Intern creates a reservation for tomorrow
  process.env.TEST_AUTH_AS = "INTERN";
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const startT = new Date(tomorrow);
  startT.setHours(10, 0, 0, 0);
  const endT = new Date(tomorrow);
  endT.setHours(11, 0, 0, 0);

  const reservationRes = await createReservationAction({
    resourceId: targetResource!.id,
    title: "Project Alpha Team Review",
    startDate: startT.toISOString().split("T")[0],
    startTime: "10:00",
    endDate: endT.toISOString().split("T")[0],
    endTime: "11:00",
  });

  assert(reservationRes.success === true, "Reservation creation should succeed");
  const reservationId = (reservationRes.data as any).id;

  // Set up real-time listener for intern to capture approval event
  let receivedApprovalEvent: NotificationPayload | null = null;
  const approvalListener = (payload: NotificationPayload) => {
    receivedApprovalEvent = payload;
  };
  notificationEmitter.on(`user:${intern!.id}`, approvalListener);

  // Switch to ADMIN and approve the reservation
  process.env.TEST_AUTH_AS = "ADMIN";
  const approveRes = await updateReservationStatusAction({
    reservationId,
    status: ReservationStatus.APPROVED,
  });

  assert(approveRes.success === true, "Admin approval should succeed");
  assert(
    !!receivedApprovalEvent,
    "Intern should receive a real-time notification event upon admin approval"
  );
  assert(
    receivedApprovalEvent!.type === "APPROVAL",
    "Notification type should be 'APPROVAL'"
  );
  assert(
    receivedApprovalEvent!.title.includes("Approved"),
    "Notification title should state 'Reservation Approved'"
  );
  assert(
    receivedApprovalEvent!.reservationId === reservationId,
    "Notification should link to the specific reservation ID"
  );
  console.log("  ✅ PASS: Admin approval triggers real-time APPROVAL notification to user");

  notificationEmitter.off(`user:${intern!.id}`, approvalListener);

  // Switch to INTERN and check inbox from database
  process.env.TEST_AUTH_AS = "INTERN";
  const internInbox = await getNotificationsAction();
  assert(internInbox.data?.unreadCount === 1, "Intern should have 1 unread approval notification in DB");
  assert(
    internInbox.data?.notifications[0].type === "APPROVAL",
    "Persisted notification type must be APPROVAL"
  );
  console.log("  ✅ PASS: Approval notification is durably persisted and queryable by user");

  // =========================================================================
  // Group 4: Real-Time Admin Rejection Notification Delivery
  // =========================================================================
  console.log("\nGroup 4: Real-Time Admin Rejection Notification Delivery");

  // Create another pending reservation for rejection test
  const startT2 = new Date(tomorrow);
  startT2.setHours(14, 0, 0, 0);
  const endT2 = new Date(tomorrow);
  endT2.setHours(15, 0, 0, 0);

  const res2 = await createReservationAction({
    resourceId: targetResource!.id,
    title: "Client Technical Presentation",
    startDate: startT2.toISOString().split("T")[0],
    startTime: "14:00",
    endDate: endT2.toISOString().split("T")[0],
    endTime: "15:00",
  });

  assert(res2.success === true, "Second reservation creation should succeed");
  const reservationId2 = (res2.data as any).id;

  let receivedRejectionEvent: NotificationPayload | null = null;
  const rejectionListener = (payload: NotificationPayload) => {
    receivedRejectionEvent = payload;
  };
  notificationEmitter.on(`user:${intern!.id}`, rejectionListener);

  // Switch to ADMIN and reject with explanation
  process.env.TEST_AUTH_AS = "ADMIN";
  const rejectRes = await updateReservationStatusAction({
    reservationId: reservationId2,
    status: ReservationStatus.REJECTED,
    rejectionReason: "Facility closed for scheduled electrical equipment maintenance.",
  });

  assert(rejectRes.success === true, "Admin rejection should succeed");
  assert(
    !!receivedRejectionEvent,
    "Intern should receive a real-time notification event upon admin rejection"
  );
  assert(
    receivedRejectionEvent!.type === "REJECTION",
    "Notification type should be 'REJECTION'"
  );
  assert(
    receivedRejectionEvent!.message.includes("electrical equipment maintenance"),
    "Notification message should communicate the admin's rejection reason"
  );
  console.log("  ✅ PASS: Admin rejection triggers real-time REJECTION notification with reason");

  notificationEmitter.off(`user:${intern!.id}`, rejectionListener);

  // =========================================================================
  // Group 5: Targeted Redis Pub/Sub Broadcast Notifications
  // =========================================================================
  console.log("\nGroup 5: Targeted Redis Pub/Sub Broadcast Notifications");

  // 1. Normal user cannot broadcast
  process.env.TEST_AUTH_AS = "INTERN";
  const unauthBroadcast = await broadcastNotificationAction({
    title: "Unauthorized Broadcast Attempt",
    message: "This should be blocked by RBAC.",
    targetRole: "ALL",
  });
  assert(
    unauthBroadcast.success === false,
    "Standard USER cannot broadcast notifications"
  );
  console.log("  ✅ PASS: broadcastNotificationAction strictly blocks non-admin callers");

  // 2. Admin can broadcast to ALL users
  process.env.TEST_AUTH_AS = "ADMIN";
  let broadcastAllReceived: any = null;
  const broadcastAllListener = (data: any) => {
    broadcastAllReceived = data;
  };
  notificationEmitter.on("notifications:broadcast:ALL", broadcastAllListener);

  const broadcastAllRes = await broadcastNotificationAction({
    title: "Facility Early Closure",
    message: "All laboratories will close at 18:00 for electrical inspection.",
    targetRole: "ALL",
    type: "SYSTEM",
  });

  assert(broadcastAllRes.success === true, "Admin broadcast to ALL users succeeds");
  assert(
    !!broadcastAllReceived && broadcastAllReceived.title === "Facility Early Closure",
    "Redis Pub/Sub channel notifications:broadcast:ALL receives message"
  );
  console.log("  ✅ PASS: Admin broadcasts to 'ALL' channel via Redis Pub/Sub");
  notificationEmitter.off("notifications:broadcast:ALL", broadcastAllListener);

  // 3. Admin can broadcast to USER role targeted channel
  let broadcastUserRoleReceived: any = null;
  const broadcastUserListener = (data: any) => {
    broadcastUserRoleReceived = data;
  };
  notificationEmitter.on("notifications:broadcast:USER", broadcastUserListener);

  const broadcastUserRes = await broadcastNotificationAction({
    title: "Internship Equipment Orientation",
    message: "Mandatory equipment orientation scheduled for Friday morning.",
    targetRole: "USER",
    type: "SYSTEM",
  });

  assert(broadcastUserRes.success === true, "Admin broadcast to USER role succeeds");
  assert(
    !!broadcastUserRoleReceived && broadcastUserRoleReceived.targetRole === "USER",
    "Targeted role broadcast correctly routes to notifications:broadcast:USER"
  );
  console.log("  ✅ PASS: Targeted broadcast routes to role channel notifications:broadcast:USER");
  notificationEmitter.off("notifications:broadcast:USER", broadcastUserListener);

  // Clean up test data
  await prisma.reservation.deleteMany({
    where: { id: { in: [reservationId, reservationId2] } },
  });
  await prisma.notification.deleteMany({
    where: { userId: { in: [intern!.id, admin!.id] } },
  });

  console.log("\n🎉 ALL 11 NOTIFICATION, REDIS PUBSUB & REAL-TIME APPROVAL TESTS PASSED!\n");
}

runNotificationTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  });
