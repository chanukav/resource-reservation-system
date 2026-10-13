/**
 * Automated Authorization & Security Test Suite
 * Proves that:
 * 1. Session tokens are cryptographically signed and cannot be forged/tampered with.
 * 2. Regular users (USER role) cannot execute administrative actions (create resources, approve/reject bookings).
 * 3. Users cannot cancel or modify reservations belonging to other users.
 * 4. Arbitrary role injection is prevented at the server layer.
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
  updateReservationStatusAction,
  cancelReservationAction,
} from "../src/actions/reservations";
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
  console.log("🔒 Starting Security & Authorization Test Suite...\n");

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
  // When no session cookie is provided or intern session is active, getCurrentUser returns intern (USER)
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
  // Create a reservation owned by Admin
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

  console.log(`\n🎉 All ${passedTests}/${totalTests} Authorization & Security Tests PASSED!`);
}

runSecurityTests()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
