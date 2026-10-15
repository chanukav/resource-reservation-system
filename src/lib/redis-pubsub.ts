import Redis from "ioredis";
import { EventEmitter } from "events";

export interface PubSubNotificationMessage {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: "APPROVAL" | "REJECTION" | "BOOKING_CREATED" | "SYSTEM";
  targetRole?: "ALL" | "USER" | "ADMIN";
  isRead?: boolean;
  reservationId?: string | null;
  createdAt: string;
}

// Global singletons to prevent multiple client connections in Next.js dev server
const globalPubSub = globalThis as unknown as {
  redisPublisher?: Redis | null;
  redisSubscriber?: Redis | null;
  memoryBus?: EventEmitter;
  isRedisConnected?: boolean;
};

const memoryBus = globalPubSub.memoryBus ?? new EventEmitter();
memoryBus.setMaxListeners(500);

export const notificationEmitter = memoryBus;

if (process.env.NODE_ENV !== "production") {
  globalPubSub.memoryBus = memoryBus;
}

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let publisher: Redis | null = null;
let subscriber: Redis | null = null;
let redisAvailable = false;

try {
  publisher = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) return null; // stop reconnecting after 3 attempts if offline
      return Math.min(times * 200, 1000);
    },
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  subscriber = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 1000);
    },
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  publisher.on("connect", () => {
    redisAvailable = true;
    globalPubSub.isRedisConnected = true;
    console.log(" [Redis PubSub] Connected to Redis Publisher successfully.");
  });

  subscriber.on("connect", () => {
    console.log(" [Redis PubSub] Connected to Redis Subscriber successfully.");
  });

  publisher.on("error", (err) => {
    redisAvailable = false;
    globalPubSub.isRedisConnected = false;
    // Suppress unhandled connection errors when local Redis server is absent
  });

  subscriber.on("error", (err) => {
    redisAvailable = false;
  });

  // Attempt initial connect asynchronously
  publisher.connect().catch(() => {
    redisAvailable = false;
  });
  subscriber.connect().catch(() => {
    redisAvailable = false;
  });
} catch {
  redisAvailable = false;
}

// Handle Redis messages and forward to memory bus subscribers
if (subscriber) {
  subscriber.on("message", (channel, messageStr) => {
    try {
      const data: PubSubNotificationMessage = JSON.parse(messageStr);
      memoryBus.emit(channel, data);
    } catch (err) {
      console.error("[Redis PubSub] Error parsing incoming message:", err);
    }
  });
}

/**
 * Publishes a notification message over Redis Pub/Sub channel.
 * Gracefully mirrors to internal memory bus for seamless zero-dependency fallback.
 */
export async function publishToChannel(
  channel: string,
  payload: PubSubNotificationMessage
): Promise<void> {
  const serialized = JSON.stringify(payload);

  // Always emit to local memory bus
  memoryBus.emit(channel, payload);

  // If Redis is active, publish to Redis channel for cross-server/multi-pod distribution
  if (publisher && publisher.status === "ready") {
    try {
      await publisher.publish(channel, serialized);
    } catch (err) {
      console.warn("[Redis PubSub] Failed to publish via Redis:", err);
    }
  }
}

/**
 * Subscribes a listener callback to a specific channel (e.g. user-targeted or broadcast).
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToChannel(
  channel: string,
  callback: (data: PubSubNotificationMessage) => void
): () => void {
  // Subscribe to local memory bus
  memoryBus.on(channel, callback);

  // If Redis is ready, subscribe to the Redis channel
  if (subscriber && subscriber.status === "ready") {
    subscriber.subscribe(channel).catch(() => {});
  }

  return () => {
    memoryBus.off(channel, callback);
    if (subscriber && subscriber.status === "ready") {
      subscriber.unsubscribe(channel).catch(() => {});
    }
  };
}

/**
 * Status checker for diagnostics
 */
export function isRedisActive(): boolean {
  return redisAvailable && publisher?.status === "ready";
}
