import { ReservationStatus } from "@prisma/client";

/**
 * Explicit Reservation State Machine Definition
 * 
 * State Transition Matrix:
 * ┌───────────────┬────────────────────────────────────────────┐
 * │ Current State │ Permitted Next States                      │
 * ├───────────────┼────────────────────────────────────────────┤
 * │ PENDING       │ APPROVED, REJECTED, CANCELLED              │
 * │ APPROVED      │ CANCELLED, COMPLETED                       │
 * │ REJECTED      │ None (Terminal State)                      │
 * │ CANCELLED     │ None (Terminal State)                      │
 * │ COMPLETED     │ None (Terminal State)                      │
 * └───────────────┴────────────────────────────────────────────┘
 * 
 * Rules:
 * 1. PENDING reservations hold a provisional availability lock.
 * 2. Only PENDING requests can be APPROVED or REJECTED by an Administrator.
 * 3. REJECTED requires a non-empty explanation (minimum 5 characters).
 * 4. PENDING and APPROVED requests can be CANCELLED by the owner or an admin
 *    before the reservation window concludes.
 * 5. Completed reservations (where endTime has passed) cannot be cancelled or altered.
 * 6. REJECTED, CANCELLED, and COMPLETED are terminal states.
 */

export const PERMITTED_RESERVATION_TRANSITIONS: Record<
  ReservationStatus,
  readonly ReservationStatus[]
> = {
  [ReservationStatus.PENDING]: [
    ReservationStatus.APPROVED,
    ReservationStatus.REJECTED,
    ReservationStatus.CANCELLED,
  ],
  [ReservationStatus.APPROVED]: [
    ReservationStatus.CANCELLED,
    ReservationStatus.COMPLETED,
  ],
  [ReservationStatus.REJECTED]: [],  // Terminal
  [ReservationStatus.CANCELLED]: [], // Terminal
  [ReservationStatus.COMPLETED]: [], // Terminal
} as const;

export function canTransitionReservation(
  from: ReservationStatus,
  to: ReservationStatus
): { allowed: boolean; reason?: string } {
  if (from === to) {
    return {
      allowed: false,
      reason: `Reservation is already in ${from.toLowerCase()} status.`,
    };
  }

  const allowedNext = PERMITTED_RESERVATION_TRANSITIONS[from];
  if (!allowedNext || !allowedNext.includes(to)) {
    const nextListStr =
      allowedNext && allowedNext.length > 0
        ? allowedNext.join(", ")
        : "None (Terminal state)";
    return {
      allowed: false,
      reason: `Illegal state transition: Cannot transition reservation from ${from} to ${to}. Permitted next status: [${nextListStr}].`,
    };
  }

  return { allowed: true };
}
