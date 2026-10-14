import { z } from "zod";
import { ReservationStatus, ResourceStatus } from "@prisma/client";

/**
 * Zod Runtime Validation Schemas for Server Mutations
 * Enforces strict boundary checks on all inputs, eliminating blind trust of browser forms.
 */

// ----------------------------------------------------
// RESERVATION SCHEMAS
// ----------------------------------------------------

export const createReservationSchema = z
  .object({
    resourceId: z
      .string()
      .trim()
      .min(1, "Resource identifier cannot be empty")
      .max(64, "Resource identifier is too long"),
    title: z
      .string()
      .trim()
      .min(3, "Reservation title must be at least 3 characters")
      .max(100, "Reservation title cannot exceed 100 characters"),
    description: z
      .string()
      .trim()
      .max(500, "Description cannot exceed 500 characters")
      .optional()
      .nullable(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must follow YYYY-MM-DD format")
      .optional(),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Start time must follow HH:mm format")
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must follow YYYY-MM-DD format")
      .optional(),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "End time must follow HH:mm format")
      .optional(),
    startDateTime: z.string().optional(),
    endDateTime: z.string().optional(),
  })
  .refine(
    (data) => {
      const hasSplitTimes = Boolean(data.startDate && data.startTime && data.endTime);
      const hasIsoTimes = Boolean(data.startDateTime && data.endDateTime);
      return hasSplitTimes || hasIsoTimes;
    },
    {
      message: "Please specify both start and end times for the reservation",
      path: ["startTime"],
    }
  );

export const editReservationSchema = z.object({
  reservationId: z
    .string()
    .trim()
    .min(1, "Reservation identifier cannot be empty")
    .max(64, "Reservation identifier is too long"),
  title: z
    .string()
    .trim()
    .min(3, "Reservation title must be at least 3 characters")
    .max(100, "Reservation title cannot exceed 100 characters")
    .optional(),
  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .nullable(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must follow YYYY-MM-DD format")
    .optional(),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Start time must follow HH:mm format")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must follow YYYY-MM-DD format")
    .optional(),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "End time must follow HH:mm format")
    .optional(),
  startDateTime: z.string().optional(),
  endDateTime: z.string().optional(),
});

export const cancelReservationSchema = z.object({
  reservationId: z
    .string()
    .trim()
    .min(1, "Reservation identifier cannot be empty")
    .max(64, "Reservation identifier is too long"),
});

export const updateReservationStatusSchema = z
  .object({
    reservationId: z
      .string()
      .trim()
      .min(1, "Reservation identifier cannot be empty")
      .max(64, "Reservation identifier is too long"),
    status: z.enum([ReservationStatus.APPROVED, ReservationStatus.REJECTED], {
      message: "Target status must be either APPROVED or REJECTED",
    }),
    rejectionReason: z
      .string()
      .trim()
      .max(500, "Rejection reason cannot exceed 500 characters")
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      if (data.status === ReservationStatus.REJECTED) {
        return Boolean(data.rejectionReason && data.rejectionReason.trim().length >= 5);
      }
      return true;
    },
    {
      message:
        "A descriptive rejection reason (minimum 5 characters) is required when rejecting a reservation",
      path: ["rejectionReason"],
    }
  );

// ----------------------------------------------------
// RESOURCE SCHEMAS
// ----------------------------------------------------

export const createResourceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Resource name must be at least 2 characters")
    .max(100, "Resource name cannot exceed 100 characters"),
  description: z
    .string()
    .trim()
    .max(1000, "Description cannot exceed 1,000 characters")
    .optional()
    .nullable(),
  location: z
    .string()
    .trim()
    .max(100, "Location cannot exceed 100 characters")
    .optional()
    .nullable(),
  capacity: z.coerce
    .number()
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1 person / unit")
    .max(10000, "Capacity cannot exceed 10,000"),
  categoryId: z
    .string()
    .trim()
    .min(1, "Category selection is required")
    .max(64, "Category identifier is too long"),
  requiresApproval: z.boolean().default(false),
  imageUrl: z
    .string()
    .trim()
    .max(500, "Image URL is too long")
    .optional()
    .nullable(),
});

