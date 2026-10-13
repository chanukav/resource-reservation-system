"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import type { SafeUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutGrid,
  CalendarDays,
  ShieldCheck,
  Building2,
  LogOut,
  LogIn,
  User,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useTransition } from "react";

interface NavbarProps {
  currentUser: SafeUser | null;
  pendingCount?: number;
}

export function Navbar({ currentUser, pendingCount = 0 }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await logoutAction();
      toast.success("Signed out successfully");
      router.push("/login");
      router.refresh();
    });
  };

  const navLinks = [
    {
      href: "/",
      label: "Browse Resources",
      icon: LayoutGrid,
      adminOnly: false,
    },
    {
      href: "/reservations",
      label: "My Reservations",
      icon: CalendarDays,
      adminOnly: false,
      authRequired: true,
    },
    {
      href: "/admin",
      label: "Admin Console",
      icon: ShieldCheck,
      badge: pendingCount > 0 ? pendingCount : null,
      adminOnly: true,
    },
  ];

  // Strictly filter links: Admin link only shown to ADMIN role
  const visibleLinks = navLinks.filter((link) => {
    if (link.adminOnly && currentUser?.role !== "ADMIN") {
      return false;
    }
    return true;
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold tracking-tight text-foreground text-base">
                PrimeWave <span className="text-emerald-600">Reserve</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Resource Management
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 pl-4">
            {visibleLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                  {link.badge && (
                    <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                      {link.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Authentication & User Profile */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 pl-2 border-l border-border/60">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <User className="h-4 w-4" />
                </div>
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">
                      {currentUser.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1 py-0 h-4 font-semibold ${
                        currentUser.role === "ADMIN"
                          ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/5"
                          : "border-blue-500/40 text-blue-600 bg-blue-500/5"
                      }`}
                    >
                      {currentUser.role}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {currentUser.email}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                disabled={isPending}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Sign Out"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <LogOut className="h-3.5 w-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <LogIn className="h-3.5 w-3.5 mr-1.5" />
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
