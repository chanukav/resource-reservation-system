/**
 * Automated Authorization, Security & Date/Time Guarantees Test Suite
 * Proves that:
 * 1. Session tokens are cryptographically signed and cannot be forged/tampered with.
 * 2. Regular users (USER role) cannot execute administrative actions (create resources, approve/reject bookings).
 * 3. Users cannot cancel or modify reservations belonging to other users.
 * 4. Arbitrary role injection is prevented at the server layer.
 * 5. PostgreSQL GiST exclusion constraint eliminates concurrency race conditions (23P01).
 * 6. Date, time, and timezone guarantees (Asia/Colombo UTC+05:30) prevent locale drift,
 *    past bookings, invalid intervals, midnight-crossing errors, and maintenance conflicts.
 */

import {
  createSignedSessionToken,
  verifySignedSessionToken,
  switchUserAction,
} from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";
import {
  createResourceAction,
  updateResourceStatusAction,
} from "../src/actions/resources";
import {
  createReservationAction,
  editReservationAction,
  updateReservationStatusAction,
  cancelReservationAction,
} from "../src/actions/reservations";
import {
  parseOrgDateTime,
  parseOrgDateTimeRange,
  validateReservationTiming,
  formatOrgDate,
  formatOrgTime,
  ORGANIZATION_TIMEZONE,
} from "../src/lib/date-utils";
import {
  canTransitionReservation,
  PERMITTED_RESERVATION_TRANSITIONS,
} from "../src/lib/reservation-state";
import { ResourceStatus, ReservationStatus } from "@prisma/client";

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runSecurityTests() {
  console.log("🔒 Starting Security, Concurrency & Date/Time Test Suite...\n");

  // --------------------------------------------------------------------------
  // TEST GROUP 1: Cryptographic Session Integrity & Anti-Forgery
  // --------------------------------------------------------------------------
  console.log("Group 1: Cryptographic HMAC Token Integrity");

  const testUserId = "user_clx123456789";
  const validToken = await createSignedSessionToken(testUserId);

  // 1. Valid token verifies correctly
  const verifiedId = await verifySignedSessionToken(validToken);
  assert(verifiedId === testUserId, "Valid token correctly verifies and extracts userId");

  // 2. Tampered payload is rejected
  const tamperedPayloadToken = validToken.replace(testUserId, "user_admin_hacked");
  const tamperedPayloadResult = await verifySignedSessionToken(tamperedPayloadToken);
  assert(
    tamperedPayloadResult === null,
    "Tampered token payload fails signature check and returns null"
  );

  // 3. Tampered signature is rejected
  const parts = validToken.split(".");
  const badSigToken = `${parts[0]}.${parts[1]}.badbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadb`;
  const badSigResult = await verifySignedSessionToken(badSigToken);
  assert(
    badSigResult === null,
    "Tampered signature fails constant-time comparison and returns null"
  );

  // 4. Arbitrary persona injection is rejected
  let blockedArbitraryPersona = false;
  try {
    // @ts-expect-error - Testing runtime rejection of illegal persona key
    await switchUserAction("SUPER_ADMIN_INJECTED");
  } catch {
    blockedArbitraryPersona = true;
  }
  assert(
    blockedArbitraryPersona,
    "Switching to arbitrary/non-whitelisted persona throws exception"
  );

  console.log("");

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Privilege Escalation Prevention on Server Actions
  // --------------------------------------------------------------------------
  console.log("Group 2: Role-Based Authorization Enforcement");

  // Ensure default intern user and admin user exist in DB
  const internUser = await prisma.user.findUnique({
    where: { email: "intern@primewave.com" },
  });
  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@primewave.com" },
  });
  const sampleCategory = await prisma.resourceCategory.findFirst();

  assert(internUser !== null, "Seeded Intern user exists in PostgreSQL");
  assert(internUser?.role === "USER", "Intern user has strict 'USER' role in database");
  assert(adminUser !== null, "Seeded Admin user exists in PostgreSQL");
  assert(adminUser?.role === "ADMIN", "Admin user has 'ADMIN' role in database");

  // 5. Normal USER cannot create resources
  const createResourceResult = await createResourceAction({
    name: "Hacked Executive Suite",
    capacity: 10,
    categoryId: sampleCategory!.id,
    requiresApproval: false,
  });
  assert(
    createResourceResult.success === false,
    "createResourceAction blocks unauthorized user"
  );
  assert(
    createResourceResult.error?.includes("Administrator privileges required") === true,
    "createResourceAction returns explicit 'Administrator privileges required' error"
  );

  // 6. Normal USER cannot modify resource operational status
  const sampleResource = await prisma.resource.findFirst();
  const updateStatusResult = await updateResourceStatusAction(
    sampleResource!.id,
    ResourceStatus.MAINTENANCE
  );
  assert(
    updateStatusResult.success === false,
    "updateResourceStatusAction blocks non-admin user"
  );

  // 7. Normal USER cannot approve reservations
  const sampleReservation = await prisma.reservation.findFirst();
  if (sampleReservation) {
    const approveResult = await updateReservationStatusAction({
      reservationId: sampleReservation.id,
      status: ReservationStatus.APPROVED,
    });
    assert(
      approveResult.success === false,
      "updateReservationStatusAction blocks non-admin approval attempt"
    );
  }

  // 8. Normal USER cannot cancel another user's reservation
  const adminOwnedRes = await prisma.reservation.create({
    data: {
      title: "Admin Private Strategy Meeting",
      startTime: new Date(Date.now() + 86400000),
      endTime: new Date(Date.now() + 90000000),
      status: ReservationStatus.APPROVED,
      userId: adminUser!.id,
      resourceId: sampleResource!.id,
    },
  });

  const cancelResult = await cancelReservationAction(adminOwnedRes.id);
  assert(
    cancelResult.success === false,
    "cancelReservationAction blocks user from cancelling another user's booking"
  );

  // Clean up test reservation
  await prisma.reservation.delete({ where: { id: adminOwnedRes.id } });

  console.log("");

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Concurrency Safety & PostgreSQL Exclusion Constraint
  // --------------------------------------------------------------------------
  console.log("Group 3: Concurrency Safety & PostgreSQL Exclusion Constraint");

  const startT = new Date(Date.now() + 100000000);
  const endT = new Date(Date.now() + 103600000); // +1 hour

  // 9. First booking succeeds
  const baseRes = await prisma.reservation.create({
    data: {
      title: "Concurrent Booking Base",
      startTime: startT,
      endTime: endT,
      status: ReservationStatus.APPROVED,
      userId: internUser!.id,
      resourceId: sampleResource!.id,
    },
  });
  assert(baseRes.id !== undefined, "Initial base reservation created");

  // 10. Direct insert of overlapping booking is REJECTED by PostgreSQL exclusion constraint
  let exclusionViolated = false;
  try {
    const overlappingStart = new Date(startT.getTime() + 30 * 60 * 1000); // +30m overlap
    const overlappingEnd = new Date(endT.getTime() + 30 * 60 * 1000);

    await prisma.reservation.create({
      data: {
        title: "Illegal Overlapping Booking",
        startTime: overlappingStart,
        endTime: overlappingEnd,
        status: ReservationStatus.APPROVED,
        userId: internUser!.id,
        resourceId: sampleResource!.id,
      },
    });
  } catch (err: unknown) {
    const msg = String(err);
    if (
      msg.includes("no_overlapping_active_reservations") ||
      msg.includes("exclusion") ||
      msg.includes("conflicts with existing key")
    ) {
      exclusionViolated = true;
    }
  }
  assert(
    exclusionViolated,
    "PostgreSQL exclusion constraint blocks overlapping reservation insert (23P01)"
  );

  // 11. Adjacent bookings (half-open [) interval) are correctly permitted
  let adjacentSucceeded = false;
  try {
    const adjacentStart = endT; // Starts exactly when baseRes ends
    const adjacentEnd = new Date(endT.getTime() + 3600000);

    const adjRes = await prisma.reservation.create({
      data: {
        title: "Legitimate Adjacent Booking",
        startTime: adjacentStart,
        endTime: adjacentEnd,
        status: ReservationStatus.APPROVED,
        userId: internUser!.id,
        resourceId: sampleResource!.id,
      },
    });

    if (adjRes.id) {
      adjacentSucceeded = true;
      await prisma.reservation.delete({ where: { id: adjRes.id } });
    }
  } catch (err) {
    console.error("Adjacent insert failed:", err);
  }
  assert(adjacentSucceeded, "Adjacent booking (10:00-11:00 followed by 11:00-12:00) is cleanly permitted");

  // Clean up base test reservation
  await prisma.reservation.delete({ where: { id: baseRes.id } });

  console.log("");

  // --------------------------------------------------------------------------
  // TEST GROUP 4: Date, Time & Organizational Timezone Guarantees (Finding 3 P1)
  // --------------------------------------------------------------------------
  console.log("Group 4: Date, Time & Organizational Timezone Guarantees (Asia/Colombo)");

  // 12. Organization timezone is strictly Asia/Colombo (UTC+05:30)
  assert(
    ORGANIZATION_TIMEZONE === "Asia/Colombo",
    "Organization timezone is declared as Asia/Colombo"
  );

  // 13. Unambiguous instant conversion: 10:00 AM in Colombo converts to 04:30 AM UTC
  const testInstant = parseOrgDateTime("2026-10-25", "10:00");
  assert(
    testInstant.toISOString() === "2026-10-25T04:30:00.000Z",
    "parseOrgDateTime('2026-10-25', '10:00') correctly maps to 04:30:00.000Z (UTC+05:30)"
  );

  // 14. Rendered output in Asia/Colombo matches original local time
  const formattedTime = formatOrgTime(testInstant);
  assert(
    formattedTime === "10:00 AM",
    `formatOrgTime correctly renders '10:00 AM' in Asia/Colombo (got: ${formattedTime})`
  );

  // 15. Validation rejects identical start and end time (endTime == startTime)
  const identicalTiming = validateReservationTiming(
    new Date("2026-10-25T10:00:00+05:30"),
    new Date("2026-10-25T10:00:00+05:30")
  );
  assert(
    identicalTiming.valid === false && identicalTiming.error?.includes("strictly after") === true,
    "Rejects reservation with identical start and end time (0 duration)"
  );

  // 16. Validation rejects end time before start time
  const endBeforeStart = validateReservationTiming(
    new Date("2026-10-25T11:00:00+05:30"),
    new Date("2026-10-25T10:00:00+05:30")
  );
  assert(
    endBeforeStart.valid === false && endBeforeStart.error?.includes("strictly after") === true,
    "Rejects reservation where end time is before start time"
  );

  // 17. Validation rejects duration shorter than 15 minutes
  const shortDuration = validateReservationTiming(
    new Date("2026-10-25T10:00:00+05:30"),
    new Date("2026-10-25T10:05:00+05:30")
  );
  assert(
    shortDuration.valid === false && shortDuration.error?.includes("at least 15 minutes") === true,
    "Rejects reservation shorter than minimum 15-minute duration"
  );

  // 18. Validation rejects reservation in the past
  const pastReservation = validateReservationTiming(
    new Date("2024-01-01T10:00:00+05:30"),
    new Date("2024-01-01T11:00:00+05:30")
  );
  assert(
    pastReservation.valid === false && pastReservation.error?.includes("in the past") === true,
    "Rejects reservation in the past"
  );

  // 19. Validation rejects reservation exceeding 90-day horizon
  const distantFuture = validateReservationTiming(
    new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
    new Date(Date.now() + 100 * 24 * 60 * 60 * 1000 + 3600000)
  );
  assert(
    distantFuture.valid === false && distantFuture.error?.includes("90 days") === true,
    "Rejects reservation exceeding 90-day booking horizon"
  );

  // 20. Midnight-crossing reservation is parsed and validated cleanly
  const midnightRange = parseOrgDateTimeRange({
    startDate: "2026-10-25",
    startTime: "23:00",
    endDate: "2026-10-26",
    endTime: "01:30",
  });
  const midnightTiming = validateReservationTiming(midnightRange.start, midnightRange.end);
  assert(
    midnightTiming.valid === true,
    "Midnight-crossing booking (23:00 to 01:30 next day) validates cleanly"
  );
  assert(
    midnightRange.end.getTime() - midnightRange.start.getTime() === 2.5 * 3600 * 1000,
    "Midnight-crossing reservation has exact 2.5 hour duration"
  );

  // 21. Reservation rejection for Resource in MAINTENANCE status
  const maintenanceCategory = await prisma.resourceCategory.findFirst();
  const maintenanceResource = await prisma.resource.create({
    data: {
      name: "Offline Laser Cutter",
      capacity: 1,
      status: ResourceStatus.MAINTENANCE,
      categoryId: maintenanceCategory!.id,
    },
  });

  const bookMaintenanceRes = await createReservationAction({
    resourceId: maintenanceResource.id,
    title: "Attempted Maintenance Resource Booking",
    startDate: "2026-10-26",
    startTime: "10:00",
    endTime: "11:00",
  });
  assert(
    bookMaintenanceRes.success === false &&
      bookMaintenanceRes.error?.includes("MAINTENANCE") === true,
    "createReservationAction blocks booking of resource in MAINTENANCE status"
  );

  // 22. Reservation rejection for Resource in DECOMMISSIONED status
  await prisma.resource.update({
    where: { id: maintenanceResource.id },
    data: { status: ResourceStatus.DECOMMISSIONED },
  });

  const bookDecommissionedRes = await createReservationAction({
    resourceId: maintenanceResource.id,
    title: "Attempted Decommissioned Resource Booking",
    startDate: "2026-10-26",
    startTime: "10:00",
    endTime: "11:00",
  });
  assert(
    bookDecommissionedRes.success === false &&
      bookDecommissionedRes.error?.includes("DECOMMISSIONED") === true,
    "createReservationAction blocks booking of resource in DECOMMISSIONED status"
  );

  // Restore resource to AVAILABLE for editing tests
  await prisma.resource.update({
    where: { id: maintenanceResource.id },
    data: { status: ResourceStatus.AVAILABLE },
  });

  // 23. Reservation Editing: Successful modification to a non-conflicting time
  const editBaseRes = await prisma.reservation.create({
    data: {
      title: "Original Booking for Edit Test",
      startTime: new Date("2026-10-26T14:00:00+05:30"),
      endTime: new Date("2026-10-26T15:00:00+05:30"),
      status: ReservationStatus.APPROVED,
      userId: internUser!.id,
      resourceId: maintenanceResource.id,
    },
  });

  const editSuccessResult = await editReservationAction({
    reservationId: editBaseRes.id,
    title: "Updated Booking Title",
    startDate: "2026-10-26",
    startTime: "15:30",
    endTime: "16:30",
  });
  assert(
    editSuccessResult.success === true,
    "editReservationAction cleanly updates reservation to a non-conflicting time"
  );

  // 24. Reservation Editing: Conflict detection blocks overlapping edit
  const conflictingRes = await prisma.reservation.create({
    data: {
      title: "Stationary Conflicting Slot",
      startTime: new Date("2026-10-26T17:00:00+05:30"),
      endTime: new Date("2026-10-26T18:00:00+05:30"),
      status: ReservationStatus.APPROVED,
      userId: adminUser!.id,
      resourceId: maintenanceResource.id,
    },
  });

  const editConflictResult = await editReservationAction({
    reservationId: editBaseRes.id,
    startDate: "2026-10-26",
    startTime: "17:15", // Overlaps with 17:00-18:00
    endTime: "18:15",
  });
  assert(
    editConflictResult.success === false &&
      editConflictResult.error?.includes("Schedule Conflict") === true,
    "editReservationAction prevents editing a booking into an overlapping interval"
  );

  // Clean up test resources and reservations
  await prisma.reservation.deleteMany({
    where: { id: { in: [editBaseRes.id, conflictingRes.id] } },
  });
  await prisma.resource.delete({
    where: { id: maintenanceResource.id },
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 5: Reservation Lifecycle & State Machine Transitions (Finding 5 P1)
  // --------------------------------------------------------------------------
  console.log("");
  console.log("Group 5: Reservation Lifecycle & State Machine Transitions");

  // 25. State Transition Policy: Legal transitions
  assert(
    canTransitionReservation(ReservationStatus.PENDING, ReservationStatus.APPROVED).allowed &&
      canTransitionReservation(ReservationStatus.PENDING, ReservationStatus.REJECTED).allowed &&
      canTransitionReservation(ReservationStatus.PENDING, ReservationStatus.CANCELLED).allowed,
    "PENDING permits transitions to APPROVED, REJECTED, and CANCELLED"
  );
  assert(
    canTransitionReservation(ReservationStatus.APPROVED, ReservationStatus.CANCELLED).allowed &&
      canTransitionReservation(ReservationStatus.APPROVED, ReservationStatus.COMPLETED).allowed,
    "APPROVED permits transitions to CANCELLED and COMPLETED"
  );

  // 26. State Transition Policy: Illegal transitions from terminal states
  assert(
    !canTransitionReservation(ReservationStatus.CANCELLED, ReservationStatus.APPROVED).allowed &&
      !canTransitionReservation(ReservationStatus.REJECTED, ReservationStatus.APPROVED).allowed &&
      !canTransitionReservation(ReservationStatus.COMPLETED, ReservationStatus.CANCELLED).allowed,
    "Terminal states (CANCELLED, REJECTED, COMPLETED) reject further transitions"
  );

  // Create a pending reservation for testing review actions
  const testCategory = await prisma.resourceCategory.findFirst();
  const testResource = await prisma.resource.create({
    data: {
      name: "State Machine Test Room",
      capacity: 4,
      status: ResourceStatus.AVAILABLE,
      categoryId: testCategory!.id,
    },
  });

  const pendingRes = await prisma.reservation.create({
    data: {
      title: "Pending State Machine Test",
      startTime: new Date(Date.now() + 2 * 86400000), // +2 days
      endTime: new Date(Date.now() + 2 * 86400000 + 3600000),
      status: ReservationStatus.PENDING,
      userId: internUser!.id,
      resourceId: testResource.id,
    },
  });

  // 27. Rejection without reason fails validation
  process.env.TEST_AUTH_AS = "ADMIN";

  const emptyRejectionRes = await updateReservationStatusAction({
    reservationId: pendingRes.id,
    status: ReservationStatus.REJECTED,
    rejectionReason: "   ",
  });
  assert(
    emptyRejectionRes.success === false &&
      emptyRejectionRes.error?.includes("minimum 5 characters") === true,
    "updateReservationStatusAction blocks rejection without a valid explanation"
  );

  // 28. Valid rejection transitions status atomically to REJECTED
  const validRejectionRes = await updateReservationStatusAction({
    reservationId: pendingRes.id,
    status: ReservationStatus.REJECTED,
    rejectionReason: "Equipment reserved for urgent hardware calibration.",
  });
  assert(
    validRejectionRes.success === true,
    "updateReservationStatusAction transitions PENDING to REJECTED with explanation"
  );

  const updatedRejected = await prisma.reservation.findUnique({
    where: { id: pendingRes.id },
  });
  assert(
    updatedRejected?.status === ReservationStatus.REJECTED &&
      updatedRejected?.rejectionReason === "Equipment reserved for urgent hardware calibration.",
    "Database record reflects REJECTED status and stored rejectionReason"
  );

  // 29. Cannot approve an already REJECTED reservation
  const approveRejectedAttempt = await updateReservationStatusAction({
    reservationId: pendingRes.id,
    status: ReservationStatus.APPROVED,
  });
  assert(
    approveRejectedAttempt.success === false &&
      approveRejectedAttempt.error?.includes("Illegal state transition") === true,
    "Blocks approval of an already REJECTED reservation"
  );

  // 30. Recheck resource operational status upon approval
  const pendingForMaint = await prisma.reservation.create({
    data: {
      title: "Pending Approval Under Maintenance",
      startTime: new Date(Date.now() + 3 * 86400000),
      endTime: new Date(Date.now() + 3 * 86400000 + 3600000),
      status: ReservationStatus.PENDING,
      userId: internUser!.id,
      resourceId: testResource.id,
    },
  });

  // Put resource in MAINTENANCE
  await prisma.resource.update({
    where: { id: testResource.id },
    data: { status: ResourceStatus.MAINTENANCE },
  });

  const approveInMaintenance = await updateReservationStatusAction({
    reservationId: pendingForMaint.id,
    status: ReservationStatus.APPROVED,
  });
  assert(
    approveInMaintenance.success === false &&
      approveInMaintenance.error?.includes("MAINTENANCE") === true,
    "Blocks approval when target resource was placed in MAINTENANCE"
  );

  // Restore resource to AVAILABLE and test successful atomic approval
  await prisma.resource.update({
    where: { id: testResource.id },
    data: { status: ResourceStatus.AVAILABLE },
  });

  // 31. Atomic approval of valid pending request succeeds
  const approveValid = await updateReservationStatusAction({
    reservationId: pendingForMaint.id,
    status: ReservationStatus.APPROVED,
  });
  assert(
    approveValid.success === true,
    "updateReservationStatusAction atomically approves valid pending reservation"
  );

  // 32. Second concurrent approval attempt is rejected (idempotency / race guard)
  const duplicateApproval = await updateReservationStatusAction({
    reservationId: pendingForMaint.id,
    status: ReservationStatus.APPROVED,
  });
  assert(
    duplicateApproval.success === false,
    "Duplicate approval attempt is rejected as reservation is no longer PENDING"
  );

  // 33. Cannot cancel a concluded/past reservation
  delete process.env.TEST_AUTH_AS;

  const pastConcludedRes = await prisma.reservation.create({
    data: {
      title: "Past Concluded Reservation",
      startTime: new Date(Date.now() - 7200000), // 2 hours ago
      endTime: new Date(Date.now() - 3600000),   // 1 hour ago
      status: ReservationStatus.APPROVED,
      userId: internUser!.id,
      resourceId: testResource.id,
    },
  });

  const cancelPastAttempt = await cancelReservationAction(pastConcludedRes.id);
  assert(
    cancelPastAttempt.success === false &&
      cancelPastAttempt.error?.includes("already concluded") === true,
    "cancelReservationAction blocks cancelling a reservation whose time has already concluded"
  );

  // Clean up state machine test records
  await prisma.reservation.deleteMany({
    where: { id: { in: [pendingRes.id, pendingForMaint.id, pastConcludedRes.id] } },
  });
  await prisma.resource.delete({
    where: { id: testResource.id },
  });

  console.log(`\n🎉 All ${passedTests}/${totalTests} Security, Concurrency & Lifecycle Tests PASSED!`);
}

runSecurityTests()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
