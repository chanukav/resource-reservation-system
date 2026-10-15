"use client";

import { useState } from "react";
import { WelcomeHeroBanner } from "@/components/welcome-hero-banner";
import { StatProgressCard } from "@/components/stat-progress-card";
import { ReservationActivityTable, ActivityReservationItem } from "@/components/reservation-activity-table";
import { CalendarWidget, CalendarMarkedDay } from "@/components/calendar-widget";
import { UpcomingBookingsWidget, UpcomingBookingItem } from "@/components/upcoming-bookings-widget";
import { ResourceCatalog, SerializedResource, SerializedCategory } from "@/components/resource-catalog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  Building2,
  Cpu,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Sparkles,
} from "lucide-react";
import type { SafeUser } from "@/lib/auth";

export interface DashboardStats {
  totalResources: number;
  availableResources: number;
  pendingReservations: number;
  activeReservations: number;
  conferenceRooms?: {
    total: number;
    vacant: number;
    percentage: number;
    categoryId?: string;
  };
  workstations?: {
    total: number;
    vacant: number;
    percentage: number;
    categoryId?: string;
  };
  activeBookings?: {
    todayCount: number;
    percentage: number;
    bookedResourcesToday: number;
  };
  pendingReviews?: {
    count: number;
    percentage: number;
    totalReservations: number;
  };
  categoryBreakdown?: {
    id: string;
    name: string;
    total: number;
    vacant: number;
    availabilityPct: number;
    todayBookings: number;
  }[];
}

interface DashboardOverviewProps {
  currentUser: SafeUser;
  resources: SerializedResource[];
  categories: SerializedCategory[];
  recentActivity: ActivityReservationItem[];
  upcomingBookings: UpcomingBookingItem[];
  stats: DashboardStats;
  markedDates?: CalendarMarkedDay[];
}

