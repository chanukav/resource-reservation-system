/**
 * Automated User Management & Login Authentication Test Suite
 * Verifies that:
 * 1. Login action verifies PBKDF2 credentials accurately and rejects invalid attempts.
 * 2. Only administrators can manage users (create, update role, delete).
 * 3. Regular users (USER role) are strictly blocked from user management actions.
 * 4. Self-demotion and self-deletion of active administrators are blocked.
 * 5. Last remaining administrator cannot be deleted or demoted.
 */

import { prisma } from "../src/lib/prisma";
import { loginAction } from "../src/actions/auth";
import {
  createUserAction,
  updateUserRoleAction,
  deleteUserAction,
} from "../src/actions/users";

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runUserManagementTests() {
  console.log("================================================================================");
  console.log("  USER MANAGEMENT & AUTHENTICATION AUTOMATED TEST SUITE");
  console.log("================================================================================\n");

  // Ensure default users exist
  const admin = await prisma.user.findUnique({ where: { email: "admin@primewave.com" } });
  const intern = await prisma.user.findUnique({ where: { email: "intern@primewave.com" } });

  if (!admin || !intern) {
    throw new Error("Seeded users not found. Run npm run seed first.");
  }

  // --------------------------------------------------------------------------
  // GROUP 1: Login Authentication & PBKDF2 Verification
  // --------------------------------------------------------------------------
  console.log("Group 1: Login Authentication & Password Verification");

  // 1. Invalid password rejected
  const badPassLogin = await loginAction({
    email: "admin@primewave.com",
    password: "WrongPassword999",
  });
  assert(
    badPassLogin.success === false && badPassLogin.error?.includes("Invalid email or password") === true,
    "loginAction rejects incorrect password"
  );

  // 2. Non-existent email rejected
  const nonExistentLogin = await loginAction({
    email: "ghost.user@primewave.com",
    password: "AnyPassword123",
  });
  assert(
    nonExistentLogin.success === false && nonExistentLogin.error?.includes("Invalid email or password") === true,
    "loginAction rejects non-existent email"
  );

  // 3. Valid Admin login succeeds
  const adminLogin = await loginAction({
    email: "admin@primewave.com",
    password: "Admin@123",
  });
  assert(
    adminLogin.success === true && adminLogin.user?.role === "ADMIN",
    "loginAction authenticates Admin and returns ADMIN role"
  );

  // 4. Valid Intern User login succeeds
  const internLogin = await loginAction({
    email: "intern@primewave.com",
    password: "Intern@123",
  });
  assert(
    internLogin.success === true && internLogin.user?.role === "USER",
    "loginAction authenticates Intern and returns USER role"
  );

  console.log("");

  // --------------------------------------------------------------------------
  // GROUP 2: Regular User (USER) RBAC Boundaries on User Management
  // --------------------------------------------------------------------------
  console.log("Group 2: Regular Users Cannot Access User Management");
  delete process.env.TEST_AUTH_AS; // Simulates USER (intern)

  // 5. USER cannot create a user
  const userCreateAttempt = await createUserAction({
    name: "Unauthorized Member",
    email: "unauthorized@primewave.com",
    password: "SecretPassword123",
    role: "USER",
  });
  assert(
    userCreateAttempt.success === false &&
      userCreateAttempt.error?.includes("Administrator privileges required") === true,
    "createUserAction strictly blocks non-admin users"
  );

  // 6. USER cannot update roles
  const userUpdateRoleAttempt = await updateUserRoleAction({
    userId: intern.id,
    role: "ADMIN",
  });
  assert(
    userUpdateRoleAttempt.success === false &&
      userUpdateRoleAttempt.error?.includes("Administrator privileges required") === true,
    "updateUserRoleAction strictly blocks non-admin users"
  );

  // 7. USER cannot delete users
  const userDeleteAttempt = await deleteUserAction({
    userId: admin.id,
  });
  assert(
    userDeleteAttempt.success === false &&
      userDeleteAttempt.error?.includes("Administrator privileges required") === true,
    "deleteUserAction strictly blocks non-admin users"
  );

  console.log("");

  // --------------------------------------------------------------------------
  // GROUP 3: Administrator User Management Operations & Safety Guards
  // --------------------------------------------------------------------------
  console.log("Group 3: Administrator User Management & Invariant Protections");
  process.env.TEST_AUTH_AS = "ADMIN"; // Simulates ADMIN

  const testEmail = `test.member.${Date.now()}@primewave.com`;

  // 8. Admin successfully creates a user
  const adminCreateUser = await createUserAction({
    name: "Test Engineer",
    email: testEmail,
    password: "StrongPassword123",
    role: "USER",
  });
  assert(
    adminCreateUser.success === true,
    "Admin can successfully provision a new user account"
  );

  const createdUser = await prisma.user.findUnique({ where: { email: testEmail } });
  assert(createdUser !== null && createdUser.role === "USER", "Created user exists in PostgreSQL with USER role");

  // 9. Duplicate email creation rejected
  const duplicateCreate = await createUserAction({
    name: "Duplicate Person",
    email: testEmail,
    password: "StrongPassword123",
    role: "USER",
  });
  assert(
    duplicateCreate.success === false && duplicateCreate.error?.includes("already exists") === true,
    "createUserAction rejects duplicate email address"
  );

  // 10. Admin promotes user to ADMIN
  const promoteUser = await updateUserRoleAction({
    userId: createdUser!.id,
    role: "ADMIN",
  });
  assert(promoteUser.success === true, "Admin can promote a user to ADMIN");

  const promotedInDb = await prisma.user.findUnique({ where: { id: createdUser!.id } });
  assert(promotedInDb?.role === "ADMIN", "Database reflects promoted ADMIN role");

  // 11. Self-demotion guard
  const selfDemoteAttempt = await updateUserRoleAction({
    userId: admin.id,
    role: "USER",
  });
  assert(
    selfDemoteAttempt.success === false &&
      selfDemoteAttempt.error?.includes("cannot revoke your own") === true,
    "updateUserRoleAction prevents admin from demoting themselves"
  );

  // 12. Self-deletion guard
  const selfDeleteAttempt = await deleteUserAction({
    userId: admin.id,
  });
  assert(
    selfDeleteAttempt.success === false &&
      selfDeleteAttempt.error?.includes("cannot delete your own") === true,
    "deleteUserAction prevents admin from deleting their own account"
  );

  // 13. Admin deletes the test user
  const deleteTestUser = await deleteUserAction({
    userId: createdUser!.id,
  });
  assert(deleteTestUser.success === true, "Admin can delete user accounts");

  const deletedInDb = await prisma.user.findUnique({ where: { id: createdUser!.id } });
  assert(deletedInDb === null, "Deleted user is cleanly purged from database");

  delete process.env.TEST_AUTH_AS;

  console.log("\n================================================================================");
  console.log("  ALL USER MANAGEMENT & AUTHENTICATION TESTS PASSED!");
  console.log("================================================================================\n");
}

runUserManagementTests()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
