"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAction } from "@/actions/auth";
import type { SafeUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2,
  Lock,
  Mail,
  Loader2,
  ShieldCheck,
  UserCheck,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  CalendarCheck2,
  Clock,
  Sparkles,
} from "lucide-react";

interface LoginFormProps {
  currentUser?: SafeUser | null;
}

type DemoAccount = {
  key: "ADMIN" | "USER";
  name: string;
  email: string;
  password: string;
  description: string;
};

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    key: "ADMIN",
    name: "Platform Admin",
    email: "admin@primewave.com",
    password: "Admin@123",
    description: "Approvals, facilities & users",
  },
  {
    key: "USER",
    name: "Engineering Intern",
    email: "intern@primewave.com",
    password: "Intern@123",
    description: "Browse & reserve resources",
  },
];

const FEATURES = [
  {
    icon: CalendarCheck2,
    title: "Real-time availability",
    text: "See what's free right now and what's booked next.",
  },
  {
    icon: Clock,
    title: "Zero double-bookings",
    text: "Overlaps are rejected at the database level.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based access",
    text: "Admins review requests; users manage their own bookings.",
  },
];

export function LoginForm({ currentUser }: LoginFormProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const executeLogin = (loginEmail: string, loginPass: string) => {
    setErrorMsg(null);
    if (!loginEmail.trim() || !loginPass) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    startTransition(async () => {
      const res = await loginAction({ email: loginEmail.trim(), password: loginPass });
      if (res.success) {
        toast.success(`Welcome back, ${res.user?.name || "User"}!`, {
          description: `Signed in with ${res.user?.role} privileges`,
        });

        // Role-based destination logic:
        let destination = redirectParam || "/";
        if (!redirectParam) {
          // If no specific redirect param was requested, route Admins to /admin and Users to /
          destination = res.user?.role === "ADMIN" ? "/admin" : "/";
        } else if (res.user?.role !== "ADMIN" && destination.startsWith("/admin")) {
          // Prevent non-admin users from landing on a 403 Forbidden page
          destination = "/";
        }

        router.push(destination);
        router.refresh();
      } else {
        setActiveDemo(null);
        setErrorMsg(res.error || "Authentication failed.");
        toast.error("Sign in failed", { description: res.error });
      }
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveDemo(null);
    executeLogin(email, password);
  };

  const handleDirectDemoLogin = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    setActiveDemo(account.key);
    executeLogin(account.email, account.password);
  };

  const isFormSubmitting = isPending && activeDemo === null;

  return (
    <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl shadow-emerald-950/5 lg:grid-cols-[1.05fr_1fr] animate-in fade-in-0 zoom-in-95 duration-500">
      {/* ------------------------------------------------------------------ */}
      {/* Brand panel (desktop only)                                          */}
      {/* ------------------------------------------------------------------ */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        {/* Decorative shapes */}
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-teal-300/20 blur-3xl" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:32px_32px]"
        />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="leading-tight">
            <p className="text-lg font-semibold tracking-tight">PrimeWave Reserve</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-100/80">
              Resource Management
            </p>
          </div>
        </div>

        <div className="relative space-y-8">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/20">
              <Sparkles className="h-3.5 w-3.5" />
              PrimeWave Lab shared facility portal
            </span>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight">
              Book rooms, kits &amp; workstations without the scheduling chaos.
            </h2>
          </div>

          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-sm text-emerald-50/75">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-emerald-100/70">
          Protected by HMAC-signed HTTP-only sessions and server-side RBAC.
        </p>
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* Form panel                                                          */}
      {/* ------------------------------------------------------------------ */}
      <section className="flex flex-col justify-center p-6 sm:p-10">
        {/* Compact brand header (mobile / tablet) */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
            <Building2 className="h-5 w-5" />
          </div>
          <p className="text-lg font-semibold tracking-tight">
            PrimeWave <span className="text-emerald-600">Reserve</span>
          </p>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your enterprise credentials to continue.
          </p>
        </div>

        {/* Active session notice */}
        {currentUser && (
          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5 text-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-muted-foreground">Signed in as</span>
              <span className="font-medium text-foreground">{currentUser.name}</span>
              <RoleBadge role={currentUser.role} />
            </div>
            <Link
              href={currentUser.role === "ADMIN" ? "/admin" : "/"}
              className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
            >
              Continue
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/[0.06] p-3.5 text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email address
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="name@primewave.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl pl-10 text-sm"
                required
                autoComplete="email"
                disabled={isPending}
                aria-invalid={errorMsg ? true : undefined}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl pl-10 pr-11 text-sm"
                required
                autoComplete="current-password"
                disabled={isPending}
                aria-invalid={errorMsg ? true : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-xl bg-emerald-600 text-sm font-medium text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700"
            disabled={isPending}
          >
            {isFormSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="h-4 w-4 transition-transform group-hover/button:translate-x-0.5" />
              </>
            )}
          </Button>
        </form>

        {/* Demo accounts */}
        <div className="mt-8">
          <div className="relative flex items-center">
            <div className="flex-1 border-t border-border/70" />
            <span className="px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Or try a demo account
            </span>
            <div className="flex-1 border-t border-border/70" />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((account) => {
              const isAdmin = account.key === "ADMIN";
              const isLoading = isPending && activeDemo === account.key;
              const Icon = isAdmin ? ShieldCheck : UserCheck;

              return (
                <button
                  key={account.key}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDirectDemoLogin(account)}
                  className={`group relative flex items-center gap-3 rounded-xl border border-border/80 bg-background p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md disabled:pointer-events-none disabled:opacity-60 ${
                    isAdmin
                      ? "hover:border-emerald-500/50 hover:shadow-emerald-500/10"
                      : "hover:border-blue-500/50 hover:shadow-blue-500/10"
                  }`}
                  aria-label={`Sign in as ${account.name}`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      isAdmin
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-blue-500/10 text-blue-600"
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-foreground">
                        {account.name}
                      </span>
                      <RoleBadge role={account.key} />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{account.description}</p>
                  </div>
                  <ArrowRight
                    className={`h-4 w-4 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 ${
                      isAdmin ? "group-hover:text-emerald-600" : "group-hover:text-blue-600"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground lg:hidden">
          Protected by HMAC-signed HTTP-only sessions and server-side RBAC.
        </p>
      </section>
    </div>
  );
}

function RoleBadge({ role }: { role: "ADMIN" | "USER" }) {
  return (
    <Badge
      variant="outline"
      className={`h-4 px-1.5 py-0 text-[9px] font-semibold ${
        role === "ADMIN"
          ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-600"
          : "border-blue-500/40 bg-blue-500/5 text-blue-600"
      }`}
    >
      {role}
    </Badge>
  );
}
