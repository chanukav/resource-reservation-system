/**
 * Centralized Date, Time, and Organizational Timezone Utilities
 * 
 * Explicit Guarantees for PrimeWave Lab Technical Assessment:
 * 1. Authoritative Organization Time Zone: "Asia/Colombo" (UTC+05:30).
 * 2. Unambiguous Instant Conversion: Client date/time strings (e.g. "2026-10-15", "10:00")
 *    are explicitly parsed with the organization offset (+05:30) to eliminate
 *    browser-server locale drift.
 * 3. PostgreSQL TIMESTAMPTZ(3) Storage: All instants represent exact global timestamps.
 * 4. Business Timing Validation:
 *    - End time must be strictly after start time (endTime > startTime).
 *    - Minimum booking duration: 15 minutes.
 *    - Maximum booking duration: 24 hours per single reservation.
 *    - Strict prohibition of bookings in the past (with a 2-minute latency grace period).
 *    - Maximum booking horizon: 90 days in advance.
 *    - Clean handling of midnight-crossing bookings (e.g. 23:00 to 01:00 next day).
 * 5. Consistent Organizational Timezone Rendering: Evaluator displays always reflect
 *    Asia/Colombo time, regardless of what timezone the client machine is running.
 */

export const ORGANIZATION_TIMEZONE = "Asia/Colombo";
export const ORGANIZATION_OFFSET = "+05:30";

export const MIN_BOOKING_DURATION_MINUTES = 15;
export const MAX_BOOKING_DURATION_HOURS = 24;
export const MAX_BOOKING_HORIZON_DAYS = 90;
export const PAST_BOOKING_BUFFER_MINUTES = 2; // Grace period for network submit latency

/**
 * Validates whether a string matches YYYY-MM-DD
 */
