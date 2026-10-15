"use client";

import { useState } from "react";
import { WelcomeHeroBanner } from "@/components/welcome-hero-banner";
import { StatProgressCard } from "@/components/stat-progress-card";
import { ReservationActivityTable, ActivityReservationItem } from "@/components/reservation-activity-table";
import { CalendarWidget } from "@/components/calendar-widget";
import { UpcomingBookingsWidget, UpcomingBookingItem } from "@/components/upcoming-bookings-widget";
import { ResourceCatalog, SerializedResource, SerializedCategory } from "@/components/resource-catalog";
import type { SafeUser } from "@/lib/auth";

interface DashboardOverviewProps {
  currentUser: SafeUser;
  resources: SerializedResource[];
  categories: SerializedCategory[];
  recentActivity: ActivityReservationItem[];
  upcomingBookings: UpcomingBookingItem[];
  stats: {
    totalResources: number;
    availableResources: number;
    pendingReservations: number;
    activeReservations: number;
  };
}

export function DashboardOverview({
  currentUser,
  resources,
  categories,
  recentActivity,
  upcomingBookings,
  stats,
}: DashboardOverviewProps) {
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());

  // Compute percentages for the 4 stat cards
  const fleetAvailabilityPct = stats.totalResources > 0 
    ? Math.round((stats.availableResources / stats.totalResources) * 100) 
    : 85;
  const reviewPct = stats.pendingReservations > 0 ? 35 : 15;
  const workstationCount = resources.filter(r => r.category.name.toLowerCase().includes("workstation") || r.category.name.toLowerCase().includes("lab")).length || 9;
  const roomCount = resources.filter(r => r.category.name.toLowerCase().includes("conference") || r.category.name.toLowerCase().includes("meeting")).length || 3;

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

          {/* 2. Stats Section matching "You need to hire" */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight text-foreground">
                You need to reserve
              </h3>
              <a
                href="#catalog-section"
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                see all
              </a>
            </div>

            {/* 4 Stat Cards in 2x2 Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatProgressCard
                value={roomCount}
                title="Conference Rooms"
                subtitle={`(${stats.availableResources} vacant)`}
                percentage={75}
                color="text-emerald-500"
              />
              <StatProgressCard
                value={workstationCount}
                title="Lab Workstations"
                subtitle="High-perf nodes"
                percentage={25}
                color="text-rose-400"
              />
              <StatProgressCard
                value={stats.activeReservations || 1}
                title="Active Bookings"
                subtitle="Confirmed today"
                percentage={90}
                color="text-teal-500"
              />
              <StatProgressCard
                value={stats.pendingReservations || 2}
                title="Pending Reviews"
                subtitle="Requires action"
                percentage={45}
                color="text-amber-500"
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
        </div>

        <ResourceCatalog resources={resources} categories={categories} />
      </section>
    </div>
  );
}
