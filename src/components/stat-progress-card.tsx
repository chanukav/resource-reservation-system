"use client";

import React from "react";

interface StatProgressCardProps {
  value: string | number;
  title: string;
  subtitle: string;
  percentage: number;
  color?: string; // Tailwind text color class, e.g. text-emerald-500, text-amber-500, text-blue-500, text-rose-400
  onClick?: () => void;
  href?: string;
  tooltip?: string;
}

export function StatProgressCard({
  value,
  title,
  subtitle,
  percentage,
  color = "text-emerald-500",
  onClick,
  href,
  tooltip,
}: StatProgressCardProps) {
  const size = 52;
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(percentage, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;

  const content = (
    <div
      onClick={onClick}
      title={tooltip || `${title}: ${value} (${clamped}%)`}
      className={`bg-white dark:bg-card rounded-3xl p-5 border border-border/80 shadow-xs flex items-center justify-between transition-all group ${
        onClick || href
          ? "cursor-pointer hover:border-emerald-500/50 hover:shadow-md hover:scale-[1.01]"
          : "hover:shadow-md"
      }`}
    >
      <div className="flex items-center gap-3.5">
        <span className="text-3xl font-extrabold tracking-tight text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          {value}
        </span>
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-foreground leading-tight">
            {title}
          </h4>
          <p className="text-[11px] text-muted-foreground font-medium">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Radial Progress Ring */}
      <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/70"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`${color} transition-all duration-700 ease-out`}
            fill="none"
          />
        </svg>
        <span className="absolute text-[10px] font-semibold text-muted-foreground">
          {clamped}%
        </span>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-3xl">
        {content}
      </a>
    );
  }

  return content;
}
