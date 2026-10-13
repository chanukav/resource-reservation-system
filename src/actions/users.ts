"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  createUserSchema,
  updateUserRoleSchema,
  deleteUserSchema,
  CreateUserInput,
  UpdateUserRoleInput,
  DeleteUserInput,
  formatZodError,
  sanitizeServerError,
} from "@/lib/validations";
import { hashPassword } from "@/lib/password";
import { Role } from "@prisma/client";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore when executed in test runner outside request scope
  }
}

export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

/**
 * Creates a new user record.
 * RESTRICTED: Administrator privileges strictly required.
 */
export async function createUserAction(formData: CreateUserInput): Promise<ActionResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return { success: false, error: "Administrator privileges required to manage users." };
    }

    const parsed = createUserSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: formatZodError(parsed.error) };
    }

    const { name, email, password, role } = parsed.data;

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      return { success: false, error: "A user with this email address already exists." };
    }

    const passwordHash = hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role as Role,
      },
    });

    safeRevalidatePath("/admin");

    return {
      success: true,
      message: `User '${newUser.name}' (${newUser.role}) created successfully.`,
    };
  } catch (error) {
    console.error("createUserAction error:", error);
    return {
      success: false,
      error: sanitizeServerError(error, "Failed to create user."),
    };
  }
}

/**
 * Updates a user's role (promotes to ADMIN or demotes to USER).
 * RESTRICTED: Administrator privileges strictly required.
 */
export async function updateUserRoleAction(formData: UpdateUserRoleInput): Promise<ActionResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return { success: false, error: "Administrator privileges required to manage users." };
    }

    const parsed = updateUserRoleSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: formatZodError(parsed.error) };
    }

    const { userId, role } = parsed.data;

    // Safety Guard: Prevent admin from demoting themselves
    if (currentUser.id === userId && role !== "ADMIN") {
      return {
        success: false,
        error: "Self-demotion blocked: You cannot revoke your own administrator privileges.",
      };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, error: "User not found." };
    }

    // Safety Guard: If demoting an admin, ensure at least one other admin exists
    if (targetUser.role === "ADMIN" && role === "USER") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN" },
      });
      if (adminCount <= 1) {
        return {
          success: false,
          error: "Action blocked: System must retain at least one administrator account.",
        };
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: role as Role },
    });

    safeRevalidatePath("/admin");

    return {
      success: true,
      message: `Role for ${targetUser.name} updated to ${role}.`,
    };
  } catch (error) {
    console.error("updateUserRoleAction error:", error);
    return {
      success: false,
      error: sanitizeServerError(error, "Failed to update user role."),
    };
  }
}

/**
 * Deletes a user account.
 * RESTRICTED: Administrator privileges strictly required.
 */
export async function deleteUserAction(formData: DeleteUserInput): Promise<ActionResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return { success: false, error: "Administrator privileges required to manage users." };
    }

    const parsed = deleteUserSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: formatZodError(parsed.error) };
    }

    const { userId } = parsed.data;

    // Safety Guard: Prevent admin from deleting their own account
    if (currentUser.id === userId) {
      return {
        success: false,
        error: "Action blocked: You cannot delete your own active administrator account.",
      };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return { success: false, error: "User not found." };
    }

    // Safety Guard: Do not delete last admin
    if (targetUser.role === "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN" },
      });
      if (adminCount <= 1) {
        return {
          success: false,
          error: "Action blocked: Cannot delete the last administrator in the system.",
        };
      }
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    safeRevalidatePath("/admin");

    return {
      success: true,
      message: `User '${targetUser.name}' removed from the system.`,
    };
  } catch (error) {
    console.error("deleteUserAction error:", error);
    return {
      success: false,
      error: sanitizeServerError(error, "Failed to delete user."),
    };
  }
}
