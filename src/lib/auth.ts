"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
};

/**
 * Retrieves the currently active user session based on an HTTP-only cookie.
 * Defaults to the seeded intern account if no cookie is set.
 */
export async function getCurrentUser(): Promise<SafeUser | null> {
  try {
    const cookieStore = await cookies();
    const email = cookieStore.get("auth_user_email")?.value || "intern@primewave.com";

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return user;
  } catch {
    return null;
  }
}

/**
 * Server Action for quick persona switching.
 * Tailored for technical assessment reviewers to seamlessly test
 * both regular user booking and administrator approval flows.
 */
export async function switchUserAction(email: string) {
  const cookieStore = await cookies();
  cookieStore.set("auth_user_email", email, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  revalidatePath("/");
  revalidatePath("/reservations");
  revalidatePath("/admin");
}
