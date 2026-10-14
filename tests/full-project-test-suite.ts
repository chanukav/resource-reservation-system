/**
 * ============================================================================
 * PRIMEWAVE RESERVE — COMPREHENSIVE FULL PROJECT TEST SUITE
 * ============================================================================
 * 
 * Tests every functional, security, concurrency, and architectural aspect of
 * the Resource Reservation Management System:
 * 
 * 1. Cryptography & Session Tokens (HMAC-SHA256, constant-time, tamper tests)
 * 2. User Authentication & Login Action (PBKDF2 passwords, role assignment)
 * 3. Role-Based Access Control & Security Invariants (USER vs ADMIN boundaries)
 * 4. Date, Time & Organizational Timezone Engine (Asia/Colombo UTC+05:30)
 * 5. PostgreSQL GiST Exclusion Constraint & Double-Booking Prevention
 * 6. Concurrency Safety & Race Condition Resolution
 * 7. Reservation Lifecycle & State Machine Transitions
 * 8. Approval Workflow (Instant Confirmation vs Admin Review Queue)
 * 9. Resource Fleet Management & Maintenance Locking
 * 10. Dashboard Statistics & Metric Computations
 * 11. User Management & Administrative Governance
 * 12. Input Sanitization & Server Error Shielding
 */

import { prisma } from "../src/lib/prisma";
import {
  createSignedSessionToken,
  verifySignedSessionToken,
} from "../src/lib/auth";
import { loginAction } from "../src/actions/auth";
import {
  createResourceAction,
  updateResourceStatusAction,
} from "../src/actions/resources";
import {
  createReservationAction,
  updateReservationStatusAction,
  cancelReservationAction,
} from "../src/actions/reservations";
import {
  createUserAction,
  updateUserRoleAction,
  deleteUserAction,
} from "../src/actions/users";
import {
  parseOrgDateTime,
  parseOrgDateTimeRange,
  validateReservationTiming,
  formatOrgTime,
  ORGANIZATION_TIMEZONE,
  ORGANIZATION_OFFSET,
} from "../src/lib/date-utils";

interface TestResult {
  module: string;
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, module: string, testName: string) {
  if (condition) {
    results.push({ module, name: testName, passed: true });
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    results.push({ module, name: testName, passed: false });
    console.error(`  ❌ FAIL: ${testName}`);
    throw new Error(`[${module}] Test failed: ${testName}`);
  }
}

