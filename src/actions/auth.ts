"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  DEMO_PERSONAS,
  DemoPersonaKey,
  createSignedSessionToken,
  COOKIE_NAME,
} from "@/lib/auth";
import {
  switchUserSchema,
  loginSchema,
  LoginInput,
  formatZodError,
} from "@/lib/validations";
import { verifyPassword } from "@/lib/password";

export type AuthActionResult = {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: "USER" | "ADMIN";
  };
};

/**
 * Standard Authentication Server Action:
 * Validates credentials, verifies PBKDF2 hash, and issues signed session cookie.
 */
export async function loginAction(data: LoginInput): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: formatZodError(parsed.error) };
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { success: false, error: "Invalid email or password." };
  }

  const isValidPassword = verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    return { success: false, error: "Invalid email or password." };
  }

  // Issue a cryptographically signed session token
  const token = await createSignedSessionToken(user.id);

  try {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
    });
  } catch {
    // Graceful fallback when invoked outside Next.js request context (e.g. test runner)
  }

  try {
    revalidatePath("/");
    revalidatePath("/reservations");
    revalidatePath("/admin");
  } catch {
    // Ignore in tests
  }

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

/**
 * Signs out the currently active user by invalidating the session cookie.
 */
export async function logoutAction(): Promise<{ success: boolean }> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
  } catch {
    // Ignore outside request context
  }

  try {
    revalidatePath("/");
    revalidatePath("/reservations");
    revalidatePath("/admin");
  } catch {
    // Ignore outside request context
  }

  return { success: true };
}

/**
 * Controlled Server Action for assessment evaluators.
 * Strict Whitelist: Only pre-seeded demo identities ('INTERN' | 'ADMIN') are permitted.
 * Arbitrary role injection (e.g. submitting role="ADMIN") is structurally impossible.
 */
export async function switchUserAction(personaKey: DemoPersonaKey) {
  const parsed = switchUserSchema.safeParse({ personaKey });
  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error));
  }

  const targetPersona = DEMO_PERSONAS[parsed.data.personaKey];

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
