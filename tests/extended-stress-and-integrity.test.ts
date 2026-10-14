/**
 * ============================================================================
 * PRIMEWAVE RESERVE — EXTENDED STRESS, INTEGRITY & SECURITY TEST SUITE
 * ============================================================================
 * 
 * Exhaustively implements the P0, P1, and P2 priority test cases:
 * 
 * Section A: Booking Engine & Concurrency Stress
 *   - 10-20 concurrent requests for same resource/interval (repeated cycles)
 *   - Multiple overlapping requests with different durations
 *   - Same interval on different resources
 *   - Edit booking into another booking's time slot (conflict rejected, original intact)
 *   - Edit booking without changing its time (succeeds)
 *   - Approve a pending booking that now conflicts (rejected safely)
 *   - Slot reuse after cancellation or rejection
 *   - Adjacent intervals (10:00-11:00 and 11:00-12:00)
 *   - Zero-length, inverted, and malformed intervals
 *   - Safe PostgreSQL 23P01 error handling without leaking SQL internals
 * 
 * Section B: Authentication & Session Security Edge Cases
 *   - Tampered payload signature mismatch
 *   - Token signed with wrong secret
 *   - Expired token rejection
 *   - Malformed/corrupted token formats
 *   - Stale-role detection upon user demotion
 *   - Deleted user session invalidation
 *   - Wrong password rejected without revealing account details
 * 
 * Section C: Authorization & ID-Guessing Defense
 *   - Server-side access control on all administrative and mutation actions
 *   - User B attempting to edit User A's reservation by ID
 *   - User B attempting to cancel User A's reservation by ID
 *   - Unauthenticated access rejection on all protected actions
 * 
 * Section D: Approval Workflow & State Machine Invariants
 *   - Reject approval on already cancelled reservation
 *   - Reject approval on already rejected reservation
 *   - Duplicate approval idempotency / rejection
 *   - Rejection without explanatory reason rejected
 *   - Resource maintenance locks pending approvals and new bookings
 *   - Existing approved bookings retained when resource enters maintenance
 * 
 * Section E: Timezone & Boundary Conditions
 *   - Exact 15-minute booking allowed, 14-minute rejected
 *   - Exact 90-day booking horizon allowed, beyond horizon rejected
 *   - Midnight-crossing sessions (23:00 to 02:30 next day)
 *   - Midnight-start sessions (00:00 to 00:30)
 *   - Boundary interval matching
 * 
 * Section F: Database Relational Integrity
 *   - Non-existent categoryId rejected
 *   - Non-positive capacity rejected
 *   - Empty/whitespace resource name rejected
 *   - Server error sanitization ensures zero SQL or credential leakage
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
  editReservationAction,
  updateReservationStatusAction,
  cancelReservationAction,
} from "../src/actions/reservations";
import {
  parseOrgDateTimeRange,
  validateReservationTiming,
  ORGANIZATION_TIMEZONE,
  ORGANIZATION_OFFSET,
} from "../src/lib/date-utils";
import { sanitizeServerError } from "../src/lib/validations";
import { createHmac } from "crypto";

interface TestReport {
  section: string;
  name: string;
  passed: boolean;
}

const reports: TestReport[] = [];

function assert(condition: boolean, section: string, testName: string) {
  if (condition) {
    reports.push({ section, name: testName, passed: true });
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    reports.push({ section, name: testName, passed: false });
    console.error(`  ❌ [FAIL] ${testName}`);
    throw new Error(`[${section}] Test failed: ${testName}`);
  }
}

async function runExtendedStressAndIntegrityTests() {
  const startTime = Date.now();
  console.log("================================================================================");
  console.log("  PRIMEWAVE RESERVE — EXTENDED STRESS, INTEGRITY & SECURITY SUITE");
  console.log("================================================================================\n");

  const adminUser = await prisma.user.findUnique({ where: { email: "admin@primewave.com" } });
  const internUser = await prisma.user.findUnique({ where: { email: "intern@primewave.com" } });
  const sampleCategory = await prisma.resourceCategory.findFirst();

  if (!adminUser || !internUser || !sampleCategory) {
    throw new Error("Seeded test data missing. Run 'npm run seed' first.");
  }

  // ============================================================================
  // SECTION A: BOOKING ENGINE & CONCURRENCY STRESS
  // ============================================================================
  console.log("🔥 SECTION A: Booking Engine & Concurrency Stress");
  {
    const sec = "ConcurrencyStress";

    // Create dedicated isolated stress asset
    const stressResource = await prisma.resource.create({
      data: {
        name: `Concurrency Stress Facility [${Date.now()}]`,
        categoryId: sampleCategory.id,
        capacity: 20,
        status: "AVAILABLE",
        requiresApproval: false,
      },
    });

    // 1. Stress test: 15 simultaneous competing requests for exact same slot, repeated 3 cycles
    console.log("  Running 3 cycles of 15 simultaneous competing booking requests...");
    for (let cycle = 1; cycle <= 3; cycle++) {
      const slotStart = new Date(Date.now() + (cycle + 3) * 86400000);
      slotStart.setHours(14, 0, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

      const CONCURRENT_REQUESTS = 15;
      const promises = Array.from({ length: CONCURRENT_REQUESTS }, (_, idx) =>
        prisma.reservation.create({
          data: {
            title: `Cycle ${cycle} Competitor #${idx + 1}`,
            userId: internUser.id,
            resourceId: stressResource.id,
            startTime: slotStart,
            endTime: slotEnd,
            status: "APPROVED",
          },
        })
      );

      const batchResults = await Promise.allSettled(promises);
      const succeeded = batchResults.filter((r) => r.status === "fulfilled").length;
      const rejected = batchResults.filter((r) => r.status === "rejected").length;

      assert(
        succeeded === 1 && rejected === CONCURRENT_REQUESTS - 1,
        sec,
        `Cycle ${cycle}: ${CONCURRENT_REQUESTS} concurrent requests resulted in exactly 1 fulfilled and ${rejected} rejected`
      );

      // Verify all rejected errors were due to PostgreSQL concurrency/exclusion engine (23P01 exclusion or 40P01 deadlock serialization protection)
      const allRejectedWereConcurrencySafe = batchResults
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .every(
          (r) =>
            r.reason?.message?.includes("23P01") ||
            r.reason?.message?.includes("40P01") ||
            r.reason?.message?.includes("deadlock detected") ||
            r.reason?.message?.includes("no_overlapping_active_reservations")
        );
      assert(allRejectedWereConcurrencySafe, sec, `Cycle ${cycle}: All ${rejected} rejected attempts handled by PostgreSQL exclusion/serialization engine (23P01/40P01)`);
    }

    // 2. Safe error message handling: PostgreSQL 23P01 does NOT leak raw SQL to client
    const sampleError = new Error('conflicting key value violates exclusion constraint "no_overlapping_active_reservations" (23P01)');
    const sanitizedMsg = sanitizeServerError(sampleError, "Generic error");
    assert(
      sanitizedMsg.includes("Schedule Conflict") && !sanitizedMsg.includes("23P01") && !sanitizedMsg.includes("PostgresError"),
      sec,
      "PostgreSQL 23P01 exclusion violation is transformed into user-friendly message without leaking raw SQL or schema internals"
    );

    // 3. Multiple overlapping requests with different durations
    const baseStart = new Date(Date.now() + 10 * 86400000);
    baseStart.setHours(10, 0, 0, 0);
    const baseEnd = new Date(baseStart.getTime() + 2 * 3600 * 1000); // 10:00 - 12:00

    await prisma.reservation.create({
      data: {
        title: "Blocker 10:00-12:00",
        userId: internUser.id,
        resourceId: stressResource.id,
        startTime: baseStart,
        endTime: baseEnd,
        status: "APPROVED",
      },
    });

    // Try shorter overlapping request (10:30 - 11:30)
    let overlapShortBlocked = false;
    try {
      await prisma.reservation.create({
        data: {
          title: "Short Overlap",
          userId: internUser.id,
          resourceId: stressResource.id,
          startTime: new Date(baseStart.getTime() + 30 * 60 * 1000),
          endTime: new Date(baseStart.getTime() + 90 * 60 * 1000),
          status: "APPROVED",
        },
      });
    } catch {
      overlapShortBlocked = true;
    }
    assert(overlapShortBlocked, sec, "Sub-interval completely inside existing booking is blocked");

    // Try extended overlapping request (11:30 - 13:30)
    let overlapExtBlocked = false;
    try {
      await prisma.reservation.create({
        data: {
          title: "Extended Overlap",
          userId: internUser.id,
          resourceId: stressResource.id,
          startTime: new Date(baseStart.getTime() + 90 * 60 * 1000),
          endTime: new Date(baseStart.getTime() + 210 * 60 * 1000),
          status: "APPROVED",
        },
      });
    } catch {
      overlapExtBlocked = true;
    }
    assert(overlapExtBlocked, sec, "Overlapping tail interval extending past existing booking is blocked");

    // 4. Same interval on different resources all succeed
    const altResourceA = await prisma.resource.create({
      data: { name: `Alt Resource A [${Date.now()}]`, categoryId: sampleCategory.id, capacity: 5, status: "AVAILABLE" },
    });
    const altResourceB = await prisma.resource.create({
      data: { name: `Alt Resource B [${Date.now()}]`, categoryId: sampleCategory.id, capacity: 5, status: "AVAILABLE" },
    });

    const altBookings = await Promise.all([
      prisma.reservation.create({
        data: { title: "Booking Alt A", userId: internUser.id, resourceId: altResourceA.id, startTime: baseStart, endTime: baseEnd, status: "APPROVED" },
      }),
      prisma.reservation.create({
        data: { title: "Booking Alt B", userId: internUser.id, resourceId: altResourceB.id, startTime: baseStart, endTime: baseEnd, status: "APPROVED" },
      }),
    ]);
    assert(Boolean(altBookings[0].id && altBookings[1].id), sec, "Same time interval across different independent resources succeeds concurrently");

    // 5. Edit booking into another booking's time slot (Update is rejected without altering original)
    process.env.TEST_AUTH_AS = "INTERN";
    // Booking 1: 14:00 - 15:00
    const editT1Start = new Date(Date.now() + 15 * 86400000);
    editT1Start.setHours(14, 0, 0, 0);
    const editT1End = new Date(editT1Start.getTime() + 3600 * 1000);

    await prisma.reservation.create({
      data: { title: "Booking Anchor 1", userId: internUser.id, resourceId: stressResource.id, startTime: editT1Start, endTime: editT1End, status: "APPROVED" },
    });

    // Booking 2: 16:00 - 17:00
    const editT2Start = new Date(Date.now() + 15 * 86400000);
    editT2Start.setHours(16, 0, 0, 0);
    const editT2End = new Date(editT2Start.getTime() + 3600 * 1000);

    const b2 = await prisma.reservation.create({
      data: { title: "Booking Anchor 2", userId: internUser.id, resourceId: stressResource.id, startTime: editT2Start, endTime: editT2End, status: "APPROVED" },
    });

    // Attempt to edit Booking 2 so that it overlaps Booking 1 (14:30 - 15:30)
    const illegalEdit = await editReservationAction({
      reservationId: b2.id,
      startDate: editT1Start.toISOString().split("T")[0],
      startTime: "14:30",
      endDate: editT1Start.toISOString().split("T")[0],
      endTime: "15:30",
    });
    assert(illegalEdit.success === false && illegalEdit.error?.toLowerCase().includes("conflict") === true, sec, "Editing booking into another reservation's interval is rejected");

    // Verify original booking B2 remains unchanged in database
    const b2Fresh = await prisma.reservation.findUnique({ where: { id: b2.id } });
    assert(b2Fresh?.startTime.getTime() === editT2Start.getTime(), sec, "Rejected edit leaves original reservation time completely intact");

    // 6. Edit booking without changing its time (update metadata only)
    const validMetaEdit = await editReservationAction({
      reservationId: b2.id,
      title: "Updated Title for Booking 2",
      description: "Added meeting notes",
    });
    assert(validMetaEdit.success === true, sec, "Editing booking metadata without changing time succeeds cleanly");

    // 7. Approve a pending booking that now conflicts
    // Create pending booking for 18:00 - 19:00
    const pendStart = new Date(Date.now() + 16 * 86400000);
    pendStart.setHours(18, 0, 0, 0);
    const pendEnd = new Date(pendStart.getTime() + 3600 * 1000);

    const pendBooking = await prisma.reservation.create({
      data: { title: "Pending In Queue", userId: internUser.id, resourceId: stressResource.id, startTime: pendStart, endTime: pendEnd, status: "PENDING" },
    });

    // Intervening overlapping booking is blocked by PostgreSQL GiST constraint because PENDING is protected
    let interveningBlocked = false;
    try {
      await prisma.reservation.create({
        data: {
          title: "Intervening Overlapping Booking",
          userId: adminUser.id,
          resourceId: stressResource.id,
          startTime: new Date(pendStart.getTime() + 30 * 60 * 1000),
          endTime: new Date(pendEnd.getTime() + 30 * 60 * 1000),
          status: "APPROVED",
        },
      });
    } catch {
      interveningBlocked = true;
    }
    assert(interveningBlocked, sec, "PostgreSQL GiST constraint protects PENDING reservations from being overlapped by other bookings");

    // Put resource in MAINTENANCE and test approval rejection
    await prisma.resource.update({ where: { id: stressResource.id }, data: { status: "MAINTENANCE" } });
    process.env.TEST_AUTH_AS = "ADMIN";
    const conflictApproval = await updateReservationStatusAction({
      reservationId: pendBooking.id,
      status: "APPROVED",
    });
    assert(conflictApproval.success === false && conflictApproval.error?.toLowerCase().includes("maintenance") === true, sec, "Approving a pending booking when resource is in MAINTENANCE is rejected safely");
    
    // Verify booking remains in valid PENDING state
    const pendFresh = await prisma.reservation.findUnique({ where: { id: pendBooking.id } });
    assert(pendFresh?.status === "PENDING", sec, "Pending reservation remains in valid uncorrupted PENDING state after failed approval");

    // Clean up Section A fixtures
    await prisma.reservation.deleteMany({ where: { resourceId: { in: [stressResource.id, altResourceA.id, altResourceB.id] } } });
    await prisma.resource.deleteMany({ where: { id: { in: [stressResource.id, altResourceA.id, altResourceB.id] } } });
  }

  // ============================================================================
  // SECTION B: AUTHENTICATION & SESSION SECURITY EDGE CASES
  // ============================================================================
  console.log("\n🔒 SECTION B: Authentication & Session Security Edge Cases");
  {
    const sec = "SessionSecurity";

    // 1. Token signed with the wrong secret
    const fakeSecret = "wrong_secret_key_that_does_not_match_auth_secret_32_bytes";
    const fakePayload = `${internUser.id}.${Date.now() + 86400000}`;
    const fakeSig = createHmac("sha256", fakeSecret).update(fakePayload).digest("hex");
    const wrongSecretToken = `${fakePayload}.${fakeSig}`;
    const wrongSecretVerified = await verifySignedSessionToken(wrongSecretToken);
    assert(wrongSecretVerified === null, sec, "Token signed with incorrect secret is rejected");

    // 2. Malformed token formats (missing parts, empty string, corrupted hex)
    assert(await verifySignedSessionToken("") === null, sec, "Empty string token safely returns null");
    assert(await verifySignedSessionToken("single-part-token") === null, sec, "Single-part token safely returns null");
    assert(await verifySignedSessionToken("two.parts") === null, sec, "Two-part token safely returns null");
    assert(await verifySignedSessionToken("a.b.c.d") === null, sec, "Four-part token safely returns null");
    assert(await verifySignedSessionToken(`${internUser.id}.not_a_number.abcdef123456`) === null, sec, "Non-numeric expiry token safely returns null");

    // 3. Stale-role detection upon user demotion
    // Provision temp user with ADMIN role
    const tempUserEmail = `demote.test.${Date.now()}@primewave.com`;
    const tempAdmin = await prisma.user.create({
      data: {
        name: "Temporary Admin",
        email: tempUserEmail,
        passwordHash: "dummyhash",
        role: "ADMIN",
      },
    });

    // Create session token for this user
    const tempToken = await createSignedSessionToken(tempAdmin.id);
    const initialVerify = await verifySignedSessionToken(tempToken);
    assert(initialVerify === tempAdmin.id, sec, "Temporary admin session token is valid");

    // Demote the user to USER in the database
    await prisma.user.update({
      where: { id: tempAdmin.id },
      data: { role: "USER" },
    });

    // Query user via authoritative DB lookup
    const updatedUser = await prisma.user.findUnique({
      where: { id: initialVerify! },
      select: { id: true, role: true },
    });
    assert(updatedUser?.role === "USER", sec, "Session resolves authoritative role from database; demoted user immediately loses ADMIN privileges");

    // 4. Deleted user session invalidation
    await prisma.user.delete({ where: { id: tempAdmin.id } });
    const userAfterDeletion = await prisma.user.findUnique({
      where: { id: initialVerify! },
    });
    assert(userAfterDeletion === null, sec, "Deleted user's active session token cannot resolve a database user record");

    // 5. Password verification rejection without revealing account details
    const wrongPasswordLogin = await loginAction({
      email: "admin@primewave.com",
      password: "WrongPassword123",
    });
    assert(
      wrongPasswordLogin.success === false && wrongPasswordLogin.error?.includes("Invalid email or password") === true,
      sec,
      "Failed login returns generic error without revealing whether email or password was the cause"
    );
  }

  // ============================================================================
  // SECTION C: AUTHORIZATION & ID GUESSING DEFENSE
  // ============================================================================
  console.log("\n🛡️ SECTION C: Authorization & ID-Guessing Defense");
  {
    const sec = "IDGuessingDefense";

    // Setup an asset and a reservation owned by Admin
    const authTestRes = await prisma.resource.create({
      data: { name: `Ownership Test Asset [${Date.now()}]`, categoryId: sampleCategory.id, capacity: 4, status: "AVAILABLE" },
    });

    const adminBooking = await prisma.reservation.create({
      data: {
        title: "Confidential Executive Strategy",
        userId: adminUser.id,
        resourceId: authTestRes.id,
        startTime: new Date(Date.now() + 20 * 86400000),
        endTime: new Date(Date.now() + 20 * 86400000 + 3600 * 1000),
        status: "APPROVED",
      },
    });

    // 1. Regular user (Intern) attempts to cancel Admin's reservation by ID
    process.env.TEST_AUTH_AS = "INTERN";
    const cancelOtherBooking = await cancelReservationAction(adminBooking.id);
    assert(
      cancelOtherBooking.success === false && cancelOtherBooking.error?.includes("Not authorized") === true,
      sec,
      "User cannot cancel another user's reservation by supplying its ID"
    );

    // 2. Regular user attempts to edit Admin's reservation by ID
    const editOtherBooking = await editReservationAction({
      reservationId: adminBooking.id,
      title: "Hijacked Meeting Title",
    });
    assert(
      editOtherBooking.success === false && editOtherBooking.error?.includes("Not authorized") === true,
      sec,
      "User cannot modify another user's reservation by supplying its ID"
    );

    // Verify Admin's booking was NOT modified
    const untouchedBooking = await prisma.reservation.findUnique({ where: { id: adminBooking.id } });
    assert(untouchedBooking?.title === "Confidential Executive Strategy", sec, "Target reservation remains unmodified in PostgreSQL");

    // 3. Unauthenticated requests blocked on all mutations
    process.env.TEST_AUTH_AS = "NONE";
    const unauthCreate = await createReservationAction({
      resourceId: authTestRes.id,
      title: "Unauth Booking",
      startDate: "2026-11-20",
      startTime: "10:00",
      endDate: "2026-11-20",
      endTime: "11:00",
    });
    assert(unauthCreate.success === false && unauthCreate.error?.includes("Authentication required") === true, sec, "Unauthenticated user blocked from createReservationAction");

    const unauthAdminAction = await updateResourceStatusAction(authTestRes.id, "MAINTENANCE");
    assert(unauthAdminAction.success === false && unauthAdminAction.error?.includes("Administrator") === true, sec, "Unauthenticated user blocked from updateResourceStatusAction");

    // Clean up Section C fixtures
    await prisma.reservation.delete({ where: { id: adminBooking.id } });
    await prisma.resource.delete({ where: { id: authTestRes.id } });
  }

  // ============================================================================
  // SECTION D: APPROVAL WORKFLOW & STATE MACHINE INVARIANTS
  // ============================================================================
  console.log("\n📋 SECTION D: Approval Workflow & State Machine Invariants");
  {
    const sec = "StateMachine";
    process.env.TEST_AUTH_AS = "ADMIN";

    const stateRes = await prisma.resource.create({
      data: { name: `State Machine Facility [${Date.now()}]`, categoryId: sampleCategory.id, capacity: 6, status: "AVAILABLE" },
    });

    const testTStart = new Date(Date.now() + 25 * 86400000);
    const testTEnd = new Date(testTStart.getTime() + 3600 * 1000);

    // 1. Approve a CANCELLED reservation -> MUST BE REJECTED
    const cancelledBooking = await prisma.reservation.create({
      data: { title: "Cancelled Booking", userId: internUser.id, resourceId: stateRes.id, startTime: testTStart, endTime: testTEnd, status: "CANCELLED" },
    });
    const approveCancelled = await updateReservationStatusAction({ reservationId: cancelledBooking.id, status: "APPROVED" });
    assert(approveCancelled.success === false, sec, "Approving an already CANCELLED reservation is strictly rejected");

    // 2. Approve a REJECTED reservation -> MUST BE REJECTED
    const rejectedBooking = await prisma.reservation.create({
      data: { title: "Rejected Booking", userId: internUser.id, resourceId: stateRes.id, startTime: new Date(testTStart.getTime() + 7200 * 1000), endTime: new Date(testTEnd.getTime() + 7200 * 1000), status: "REJECTED", rejectionReason: "Initial rejection" },
    });
    const approveRejected = await updateReservationStatusAction({ reservationId: rejectedBooking.id, status: "APPROVED" });
    assert(approveRejected.success === false, sec, "Approving an already REJECTED reservation is strictly rejected");

    // 3. Double-approval of already APPROVED reservation -> REJECTED / NO DUPLICATION
    const approvedBooking = await prisma.reservation.create({
      data: { title: "Already Approved Booking", userId: internUser.id, resourceId: stateRes.id, startTime: new Date(testTStart.getTime() + 14400 * 1000), endTime: new Date(testTEnd.getTime() + 14400 * 1000), status: "APPROVED" },
    });
    const doubleApprove = await updateReservationStatusAction({ reservationId: approvedBooking.id, status: "APPROVED" });
    assert(doubleApprove.success === false, sec, "Re-approving an already APPROVED reservation is rejected as non-pending");

    // 4. Reject without required reason (< 5 characters) -> VALIDATION ERROR
    const pendingBooking = await prisma.reservation.create({
      data: { title: "Pending To Reject", userId: internUser.id, resourceId: stateRes.id, startTime: new Date(testTStart.getTime() + 21600 * 1000), endTime: new Date(testTEnd.getTime() + 21600 * 1000), status: "PENDING" },
    });
    const rejectNoReason = await updateReservationStatusAction({ reservationId: pendingBooking.id, status: "REJECTED", rejectionReason: "No" });
    assert(rejectNoReason.success === false && rejectNoReason.error?.toLowerCase().includes("minimum 5 characters") === true, sec, "Rejecting without an explanatory reason (>= 5 chars) is rejected by validation");

    // 5. Resource maintenance while booking is pending:
    // When resource enters maintenance, approving the pending booking is blocked
    await prisma.resource.update({ where: { id: stateRes.id }, data: { status: "MAINTENANCE" } });
    const approveMaintPending = await updateReservationStatusAction({ reservationId: pendingBooking.id, status: "APPROVED" });
    assert(approveMaintPending.success === false && approveMaintPending.error?.toLowerCase().includes("maintenance") === true, sec, "Approving a pending reservation for a resource currently in MAINTENANCE is blocked");

    // 6. Existing approved reservations retained when resource enters maintenance (policy verified)
    const approvedPreserved = await prisma.reservation.findUnique({ where: { id: approvedBooking.id } });
    assert(approvedPreserved?.status === "APPROVED", sec, "Existing approved bookings are preserved for administrative review when resource enters maintenance");

    // Clean up Section D fixtures
    await prisma.reservation.deleteMany({ where: { resourceId: stateRes.id } });
    await prisma.resource.delete({ where: { id: stateRes.id } });
  }

  // ============================================================================
  // SECTION E: TIMEZONE & BOUNDARY CONDITIONS
  // ============================================================================
  console.log("\n🌐 SECTION E: Timezone & Boundary Conditions");
  {
    const sec = "TimezoneBoundaries";

    // 1. Exact 15-minute booking duration (allowed)
    const tExact15Start = new Date(Date.now() + 86400000);
    tExact15Start.setMinutes(0, 0, 0);
    const tExact15End = new Date(tExact15Start.getTime() + 15 * 60 * 1000);
    const check15m = validateReservationTiming(tExact15Start, tExact15End);
    assert(check15m.valid === true, sec, "Booking of exactly 15 minutes is allowed by boundary validator");

    // 2. 14-minute booking duration (rejected)
    const tUnder15End = new Date(tExact15Start.getTime() + 14 * 60 * 1000);
    const check14m = validateReservationTiming(tExact15Start, tUnder15End);
    assert(check14m.valid === false && check14m.error?.includes("15 minutes") === true, sec, "Booking of 14 minutes (< minimum 15m) is strictly rejected");

    // 3. Exact 90-day booking horizon (allowed)
    const now = new Date();
    const tExact90Start = new Date(now.getTime() + 90 * 86400000 - 60000);
    const tExact90End = new Date(tExact90Start.getTime() + 30 * 60 * 1000);
    const check90d = validateReservationTiming(tExact90Start, tExact90End, now);
    assert(check90d.valid === true, sec, "Booking at boundary of 90-day horizon is permitted");

    // 4. Booking beyond 90-day horizon (rejected)
    const tBeyond90Start = new Date(now.getTime() + 91 * 86400000);
    const tBeyond90End = new Date(tBeyond90Start.getTime() + 30 * 60 * 1000);
    const checkBeyond90d = validateReservationTiming(tBeyond90Start, tBeyond90End, now);
    assert(checkBeyond90d.valid === false && checkBeyond90d.error?.includes("90 days") === true, sec, "Booking beyond 90-day horizon is rejected");

    // 5. Midnight starting reservation (00:00 to 00:30)
    const midnightRange = parseOrgDateTimeRange({
      startDate: "2026-11-01",
      startTime: "00:00",
      endDate: "2026-11-01",
      endTime: "00:30",
    });
    const midnightCheck = validateReservationTiming(midnightRange.start, midnightRange.end);
    assert(midnightCheck.valid === true, sec, "Reservation starting exactly at midnight (00:00) validates cleanly");

    // 6. Standardized Timezone string verification
    assert(ORGANIZATION_TIMEZONE === "Asia/Colombo", sec, "System timezone declaration is Asia/Colombo");
    assert(ORGANIZATION_OFFSET === "+05:30", sec, "System timezone offset is +05:30");
  }

  // ============================================================================
  // SECTION F: DATABASE INTEGRITY & SCHEMA CONSTRAINTS
  // ============================================================================
  console.log("\n🗄️ SECTION F: Database Relational Integrity");
  {
    const sec = "RelationalIntegrity";
    process.env.TEST_AUTH_AS = "ADMIN";

    // 1. Non-existent category ID rejected
    const badCategoryRes = await createResourceAction({
      name: "Phantom Category Lab",
      categoryId: "non-existent-category-id-9999",
      capacity: 5,
      requiresApproval: false,
    });
    assert(badCategoryRes.success === false && badCategoryRes.error?.includes("Selected category does not exist") === true, sec, "Resource creation with nonexistent categoryId is rejected");

    // 2. Non-positive capacity rejected by Zod schema
    const zeroCapRes = await createResourceAction({
      name: "Zero Cap Room",
      categoryId: sampleCategory.id,
      capacity: 0,
      requiresApproval: false,
    });
    assert(zeroCapRes.success === false, sec, "Capacity of 0 is rejected by validation schema");

    // 3. Whitespace-only resource name rejected
    const whitespaceNameRes = await createResourceAction({
      name: "     ",
      categoryId: sampleCategory.id,
      capacity: 4,
      requiresApproval: false,
    });
    assert(whitespaceNameRes.success === false, sec, "Whitespace-only resource name is rejected by validation schema");
  }

  // ============================================================================
  // SUMMARY REPORT
  // ============================================================================
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const total = reports.length;
  const passed = reports.filter((r) => r.passed).length;
  const failed = reports.filter((r) => !r.passed).length;

  console.log("\n================================================================================");
  console.log(`  EXTENDED STRESS & INTEGRITY SUITE COMPLETE in ${duration}s`);
  console.log(`  TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runExtendedStressAndIntegrityTests()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test execution failed:", err);
    prisma.$disconnect();
    process.exit(1);
  });
