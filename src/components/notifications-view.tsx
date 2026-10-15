"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  AlertOctagon,
  Calendar,
  Clock,
  Radio,
  CheckCheck,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Inbox,
  Filter,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  clearAllNotificationsAction,
} from "@/actions/notifications";
import type { SafeUser } from "@/lib/auth";
import { formatOrgDate, formatOrgTimeRange } from "@/lib/date-utils";

export interface FullNotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "APPROVAL" | "REJECTION" | "BOOKING_CREATED" | "SYSTEM";
  isRead: boolean;
  reservationId?: string | null;
  createdAt: string;
  reservation?: {
    id: string;
    title: string;
    startTime: string | Date;
    endTime: string | Date;
    status: string;
    resource?: {
      name: string;
      location?: string | null;
    } | null;
  } | null;
}

interface NotificationsViewProps {
  initialNotifications: FullNotificationItem[];
  currentUser: SafeUser;
}

export function NotificationsView({
  initialNotifications,
  currentUser,
}: NotificationsViewProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<FullNotificationItem[]>(
    initialNotifications
  );
  const [filter, setFilter] = useState<
    "ALL" | "UNREAD" | "APPROVAL" | "REJECTION" | "SYSTEM"
  >("ALL");
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const approvalsCount = notifications.filter((n) => n.type === "APPROVAL").length;
  const rejectionsCount = notifications.filter((n) => n.type === "REJECTION").length;
  const broadcastsCount = notifications.filter((n) => n.type === "SYSTEM").length;

  // Real-Time SSE listener to prepend notifications live
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/notifications/stream");

      eventSource.addEventListener("notification", (event) => {
        try {
          const newNotification: FullNotificationItem = JSON.parse(event.data);
          setNotifications((prev) => [
            newNotification,
            ...prev.filter((n) => n.id !== newNotification.id),
          ]);

          window.dispatchEvent(
            new CustomEvent("notifications-count-change", {
              detail: { count: unreadCount + 1 },
            })
          );
        } catch (err) {
          console.error("Error parsing notification event:", err);
        }
      });
    } catch (err) {
      console.error("SSE connection error in notifications-view:", err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [unreadCount]);

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    const newCount = Math.max(0, unreadCount - 1);
    window.dispatchEvent(
      new CustomEvent("notifications-count-change", {
        detail: { count: newCount },
      })
    );

    startTransition(async () => {
      await markNotificationAsReadAction(id);
    });
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    window.dispatchEvent(
      new CustomEvent("notifications-count-change", {
        detail: { count: 0 },
      })
    );

    startTransition(async () => {
      await markAllNotificationsAsReadAction();
      toast.success("All notifications marked as read");
      router.refresh();
    });
  };

  const handleClearInbox = () => {
    setNotifications([]);
    window.dispatchEvent(
      new CustomEvent("notifications-count-change", {
        detail: { count: 0 },
      })
    );

    startTransition(async () => {
      await clearAllNotificationsAction();
      toast.success("Notification inbox cleared");
      router.refresh();
    });
  };

  const filteredList = notifications.filter((n) => {
    if (filter === "UNREAD") return !n.isRead;
    if (filter === "APPROVAL") return n.type === "APPROVAL";
    if (filter === "REJECTION") return n.type === "REJECTION";
    if (filter === "SYSTEM") return n.type === "SYSTEM";
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total */}
        <div className="bg-card rounded-3xl p-5 border border-border/70 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Inbox Total
            </span>
            <p className="text-2xl font-black text-foreground">{notifications.length}</p>
            <p className="text-[10px] text-muted-foreground">All stored alerts</p>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center">
            <Inbox className="h-5 w-5" />
          </div>
        </div>

        {/* Card 2: Unread */}
        <div className="bg-card rounded-3xl p-5 border border-border/70 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Unread Alerts
            </span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {unreadCount}
            </p>
            <p className="text-[10px] text-muted-foreground">Requires attention</p>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Bell className="h-5 w-5" />
          </div>
        </div>

        {/* Card 3: Approvals */}
        <div className="bg-card rounded-3xl p-5 border border-border/70 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
              Approvals
            </span>
            <p className="text-2xl font-black text-teal-600 dark:text-teal-400">
              {approvalsCount}
            </p>
            <p className="text-[10px] text-muted-foreground">Confirmed bookings</p>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Card 4: Broadcasts */}
        <div className="bg-card rounded-3xl p-5 border border-border/70 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Broadcasts
            </span>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {broadcastsCount}
            </p>
            <p className="text-[10px] text-muted-foreground">Campus advisories</p>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Radio className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Toolbar Header */}
      <div className="bg-card rounded-3xl border border-border/70 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filter === "ALL"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("UNREAD")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filter === "UNREAD"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("APPROVAL")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filter === "APPROVAL"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Approvals ({approvalsCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("REJECTION")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filter === "REJECTION"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Declined ({rejectionsCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("SYSTEM")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filter === "SYSTEM"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Broadcasts ({broadcastsCount})
          </button>
        </div>

        {/* Actions on right */}
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0 || isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/80 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark All Read</span>
              </button>
              <button
                type="button"
                onClick={handleClearInbox}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/80 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear Inbox</span>
              </button>
            </>
          )}

          {/* SSE Live status indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Redis Pub/Sub &amp; SSE Active</span>
          </div>
        </div>
      </div>

      {/* Main Notification Stream List */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="bg-card rounded-3xl border border-border/70 p-16 text-center space-y-3 shadow-xs">
            <div className="h-14 w-14 rounded-3xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">No notifications to display</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {filter === "UNREAD"
                ? "You have read all your alerts. When administrators review your reservations or dispatch announcements, they will appear here in real time."
                : "Your notifications inbox is completely clear."}
            </p>
          </div>
        ) : (
          filteredList.map((item) => (
            <div
              key={item.id}
              className={`bg-card rounded-3xl border transition-all p-5 shadow-xs flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                !item.isRead
                  ? "border-emerald-500/40 bg-emerald-500/[0.02]"
                  : "border-border/70"
              }`}
            >
              <div className="flex items-start gap-4 min-w-0">
                {/* Icon */}
                <div className="shrink-0 mt-0.5">
                  {item.type === "APPROVAL" ? (
                    <div className="h-10 w-10 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center ring-1 ring-emerald-500/25">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  ) : item.type === "REJECTION" ? (
                    <div className="h-10 w-10 rounded-2xl bg-rose-500/15 text-rose-600 flex items-center justify-center ring-1 ring-rose-500/25">
                      <AlertOctagon className="h-5 w-5" />
                    </div>
                  ) : item.type === "BOOKING_CREATED" ? (
                    <div className="h-10 w-10 rounded-2xl bg-blue-500/15 text-blue-600 flex items-center justify-center ring-1 ring-blue-500/25">
                      <Calendar className="h-5 w-5" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-2xl bg-purple-500/15 text-purple-600 flex items-center justify-center ring-1 ring-purple-500/25">
                      <Radio className="h-5 w-5" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="text-sm font-black text-foreground">{item.title}</h4>

                    {!item.isRead && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold border border-emerald-500/25">
                        NEW
                      </span>
                    )}

                    <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(item.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                    {item.message}
                  </p>

                  {/* If linked to a reservation, display resource capsule */}
                  {item.reservation && (
                    <div className="mt-3 p-3 rounded-2xl bg-muted/40 border border-border/70 flex items-center justify-between max-w-md">
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {item.reservation.resource?.name || "Facility Resource"}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {item.reservation.title}
                        </p>
                      </div>
                      <Link
                        href={currentUser.role === "ADMIN" ? "/admin" : "/reservations"}
                        className="flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs transition-colors shrink-0"
                      >
                        <span>Open Ledger</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions on right */}
              <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                {!item.isRead && (
                  <button
                    type="button"
                    onClick={() => handleMarkAsRead(item.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border/80 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Mark as read</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
