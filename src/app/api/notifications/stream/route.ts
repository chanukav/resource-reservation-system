export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  subscribeToChannel,
  type PubSubNotificationMessage,
} from "@/lib/redis-pubsub";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = user.id;
  const userRole = user.role;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection handshake with user context & Redis status
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({
            status: "connected",
            userId,
            role: userRole,
            channels: [
              `notifications:user:${userId}`,
              `notifications:broadcast:ALL`,
              `notifications:broadcast:${userRole}`,
            ],
          })}\n\n`
        )
      );

      // Heartbeat ping every 25 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`event: ping\ndata: ${Date.now()}\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25000);

      // Common notification emitter to SSE stream
      const onNotification = (payload: PubSubNotificationMessage) => {
        try {
          controller.enqueue(
            encoder.encode(
              `event: notification\ndata: ${JSON.stringify(payload)}\n\n`
            )
          );
        } catch (err) {
          console.error("[SSE Stream] Error streaming notification:", err);
        }
      };

      // 1. Subscribe to User-Targeted Channel via Redis Pub/Sub
      const unsubUser = subscribeToChannel(
        `notifications:user:${userId}`,
        onNotification
      );

      // 2. Subscribe to Global Targeted Broadcast Channel (ALL users)
      const unsubAllBroadcast = subscribeToChannel(
        "notifications:broadcast:ALL",
        onNotification
      );

      // 3. Subscribe to Role-Targeted Broadcast Channel (USER or ADMIN)
      const unsubRoleBroadcast = subscribeToChannel(
        `notifications:broadcast:${userRole}`,
        onNotification
      );

      // Handle connection teardown and cleanup Redis subscribers
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubUser();
        unsubAllBroadcast();
        unsubRoleBroadcast();
        try {
          controller.close();
        } catch {
          // Stream already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
