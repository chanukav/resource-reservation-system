import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Sign In | PrimeWave Reserve",
  description: "Sign in to PrimeWave Reserve resource management platform.",
};

export default async function LoginPage() {
  const user = await getCurrentUser();

  return (
    <div className="relative isolate flex min-h-[calc(100vh-8rem)] items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[480px] w-[880px] -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[420px] rounded-full bg-teal-300/10 blur-3xl" />
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)] opacity-60" />
      </div>

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
