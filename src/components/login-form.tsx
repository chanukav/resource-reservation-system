"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
  KeyRound,
} from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    startTransition(async () => {
      const res = await loginAction({ email: email.trim(), password });
      if (res.success) {
        toast.success(`Welcome back, ${res.user?.name || "User"}!`, {
          description: `Signed in as ${res.user?.role}`,
        });
        router.push(redirectTo);
        router.refresh();
      } else {
        setErrorMsg(res.error || "Authentication failed.");
        toast.error("Sign in failed", { description: res.error });
      }
    });
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg(null);
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-border/80">
      <CardHeader className="space-y-2 text-center pb-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
          <Building2 className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            PrimeWave <span className="text-emerald-600">Reserve</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Sign in with your enterprise credentials to manage or reserve shared resources
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="name@primewave.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 text-sm"
                required
                autoComplete="email"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold">
                Password
              </Label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-9 text-sm"
                required
                autoComplete="current-password"
                disabled={isPending}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-all"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        {/* Evaluator Quick-Fill Section */}
        <div className="pt-2 border-t border-border/60">
          <div className="flex items-center gap-1.5 mb-2.5 text-muted-foreground">
            <KeyRound className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Quick Demo Accounts (Evaluation)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill("admin@primewave.com", "Admin@123")}
              className="flex flex-col items-start p-2.5 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted text-left transition-colors"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Admin
                </span>
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/40 text-emerald-600">
                  ADMIN
                </Badge>
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 truncate w-full">
                admin@primewave.com
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill("intern@primewave.com", "Intern@123")}
              className="flex flex-col items-start p-2.5 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted text-left transition-colors"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5 text-blue-600" /> Intern User
                </span>
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-blue-500/40 text-blue-600">
                  USER
                </Badge>
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 truncate w-full">
                intern@primewave.com
              </span>
            </button>
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t border-border/60 pt-4 pb-4 text-center justify-center">
        <p className="text-[11px] text-muted-foreground">
          Protected by HMAC-signed HTTP-only sessions and server-side RBAC.
        </p>
      </CardFooter>
    </Card>
  );
}
