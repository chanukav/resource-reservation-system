import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Sign In | PrimeWave Reserve",
  description: "Sign in to PrimeWave Reserve resource management platform.",
};

export default async function LoginPage() {
  const user = await getCurrentUser();

  // If already authenticated, redirect to home page
  if (user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
