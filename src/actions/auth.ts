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
import { switchUserSchema, formatZodError } from "@/lib/validations";

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
