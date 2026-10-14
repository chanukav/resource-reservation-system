"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ResourceStatus } from "@prisma/client";
import { ActionResult } from "./reservations";
import {
  createResourceSchema,
  updateResourceStatusSchema,
  formatZodError,
  sanitizeServerError,
} from "@/lib/validations";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore when executed in test runner outside request scope
  }
}

export async function createResourceAction(formData: {
  name: string;
  description?: string;
  location?: string;
  capacity: number;
  categoryId: string;
  requiresApproval: boolean;
  imageUrl?: string;
}): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return { success: false, error: "Administrator privileges required to create resources." };
    }

    // 1. Runtime schema validation with Zod
    const parsed = createResourceSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: formatZodError(parsed.error) };
    }
    const validatedData = parsed.data;

    // 2. Verify parent category exists
    const category = await prisma.resourceCategory.findUnique({
      where: { id: validatedData.categoryId },
    });
    if (!category) {
      return { success: false, error: "Selected category does not exist." };
    }

    const newResource = await prisma.resource.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        location: validatedData.location || null,
        capacity: validatedData.capacity,
        categoryId: validatedData.categoryId,
        requiresApproval: validatedData.requiresApproval,
        status: ResourceStatus.AVAILABLE,
      },
    });

    safeRevalidatePath("/");
    safeRevalidatePath("/admin");

    return {
      success: true,
      message: `Resource "${newResource.name}" created successfully.`,
      data: newResource,
    };
  } catch (error) {
    console.error("createResourceAction error:", error);
    return {
      success: false,
      error: sanitizeServerError(error, "Failed to create resource."),
    };
  }
}

export async function updateResourceStatusAction(
  resourceId: string,
  status: ResourceStatus
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return { success: false, error: "Administrator privileges required." };
    }

    // 1. Runtime schema validation with Zod
    const parsed = updateResourceStatusSchema.safeParse({ resourceId, status });
    if (!parsed.success) {
      return { success: false, error: formatZodError(parsed.error) };
    }
    const validatedData = parsed.data;

    await prisma.resource.update({
      where: { id: validatedData.resourceId },
      data: { status: validatedData.status },
    });

    safeRevalidatePath("/");
    safeRevalidatePath("/admin");

    return {
      success: true,
      message: `Resource status updated to ${validatedData.status.toLowerCase()}.`,
    };
  } catch (error) {
    console.error("updateResourceStatusAction error:", error);
    return {
      success: false,
      error: sanitizeServerError(error, "Failed to update resource status."),
    };
  }
}
