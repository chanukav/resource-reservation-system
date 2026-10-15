"use client";

import React from "react";
import { LottiePlayer } from "@/components/ui/lottie-player";

interface LoadingAnimationProps {
  message?: string;
  subMessage?: string;
  fullscreen?: boolean;
}

export function LoadingAnimation({
  message = "Synchronizing Facility Operations",
  subMessage = "Authoritative PostgreSQL GiST conflict prevention & dispatch ledger",
  fullscreen = false,
}: LoadingAnimationProps) {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-5 animate-in fade-in-50 duration-300">
      {/* Lottie Orbital Animation */}
      <div className="relative flex items-center justify-center h-28 w-28">
        <div className="absolute inset-0 rounded-full bg-emerald-500/15 blur-xl animate-pulse" />
        <LottiePlayer
          src="/animations/loading-rings.json"
          className="h-28 w-28 drop-shadow-xs"
        />
      </div>

      {/* Loading Typography & Micro-status */}
      <div className="space-y-1.5 max-w-xs">
        <div className="flex items-center justify-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <h4 className="text-sm font-extrabold tracking-tight text-foreground">
            {message}
          </h4>
        </div>
        {subMessage && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {subMessage}
          </p>
        )}
      </div>

      {/* Three-dot wave indicator */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce" />
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return (
    <div className="flex min-h-[360px] w-full items-center justify-center">
      {content}
    </div>
  );
}

/**
 * Skeleton Loader Card for Dashboard stats and catalog placeholders
 */
export function SkeletonDashboardLoader() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="h-44 w-full rounded-3xl bg-muted/60" />

      {/* 4 Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-3xl bg-muted/50 p-5 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-7 w-12 rounded-lg bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
            </div>
            <div className="h-12 w-12 rounded-full bg-muted" />
          </div>
        ))}
      </div>

      {/* Main Content & Table Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        <div className="lg:col-span-8 h-72 rounded-3xl bg-muted/40" />
        <div className="lg:col-span-4 h-72 rounded-3xl bg-muted/40" />
      </div>
    </div>
  );
}
