import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { AnimatedAuthBackground } from "@/components/ui/animated-auth-background";

export const metadata = {
  title: "Sign In | PrimeWave Reserve",
  description: "Sign in to PrimeWave Reserve resource management platform.",
};

export default async function LoginPage() {
  const user = await getCurrentUser();

  return (
    <div className="relative isolate flex min-h-full w-full items-center justify-center p-2 sm:p-4">
      {/* Dynamic Animated Interactive Background */}
      <AnimatedAuthBackground />

      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        }
      >
        <LoginForm currentUser={user} />
      </Suspense>
    </div>
  );
}