export const updateResourceStatusSchema = z.object({
  resourceId: z
    .string()
    .trim()
    .min(1, "Resource identifier cannot be empty")
    .max(64, "Resource identifier is too long"),
  status: z.enum(
    [
      ResourceStatus.AVAILABLE,
      ResourceStatus.MAINTENANCE,
      ResourceStatus.DECOMMISSIONED,
    ],
    {
      message:
        "Invalid status enum value. Must be AVAILABLE, MAINTENANCE, or DECOMMISSIONED",
    }
  ),
});

// ----------------------------------------------------
// AUTH SCHEMAS
// ----------------------------------------------------

export const switchUserSchema = z.object({
  personaKey: z.enum(["INTERN", "ADMIN"], {
    message: "Invalid persona requested. Privilege escalation blocked.",
  }),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password cannot exceed 100 characters"),
  role: z.enum(["USER", "ADMIN"], {
    message: "Role must be USER or ADMIN",
  }),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserRoleSchema = z.object({
  userId: z.string().trim().min(1, "User ID cannot be empty"),
  role: z.enum(["USER", "ADMIN"], {
    message: "Role must be USER or ADMIN",
  }),
});
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const deleteUserSchema = z.object({
  userId: z.string().trim().min(1, "User ID cannot be empty"),
});
export type DeleteUserInput = z.infer<typeof deleteUserSchema>;

// ----------------------------------------------------
// PASSWORD VALIDATION SCHEMAS
// ----------------------------------------------------

export const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(100, "Password cannot exceed 100 characters")
  .refine((val) => /[A-Z]/.test(val), {
    message: "Password must contain at least one uppercase letter (A-Z)",
  })
  .refine((val) => /[a-z]/.test(val), {
    message: "Password must contain at least one lowercase letter (a-z)",
  })
  .refine((val) => /[0-9]/.test(val), {
    message: "Password must contain at least one number (0-9)",
  })
  .refine((val) => /[^A-Za-z0-9]/.test(val), {
    message: "Password must contain at least one special character (!@#$%^&*...)",
  });

export const changeOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirmation password do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });
export type ChangeOwnPasswordInput = z.infer<typeof changeOwnPasswordSchema>;

export const adminResetUserPasswordSchema = z.object({
  targetUserId: z.string().trim().min(1, "Target user ID cannot be empty"),
  newPassword: strongPasswordSchema,
});
export type AdminResetUserPasswordInput = z.infer<typeof adminResetUserPasswordSchema>;

// ----------------------------------------------------
// SAFE ERROR UTILITIES
// ----------------------------------------------------

/**
 * Extracts a concise, user-friendly error message from a ZodError
 */
export function formatZodError(error: z.ZodError): string {
  const firstIssue = error.issues[0];
  if (firstIssue) {
    return firstIssue.message;
  }
  return "Input validation failed. Please review your entries.";
}

/**
 * Sanitizes server exceptions to ensure no stack traces, SQL internals,
 * database connection strings, or system paths leak to the client.
 */
export function sanitizeServerError(
  error: unknown,
  fallbackMessage: string
): string {
  if (error instanceof z.ZodError) {
    return formatZodError(error);
  }

  const errString = error instanceof Error ? error.message : String(error);

  // Surface known safe domain / PostgreSQL errors with friendly explanations
  if (
    errString.includes("no_overlapping_active_reservations") ||
    errString.includes("exclusion constraint") ||
    errString.includes("23P01")
  ) {
    return "Schedule Conflict: A simultaneous booking was confirmed for this overlapping time slot. Please select another time window.";
  }

  if (
    errString.includes("resources_categoryId_name_key") ||
    (errString.includes("Unique constraint") && errString.includes("name"))
  ) {
    return "A resource with this name already exists in the selected category.";
  }

  if (errString.includes("23503") || errString.includes("foreign key constraint")) {
    return "This category cannot be deleted because resources are currently assigned to it.";
  }

  // Do not expose stack traces or raw database exceptions
  return fallbackMessage;
}
