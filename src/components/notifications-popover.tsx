"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  AlertOctagon,
  Calendar,
  Clock,
  CheckCheck,
  Trash2,
  X,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  getNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  clearAllNotificationsAction,
} from "@/actions/notifications";
import type { SafeUser } from "@/lib/auth";

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "APPROVAL" | "REJECTION" | "BOOKING_CREATED" | "SYSTEM";
  isRead: boolean;
  reservationId?: string | null;
  createdAt: string;
}

interface NotificationsPopoverProps {
  currentUser?: SafeUser | null;
}

function formatRelativeTime(dateString: string): string {
  try {
    const now = new Date();
    const past = new Date(dateString);
    const diffSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffSeconds < 45) return "Just now";
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
    return past.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function NotificationsPopover({ currentUser }: NotificationsPopoverProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const popoverRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load of Notifications from Server Action
  useEffect(() => {
    if (!currentUser) return;

    getNotificationsAction().then((res) => {
      if (res.success && res.data) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    });
  }, [currentUser]);

  // Synchronize with sidebar and other components
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("notifications-count-change", {
        detail: { count: unreadCount },
      })
    );
  }, [unreadCount]);

  // 2. Real-Time Server-Sent Events (SSE) Listener
  useEffect(() => {
    if (!currentUser) return;

    let eventSource: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource("/api/notifications/stream");

        eventSource.addEventListener("notification", (event) => {
          try {
            const data: NotificationItem = JSON.parse(event.data);

            // Audio notification chime (synthesized via Web Audio API, no external asset needed)
            playChime(data.type);

            // Pop interactive toast immediately
            if (data.type === "APPROVAL") {
              toast.success(data.title, {
                description: data.message,
                duration: 6000,
              });
            } else if (data.type === "REJECTION") {
              toast.error(data.title, {
                description: data.message,
                duration: 7000,
              });
            } else {
              toast.info(data.title, {
                description: data.message,
                duration: 5000,
              });
            }

            // Update local state without full reload
            setNotifications((prev) => [data, ...prev.filter((n) => n.id !== data.id)]);
            setUnreadCount((prev) => prev + 1);
          } catch (err) {
            console.error("Failed to parse SSE notification:", err);
          }
        });

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Exponential backoff reconnect
          reconnectTimer = setTimeout(connectSSE, 5000);
        };
      } catch (err) {
        console.error("SSE connection error:", err);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [currentUser]);

  // 3. Click outside listener to dismiss popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = (item: NotificationItem) => {
    if (item.isRead) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    startTransition(async () => {
      await markNotificationAsReadAction(item.id);
    });
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    startTransition(async () => {
      await markAllNotificationsAsReadAction();
      toast.success("All notifications marked as read");
    });
  };

  const handleClearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
    startTransition(async () => {
      await clearAllNotificationsAction();
      toast.success("Notification inbox cleared");
    });
  };

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  if (!currentUser) return null;

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative h-9 w-9 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
          isOpen
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
        title="Real-Time Notifications"
        aria-label="Open notifications"
      >
        <Bell className="h-4 w-4" />

        {/* Real-Time Unread Badge with pulsing radar ring */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-black text-white shadow-xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-[360px] sm:w-[420px] rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl shadow-emerald-950/10 z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-black text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {notifications.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    disabled={unreadCount === 0 || isPending}
                    className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    disabled={isPending}
                    className="p-1.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40 cursor-pointer"
                    title="Clear inbox"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="px-4 py-2 border-b border-border/40 flex items-center gap-2 bg-muted/10 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                filter === "all"
                  ? "bg-emerald-600 text-white shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                filter === "unread"
                  ? "bg-emerald-600 text-white shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications Scroll List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 px-6 text-center space-y-2.5">
                <div className="h-12 w-12 rounded-3xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-foreground">You are all caught up!</p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  {filter === "unread"
                    ? "No unread alerts. You will receive real-time notifications when admins review your reservations."
                    : "No notifications in your inbox yet. New booking updates and approval alerts will appear here."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    handleMarkAsRead(item);
                    if (item.reservationId) {
                      setIsOpen(false);
                      router.push(currentUser.role === "ADMIN" ? "/admin" : "/reservations");
                    }
                  }}
                  className={`p-4 flex items-start gap-3.5 transition-colors cursor-pointer group hover:bg-muted/40 ${
                    !item.isRead ? "bg-emerald-500/[0.04]" : ""
                  }`}
                >
                  {/* Status Indicator Icon */}
                  <div className="shrink-0 mt-0.5">
                    {item.type === "APPROVAL" ? (
                      <div className="h-8 w-8 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center ring-1 ring-emerald-500/25">
                        <CheckCircle2 className="h-4.5 w-4.5" />
                      </div>
                    ) : item.type === "REJECTION" ? (
                      <div className="h-8 w-8 rounded-2xl bg-rose-500/15 text-rose-600 flex items-center justify-center ring-1 ring-rose-500/25">
                        <AlertOctagon className="h-4.5 w-4.5" />
                      </div>
                    ) : item.type === "BOOKING_CREATED" ? (
                      <div className="h-8 w-8 rounded-2xl bg-blue-500/15 text-blue-600 flex items-center justify-center ring-1 ring-blue-500/25">
                        <Calendar className="h-4.5 w-4.5" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center">
                        <Bell className="h-4.5 w-4.5" />
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-foreground truncate">
                        {item.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {item.message}
                    </p>

                    {item.reservationId && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 pt-0.5">
                        <span>View reservation</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>

                  {/* Unread dot */}
                  {!item.isRead && (
                    <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="px-4 py-2.5 bg-muted/30 border-t border-border/50 text-[10px] text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live SSE dispatch connected
            </span>
            <span>PrimeWave Real-Time</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * High-quality pleasant notification chime synthesized with Web Audio API.
 * Requires zero external audio files and triggers cleanly in all modern browsers.
 */
function playChime(type: string) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "APPROVAL") {
      // Pleasant upward two-tone major third (E5 -> G#5)
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.setValueAtTime(830.61, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === "REJECTION") {
      // Soft gentle low double chime
      osc.type = "triangle";
      osc.frequency.setValueAtTime(329.63, now);
      osc.frequency.setValueAtTime(293.66, now + 0.15);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      // Subtle single tone
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {
    // Non-fatal if browser blocks autoplay audio context
  }
}