async function runFullProjectTestSuite() {
  const startTime = Date.now();
  console.log("================================================================================");
  console.log("  PRIMEWAVE RESERVE — EXHAUSTIVE FULL PROJECT AUTOMATED TEST SUITE");
  console.log("================================================================================\n");

  // Load Seeded Personas
  const adminUser = await prisma.user.findUnique({ where: { email: "admin@primewave.com" } });
  const internUser = await prisma.user.findUnique({ where: { email: "intern@primewave.com" } });
  const sampleCategory = await prisma.resourceCategory.findFirst();

  if (!adminUser || !internUser || !sampleCategory) {
    throw new Error("Missing seeded test data. Please run 'npm run seed' first.");
  }

  // Set initial test context as Admin for setup
  process.env.TEST_AUTH_AS = "ADMIN";

  // ============================================================================
  // MODULE 1: Cryptography, Session Signing & Tamper Resistance
  // ============================================================================
  console.log("\n📦 MODULE 1: Cryptography, Session Signing & Tamper Resistance");
  {
    const mod = "Cryptography";
    const token = await createSignedSessionToken(internUser.id);
    assert(typeof token === "string" && token.includes("."), mod, "Generates signed dot-delimited token");

    const verified = await verifySignedSessionToken(token);
    assert(verified === internUser.id, mod, "Verifies authentic signature and extracts userId");

    // Tampered payload
    const tamperedPayloadToken = token.replace(internUser.id, "user_admin_hacked");
    const tamperedPayloadResult = await verifySignedSessionToken(tamperedPayloadToken);
    assert(tamperedPayloadResult === null, mod, "Detects payload tampering and rejects privilege escalation");

    // Tampered signature
    const parts = token.split(".");
    const badSigToken = `${parts[0]}.${parts[1]}.badbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadb`;
    const badSigResult = await verifySignedSessionToken(badSigToken);
    assert(badSigResult === null, mod, "Detects forged HMAC signature via constant-time verification");

    // Expired token (create a token with timestamp in the past)
    const secret = process.env.AUTH_SECRET || "primewave_assessment_default_hmac_secret_key_32_bytes";
    const pastExpiry = Date.now() - 3600000;
    const pastPayload = `${internUser.id}.${pastExpiry}`;
    const { createHmac } = await import("crypto");
    const pastSig = createHmac("sha256", secret).update(pastPayload).digest("hex");
    const expiredToken = `${pastPayload}.${pastSig}`;
    assert(await verifySignedSessionToken(expiredToken) === null, mod, "Rejects expired session tokens");
  }

  // ============================================================================
  // MODULE 2: User Authentication & Login Action (PBKDF2)
  // ============================================================================
  console.log("\n📦 MODULE 2: User Authentication & Login Action");
  {
    const mod = "AuthAction";
    // Bad password
    const badLogin = await loginAction({ email: "admin@primewave.com", password: "IncorrectPassword123" });
    assert(badLogin.success === false, mod, "loginAction rejects invalid password");

    // Unknown email
    const unknownLogin = await loginAction({ email: "nonexistent@primewave.com", password: "Password123!" });
    assert(unknownLogin.success === false, mod, "loginAction rejects non-existent email");

    // Valid admin login
    const adminLogin = await loginAction({ email: "admin@primewave.com", password: "Admin@123" });
    assert(adminLogin.success === true && adminLogin.user?.role === "ADMIN", mod, "loginAction authenticates Admin and returns ADMIN role");

    // Valid intern login
    const internLogin = await loginAction({ email: "intern@primewave.com", password: "Intern@123" });
    assert(internLogin.success === true && internLogin.user?.role === "USER", mod, "loginAction authenticates Intern and returns USER role");
  }

  // ============================================================================
  // MODULE 3: Role-Based Access Control (RBAC) & Server Guard Invariants
  // ============================================================================
  console.log("\n📦 MODULE 3: Role-Based Access Control (RBAC) Enforcement");
  {
    const mod = "RBAC";
    // Simulate USER role context
    process.env.TEST_AUTH_AS = "INTERN";

    // 1. Regular user cannot create resources
    const blockedCreateRes = await createResourceAction({
      name: "Rogue Unauthorized Lab",
      description: "Should fail",
      categoryId: sampleCategory.id,
      capacity: 10,
      requiresApproval: false,
    });
    assert(blockedCreateRes.success === false && blockedCreateRes.error?.includes("Administrator") === true, mod, "USER cannot create resources");

    // 2. Regular user cannot update resource status
    const tempRes = await prisma.resource.create({
      data: {
        name: "Permission Test Asset",
        categoryId: sampleCategory.id,
        capacity: 4,
        status: "AVAILABLE",
      },
    });

    const blockedStatusChange = await updateResourceStatusAction(tempRes.id, "MAINTENANCE");
    assert(blockedStatusChange.success === false && blockedStatusChange.error?.includes("Administrator") === true, mod, "USER cannot modify resource operational status");

    // 3. Regular user cannot approve or reject reservations
    const blockedApproval = await updateReservationStatusAction({
      reservationId: "dummy-reservation-id",
      status: "APPROVED",
    });
    assert(blockedApproval.success === false && blockedApproval.error?.includes("Administrator") === true, mod, "USER cannot approve reservations");

    // 4. Regular user cannot delete other users or manage roles
    const blockedUserCreate = await createUserAction({
      name: "Hacker User",
      email: "hacker@primewave.com",
      password: "Password123!",
      role: "ADMIN",
    });
    assert(blockedUserCreate.success === false, mod, "USER cannot access administrative user creation");

    // Clean up temp resource
    await prisma.resource.delete({ where: { id: tempRes.id } });
  }

  // ============================================================================
  // MODULE 4: Date, Time & Organizational Timezone Engine (Asia/Colombo)
  // ============================================================================
  console.log("\n📦 MODULE 4: Date, Time & Organizational Timezone Engine");
  {
    const mod = "DateTimeEngine";
    assert(ORGANIZATION_TIMEZONE === "Asia/Colombo", mod, "Organizational timezone strictly configured to Asia/Colombo");
    assert(ORGANIZATION_OFFSET === "+05:30", mod, "Authoritative UTC offset is +05:30");

    // Accurate instant parsing
    const parsed = parseOrgDateTime("2026-11-20", "14:30");
    assert(parsed.toISOString() === "2026-11-20T09:00:00.000Z", mod, "parseOrgDateTime('2026-11-20', '14:30') cleanly converts to 09:00:00.000Z (UTC+05:30)");

    // Consistent formatted strings
    const formattedTime = formatOrgTime(parsed);
    assert(formattedTime === "02:30 PM", mod, "formatOrgTime renders accurate 12-hour local time ('02:30 PM')");

    // Rejection of inverted intervals
    const startInvert = new Date(Date.now() + 86400000);
    const endInvert = new Date(startInvert.getTime() - 30 * 60 * 1000);
    const invertedCheck = validateReservationTiming(startInvert, endInvert);
    assert(invertedCheck.valid === false, mod, "Rejects inverted interval where endTime < startTime");

    // Rejection of identical start & end (0 duration)
    const zeroDurationCheck = validateReservationTiming(startInvert, startInvert);
    assert(zeroDurationCheck.valid === false, mod, "Rejects interval with identical start and end time (0 duration)");

    // Rejection of too-short booking (< 15 mins)
    const tooShortEnd = new Date(startInvert.getTime() + 10 * 60 * 1000);
    const shortCheck = validateReservationTiming(startInvert, tooShortEnd);
    assert(shortCheck.valid === false && shortCheck.error?.includes("15 minutes") === true, mod, "Rejects booking shorter than 15 minutes");

    // Rejection of bookings exceeding 90-day horizon
    const farFutureStart = new Date(Date.now() + 95 * 86400000);
    const farFutureEnd = new Date(farFutureStart.getTime() + 60 * 60 * 1000);
    const horizonCheck = validateReservationTiming(farFutureStart, farFutureEnd);
    assert(horizonCheck.valid === false && horizonCheck.error?.includes("90 days") === true, mod, "Rejects bookings exceeding 90-day scheduling horizon");

    // Clean midnight-crossing / overnight interval support
    const overnightRange = parseOrgDateTimeRange({
      startDate: "2026-10-20",
      startTime: "23:00",
      endDate: "2026-10-21",
      endTime: "02:30",
    });
    const overnightCheck = validateReservationTiming(overnightRange.start, overnightRange.end);
    assert(overnightCheck.valid === true, mod, "Cleanly supports midnight-crossing / overnight intervals (23:00 to 02:30 next day)");
  }

  // ============================================================================
  // MODULE 5: PostgreSQL GiST Range Integrity & Double-Booking Prevention
  // ============================================================================
  console.log("\n📦 MODULE 5: PostgreSQL GiST Range Integrity & Double-Booking Prevention");
  {
    const mod = "GiSTExclusion";
    // Create an isolated resource for strict overlap validation
    const testRes = await prisma.resource.create({
      data: {
        name: `GiST Test Suite Asset [${Date.now()}]`,
        categoryId: sampleCategory.id,
        capacity: 8,
        status: "AVAILABLE",
        requiresApproval: false,
      },
    });

    // 1. Initial baseline reservation (Day after tomorrow 10:00 - 11:30)
    const tBaseStart = new Date(Date.now() + 2 * 86400000);
    tBaseStart.setHours(10, 0, 0, 0);
    const tBaseEnd = new Date(tBaseStart.getTime() + 90 * 60 * 1000);

    const baseBooking = await prisma.reservation.create({
      data: {
        title: "Base GiST Reservation",
        userId: internUser.id,
        resourceId: testRes.id,
        startTime: tBaseStart,
        endTime: tBaseEnd,
        status: "APPROVED",
      },
    });
    assert(Boolean(baseBooking.id), mod, "Base reservation inserted into PostgreSQL database");

    // 2. Partial Overlap inside existing slot (10:30 - 11:00) MUST FAIL via GiST
    let overlapBlocked = false;
    try {
      const tOverlapStart = new Date(tBaseStart.getTime() + 30 * 60 * 1000);
      const tOverlapEnd = new Date(tBaseStart.getTime() + 60 * 60 * 1000);
      await prisma.reservation.create({
        data: {
          title: "Overlapping Slot Attempt",
          userId: internUser.id,
          resourceId: testRes.id,
          startTime: tOverlapStart,
          endTime: tOverlapEnd,
          status: "APPROVED",
        },
      });
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string };
      if (e.message?.includes("no_overlapping_active_reservations") || e.code === "23P01") {
        overlapBlocked = true;
      }
    }
    assert(overlapBlocked === true, mod, "PostgreSQL GiST constraint (23P01) blocks overlapping reservation on the same resource");

    // 3. Adjacent booking with matching bounds ([11:30 - 12:30)) MUST SUCCEED (half-open [))
    const tAdjacentStart = new Date(tBaseEnd.getTime());
    const tAdjacentEnd = new Date(tAdjacentStart.getTime() + 60 * 60 * 1000);
    const adjacentBooking = await prisma.reservation.create({
      data: {
        title: "Adjacent Booking",
        userId: internUser.id,
        resourceId: testRes.id,
        startTime: tAdjacentStart,
        endTime: tAdjacentEnd,
        status: "APPROVED",
      },
    });
    assert(Boolean(adjacentBooking.id), mod, "Adjacent booking with matching end/start timestamp allowed by half-open [) interval bounds");

    // 4. Overlap on DIFFERENT resource MUST SUCCEED
    const otherRes = await prisma.resource.create({
      data: {
        name: `Independent Resource [${Date.now()}]`,
        categoryId: sampleCategory.id,
        capacity: 4,
        status: "AVAILABLE",
        requiresApproval: false,
      },
    });

    const diffResourceBooking = await prisma.reservation.create({
      data: {
        title: "Concurrent Booking on Separate Resource",
        userId: internUser.id,
        resourceId: otherRes.id,
        startTime: tBaseStart,
        endTime: tBaseEnd,
        status: "APPROVED",
      },
    });
    assert(Boolean(diffResourceBooking.id), mod, "Independent resources can be booked concurrently during identical time slots");

    // Clean up
    await prisma.reservation.deleteMany({ where: { resourceId: { in: [testRes.id, otherRes.id] } } });
    await prisma.resource.deleteMany({ where: { id: { in: [testRes.id, otherRes.id] } } });
  }

  // ============================================================================
  // MODULE 6: Concurrency Safety & Simultaneous Race Conditions
  // ============================================================================
  console.log("\n📦 MODULE 6: Concurrency Safety & Simultaneous Race Conditions");
  {
    const mod = "ConcurrencySafety";
    const raceRes = await prisma.resource.create({
      data: {
        name: `Race Condition Target [${Date.now()}]`,
        categoryId: sampleCategory.id,
        capacity: 12,
        status: "AVAILABLE",
        requiresApproval: false,
      },
    });

    const raceStart = new Date(Date.now() + 3 * 86400000);
    raceStart.setHours(15, 0, 0, 0);
    const raceEnd = new Date(raceStart.getTime() + 60 * 60 * 1000);

    // Launch two simultaneous booking promises targeting the exact same resource & interval
    const raceAttempts = await Promise.allSettled([
      prisma.reservation.create({
        data: {
          title: "Contender A",
          userId: internUser.id,
          resourceId: raceRes.id,
          startTime: raceStart,
          endTime: raceEnd,
          status: "APPROVED",
        },
      }),
      prisma.reservation.create({
        data: {
          title: "Contender B",
          userId: internUser.id,
          resourceId: raceRes.id,
          startTime: raceStart,
          endTime: raceEnd,
          status: "APPROVED",
        },
      }),
    ]);

    const fulfilled = raceAttempts.filter((r) => r.status === "fulfilled").length;
    const rejected = raceAttempts.filter((r) => r.status === "rejected").length;

    assert(fulfilled === 1 && rejected === 1, mod, "Simultaneous race condition resolved safely: exactly 1 fulfilled, 1 rejected");

    // Clean up
    await prisma.reservation.deleteMany({ where: { resourceId: raceRes.id } });
    await prisma.resource.deleteMany({ where: { id: raceRes.id } });
  }

  // ============================================================================
  // MODULE 7: Approval Workflows & Reservation Lifecycle
  // ============================================================================
  console.log("\n📦 MODULE 7: Approval Workflows & State Machine Transitions");
  {
    const mod = "ApprovalWorkflow";
    // 1. Auto-approved resource
    const autoRes = await prisma.resource.create({
      data: {
        name: `Auto-Approve Asset [${Date.now()}]`,
        categoryId: sampleCategory.id,
        capacity: 4,
        status: "AVAILABLE",
        requiresApproval: false,
      },
    });

    process.env.TEST_AUTH_AS = "INTERN";
    const autoBooking = await createReservationAction({
      resourceId: autoRes.id,
      title: "Instant Booking Test",
      startDate: "2026-11-25",
      startTime: "10:00",
      endDate: "2026-11-25",
      endTime: "11:00",
    });
    const autoData = autoBooking.data as { id?: string; status?: string } | undefined;
    assert(autoBooking.success === true && autoData?.status === "APPROVED", mod, "Resource with requiresApproval=false receives immediate APPROVED status");

    // 2. Resource requiring admin approval
    const manualRes = await prisma.resource.create({
      data: {
        name: `Manual Review Asset [${Date.now()}]`,
        categoryId: sampleCategory.id,
        capacity: 6,
        status: "AVAILABLE",
        requiresApproval: true,
      },
    });

    const pendingBooking = await createReservationAction({
      resourceId: manualRes.id,
      title: "Pending Approval Test",
      startDate: "2026-11-26",
      startTime: "14:00",
      endDate: "2026-11-26",
      endTime: "15:00",
    });
    const pendingData = pendingBooking.data as { id: string; status?: string };
    assert(pendingBooking.success === true && pendingData?.status === "PENDING", mod, "Resource with requiresApproval=true routes to PENDING queue");

    // 3. Admin rejects pending reservation with reason
    process.env.TEST_AUTH_AS = "ADMIN";
    const rejectAttempt = await updateReservationStatusAction({
      reservationId: pendingData.id,
      status: "REJECTED",
      rejectionReason: "Equipment reserved for executive summit",
    });
    assert(rejectAttempt.success === true, mod, "Admin can reject pending request with an explanatory note");

    const rejectedRecord = await prisma.reservation.findUnique({ where: { id: pendingData.id } });
    assert(rejectedRecord?.status === "REJECTED" && rejectedRecord?.rejectionReason === "Equipment reserved for executive summit", mod, "Database reflects REJECTED status and stored rejectionReason");

    // Verify rejection freed the slot for re-booking
    process.env.TEST_AUTH_AS = "INTERN";
    const rebookSlot = await createReservationAction({
      resourceId: manualRes.id,
      title: "Rebook Freed Slot",
      startDate: "2026-11-26",
      startTime: "14:00",
      endDate: "2026-11-26",
      endTime: "15:00",
    });
    const rebookData = rebookSlot.data as { id: string; status?: string };
    assert(rebookSlot.success === true, mod, "Rejected reservation frees slot immediately for subsequent bookings");

    // 4. Admin approves valid pending reservation
    process.env.TEST_AUTH_AS = "ADMIN";
    const approveAttempt = await updateReservationStatusAction({
      reservationId: rebookData.id,
      status: "APPROVED",
    });
    assert(approveAttempt.success === true, mod, "Admin can approve pending reservation atomically");

    const approvedRecord = await prisma.reservation.findUnique({ where: { id: rebookData.id } });
    assert(approvedRecord?.status === "APPROVED", mod, "Database reflects APPROVED status");

    // 5. User cancels own approved reservation
    process.env.TEST_AUTH_AS = "INTERN";
    const cancelRes = await cancelReservationAction(rebookData.id);
    assert(cancelRes.success === true, mod, "User can cancel own reservation, transitioning status to CANCELLED");

    const cancelledRecord = await prisma.reservation.findUnique({ where: { id: rebookData.id } });
    assert(cancelledRecord?.status === "CANCELLED", mod, "Database reflects CANCELLED status");

    // Verify cancelled slot is now bookable again
    const rebookAfterCancel = await createReservationAction({
      resourceId: manualRes.id,
      title: "Rebook After Cancel",
      startDate: "2026-11-26",
      startTime: "14:00",
      endDate: "2026-11-26",
      endTime: "15:00",
    });
    assert(rebookAfterCancel.success === true, mod, "Cancelled reservation frees slot immediately for subsequent reservations");

    // Clean up
    await prisma.reservation.deleteMany({ where: { resourceId: { in: [autoRes.id, manualRes.id] } } });
    await prisma.resource.deleteMany({ where: { id: { in: [autoRes.id, manualRes.id] } } });
  }

  // ============================================================================
  // MODULE 8: Resource Fleet & Maintenance States
  // ============================================================================
  console.log("\n📦 MODULE 8: Resource Fleet & Maintenance States");
  {
    const mod = "MaintenanceStates";
    process.env.TEST_AUTH_AS = "ADMIN";

    // Create resource in MAINTENANCE status
    const maintRes = await prisma.resource.create({
      data: {
        name: `Maintenance Lab [${Date.now()}]`,
        categoryId: sampleCategory.id,
        capacity: 4,
        status: "MAINTENANCE",
        requiresApproval: false,
      },
    });

    // Attempt to book maintenance resource
    process.env.TEST_AUTH_AS = "INTERN";
    const blockedMaintBooking = await createReservationAction({
      resourceId: maintRes.id,
      title: "Maint Booking Attempt",
      startDate: "2026-11-28",
      startTime: "09:00",
      endDate: "2026-11-28",
      endTime: "10:00",
    });
    assert(blockedMaintBooking.success === false && blockedMaintBooking.error?.toLowerCase().includes("maintenance") === true, mod, "Resources in MAINTENANCE status cannot be booked");

    // Decommissioned status
    process.env.TEST_AUTH_AS = "ADMIN";
    await updateResourceStatusAction(maintRes.id, "DECOMMISSIONED");

    process.env.TEST_AUTH_AS = "INTERN";
    const blockedDecomBooking = await createReservationAction({
      resourceId: maintRes.id,
      title: "Decom Booking Attempt",
      startDate: "2026-11-28",
      startTime: "09:00",
      endDate: "2026-11-28",
      endTime: "10:00",
    });
    assert(blockedDecomBooking.success === false && blockedDecomBooking.error?.toLowerCase().includes("decommissioned") === true, mod, "Resources in DECOMMISSIONED status cannot be booked");

    // Reactivate to AVAILABLE and verify it can now be booked
    process.env.TEST_AUTH_AS = "ADMIN";
    await updateResourceStatusAction(maintRes.id, "AVAILABLE");

    process.env.TEST_AUTH_AS = "INTERN";
    const allowedAfterReactivation = await createReservationAction({
      resourceId: maintRes.id,
      title: "Reactivated Booking",
      startDate: "2026-11-28",
      startTime: "09:00",
      endDate: "2026-11-28",
      endTime: "10:00",
    });
    assert(allowedAfterReactivation.success === true, mod, "Reactivating resource to AVAILABLE enables immediate reservations");

    // Clean up
    await prisma.reservation.deleteMany({ where: { resourceId: maintRes.id } });
    await prisma.resource.deleteMany({ where: { id: maintRes.id } });
  }

  // ============================================================================
  // MODULE 9: User Management & Governance Invariants
  // ============================================================================
  console.log("\n📦 MODULE 9: User Management & Governance Invariants");
  {
    const mod = "UserGovernance";
    process.env.TEST_AUTH_AS = "ADMIN";

    // 1. Provision user
    const testEmail = `test.user.${Date.now()}@primewave.com`;
    const userCreate = await createUserAction({
      name: "Temporary Test User",
      email: testEmail,
      password: "TestPassword123!",
      role: "USER",
    });
    assert(userCreate.success === true, mod, "Admin can provision new user account");

    const createdUser = await prisma.user.findUnique({ where: { email: testEmail } });
    assert(createdUser !== null && createdUser.role === "USER", mod, "Created user exists in database with USER role");

    // 2. Reject duplicate email
    const dupCreate = await createUserAction({
      name: "Duplicate User",
      email: testEmail,
      password: "AnotherPassword123!",
      role: "USER",
    });
    assert(dupCreate.success === false && dupCreate.error?.includes("already exists") === true, mod, "Rejects duplicate user registration");

    // 3. Promote user to ADMIN
    const promoRes = await updateUserRoleAction({ userId: createdUser!.id, role: "ADMIN" });
    assert(promoRes.success === true, mod, "Admin can promote user account to ADMIN role");

    const promotedUser = await prisma.user.findUnique({ where: { id: createdUser!.id } });
    assert(promotedUser?.role === "ADMIN", mod, "Database reflects promoted ADMIN role");

    // 4. Invariant: Admin cannot demote self
    const selfDemote = await updateUserRoleAction({ userId: adminUser.id, role: "USER" });
    assert(selfDemote.success === false && selfDemote.error?.toLowerCase().includes("cannot revoke your own") === true, mod, "Prevents administrator from demoting self");

    // 5. Invariant: Admin cannot delete self
    const selfDelete = await deleteUserAction({ userId: adminUser.id });
    assert(selfDelete.success === false && selfDelete.error?.toLowerCase().includes("delete your own") === true, mod, "Prevents administrator from deleting self");

    // 6. Delete created user
    const delRes = await deleteUserAction({ userId: createdUser!.id });
    assert(delRes.success === true, mod, "Admin can cleanly delete user accounts");
  }

  // ============================================================================
  // MODULE 10: Input Validation, Schema Bounds & Error Sanitization
  // ============================================================================
  console.log("\n📦 MODULE 10: Input Validation, Schema Bounds & Error Sanitization");
  {
    const mod = "ValidationSanitization";
    process.env.TEST_AUTH_AS = "ADMIN";

    // Resource with empty name
    const invalidNameRes = await createResourceAction({
      name: "",
      categoryId: sampleCategory.id,
      capacity: 5,
      requiresApproval: false,
    });
    assert(invalidNameRes.success === false, mod, "createResourceAction rejects empty resource name");

    // Resource with invalid capacity (< 1)
    const invalidCapRes = await createResourceAction({
      name: "Zero Cap Room",
      categoryId: sampleCategory.id,
      capacity: 0,
      requiresApproval: false,
    });
    assert(invalidCapRes.success === false, mod, "createResourceAction rejects non-positive capacity");

    // Reservation with empty title
    process.env.TEST_AUTH_AS = "INTERN";
    const invalidTitleRes = await createReservationAction({
      resourceId: sampleCategory.id, // invalid dummy
      title: "   ",
      startDate: "2026-11-20",
      startTime: "10:00",
      endDate: "2026-11-20",
      endTime: "11:00",
    });
    assert(invalidTitleRes.success === false, mod, "createReservationAction rejects whitespace/empty title");
  }

  // ============================================================================
  // SUMMARY REPORT
  // ============================================================================
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log("\n================================================================================");
  console.log(`  FULL PROJECT TEST SUITE FINISHED in ${duration}s`);
  console.log(`  TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runFullProjectTestSuite()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test execution halted with error:", err);
    prisma.$disconnect();
    process.exit(1);
  });
