"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";

export interface CalendarMarkedDay {
  dateStr: string; // "YYYY-MM-DD"
  title?: string;
  count?: number;
  hasApproved?: boolean;
  hasPending?: boolean;
}

interface CalendarWidgetProps {
  onSelectDate?: (date: Date) => void;
  selectedDate?: Date;
  markedDates?: CalendarMarkedDay[];
  navigationBasePath?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEK_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function formatToYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CalendarWidget({
  onSelectDate,
  selectedDate: initialSelected,
  markedDates = [],
  navigationBasePath = "/reservations",
}: CalendarWidgetProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(() => initialSelected || new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => initialSelected || new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDay = new Date(year, month, 1).getDay();
  // Adjust so Monday is 0
  const startOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  // Fast lookup map for marked dates: "YYYY-MM-DD" -> { hasApproved, hasPending, count }
  const markedMap = useMemo(() => {
    const map = new Map<string, { count: number; hasApproved: boolean; hasPending: boolean }>();
    for (const item of markedDates) {
      const existing = map.get(item.dateStr) || { count: 0, hasApproved: false, hasPending: false };
      map.set(item.dateStr, {
        count: existing.count + (item.count || 1),
        hasApproved: existing.hasApproved || item.hasApproved || false,
        hasPending: existing.hasPending || item.hasPending || false,
      });
    }
    return map;
  }, [markedDates]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    handleDayClick(now.getDate(), now.getMonth(), now.getFullYear());
  };

  const handleDayClick = (day: number, m: number = month, y: number = year) => {
    const chosen = new Date(y, m, day);
    setSelectedDate(chosen);
    onSelectDate?.(chosen);

    const dateStr = formatToYYYYMMDD(chosen);
    // Navigate directly to that day's reservation ledger
    router.push(`${navigationBasePath}?date=${dateStr}`);
  };

  // Calendar cells
  const cells: { type: "prev" | "curr" | "next"; day: number; dateStr: string }[] = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevDate = new Date(year, month - 1, d);
    cells.push({
      type: "prev",
      day: d,
      dateStr: formatToYYYYMMDD(prevDate),
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const currDate = new Date(year, month, d);
    cells.push({
      type: "curr",
      day: d,
      dateStr: formatToYYYYMMDD(currDate),
    });
  }

  const remaining = 35 - cells.length;
  if (remaining > 0) {
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      cells.push({
        type: "next",
        day: d,
        dateStr: formatToYYYYMMDD(nextDate),
      });
    }
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const isCurrentViewingMonthSameAsToday = isCurrentMonth;

  const selectedDateStr = formatToYYYYMMDD(selectedDate);
  const selectedDayInfo = markedMap.get(selectedDateStr);

  return (
    <div className="bg-white dark:bg-card rounded-3xl p-5 border border-border/80 shadow-xs space-y-4">
      {/* Calendar Header with Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black tracking-tight text-foreground">
            {MONTH_NAMES[month]} {year}
          </h3>
          {!isCurrentViewingMonthSameAsToday && (
            <button
              type="button"
              onClick={handleJumpToToday}
              className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/20 transition-colors cursor-pointer"
            >
              Today
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekdays Row */}
      <div className="grid grid-cols-7 text-center">
        {WEEK_DAYS.map((d) => (
          <span
            key={d}
            className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider py-1"
          >
            {d}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {cells.map((cell, idx) => {
          if (cell.type !== "curr") {
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (cell.type === "prev") {
                    handleDayClick(cell.day, month - 1, year);
                  } else {
                    handleDayClick(cell.day, month + 1, year);
                  }
                }}
                title={`Navigate to ${cell.dateStr}`}
                className="h-10 flex flex-col items-center justify-center text-[12px] text-slate-300 dark:text-zinc-600 font-medium cursor-pointer hover:text-foreground/70 transition-colors"
              >
                <span>{cell.day}</span>
              </button>
            );
          }

          const isSelected = selectedDateStr === cell.dateStr;
          const isToday = isCurrentMonth && today.getDate() === cell.day;
          const mark = markedMap.get(cell.dateStr);
          const hasBookings = !!mark && mark.count > 0;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDayClick(cell.day)}
              title={
                hasBookings
                  ? `${mark.count} reservation(s) on ${MONTH_NAMES[month]} ${cell.day} - Click to navigate`
                  : `Click to view reservations for ${MONTH_NAMES[month]} ${cell.day}`
              }
              className="relative h-10 flex flex-col items-center justify-center group focus:outline-none cursor-pointer"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                  isSelected
                    ? "border-2 border-dashed border-zinc-700 dark:border-zinc-300 text-foreground font-bold shadow-2xs"
                    : isToday
                    ? "bg-emerald-600 text-white font-bold shadow-xs hover:bg-emerald-700"
                    : "text-foreground/90 font-medium hover:bg-muted/70 group-hover:scale-105"
                }`}
              >
                {cell.day}
              </span>

              {/* Indicator dots beneath day number */}
              {isSelected ? (
                <span className="flex items-center gap-[2.5px] mt-0.5">
                  <span className="h-1 w-1 rounded-full bg-zinc-700 dark:bg-zinc-300" />
                  <span className="h-1 w-1 rounded-full bg-zinc-700 dark:bg-zinc-300" />
                  <span className="h-1 w-1 rounded-full bg-zinc-700 dark:bg-zinc-300" />
                </span>
              ) : hasBookings ? (
                <span className="flex items-center gap-1 mt-0.5">
                  {mark.hasApproved && (
                    <span className="h-1 w-1 rounded-full bg-emerald-500" />
                  )}
                  {mark.hasPending && (
                    <span className="h-1 w-1 rounded-full bg-amber-500" />
                  )}
                  {!mark.hasApproved && !mark.hasPending && (
                    <span className="h-1 w-1 rounded-full bg-teal-500" />
                  )}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Selected Day Context & Quick Navigation Bar */}
      <div className="pt-2 border-t border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold text-foreground">
            {selectedDate.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
          {selectedDayInfo && selectedDayInfo.count > 0 ? (
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
              {selectedDayInfo.count} booking{selectedDayInfo.count > 1 ? "s" : ""}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">Available</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => router.push(`${navigationBasePath}?date=${selectedDateStr}`)}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors cursor-pointer group"
        >
          <span>View Day</span>
          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
