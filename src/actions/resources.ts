"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ResourceStatus } from "@prisma/client";
import { ActionResult } from "./reservations";

export async function createResourceAction(formData: {
  name: string;
  description?: string;
  location?: string;
  capacity: number;
  categoryId: string;
  requiresApproval: boolean;
}): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return { success: false, error: "Administrator privileges required to create resources." };
    }

    const { name, description, location, capacity, categoryId, requiresApproval } = formData;

    if (!name || !name.trim()) {
      return { success: false, error: "Resource name is required." };
    }

    if (!categoryId) {
      return { success: false, error: "Category selection is required." };
    }

    const newResource = await prisma.resource.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        location: location?.trim() || null,
        capacity: Number(capacity) || 1,
        categoryId,
        requiresApproval: Boolean(requiresApproval),
        status: ResourceStatus.AVAILABLE,
      },
    });

    revalidatePath("/");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Resource "${newResource.name}" created successfully.`,
      data: newResource,
    };
  } catch (error) {
    console.error("createResourceAction error:", error);
    return { success: false, error: "Failed to create resource." };
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

    await prisma.resource.update({
      where: { id: resourceId },
      data: { status },
    });

    revalidatePath("/");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Resource status updated to ${status.toLowerCase()}.`,
    };
  } catch (error) {
    console.error("updateResourceStatusAction error:", error);
    return { success: false, error: "Failed to update resource status." };
  }
}
