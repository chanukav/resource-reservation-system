"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { switchUserAction, SafeUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutGrid,
  CalendarDays,
  ShieldCheck,
  UserCheck,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { useTransition } from "react";

interface NavbarProps {
  currentUser: SafeUser | null;
  pendingCount?: number;
}

export function Navbar({ currentUser, pendingCount = 0 }: NavbarProps) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleRoleSwitch = (email: string, roleName: string) => {
    startTransition(async () => {
      await switchUserAction(email);
      toast.success(`Switched active persona to ${roleName}`, {
        description: `Logged in as ${email}`,
      });
    });
  };

  const navLinks = [
    {
      href: "/",
      label: "Browse Resources",
      icon: LayoutGrid,
    },
    {
      href: "/reservations",
      label: "My Reservations",
      icon: CalendarDays,
    },
    {
      href: "/admin",
      label: "Admin Management",
      icon: ShieldCheck,
      badge: pendingCount > 0 ? pendingCount : null,
      adminOnly: true,
    },
  ];

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
            {navLinks.map((link) => {
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

        {/* Persona Switcher / Active User Banner */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/40 p-1">
            <Button
              size="sm"
              variant={currentUser?.role === "USER" ? "default" : "ghost"}
              className="h-7 text-xs px-2.5"
              disabled={isPending}
              onClick={() => handleRoleSwitch("intern@primewave.com", "Engineering Intern (USER)")}
            >
              <UserCheck className="h-3.5 w-3.5 mr-1" />
              Intern User
            </Button>
            <Button
              size="sm"
              variant={currentUser?.role === "ADMIN" ? "default" : "ghost"}
              className="h-7 text-xs px-2.5"
              disabled={isPending}
              onClick={() => handleRoleSwitch("admin@primewave.com", "Platform Admin (ADMIN)")}
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              Admin
            </Button>
          </div>

          <div className="hidden lg:flex flex-col items-end text-xs">
            <span className="font-medium text-foreground">{currentUser?.name || "Guest"}</span>
            <span className="text-muted-foreground text-[11px]">{currentUser?.email}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
