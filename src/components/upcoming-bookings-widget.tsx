"use client";

import Link from "next/link";
import { User, Phone, MessageSquare, Calendar, ChevronRight } from "lucide-react";

export interface UpcomingBookingItem {
  id: string;
  userName: string;
  resourceName: string;
  startTime: string;
  categoryName: string;
}

interface UpcomingBookingsWidgetProps {
  items: UpcomingBookingItem[];
  seeAllHref?: string;
}

const AVATAR_COLORS = [
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-rose-100 text-rose-800 border-rose-200",
  "bg-teal-100 text-teal-800 border-teal-200",
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function UpcomingBookingsWidget({
  items,
  seeAllHref = "/reservations",
}: UpcomingBookingsWidgetProps) {
  return (
    <div className="bg-white dark:bg-card rounded-3xl p-5 border border-border/80 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-tight text-foreground">
          New Applicants
        </h3>
        <Link
          href={seeAllHref}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          see all
        </Link>
      </div>

      {/* List */}
      <div className="space-y-3.5">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center">
            No upcoming bookings scheduled.
          </p>
        ) : (
          items.map((item, idx) => {
            const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 group hover:bg-muted/40 p-1.5 -mx-1.5 rounded-2xl transition-colors"
              >
                {/* Avatar & Details */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center font-bold text-xs border ${colorClass}`}
                  >
                    {getInitials(item.userName)}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {item.userName}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {item.resourceName}
                    </p>
                  </div>
                </div>

                {/* Right Action Icons matching reference image */}
                <div className="flex items-center gap-1 shrink-0 text-muted-foreground/60 group-hover:text-muted-foreground">
                  <button
                    type="button"
                    className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted hover:text-foreground transition-colors"
                    title="User details"
                  >
                    <User className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted hover:text-foreground transition-colors"
                    title="Dispatch message"
                  >
                    <MessageSquare className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
