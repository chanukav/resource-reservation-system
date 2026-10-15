"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeServerError } from "@/lib/validations";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Fetches notifications and unread count for the currently authenticated user.
 */
export async function getNotificationsAction(): Promise<
  ActionResult<{ notifications: any[]; unreadCount: number }>
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required." };
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      prisma.notification.count({
        where: { userId: user.id, isRead: false },
      }),
    ]);

    return {
      success: true,
      data: {
        notifications: notifications.map((n) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        })),
        unreadCount,
      },
    };
  } catch (error) {
    console.error("getNotificationsAction error:", error);
    return {
      success: false,
      error: sanitizeServerError(error, "Failed to load notifications."),
    };
  }
}

/**
 * Marks a specific notification as read.
 */
export async function markNotificationAsReadAction(
  notificationId: string
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required." };
    }

    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: user.id,
      },
      data: {
        isRead: true,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("markNotificationAsReadAction error:", error);
    return {
      success: false,
      error: sanitizeServerError(error, "Failed to mark notification as read."),
    };
  }
}

/**
 * Marks all notifications for the current user as read.
 */
export async function markAllNotificationsAsReadAction(): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required." };
    }

    await prisma.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return { success: true, message: "All notifications marked as read." };
  } catch (error) {
    console.error("markAllNotificationsAsReadAction error:", error);
    return {
      success: false,
      error: sanitizeServerError(error, "Failed to mark all as read."),
    };
  }
}

/**
 * Clears/deletes all notifications for the current user.
 */
export async function clearAllNotificationsAction(): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required." };
    }

    await prisma.notification.deleteMany({
      where: {
        userId: user.id,
      },
    });

    return { success: true, message: "Notification inbox cleared." };
  } catch (error) {
    console.error("clearAllNotificationsAction error:", error);
    return {
      success: false,
      error: sanitizeServerError(error, "Failed to clear notifications."),
    };
  }
}

/**
 * Dispatches an automated targeted broadcast alert via Redis Pub/Sub.
 * Enforces strict administrator role verification.
 */
export async function broadcastNotificationAction({
  title,
  message,
  targetRole = "ALL",
  type = "SYSTEM",
}: {
  title: string;
  message: string;
  targetRole?: "ALL" | "USER" | "ADMIN";
  type?: "SYSTEM" | "APPROVAL" | "REJECTION" | "BOOKING_CREATED";
}): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return {
        success: false,
        error: "Administrator authorization required to broadcast alerts.",
      };
    }

    if (!title || title.trim().length < 3) {
      return {
        success: false,
        error: "Broadcast title must be at least 3 characters.",
      };
    }

    if (!message || message.trim().length < 5) {
      return {
        success: false,
        error: "Broadcast message must be at least 5 characters.",
      };
    }

    const { createAndDispatchBroadcastNotification } = await import(
      "@/lib/notifications"
    );

    const payload = await createAndDispatchBroadcastNotification({
      title: title.trim(),
      message: message.trim(),
      targetRole,
      type,
    });

    if (!payload) {
      return { success: false, error: "Failed to broadcast notification." };
    }

    return {
      success: true,
      message: `Broadcast successfully dispatched to ${
        targetRole === "ALL" ? "all campus users" : `${targetRole}s`
      } via Redis Pub/Sub.`,
      data: payload,
    };
  } catch (error) {
    console.error("broadcastNotificationAction error:", error);
    return {
      success: false,
      error: sanitizeServerError(error, "Failed to dispatch broadcast alert."),
    };
  }
}

