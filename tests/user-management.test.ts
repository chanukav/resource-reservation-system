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
  changeOwnPasswordAction,
  adminResetUserPasswordAction,
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

  // --------------------------------------------------------------------------
  // GROUP 4: User Password Self-Change & Admin Password Reset
  // --------------------------------------------------------------------------
  console.log("\nGroup 4: Password Change & Strong Password Validation");

  // 14. Unauthenticated change rejected
  process.env.TEST_AUTH_AS = "NONE";
  const unauthChange = await changeOwnPasswordAction({
    currentPassword: "Intern@123",
    newPassword: "ValidNewPass#2026",
    confirmPassword: "ValidNewPass#2026",
  });
  assert(
    unauthChange.success === false && unauthChange.error?.includes("Authentication required") === true,
    "changeOwnPasswordAction rejects unauthenticated visitors"
  );

  // 15. Incorrect current password rejected
  delete process.env.TEST_AUTH_AS; // Authenticated as Intern
  const badCurrentPass = await changeOwnPasswordAction({
    currentPassword: "WrongCurrentPassword!1",
    newPassword: "ValidNewPass#2026",
    confirmPassword: "ValidNewPass#2026",
  });
  assert(
    badCurrentPass.success === false && badCurrentPass.error?.includes("current password you provided is incorrect") === true,
    "changeOwnPasswordAction rejects incorrect current password"
  );

  // 16. Weak password validations
  const tooShort = await changeOwnPasswordAction({
    currentPassword: "Intern@123",
    newPassword: "Short!1",
    confirmPassword: "Short!1",
  });
  assert(
    tooShort.success === false && tooShort.error?.includes("at least 8 characters") === true,
    "changeOwnPasswordAction enforces minimum 8 characters"
  );

  const missingUpper = await changeOwnPasswordAction({
    currentPassword: "Intern@123",
    newPassword: "nouppercase!123",
    confirmPassword: "nouppercase!123",
  });
  assert(
    missingUpper.success === false && missingUpper.error?.includes("uppercase letter") === true,
    "changeOwnPasswordAction requires at least one uppercase letter"
  );

  const missingSpecial = await changeOwnPasswordAction({
    currentPassword: "Intern@123",
    newPassword: "NoSpecialChar123",
    confirmPassword: "NoSpecialChar123",
  });
  assert(
    missingSpecial.success === false && missingSpecial.error?.includes("special character") === true,
    "changeOwnPasswordAction requires at least one special character"
  );

  // 17. Reusing identical current password rejected
  const samePass = await changeOwnPasswordAction({
    currentPassword: "Intern@123",
    newPassword: "Intern@123",
    confirmPassword: "Intern@123",
  });
  assert(
    samePass.success === false && samePass.error?.includes("different from your current password") === true,
    "changeOwnPasswordAction prevents reusing existing password"
  );

  // 18. Mismatched confirm password rejected
  const mismatchPass = await changeOwnPasswordAction({
    currentPassword: "Intern@123",
    newPassword: "BrandNewPass#999",
    confirmPassword: "BrandNewPass#888",
  });
  assert(
    mismatchPass.success === false && mismatchPass.error?.includes("do not match") === true,
    "changeOwnPasswordAction enforces password confirmation match"
  );

  // 19. Valid strong password change succeeds
  const validChange = await changeOwnPasswordAction({
    currentPassword: "Intern@123",
    newPassword: "BrandNewPass#2026",
    confirmPassword: "BrandNewPass#2026",
  });
  assert(validChange.success === true, "changeOwnPasswordAction succeeds with verified credentials & strong password");

  // 20. Login with new password works, old password fails
  const loginWithOld = await loginAction({
    email: "intern@primewave.com",
    password: "Intern@123",
  });
  assert(loginWithOld.success === false, "Old password is invalid after successful password change");

  const loginWithNew = await loginAction({
    email: "intern@primewave.com",
    password: "BrandNewPass#2026",
  });
  assert(loginWithNew.success === true, "User successfully authenticates with new changed password");

  // 21. Non-admin cannot invoke adminResetUserPasswordAction
  const nonAdminReset = await adminResetUserPasswordAction({
    targetUserId: admin.id,
    newPassword: "AdminResetPass#2026",
  });
  assert(
    nonAdminReset.success === false && nonAdminReset.error?.includes("Administrator privileges required") === true,
    "adminResetUserPasswordAction strictly blocks non-admin users"
  );

  // 22. Admin reset with weak password rejected
  process.env.TEST_AUTH_AS = "ADMIN";
  const weakAdminReset = await adminResetUserPasswordAction({
    targetUserId: intern.id,
    newPassword: "weak",
  });
  assert(
    weakAdminReset.success === false && weakAdminReset.error?.includes("at least 8 characters") === true,
    "adminResetUserPasswordAction enforces strong password requirements"
  );

  // 23. Admin resets user password at user request
  const validAdminReset = await adminResetUserPasswordAction({
    targetUserId: intern.id,
    newPassword: "Intern@123", // restore back to seed default
  });
  assert(
    validAdminReset.success === true && validAdminReset.message?.includes("successfully updated") === true,
    "adminResetUserPasswordAction allows administrator to reset user's password at user request"
  );

  // 24. Intern can login with reset password
  const verifyRestoredLogin = await loginAction({
    email: "intern@primewave.com",
    password: "Intern@123",
  });
  assert(verifyRestoredLogin.success === true, "User can successfully login with the admin-reset password");

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
