"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ReservationStatus } from "@prisma/client";

export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

/**
 * Creates a new reservation with robust double-booking conflict detection.
 * Enforces business rules outlined in the PrimeWave Lab technical assessment.
 */
export async function createReservationAction(formData: {
  resourceId: string;
  title: string;
  description?: string;
  startDateTime: string; // ISO string
  endDateTime: string;   // ISO string
}): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required to place reservations." };
    }

    const { resourceId, title, description, startDateTime, endDateTime } = formData;

    if (!title || !title.trim()) {
      return { success: false, error: "Reservation title or purpose is required." };
    }

    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { success: false, error: "Invalid date or time provided." };
    }

    if (start >= end) {
      return { success: false, error: "Reservation end time must be after the start time." };
    }

    if (start < new Date(now.getTime() - 5 * 60 * 1000)) {
      return { success: false, error: "Cannot create a reservation in the past." };
    }

    // Verify target resource exists and is operational
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      return { success: false, error: "Resource not found." };
    }

    if (resource.status !== "AVAILABLE") {
      return {
        success: false,
        error: `Resource is currently ${resource.status.toLowerCase()} and cannot be booked.`,
      };
    }

    // -------------------------------------------------------------------------
    // CRITICAL REQUIREMENT: Double-Booking & Conflict Detection
    // Check if an overlapping reservation already exists that is PENDING or APPROVED
    // Condition: existing.startTime < new.endTime AND existing.endTime > new.startTime
    // -------------------------------------------------------------------------
    const conflictingBooking = await prisma.reservation.findFirst({
      where: {
        resourceId,
        status: { in: [ReservationStatus.APPROVED, ReservationStatus.PENDING] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
      include: {
        user: { select: { name: true } },
      },
    });

    if (conflictingBooking) {
      const conflictStart = conflictingBooking.startTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const conflictEnd = conflictingBooking.endTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const conflictDate = conflictingBooking.startTime.toLocaleDateString();

      return {
        success: false,
        error: `Schedule Conflict: This resource is already booked on ${conflictDate} from ${conflictStart} to ${conflictEnd}. Please select another time window.`,
      };
    }

    // High-demand items requiring approval start in PENDING, otherwise APPROVED
    const initialStatus = resource.requiresApproval
      ? ReservationStatus.PENDING
      : ReservationStatus.APPROVED;

    const reservation = await prisma.reservation.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        startTime: start,
        endTime: end,
        status: initialStatus,
        userId: user.id,
        resourceId,
      },
    });

    revalidatePath("/");
    revalidatePath("/reservations");
    revalidatePath("/admin");

    return {
      success: true,
      message: resource.requiresApproval
        ? "Reservation submitted and is pending administrator review."
        : "Reservation confirmed successfully!",
      data: reservation,
    };
  } catch (error: unknown) {
    const errString = error instanceof Error ? error.message : String(error);

    // Detect PostgreSQL exclusion constraint violation (code 23P01)
    if (
      errString.includes("no_overlapping_active_reservations") ||
      errString.includes("exclusion constraint") ||
      errString.includes("23P01")
    ) {
      return {
        success: false,
        error:
          "Schedule Conflict: A simultaneous booking was confirmed for this overlapping time slot. Please select another time window.",
      };
    }

    console.error("createReservationAction error:", error);
    return {
      success: false,
      error: "An unexpected server error occurred while creating your reservation.",
    };
  }
}

/**
 * Cancels a reservation by the owner or an administrator.
 */
export async function cancelReservationAction(reservationId: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required." };
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      return { success: false, error: "Reservation not found." };
    }

    // Only owner or admin can cancel
    if (reservation.userId !== user.id && user.role !== "ADMIN") {
      return { success: false, error: "Not authorized to cancel this reservation." };
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      return { success: false, error: "Reservation is already cancelled." };
    }

    await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.CANCELLED },
    });

    revalidatePath("/");
    revalidatePath("/reservations");
    revalidatePath("/admin");

    return { success: true, message: "Reservation cancelled successfully." };
  } catch (error) {
    console.error("cancelReservationAction error:", error);
    return { success: false, error: "Failed to cancel reservation." };
  }
}

/**
 * Administrator action to approve or reject a pending reservation.
 */
export async function updateReservationStatusAction({
  reservationId,
  status,
  rejectionReason,
}: {
  reservationId: string;
  status: ReservationStatus;
  rejectionReason?: string;
}): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return { success: false, error: "Administrator privileges required." };
    }

    const targetReservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!targetReservation) {
      return { success: false, error: "Reservation not found." };
    }

    if (targetReservation.status !== ReservationStatus.PENDING) {
      return {
        success: false,
        error: `Cannot update reservation: it is already ${targetReservation.status.toLowerCase()}.`,
      };
    }

    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status,
        rejectionReason: status === ReservationStatus.REJECTED ? rejectionReason : null,
      },
    });

    revalidatePath("/");
    revalidatePath("/reservations");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Reservation marked as ${status.toLowerCase()}.`,
    };
  } catch (error) {
    console.error("updateReservationStatusAction error:", error);
    return { success: false, error: "Failed to update reservation status." };
  }
}