export function isValidDateString(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

/**
 * Validates whether a string matches HH:mm (or HH:mm:ss) in 24h format
 */
export function isValidTimeString(timeStr: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(timeStr);
}

/**
 * Parses date ("YYYY-MM-DD") and time ("HH:mm") into a Date object representing
 * the exact instant in the organization's timezone (Asia/Colombo / UTC+05:30).
 */
export function parseOrgDateTime(dateStr: string, timeStr: string): Date {
  if (!isValidDateString(dateStr)) {
    throw new Error(`Invalid date format '${dateStr}'. Expected YYYY-MM-DD.`);
  }

  if (!isValidTimeString(timeStr)) {
    throw new Error(`Invalid time format '${timeStr}'. Expected HH:mm in 24-hour time.`);
  }

  const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  const isoStringWithOffset = `${dateStr}T${normalizedTime}${ORGANIZATION_OFFSET}`;
  
  const parsed = new Date(isoStringWithOffset);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Could not parse instant from '${isoStringWithOffset}'.`);
  }

  return parsed;
}

/**
 * Parses a reservation time range, supporting same-day bookings as well as
 * midnight-crossing reservations (when endDate is specified).
 */
export function parseOrgDateTimeRange(params: {
  startDate: string;
  startTime: string;
  endDate?: string;
  endTime: string;
}): { start: Date; end: Date } {
  const { startDate, startTime, endDate = startDate, endTime } = params;

  const start = parseOrgDateTime(startDate, startTime);
  const end = parseOrgDateTime(endDate, endTime);

  return { start, end };
}

/**
 * Validates business rules for reservation timing.
 */
export function validateReservationTiming(
  start: Date,
  end: Date,
  referenceNow: Date = new Date()
): { valid: boolean; error?: string } {
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: "Invalid reservation dates or times provided." };
  }

  // 1. End must be after start
  if (end.getTime() <= start.getTime()) {
    return {
      valid: false,
      error: "Reservation end time must be strictly after the start time.",
    };
  }

  // 2. Minimum booking duration
  const durationMs = end.getTime() - start.getTime();
  const minDurationMs = MIN_BOOKING_DURATION_MINUTES * 60 * 1000;
  if (durationMs < minDurationMs) {
    return {
      valid: false,
      error: `Reservation duration must be at least ${MIN_BOOKING_DURATION_MINUTES} minutes.`,
    };
  }

  // 3. Maximum booking duration
  const maxDurationMs = MAX_BOOKING_DURATION_HOURS * 60 * 60 * 1000;
  if (durationMs > maxDurationMs) {
    return {
      valid: false,
      error: `A single reservation cannot exceed ${MAX_BOOKING_DURATION_HOURS} hours. For extended reservations, contact the Platform Administrator.`,
    };
  }

  // 4. Past bookings prohibited
  const earliestAllowedTime = referenceNow.getTime() - PAST_BOOKING_BUFFER_MINUTES * 60 * 1000;
  if (start.getTime() < earliestAllowedTime) {
    return {
      valid: false,
      error: "Cannot create a reservation in the past. Please select an upcoming date and time.",
    };
  }

  // 5. Booking horizon limit
  const maxAllowedHorizon = referenceNow.getTime() + MAX_BOOKING_HORIZON_DAYS * 24 * 60 * 60 * 1000;
  if (start.getTime() > maxAllowedHorizon) {
    return {
      valid: false,
      error: `Reservations cannot be made more than ${MAX_BOOKING_HORIZON_DAYS} days in advance.`,
    };
  }

  return { valid: true };
}

/**
 * Formats a date into a human-readable string in Asia/Colombo.
 * e.g. "Thu, Oct 15, 2026"
 */
export function formatOrgDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return "Invalid Date";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: ORGANIZATION_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  };

  return new Intl.DateTimeFormat("en-US", { ...defaultOptions, ...options }).format(d);
}

/**
 * Formats a time into a 12-hour string with AM/PM in Asia/Colombo.
 * e.g. "10:00 AM"
 */
export function formatOrgTime(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return "Invalid Time";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: ORGANIZATION_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };

  return new Intl.DateTimeFormat("en-US", { ...defaultOptions, ...options }).format(d);
}

/**
 * Formats date and time with explicit organizational timezone label.
 * e.g. "Oct 15, 2026, 10:00 AM (Asia/Colombo)"
 */
export function formatOrgDateTime(date: Date | string | number): string {
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return "Invalid Date";

  const dateStr = formatOrgDate(d, { weekday: undefined, year: "numeric", month: "short", day: "numeric" });
  const timeStr = formatOrgTime(d);
  return `${dateStr}, ${timeStr} (${ORGANIZATION_TIMEZONE})`;
}

/**
 * Formats a start and end range for reservations, properly indicating if the
 * reservation crosses into another day.
 */
export function formatOrgTimeRange(
  start: Date | string | number,
  end: Date | string | number
): string {
  const s = typeof start === "object" ? start : new Date(start);
  const e = typeof end === "object" ? end : new Date(end);

  const startDateStr = formatOrgDate(s, { weekday: undefined, year: "numeric", month: "numeric", day: "numeric" });
  const endDateStr = formatOrgDate(e, { weekday: undefined, year: "numeric", month: "numeric", day: "numeric" });

  const startTimeStr = formatOrgTime(s);
  const endTimeStr = formatOrgTime(e);

  if (startDateStr === endDateStr) {
    return `${startTimeStr} – ${endTimeStr}`;
  } else {
    const sDateBrief = formatOrgDate(s, { weekday: undefined, month: "short", day: "numeric" });
    const eDateBrief = formatOrgDate(e, { weekday: undefined, month: "short", day: "numeric" });
    return `${sDateBrief} ${startTimeStr} – ${eDateBrief} ${endTimeStr}`;
  }
}

/**
 * Formats a Date or timestamp string into YYYY-MM-DD in the organization timezone (Asia/Colombo).
 * e.g. "2026-10-15"
 */
export function formatOrgDateYYYYMMDD(date: Date | string | number): string {
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ORGANIZATION_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

