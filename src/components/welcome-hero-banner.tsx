"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

interface WelcomeHeroBannerProps {
  userName: string;
  activeCount: number;
  pendingCount?: number;
}

export function WelcomeHeroBanner({
  userName,
  activeCount,
  pendingCount = 0,
}: WelcomeHeroBannerProps) {
  const firstName = userName.split(" ")[0];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 text-white p-6 sm:p-7 shadow-md">
      {/* Subtle background glow effect */}
      <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-black/10 blur-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-lg">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Hello {firstName}! 👋
          </h2>
          <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed font-normal">
            {activeCount > 0
              ? `You have ${activeCount} active reservation${activeCount > 1 ? "s" : ""}${
                  pendingCount > 0 ? ` and ${pendingCount} pending approval${pendingCount > 1 ? "s" : ""}` : ""
                }. Everything is set for today's lab operations!`
              : "Ready to reserve laboratory workspaces, hardware kits, or conference rooms for today's tasks?"}
          </p>

          <div className="pt-2">
            <Link
              href="#catalog-section"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white underline underline-offset-4 hover:text-emerald-100 transition-colors"
            >
              <span>Explore Fleet & Reserve</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Flat SVG Vector Illustration matching reference style */}
        <div className="shrink-0 flex items-center justify-center md:justify-end pr-2">
          <svg
            className="w-36 h-28 sm:w-44 sm:h-32 drop-shadow-sm"
            viewBox="0 0 200 150"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Ambient circle glow */}
            <circle cx="125" cy="75" r="55" fill="white" fillOpacity="0.12" />

            {/* Character Torso & Clothing */}
            <path
              d="M95 145 C95 105, 155 105, 155 145 Z"
              fill="#FDE68A"
            />
            {/* Jacket / Overwear */}
            <path
              d="M102 145 C102 115, 118 118, 125 132 C132 118, 148 115, 148 145 Z"
              fill="#FEF3C7"
            />

            {/* Neck */}
            <rect x="120" y="78" width="10" height="15" rx="3" fill="#FBCFE8" />

            {/* Head */}
            <circle cx="125" cy="65" r="18" fill="#FDE2E4" />

            {/* Hair */}
            <path
              d="M107 65 C107 42, 143 42, 143 65 C143 68, 140 70, 137 66 C134 60, 130 58, 125 58 C120 58, 116 60, 113 66 C110 70, 107 68, 107 65 Z"
              fill="#1E293B"
            />
            {/* Hair Side Buns / Flow */}
            <path
              d="M108 62 C104 68, 104 78, 109 82 C110 78, 110 72, 112 68 Z"
              fill="#1E293B"
            />
            <path
              d="M142 62 C146 68, 146 78, 141 82 C140 78, 140 72, 138 68 Z"
              fill="#1E293B"
            />

            {/* Gentle smile & eye dots */}
            <circle cx="120" cy="65" r="1.5" fill="#334155" />
            <circle cx="130" cy="65" r="1.5" fill="#334155" />
            <path
              d="M122 71 Q125 74 128 71"
              stroke="#334155"
              strokeWidth="1.2"
              strokeLinecap="round"
            />

            {/* Arms holding laptop */}
            <path
              d="M104 120 L75 110 L92 98"
              stroke="#FBCFE8"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M146 120 L125 115"
              stroke="#FBCFE8"
              strokeWidth="8"
              strokeLinecap="round"
            />

            {/* Sleek Laptop (White/Silver like image) */}
            <g transform="rotate(-6 70 100)">
              {/* Screen Base */}
              <rect x="52" y="78" width="50" height="34" rx="4" fill="#FFFFFF" />
              {/* Screen Display */}
              <rect x="55" y="81" width="44" height="28" rx="2" fill="#E2E8F0" />
              {/* Screen content illustration */}
              <rect x="58" y="85" width="22" height="3" rx="1.5" fill="#10B981" />
              <rect x="58" y="91" width="36" height="2" rx="1" fill="#94A3B8" />
              <rect x="58" y="96" width="28" height="2" rx="1" fill="#94A3B8" />
              {/* Laptop Keyboard Base */}
              <path d="M46 112 L106 112 L100 119 L52 119 Z" fill="#CBD5E1" />
            </g>

            {/* Decorative Sparkles */}
            <circle cx="45" cy="40" r="2" fill="white" fillOpacity="0.8" />
            <circle cx="165" cy="35" r="2.5" fill="white" fillOpacity="0.6" />
            <circle cx="178" cy="70" r="1.5" fill="white" fillOpacity="0.7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
