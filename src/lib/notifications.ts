import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";
import {
  publishToChannel,
  subscribeToChannel,
  type PubSubNotificationMessage,
} from "@/lib/redis-pubsub";

export {
  subscribeToChannel,
  isRedisActive,
  notificationEmitter,
} from "@/lib/redis-pubsub";
export type { PubSubNotificationMessage } from "@/lib/redis-pubsub";

export interface NotificationPayload {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: NotificationType;
  targetRole?: "ALL" | "USER" | "ADMIN";
  isRead?: boolean;
  reservationId?: string | null;
  createdAt: string;
}

/**
 * Creates an automated personal notification in PostgreSQL and broadcasts it in real-time
 * via Redis Pub/Sub on the channel `notifications:user:${userId}`.
 */
export async function createAndDispatchNotification({
  userId,
  title,
  message,
  type = "SYSTEM",
  reservationId,
}: {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  reservationId?: string;
}): Promise<NotificationPayload | null> {
  try {
    const record = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        reservationId: reservationId || null,
      },
    });

    const payload: NotificationPayload = {
      id: record.id,
      userId: record.userId,
      title: record.title,
      message: record.message,
      type: record.type,
      isRead: record.isRead,
      reservationId: record.reservationId,
      createdAt: record.createdAt.toISOString(),
    };

    // Real-Time dispatch across Redis Pub/Sub user channel
    await publishToChannel(`notifications:user:${userId}`, payload);
    await publishToChannel(`user:${userId}`, payload);
    return payload;
  } catch (error) {
    console.error("Failed to create/dispatch notification:", error);
    return null;
  }
}

/**
 * Sends a targeted broadcast notification to a specific group of users (ALL, USER, or ADMIN).
 * Saves to PostgreSQL and publishes via Redis Pub/Sub on `notifications:broadcast:${targetRole}`.
 */
export async function createAndDispatchBroadcastNotification({
  title,
  message,
  targetRole = "ALL",
  type = "SYSTEM",
}: {
  title: string;
  message: string;
  targetRole?: "ALL" | "USER" | "ADMIN";
  type?: NotificationType;
}): Promise<NotificationPayload | null> {
  try {
    const whereClause =
      targetRole === "ALL" ? {} : { role: targetRole as "USER" | "ADMIN" };

    const targetUsers = await prisma.user.findMany({
      where: whereClause,
      select: { id: true },
    });

    if (targetUsers.length > 0) {
      await prisma.notification.createMany({
        data: targetUsers.map((u) => ({
          userId: u.id,
          title,
          message,
          type,
        })),
      });
    }

    const payload: NotificationPayload = {
      id: `broadcast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title,
      message,
      type,
      targetRole,
      createdAt: new Date().toISOString(),
    };

    // Publish to targeted broadcast channel
    await publishToChannel(`notifications:broadcast:${targetRole}`, payload);
    return payload;
  } catch (error) {
    console.error("Failed to create/dispatch broadcast notification:", error);
    return null;
  }
}

/**
 * Dispatches notification to all system administrators (e.g. for pending approval requests).
 */
export async function dispatchNotificationToAdmins({
  title,
  message,
  type = "BOOKING_CREATED",
  reservationId,
}: {
  title: string;
  message: string;
  type?: NotificationType;
  reservationId?: string;
}) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    for (const admin of admins) {
      await createAndDispatchNotification({
        userId: admin.id,
        title,
        message,
        type,
        reservationId,
      });
    }
  } catch (error) {
    console.error("Failed to dispatch admin notification:", error);
  }
}
