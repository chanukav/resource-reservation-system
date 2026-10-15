"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarWidgetProps {
  onSelectDate?: (date: Date) => void;
  selectedDate?: Date;
  markedDates?: string[]; // ISO strings of dates that have reservations
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEK_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export function CalendarWidget({
  onSelectDate,
  selectedDate: initialSelected,
  markedDates = [],
}: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(() => initialSelected || new Date());
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const d = initialSelected || new Date();
    return d.getDate();
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDay = new Date(year, month, 1).getDay();
  // Adjust so Monday is 0
  const startOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    const chosen = new Date(year, month, day);
    onSelectDate?.(chosen);
  };

  // Calendar cells: empty or prev month days + current month days
  const cells: { type: "prev" | "curr" | "next"; day: number }[] = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ type: "prev", day: prevMonthDays - i });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ type: "curr", day: d });
  }

  const remaining = 35 - cells.length;
  if (remaining > 0) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ type: "next", day: d });
    }
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div className="bg-white dark:bg-card rounded-3xl p-5 border border-border/80 shadow-xs">
      {/* Calendar Header with Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <h3 className="text-sm font-bold tracking-tight text-foreground">
          {MONTH_NAMES[month]} {year}
        </h3>

        <button
          type="button"
          onClick={handleNextMonth}
          className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekdays Row */}
      <div className="grid grid-cols-7 text-center mb-2">
        {WEEK_DAYS.map((d) => (
          <span key={d} className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider py-1">
            {d}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {cells.map((cell, idx) => {
          if (cell.type !== "curr") {
            return (
              <div
                key={idx}
                className="h-8 flex items-center justify-center text-[11px] text-muted-foreground/30 font-medium"
              >
                {cell.day}
              </div>
            );
          }

          const isSelected = selectedDay === cell.day;
          const isToday = isCurrentMonth && today.getDate() === cell.day;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectDay(cell.day)}
              className="relative h-8 flex flex-col items-center justify-center group focus:outline-none"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                  isSelected
                    ? "border-2 border-dashed border-foreground/60 text-foreground font-bold bg-muted/30"
                    : isToday
                    ? "bg-emerald-500/15 text-emerald-600 font-bold"
                    : "text-foreground/80 hover:bg-muted/60"
                }`}
              >
                {cell.day}
              </span>
              {isSelected && (
                <span className="flex gap-0.5 mt-0.5">
                  <span className="h-0.5 w-0.5 rounded-full bg-foreground" />
                  <span className="h-0.5 w-0.5 rounded-full bg-foreground" />
                  <span className="h-0.5 w-0.5 rounded-full bg-foreground" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
