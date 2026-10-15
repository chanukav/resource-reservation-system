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
  MapPin,
  Users,
  Clock,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { SupportModal } from "@/components/support-modal";
import { LottiePlayer } from "@/components/ui/lottie-player";
import { NotificationsPopover } from "@/components/notifications-popover";
import { scrollToResourceCard } from "@/lib/client-utils";

interface DashboardShellProps {
  currentUser: SafeUser | null;
  pendingCount?: number;
  unreadNotificationCount?: number;
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
  unreadNotificationCount = 0,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [liveUnreadCount, setLiveUnreadCount] = useState(unreadNotificationCount);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize search input with URL search param on mount & with catalog internal search
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const q = urlParams.get("q");
      if (q) {
        setSearchVal(q);
      }
    }

    const handleSync = (e: any) => {
      if (typeof e.detail?.query === "string") {
        setSearchVal(e.detail.query);
      }
    };
    window.addEventListener("header-search-sync", handleSync);
    return () => {
      window.removeEventListener("header-search-sync", handleSync);
    };
  }, []);

  // Click outside search container & escape key listener
  useEffect(() => {
    function handleDocClick(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSearchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSearchInput = (val: string) => {
    setSearchVal(val);

    // 1. Instantly dispatch custom event to filter the catalog live on the current page
    window.dispatchEvent(
      new CustomEvent("catalog-search-change", { detail: { query: val } })
    );

    // 2. Sync URL query parameter if on dashboard
    if (typeof window !== "undefined" && pathname === "/") {
      const url = new URL(window.location.href);
      if (val.trim()) {
        url.searchParams.set("q", val);
      } else {
        url.searchParams.delete("q");
      }
      window.history.replaceState({}, "", url.toString());
    }

    // 3. Debounce live search dropdown fetch
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!val.trim()) {
      setSearchResults([]);
      setSearchDropdownOpen(false);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setSearchDropdownOpen(true);

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/resources/search?q=${encodeURIComponent(val.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.error("Live search fetch error:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 180);
  };

  const handleClearSearch = () => {
    setSearchVal("");
    setSearchResults([]);
    setSearchDropdownOpen(false);
    setSearchLoading(false);
    window.dispatchEvent(
      new CustomEvent("catalog-search-change", { detail: { query: "" } })
    );
    if (typeof window !== "undefined" && pathname === "/") {
      const url = new URL(window.location.href);
      url.searchParams.delete("q");
      window.history.replaceState({}, "", url.toString());
    }
  };

  const handleSelectSearchResult = (item: any) => {
    setSearchDropdownOpen(false);
    setSearchVal(item.name);

    if (pathname === "/") {
      // 1. Dispatch event with targetResourceId and query to ensure the catalog renders and resets any restricting filters
      window.dispatchEvent(
        new CustomEvent("catalog-search-change", {
          detail: {
            query: item.name,
            targetResourceId: item.id,
            categoryId: item.categoryId,
          },
        })
      );

      // 2. Sync URL query params
      const url = new URL(window.location.href);
      url.searchParams.set("q", item.name);
      url.searchParams.set("target", item.id);
      window.history.replaceState({}, "", url.toString());

      // 3. Staggered scroll to ensure DOM element is ready after React re-render
      setTimeout(() => {
        scrollToResourceCard(item.id);
      }, 100);
      setTimeout(() => {
        scrollToResourceCard(item.id);
      }, 350);
    } else {
      router.push(`/?target=${item.id}&q=${encodeURIComponent(item.name)}#catalog-section`);
    }
  };

  const handleSearchSubmit = () => {
    setSearchDropdownOpen(false);
    if (searchResults.length === 1) {
      handleSelectSearchResult(searchResults[0]);
      return;
    }
    if (pathname !== "/") {
      router.push(`/?q=${encodeURIComponent(searchVal)}#catalog-section`);
    } else {
      document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
    }
  };

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

  useEffect(() => {
    setLiveUnreadCount(unreadNotificationCount);
  }, [unreadNotificationCount]);

  useEffect(() => {
    const handleCountChange = (e: any) => {
      if (typeof e.detail?.count === "number") {
        setLiveUnreadCount(e.detail.count);
      }
    };
    window.addEventListener("notifications-count-change", handleCountChange);
    return () => {
      window.removeEventListener("notifications-count-change", handleCountChange);
    };
  }, []);

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
      <div className="relative h-full w-full overflow-y-auto bg-[#f0f3f8] dark:bg-[#0c1017] p-4 sm:p-6 lg:p-8 flex items-center justify-center">
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
  } else if (pathname.startsWith("/notifications")) {
    pageTitle = "Notifications Hub";
    pageSubtitle = "Real-time alerts, approval decisions & campus broadcasts";
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
            {/* Mobile Search Bar */}
            <div className="lg:hidden mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search facilities..."
                  value={searchVal}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setMobileMenuOpen(false);
                      handleSearchSubmit();
                    }
                  }}
                  className="h-9 w-full rounded-2xl border border-border/80 bg-muted/40 pl-9 pr-8 text-xs placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                {searchVal && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
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

            {/* Notifications Tab */}
            <Link
              href="/notifications"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition-all ${
                pathname.startsWith("/notifications")
                  ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold border-l-[3.5px] border-emerald-600 pl-3 shadow-2xs"
                  : "font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
              </div>
              {liveUnreadCount > 0 && (
                <span className="h-4.5 px-2 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {liveUnreadCount > 99 ? "99+" : liveUnreadCount}
                </span>
              )}
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

          {/* Center Search Input with Instant Dropdown and Catalog Sync */}
          <div ref={searchContainerRef} className="hidden md:flex items-center relative w-64 lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search facilities, catalog..."
              value={searchVal}
              onFocus={() => {
                if (searchVal.trim().length > 0 && searchResults.length > 0) {
                  setSearchDropdownOpen(true);
                }
              }}
              onChange={(e) => handleSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearchSubmit();
                }
              }}
              className="h-9 w-full rounded-full border border-border/80 bg-muted/40 pl-9 pr-14 text-xs placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/60 focus:bg-background transition-all"
            />
            
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchVal && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted text-xs cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <kbd className="hidden sm:inline-block rounded border border-border/70 bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground font-semibold">
                ↵
              </kbd>
            </div>

            {/* Live Autocomplete Dropdown */}
            {searchDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-border/80 bg-popover text-popover-foreground shadow-2xl p-2 z-50 animate-in fade-in-0 zoom-in-95 backdrop-blur-md">
                <div className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground flex items-center justify-between border-b border-border/50 pb-2 mb-1">
                  <span>Facility Matches ({searchResults.length})</span>
                  {searchLoading && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-normal">
                      <Loader2 className="h-3 w-3 animate-spin" /> Searching...
                    </span>
                  )}
                </div>

                {searchLoading && searchResults.length === 0 ? (
                  <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    <span>Searching facility catalog...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="py-6 px-4 text-center text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">No facilities found</p>
                    <p className="text-[11px] mt-0.5 text-muted-foreground">
                      No matching resource for &ldquo;{searchVal}&rdquo;
                    </p>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                    {searchResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectSearchResult(item)}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-muted/70 transition-all flex items-center justify-between gap-3 group cursor-pointer border border-transparent hover:border-border/60"
                      >
                        <div className="min-w-0 space-y-0.5 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                              {item.assetCode}
                            </span>
                            <span className="text-xs font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                              {item.name}
                            </span>
                            {item.requiresApproval && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shrink-0">
                                Approval Req.
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground truncate">
                            <span className="truncate">{item.categoryName}</span>
                            {item.location && (
                              <>
                                <span>•</span>
                                <span className="truncate flex items-center gap-0.5">
                                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                                  {item.location}
                                </span>
                              </>
                            )}
                            <span>•</span>
                            <span className="shrink-0">{item.capacity} max</span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {item.isOperational ? (
                            item.isOccupiedNow ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-full">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                                Occupied
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Vacant Now
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                              Maintenance
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Footer action */}
                <div className="p-2 border-t border-border/50 mt-1 flex items-center justify-between text-[11px] text-muted-foreground bg-muted/30 rounded-xl">
                  <span>
                    Press <kbd className="px-1 py-0.5 rounded border border-border/70 bg-background font-mono text-[10px]">↵</kbd> to filter catalog
                  </span>
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    View in catalog <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
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

            {/* Interactive Real-Time Notification Center */}
            <NotificationsPopover currentUser={currentUser} />

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
        <main id="dashboard-main-scroll" className="flex-1 overflow-y-auto p-5 sm:p-7 lg:p-8 bg-slate-50/50 dark:bg-background focus:outline-none scroll-smooth">
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
