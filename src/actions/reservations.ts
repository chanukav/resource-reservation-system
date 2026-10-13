"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ReservationStatus } from "@prisma/client";
import {
  parseOrgDateTimeRange,
  validateReservationTiming,
  formatOrgDate,
  formatOrgTimeRange,
} from "@/lib/date-utils";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Non-fatal when called outside request context (e.g. CLI test runner)
  }
}

export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

export type CreateReservationInput = {
  resourceId: string;
  title: string;
  description?: string;
  startDateTime?: string; // ISO string with or without offset
  endDateTime?: string;   // ISO string with or without offset
  startDate?: string;     // YYYY-MM-DD
  startTime?: string;     // HH:mm
  endDate?: string;       // YYYY-MM-DD (optional, for midnight crossing)
  endTime?: string;       // HH:mm
};

export type EditReservationInput = {
  reservationId: string;
  title?: string;
  description?: string;
  startDateTime?: string;
  endDateTime?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
};

/**
 * Creates a new reservation with robust double-booking conflict detection,
 * strict organizational timezone guarantees (Asia/Colombo), and concurrency safety.
 */
export async function createReservationAction(formData: CreateReservationInput): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required to place reservations." };
    }

    const { resourceId, title, description } = formData;

    if (!title || !title.trim()) {
      return { success: false, error: "Reservation title or purpose is required." };
    }

    // 1. Resolve start and end instants in Asia/Colombo
    let start: Date;
    let end: Date;

    try {
      if (formData.startDate && formData.startTime && formData.endTime) {
        const parsed = parseOrgDateTimeRange({
          startDate: formData.startDate,
          startTime: formData.startTime,
          endDate: formData.endDate || formData.startDate,
          endTime: formData.endTime,
        });
        start = parsed.start;
        end = parsed.end;
      } else if (formData.startDateTime && formData.endDateTime) {
        start = new Date(formData.startDateTime);
        end = new Date(formData.endDateTime);
      } else {
        return { success: false, error: "Please provide valid reservation date and time." };
      }
    } catch (parseErr) {
      return {
        success: false,
        error: parseErr instanceof Error ? parseErr.message : "Invalid date or time format.",
      };
    }

    // 2. Validate business rules on timings
    const timingValidation = validateReservationTiming(start, end);
    if (!timingValidation.valid) {
      return { success: false, error: timingValidation.error };
    }

    // 3. Verify target resource exists and operational status
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      return { success: false, error: "Resource not found." };
    }

    if (resource.status !== "AVAILABLE") {
      return {
        success: false,
        error: `Resource is currently in ${resource.status} status and cannot be reserved.`,
      };
    }

    // 4. Double-Booking Conflict Detection
    // Query condition: existing.startTime < new.endTime AND existing.endTime > new.startTime
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
      const conflictRange = formatOrgTimeRange(conflictingBooking.startTime, conflictingBooking.endTime);
      const conflictDate = formatOrgDate(conflictingBooking.startTime);

      return {
        success: false,
        error: `Schedule Conflict: This resource is already booked on ${conflictDate} (${conflictRange}). Please select another time window.`,
      };
    }

    // 5. High-demand items requiring approval start in PENDING, otherwise APPROVED
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

    safeRevalidatePath("/");
    safeRevalidatePath("/reservations");
    safeRevalidatePath("/admin");

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
 * Updates / edits an existing reservation with the exact same business rules,
 * concurrency protections, and conflict detection as creation.
 */
export async function editReservationAction(formData: EditReservationInput): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required to modify reservations." };
    }

    const { reservationId } = formData;
    if (!reservationId) {
      return { success: false, error: "Reservation ID is required." };
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { resource: true },
    });

    if (!reservation) {
      return { success: false, error: "Reservation not found." };
    }

    // Only owner or admin can edit
    if (reservation.userId !== user.id && user.role !== "ADMIN") {
      return { success: false, error: "Not authorized to modify this reservation." };
    }

    if (
      reservation.status === ReservationStatus.CANCELLED ||
      reservation.status === ReservationStatus.REJECTED
    ) {
      return {
        success: false,
        error: `Cannot modify a reservation that is ${reservation.status.toLowerCase()}.`,
      };
    }

    if (reservation.resource.status !== "AVAILABLE") {
      return {
        success: false,
        error: `Resource is currently in ${reservation.resource.status} status and cannot be modified.`,
      };
    }

    // Resolve updated start and end times
    let start = reservation.startTime;
    let end = reservation.endTime;

    if (formData.startDate && formData.startTime && formData.endTime) {
      const parsed = parseOrgDateTimeRange({
        startDate: formData.startDate,
        startTime: formData.startTime,
        endDate: formData.endDate || formData.startDate,
        endTime: formData.endTime,
      });
      start = parsed.start;
      end = parsed.end;
    } else if (formData.startDateTime && formData.endDateTime) {
      start = new Date(formData.startDateTime);
      end = new Date(formData.endDateTime);
    }

    // Validate business timing
    const timingValidation = validateReservationTiming(start, end);
    if (!timingValidation.valid) {
      return { success: false, error: timingValidation.error };
    }

    // Check for conflicts with other reservations (excluding this one)
    const conflictingBooking = await prisma.reservation.findFirst({
      where: {
        resourceId: reservation.resourceId,
        id: { not: reservation.id },
        status: { in: [ReservationStatus.APPROVED, ReservationStatus.PENDING] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    if (conflictingBooking) {
      const conflictRange = formatOrgTimeRange(conflictingBooking.startTime, conflictingBooking.endTime);
      const conflictDate = formatOrgDate(conflictingBooking.startTime);

      return {
        success: false,
        error: `Schedule Conflict: This resource is already booked on ${conflictDate} (${conflictRange}). Please select another time window.`,
      };
    }

    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        title: formData.title?.trim() ?? reservation.title,
        description:
          formData.description !== undefined
            ? formData.description.trim() || null
            : reservation.description,
        startTime: start,
        endTime: end,
      },
    });

    safeRevalidatePath("/");
    safeRevalidatePath("/reservations");
    safeRevalidatePath("/admin");

    return {
      success: true,
      message: "Reservation modified successfully!",
      data: updated,
    };
  } catch (error: unknown) {
    const errString = error instanceof Error ? error.message : String(error);

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

    console.error("editReservationAction error:", error);
    return { success: false, error: "Failed to update reservation." };
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

    safeRevalidatePath("/");
    safeRevalidatePath("/reservations");
    safeRevalidatePath("/admin");

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

    safeRevalidatePath("/");
    safeRevalidatePath("/reservations");
    safeRevalidatePath("/admin");

    return {
      success: true,
      message: `Reservation marked as ${status.toLowerCase()}.`,
    };
  } catch (error) {
    console.error("updateReservationStatusAction error:", error);
    return { success: false, error: "Failed to update reservation status." };
  }
}
