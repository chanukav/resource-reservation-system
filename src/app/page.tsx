import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ResourceCatalog, SerializedResource, SerializedCategory } from "@/components/resource-catalog";
import { Building2, CalendarCheck2, Layers, CheckCircle2, ShieldCheck, UserCheck } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  // Fetch categories with resource counts
  const categoriesRaw = await prisma.resourceCategory.findMany({
    include: {
      _count: {
        select: { resources: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Fetch resources with their category and current/upcoming reservations
  const now = new Date();
  const resourcesRaw = await prisma.resource.findMany({
    include: {
      category: {
        select: { id: true, name: true },
      },
      reservations: {
        where: {
          status: { in: ["APPROVED", "PENDING"] },
          endTime: { gte: now },
        },
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          status: true,
        },
        orderBy: { startTime: "asc" },
      },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  // Convert Date objects to ISO strings for Client Component boundary
  const resources: SerializedResource[] = resourcesRaw.map((r) => ({
    ...r,
    reservations: r.reservations.map((res) => ({
      ...res,
      startTime: res.startTime.toISOString(),
      endTime: res.endTime.toISOString(),
    })),
  }));

  const categories: SerializedCategory[] = categoriesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    _count: c._count,
  }));

  // ----------------------------------------------------
  // KPI Metrics: Clearly distinguishing Operational Status vs Real-Time Occupancy vs Scheduled Queue
  // (Finding 8 Alignment)
  // ----------------------------------------------------
  const totalResources = resources.length;

  // 1. Operational status: Can this resource be booked at all? (excludes Maintenance and Decommissioned)
  const operationalResources = resources.filter((r) => r.status === "AVAILABLE");
  const operationalCount = operationalResources.length;
  const maintenanceCount = resources.filter((r) => r.status === "MAINTENANCE").length;

  // 2. Real-time Occupancy: Which operational resources are physically in-use right now?
  const currentlyOccupiedResources = operationalResources.filter((r) =>
    r.reservations.some(
      (res) =>
        res.status === "APPROVED" &&
        new Date(res.startTime) <= now &&
        new Date(res.endTime) > now
    )
  );
  const occupiedNowCount = currentlyOccupiedResources.length;

  // 3. Immediately Vacant: Operational resources that have no active booking at the current moment
  const vacantNowCount = operationalCount - occupiedNowCount;

  // 4. Scheduled Sessions: Active/upcoming bookings in queue
  const activeBookingsCount = await prisma.reservation.count({
    where: {
      status: { in: ["APPROVED", "PENDING"] },
      endTime: { gte: now },
    },
  });

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Hero & Context Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-emerald-500/10 via-background to-muted/40 p-6 sm:p-8">
        <div className="max-w-2xl space-y-2.5">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            PrimeWave Lab Shared Facility Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Resource Reservation Management
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Welcome back, <span className="font-medium text-foreground">{currentUser.name}</span>.
            Browse shared meeting rooms, media kits, and lab workstations with real-time schedule
            transparency and guaranteed double-booking prevention.
          </p>

          {/* Explicit Role Privileges Banner */}
          {currentUser.role === "ADMIN" ? (
            <div className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Administrator Access:</strong> Full authority to approve/reject bookings, manage resources, and configure user permissions.
              </span>
              <Link
                href="/admin"
                className="font-semibold underline ml-1 text-emerald-700 dark:text-emerald-300 hover:text-emerald-900"
              >
                Open Admin Hub &rarr;
              </Link>
            </div>
          ) : (
            <div className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-800 dark:text-blue-300">
              <UserCheck className="h-4 w-4 text-blue-600 shrink-0" />
              <span>
                <strong>Standard User Access:</strong> Browse facilities, check schedules, and reserve assets. Administrative controls are restricted to administrators.
              </span>
            </div>
          )}
        </div>

        {/* Live Metric Badges */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4 border-t border-border/50 pt-6">
          {/* 1. Operational Fleet */}
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">
                {operationalCount}
                <span className="text-xs font-normal text-muted-foreground">/{totalResources}</span>
              </div>
              <div className="text-xs font-medium text-foreground">Operational Assets</div>
              <div className="text-[10px] text-muted-foreground">
                {maintenanceCount > 0 ? `${maintenanceCount} in maintenance` : "100% operational"}
              </div>
            </div>
          </div>

          {/* 2. Vacant Right Now */}
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-teal-500/10 p-2 text-teal-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">{vacantNowCount}</div>
              <div className="text-xs font-medium text-foreground">Vacant Right Now</div>
              <div className="text-[10px] text-muted-foreground">Free for immediate booking</div>
            </div>
          </div>

          {/* 3. Currently Occupied */}
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600">
              <CalendarCheck2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">{occupiedNowCount}</div>
              <div className="text-xs font-medium text-foreground">In Use Right Now</div>
              <div className="text-[10px] text-muted-foreground">Active session ongoing</div>
            </div>
          </div>

          {/* 4. Scheduled Bookings */}
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600">
              <CalendarCheck2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">{activeBookingsCount}</div>
              <div className="text-xs font-medium text-foreground">Scheduled Queue</div>
              <div className="text-[10px] text-muted-foreground">Active & upcoming bookings</div>
            </div>
          </div>

          {/* 5. Asset Categories */}
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">{categories.length}</div>
              <div className="text-xs font-medium text-foreground">Categories</div>
              <div className="text-[10px] text-muted-foreground">Classified facility types</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Resource Catalog */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Available Facilities & Equipment
            </h2>
            <p className="text-xs text-muted-foreground">
              Select any resource to view details and schedule a reserved slot.
            </p>
          </div>
        </div>

        <ResourceCatalog resources={resources} categories={categories} />
      </section>
    </div>
  );
}