export function DashboardOverview({
  currentUser,
  resources,
  categories,
  recentActivity,
  upcomingBookings,
  stats,
  markedDates = [],
}: DashboardOverviewProps) {
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [activeCatalogCategory, setActiveCatalogCategory] = useState<string>("ALL");
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);

  // Fallback calculations in case stats object has partial data
  const conferenceTotal = stats.conferenceRooms?.total ?? 0;
  const conferenceVacant = stats.conferenceRooms?.vacant ?? 0;
  const conferencePct = stats.conferenceRooms?.percentage ?? 0;

  const workstationTotal = stats.workstations?.total ?? 0;
  const workstationVacant = stats.workstations?.vacant ?? 0;
  const workstationPct = stats.workstations?.percentage ?? 0;

  const todayBookingsCount = stats.activeBookings?.todayCount ?? stats.activeReservations;
  const todayOccupancyPct = stats.activeBookings?.percentage ?? 0;

  const pendingCount = stats.pendingReviews?.count ?? stats.pendingReservations;
  const resolutionPct = stats.pendingReviews?.percentage ?? 100;

  const handleSelectConferenceRooms = () => {
    if (stats.conferenceRooms?.categoryId) {
      setActiveCatalogCategory(stats.conferenceRooms.categoryId);
    }
    document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSelectWorkstations = () => {
    if (stats.workstations?.categoryId) {
      setActiveCatalogCategory(stats.workstations.categoryId);
    }
    document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="space-y-8">
      {/* 2-Column Dashboard Grid matching Reference UI Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        
        {/* Main Content Column (Left/Center) */}
        <div className="lg:col-span-8 space-y-7">
          {/* 1. Welcome Hero Banner */}
          <WelcomeHeroBanner
            userName={currentUser.name}
            activeCount={stats.activeReservations}
            pendingCount={currentUser.role === "ADMIN" ? stats.pendingReservations : 0}
          />

          {/* 2. Proper Working Analytics Section matching "You need to reserve" */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight text-foreground">
                  You need to reserve
                </h3>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Live metrics
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAnalyticsModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:underline transition-colors cursor-pointer"
              >
                <span>see all analytics</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* 4 Stat Cards in 2x2 Grid with Authentic Live Numbers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatProgressCard
                value={conferenceTotal}
                title="Conference Rooms"
                subtitle={`(${conferenceVacant} vacant)`}
                percentage={conferencePct}
                color={conferencePct > 50 ? "text-emerald-500" : conferencePct > 0 ? "text-amber-500" : "text-rose-400"}
                onClick={handleSelectConferenceRooms}
                tooltip="Click to view and reserve available Conference Rooms"
              />
              <StatProgressCard
                value={workstationTotal}
                title="Lab Workstations"
                subtitle={`(${workstationVacant} vacant)`}
                percentage={workstationPct}
                color={workstationPct > 50 ? "text-teal-500" : "text-rose-400"}
                onClick={handleSelectWorkstations}
                tooltip="Click to view and reserve available Lab Workstations"
              />
              <StatProgressCard
                value={todayBookingsCount}
                title="Active Bookings"
                subtitle={todayBookingsCount > 0 ? `${todayBookingsCount} confirmed today` : "No bookings today"}
                percentage={todayOccupancyPct}
                color="text-emerald-500"
                href="/reservations?filter=UPCOMING"
                tooltip="Click to view upcoming dispatch ledger"
              />
              <StatProgressCard
                value={pendingCount}
                title="Pending Reviews"
                subtitle={pendingCount === 0 ? "All reviews cleared" : `${pendingCount} requires action`}
                percentage={resolutionPct}
                color={pendingCount === 0 ? "text-emerald-500" : "text-amber-500"}
                href={currentUser.role === "ADMIN" ? "/admin" : "/reservations?filter=PENDING"}
                tooltip={currentUser.role === "ADMIN" ? "Click to open admin review queue" : "Click to view your pending bookings"}
              />
            </div>
          </div>

          {/* 3. Reservation Activity Table matching "Recruitment progress" */}
          <ReservationActivityTable
            items={recentActivity}
            seeAllHref="/reservations"
          />
        </div>

        {/* Right Sidebar Column */}
        <div className="lg:col-span-4 space-y-7">
          {/* 1. Interactive Calendar Widget */}
          <CalendarWidget
            selectedDate={selectedCalendarDate}
            onSelectDate={(d) => setSelectedCalendarDate(d)}
            markedDates={markedDates}
          />

          {/* 2. New Applicants / Upcoming Bookings List Widget */}
          <UpcomingBookingsWidget
            items={upcomingBookings}
            seeAllHref="/reservations"
          />
        </div>
      </div>

      {/* Main Resource Inventory Catalog */}
      <section id="catalog-section" className="pt-4 border-t border-border/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground">
              Facility & Equipment Inventory
            </h2>
            <p className="text-xs text-muted-foreground">
              Browse real-time lab workstations, conference suites, and media hardware
            </p>
          </div>
          {activeCatalogCategory !== "ALL" && (
            <button
              type="button"
              onClick={() => setActiveCatalogCategory("ALL")}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Show all categories
            </button>
          )}
        </div>

        <ResourceCatalog
          resources={resources}
          categories={categories}
          activeCategoryId={activeCatalogCategory}
          onSelectCategory={(id) => setActiveCatalogCategory(id)}
        />
      </section>

      {/* Enterprise Analytics Breakdown Modal */}
      <Dialog open={isAnalyticsModalOpen} onOpenChange={setIsAnalyticsModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-6 bg-white dark:bg-card border border-border shadow-xl">
          <DialogHeader className="space-y-1.5 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <BarChart3 className="h-4 w-4" />
              </div>
              <DialogTitle className="text-lg font-black tracking-tight text-foreground">
                Fleet Analytics & Utilization Hub
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Live organizational metrics, equipment availability, and dispatch health for PrimeWave Reserve.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Quick KPI Overview */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-muted/40 p-3 border border-border/60 text-center">
                <span className="text-xs text-muted-foreground font-medium block">Total Fleet</span>
                <span className="text-xl font-extrabold text-foreground">{stats.totalResources}</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                  {stats.availableResources} vacant
                </span>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3 border border-border/60 text-center">
                <span className="text-xs text-muted-foreground font-medium block">Occupancy Today</span>
                <span className="text-xl font-extrabold text-foreground">{todayOccupancyPct}%</span>
                <span className="text-[10px] text-muted-foreground font-semibold block mt-0.5">
                  {todayBookingsCount} active bookings
                </span>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3 border border-border/60 text-center">
                <span className="text-xs text-muted-foreground font-medium block">Clearance SLA</span>
                <span className="text-xl font-extrabold text-foreground">{resolutionPct}%</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block mt-0.5">
                  {pendingCount} in queue
                </span>
              </div>
            </div>

            {/* Per-Category Utilization Breakdown */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                Category Availability Breakdown
              </h4>

              <div className="space-y-2">
                {stats.categoryBreakdown?.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-3 rounded-2xl bg-muted/30 border border-border/60 flex flex-col gap-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{cat.name}</span>
                      <span className="font-mono font-bold text-foreground">
                        {cat.vacant} / {cat.total} vacant ({cat.availabilityPct}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-muted/70 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${cat.availabilityPct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAnalyticsModalOpen(false)}
                className="text-xs rounded-full"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setIsAnalyticsModalOpen(false);
                  document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-xs rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                View Inventory Catalog
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
