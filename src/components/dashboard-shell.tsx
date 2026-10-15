"use client";

import { useState, useTransition, useRef, useEffect, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutAction, switchUserAction } from "@/actions/auth";
import type { SafeUser } from "@/lib/auth";
import {
  LayoutGrid,
  CalendarDays,
  ShieldCheck,
  Building2,
  LogOut,
  ChevronDown,
  Search,
  Mail,
  Bell,
  Settings,
  KeyRound,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { SupportModal } from "@/components/support-modal";
import { LottiePlayer } from "@/components/ui/lottie-player";

interface DashboardShellProps {
  currentUser: SafeUser | null;
  pendingCount?: number;
  children: ReactNode;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function DashboardShell({
  currentUser,
  pendingCount = 0,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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

  const isLoginPage = pathname === "/login";
  if (isLoginPage) {
    return (
      <div className="min-h-screen w-full bg-[#f0f3f8] dark:bg-[#0c1017] p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        {children}
      </div>
    );
  }

  // Determine current page title
  let pageTitle = "Dashboard";
  let pageSubtitle = "Facility inventory & reservation dispatch";
  if (pathname.startsWith("/admin")) {
    pageTitle = "Admin Management Hub";
    pageSubtitle = "Operations governance, approvals & fleet control";
  } else if (pathname.startsWith("/reservations")) {
    pageTitle = "Personal Reservations";
    pageSubtitle = "Your active bookings & scheduled ledger";
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground flex flex-col lg:flex-row antialiased">
      {/* Left Sidebar - FIXED / NEVER SCROLLS WITH CONTENT */}
      <aside className="w-full lg:w-[250px] shrink-0 border-b lg:border-b-0 lg:border-r border-border/70 p-5 lg:p-6 flex flex-col justify-between bg-card h-auto lg:h-full lg:overflow-y-auto z-30 shadow-xs">
        <div className="space-y-7">
          {/* Brand Logo */}
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                <div className="h-4.5 w-4.5 rotate-45 border-2 border-white rounded-[3px]" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tight text-foreground leading-tight">
                  PrimeWave
                </span>
                <span className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase">
                  Reserve
                </span>
              </div>
            </Link>

            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className={`space-y-1.5 lg:block ${mobileMenuOpen ? "block" : "hidden lg:block"}`}>
            {/* Dashboard Link */}
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition-all ${
                pathname === "/"
                  ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold border-l-[3.5px] border-emerald-600 pl-3 shadow-2xs"
                  : "font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutGrid className="h-4 w-4" />
                <span>Dashboard</span>
              </div>
            </Link>

            {/* My Reservations Link */}
            <Link
              href="/reservations"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition-all ${
                pathname.startsWith("/reservations")
                  ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold border-l-[3.5px] border-emerald-600 pl-3 shadow-2xs"
                  : "font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4" />
                <span>Reservations</span>
              </div>
            </Link>

            {/* Admin Hub Link (Visible for Admin) */}
            {currentUser?.role === "ADMIN" && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition-all ${
                  pathname.startsWith("/admin")
                    ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold border-l-[3.5px] border-emerald-600 pl-3 shadow-2xs"
                    : "font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Admin Hub</span>
                </div>
                {pendingCount > 0 && (
                  <span className="h-4.5 px-2 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )}

            {/* Settings / Security Link */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setChangePasswordModalOpen(true);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Bottom Support 24/7 Card */}
        <div className="mt-8 pt-4 lg:pt-0">
          <div className="bg-muted/40 rounded-3xl p-4 border border-border/70 text-center space-y-2.5">
            {/* Lottie Animated Pulse & Avatar Stack */}
            <div className="flex flex-col items-center justify-center">
              <div className="h-9 w-9 -mb-1">
                <LottiePlayer src="/animations/support-pulse.json" className="h-9 w-9" />
              </div>
              <div className="flex items-center justify-center -space-x-2">
                <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-800 border-2 border-card flex items-center justify-center text-[9px] font-bold">
                  JS
                </div>
                <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-800 border-2 border-card flex items-center justify-center text-[9px] font-bold z-10 shadow-xs">
                  ML
                </div>
                <div className="h-6 w-6 rounded-full bg-amber-100 text-amber-800 border-2 border-card flex items-center justify-center text-[9px] font-bold">
                  PW
                </div>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-bold text-foreground">Support 24/7</h5>
              <p className="text-[10px] text-muted-foreground">Campus dispatch team</p>
            </div>

            <button
              type="button"
              onClick={() => setSupportModalOpen(true)}
              className="w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              Start chat
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area - FIXED HEADER + INDEPENDENTLY SCROLLING MIDDLE CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-background">
        {/* Top Bar Header - FIXED / NEVER SCROLLS */}
        <header className="h-16 shrink-0 border-b border-border/60 px-6 sm:px-8 flex items-center justify-between bg-card z-20">
          {/* Title & Context on Left */}
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground truncate">
                {pageTitle}
              </h1>
              <p className="hidden sm:block text-[11px] text-muted-foreground font-medium -mt-0.5 truncate">
                {pageSubtitle}
              </p>
            </div>
          </div>

          {/* Center Search Input (UX Enhancement) */}
          <div className="hidden md:flex items-center relative w-64 lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search facilities, catalog..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (pathname !== "/") {
                    router.push("/#catalog-section");
                  } else {
                    document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
                  }
                }
              }}
              className="h-9 w-full rounded-full border border-border/80 bg-muted/40 pl-9 pr-9 text-xs placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border/70 bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground font-semibold">
              ↵
            </kbd>
          </div>

          {/* Right Tools: Messages, Notifications, Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* Quick Dispatch Messages */}
            <button
              type="button"
              onClick={() => setSupportModalOpen(true)}
              className="h-8.5 w-8.5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Campus Support Dispatch"
            >
              <Mail className="h-4 w-4" />
            </button>

            {/* Notification Bell with Badge */}
            <div className="relative">
              <button
                type="button"
                onClick={() => router.push(currentUser?.role === "ADMIN" ? "/admin" : "/reservations")}
                className="h-8.5 w-8.5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title={pendingCount > 0 ? `${pendingCount} reviews pending` : "Notifications"}
              >
                <Bell className="h-4 w-4" />
              </button>
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white shadow-xs">
                  {pendingCount}
                </span>
              )}
            </div>

            {/* User Avatar with Profile Dropdown */}
            {currentUser ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-muted transition-colors focus:outline-none cursor-pointer"
                >
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center font-bold text-xs">
                    {getInitials(currentUser.name)}
                  </div>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 origin-top-right rounded-3xl border border-border/80 bg-popover p-3 text-popover-foreground shadow-2xl backdrop-blur-md z-50 animate-in fade-in-0 zoom-in-95">
                    {/* User Info Header */}
                    <div className="p-3 rounded-2xl bg-muted/50 border border-border/60">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 flex items-center justify-center font-bold text-sm">
                          {getInitials(currentUser.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">
                            {currentUser.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {currentUser.email}
                          </p>
                          <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            {currentUser.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Persona Switcher */}
                    <div className="mt-3 px-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
                          className={`px-2 py-1.5 rounded-xl text-xs font-semibold text-center border transition-all cursor-pointer ${
                            currentUser.role === "USER"
                              ? "bg-blue-500 text-white border-blue-600"
                              : "bg-muted/40 hover:bg-muted text-foreground border-border/80"
                          }`}
                        >
                          Intern (USER)
                        </button>
                        <button
                          type="button"
                          disabled={isPending || currentUser.role === "ADMIN"}
                          onClick={() => {
                            setDropdownOpen(false);
                            handleRoleSwitch("ADMIN", "Platform Administrator (ADMIN)");
                          }}
                          className={`px-2 py-1.5 rounded-xl text-xs font-semibold text-center border transition-all cursor-pointer ${
                            currentUser.role === "ADMIN"
                              ? "bg-emerald-600 text-white border-emerald-700"
                              : "bg-muted/40 hover:bg-muted text-foreground border-border/80"
                          }`}
                        >
                          Admin (ADMIN)
                        </button>
                      </div>
                    </div>

                    <div className="my-2 border-t border-border/60" />

                    {/* Actions */}
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          setChangePasswordModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors text-left cursor-pointer"
                      >
                        <KeyRound className="h-4 w-4 text-muted-foreground" />
                        <span>Change Password</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          handleSignOut();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 text-xs font-semibold"
              >
                Sign In
              </Link>
            )}
          </div>
        </header>

        {/* Dynamic Page Content - ONLY THIS MIDDLE CONTENT SCROLLS */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-7 lg:p-8 bg-slate-50/50 dark:bg-background focus:outline-none">
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Support Modal */}
      <SupportModal
        open={supportModalOpen}
        onOpenChange={setSupportModalOpen}
      />

      {/* Change Password Modal */}
      {currentUser && (
        <ChangePasswordModal
          open={changePasswordModalOpen}
          onOpenChange={setChangePasswordModalOpen}
        />
      )}
    </div>
  );
}
