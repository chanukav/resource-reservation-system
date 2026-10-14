"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutAction, switchUserAction } from "@/actions/auth";
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
  UserCheck,
  Loader2,
  ChevronDown,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { ChangePasswordModal } from "@/components/change-password-modal";

interface NavbarProps {
  currentUser: SafeUser | null;
  pendingCount?: number;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Navbar({ currentUser, pendingCount = 0 }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen]);

  const handleRoleSwitch = (personaKey: "INTERN" | "ADMIN", roleName: string) => {
    startTransition(async () => {
      await switchUserAction(personaKey);
      toast.success(`Switched persona to ${roleName}`);
      if (personaKey === "INTERN" && pathname.startsWith("/admin")) {
        router.push("/");
      } else {
        router.refresh();
      }
    });
  };

  const handleSignOut = () => {
    startTransition(async () => {
      await logoutAction();
      toast.success("Signed out successfully");
      router.push("/login");
      router.refresh();
    });
  };



  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & System Status */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-foreground text-sm">
                  PRIMEWAVE <span className="text-emerald-600">RESERVE</span>
                </span>
                <span className="hidden md:inline-flex rounded border border-border/80 bg-muted/50 px-1.5 py-0.2 text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
                  v2.4 • LK-HQ
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">
                Facility & Asset Operations
              </span>
            </div>
          </Link>

          {/* System Status Pill */}
          <div className="hidden lg:flex items-center gap-2 border-l border-border/60 pl-4 text-[11px] text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-medium text-foreground/80">Systems Normal</span>
            <span className="text-muted-foreground/60">•</span>
            <span className="font-mono text-[10px] text-muted-foreground">Asia/Colombo (+05:30)</span>
          </div>
        </div>

        {/* Floating Profile & Actions Component */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="relative" ref={dropdownRef}>
              {/* Trigger Button: Clean, uncluttered, opens the floating menu */}
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                className="flex items-center gap-2.5 rounded-full border border-border/80 bg-background/80 hover:bg-muted/70 pl-1.5 pr-3 py-1 text-left transition-all hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 cursor-pointer"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-semibold text-xs">
                  {getInitials(currentUser.name)}
                </div>
                <div className="hidden sm:flex flex-col items-start leading-none">
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
                  <span className="text-[10px] text-muted-foreground mt-0.5 max-w-[130px] truncate">
                    {currentUser.email}
                  </span>
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Floating Menu Component: Encapsulates all action buttons */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 origin-top-right rounded-2xl border border-border/80 bg-popover/98 p-2 text-popover-foreground shadow-2xl backdrop-blur-md ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95 z-50">
                  {/* User Profile Card Header */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/60">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 font-bold text-sm">
                      {getInitials(currentUser.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {currentUser.name}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 h-4 font-bold ${
                            currentUser.role === "ADMIN"
                              ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/5"
                              : "border-blue-500/40 text-blue-600 bg-blue-500/5"
                          }`}
                        >
                          {currentUser.role}
                        </Badge>
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>

                  {/* Navigation Links inside floating menu */}
                  <div className="mt-2 space-y-0.5">
                    <Link
                      href="/"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                      <span>Browse Resources</span>
                    </Link>

                    <Link
                      href="/reservations"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span>My Reservations</span>
                    </Link>

                    {/* ADMIN CONSOLE: STRICTLY FOR ADMIN ONLY. NEVER VISIBLE TO REGULAR USERS */}
                    {currentUser.role === "ADMIN" && (
                      <Link
                        href="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          <span>Admin Management Hub</span>
                        </div>
                        {pendingCount > 0 && (
                          <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                            {pendingCount}
                          </Badge>
                        )}
                      </Link>
                    )}
                  </div>

                  <div className="my-1.5 border-t border-border/60" />

                  {/* Quick Persona Switcher inside floating menu */}
                  <div className="px-2 py-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Switch Persona (Evaluation)
                    </span>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        disabled={isPending || currentUser.role === "USER"}
                        onClick={() => {
                          setDropdownOpen(false);
                          handleRoleSwitch("INTERN", "Engineering Intern (USER)");
                        }}
                        className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                          currentUser.role === "USER"
                            ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 font-semibold"
                            : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent"
                        }`}
                      >
                        <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                        <span>Intern</span>
                      </button>

                      <button
                        type="button"
                        disabled={isPending || currentUser.role === "ADMIN"}
                        onClick={() => {
                          setDropdownOpen(false);
                          handleRoleSwitch("ADMIN", "Platform Administrator (ADMIN)");
                        }}
                        className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                          currentUser.role === "ADMIN"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold"
                            : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent"
                        }`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Admin</span>
                      </button>
                    </div>
                  </div>

                  <div className="my-1.5 border-t border-border/60" />

                  {/* Account Settings, Change Password & Sign Out */}
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        setChangePasswordModalOpen(true);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer text-left"
                    >
                      <KeyRound className="h-4 w-4 text-emerald-600" />
                      <span>Change Password</span>
                    </button>

                    <Link
                      href="/login"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <LogIn className="h-4 w-4 text-muted-foreground" />
                      <span>Switch Account / Sign In</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        handleSignOut();
                      }}
                      disabled={isPending}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Controlled Change Password Modal - rendered outside the dropdown so it persists when menu closes */}
              <ChangePasswordModal
                open={changePasswordModalOpen}
                onOpenChange={setChangePasswordModalOpen}
              />
            </div>
          ) : pathname === "/login" ? null : (
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
