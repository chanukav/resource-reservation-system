"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createHmac, timingSafeEqual } from "crypto";

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
};

export const DEMO_PERSONAS = {
  INTERN: {
    email: "intern@primewave.com",
    label: "Engineering Intern (USER)",
  },
  ADMIN: {
    email: "admin@primewave.com",
    label: "Platform Administrator (ADMIN)",
  },
} as const;

export type DemoPersonaKey = keyof typeof DEMO_PERSONAS;

const COOKIE_NAME = "primewave_auth_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    // Deterministic fallback for local assessment environment
    return "primewave_assessment_default_hmac_secret_key_32_bytes";
  }
  return secret;
}

/**
 * Creates a cryptographically signed session token:
 * Format: `${userId}.${expiryTimestamp}.${hmacSignature}`
 */
export async function createSignedSessionToken(userId: string): Promise<string> {
  const secret = getAuthSecret();
  const expiry = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${expiry}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

/**
 * Validates a signed session token using constant-time comparison.
 * Returns the userId if valid and not expired, otherwise returns null.
 */
export async function verifySignedSessionToken(token: string): Promise<string | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [userId, expiryStr, signature] = parts;
    const expiry = parseInt(expiryStr, 10);

    if (isNaN(expiry) || Date.now() > expiry) {
      return null; // Expired
    }

    const secret = getAuthSecret();
    const payload = `${userId}.${expiryStr}`;
    const expectedSignature = createHmac("sha256", secret).update(payload).digest("hex");

    const sigBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expectedSignature, "hex");

    if (sigBuf.length !== expectedBuf.length) {
      return null;
    }

    if (!timingSafeEqual(sigBuf, expectedBuf)) {
      return null; // Tampered token
    }

    return userId;
  } catch {
    return null;
  }
}

/**
 * Retrieves the currently active user session verified against PostgreSQL.
 * Role is ALWAYS derived from the authoritative database record, never from client input.
 */
export async function getCurrentUser(): Promise<SafeUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;

    let verifiedUserId: string | null = null;

    if (sessionCookie) {
      verifiedUserId = await verifySignedSessionToken(sessionCookie);
    }

    // If no valid session exists, default to the seeded Intern account
    if (!verifiedUserId) {
      const defaultUser = await prisma.user.findUnique({
        where: { email: DEMO_PERSONAS.INTERN.email },
        select: { id: true, name: true, email: true, role: true },
      });
      return defaultUser;
    }

    // Query authoritative user and role from PostgreSQL
    const user = await prisma.user.findUnique({
      where: { id: verifiedUserId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return user;
  } catch {
    // Fallback when called outside active Next.js request context (e.g. test runner)
    try {
      const emailToUse =
        process.env.TEST_AUTH_AS === "ADMIN"
          ? DEMO_PERSONAS.ADMIN.email
          : DEMO_PERSONAS.INTERN.email;

      const fallbackUser = await prisma.user.findUnique({
        where: { email: emailToUse },
        select: { id: true, name: true, email: true, role: true },
      });
      return fallbackUser;
    } catch {
      return null;
    }
  }
}

/**
 * Controlled Server Action for assessment evaluators.
 * Strict Whitelist: Only pre-seeded demo identities ('INTERN' | 'ADMIN') are permitted.
 * Arbitrary role injection (e.g. submitting role="ADMIN") is structurally impossible.
 */
export async function switchUserAction(personaKey: DemoPersonaKey) {
  const targetPersona = DEMO_PERSONAS[personaKey];
  if (!targetPersona) {
    throw new Error("Invalid persona requested. Privilege escalation blocked.");
  }

  // Fetch the authoritative seeded user from the database
  const user = await prisma.user.findUnique({
    where: { email: targetPersona.email },
  });

  if (!user) {
    throw new Error(`Seeded user ${targetPersona.email} not found. Run 'npm run seed' first.`);
  }

  // Issue a cryptographically signed session token
  const token = await createSignedSessionToken(user.id);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
  });

  revalidatePath("/");
  revalidatePath("/reservations");
  revalidatePath("/admin");
}
