import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ResourceCatalog, SerializedResource, SerializedCategory } from "@/components/resource-catalog";
import { Building2, CalendarCheck2, Layers, CheckCircle2, ShieldCheck } from "lucide-react";
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
      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-emerald-500/[0.08] via-card to-background p-6 sm:p-8 shadow-xs">
        {/* Ambient decorative blur */}
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

        <div className="relative max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            PrimeWave Lab Shared Facility Portal
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
            Resource Reservation Management
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Welcome back, <strong className="text-foreground">{currentUser.name}</strong>
            <span
              className={`inline-flex items-center ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                currentUser.role === "ADMIN"
                  ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                  : "border-blue-500/40 text-blue-600 bg-blue-500/10"
              }`}
            >
              {currentUser.role}
            </span>
            . Browse shared meeting spaces, media equipment, and lab workstations with live occupancy and guaranteed conflict prevention.
          </p>

          {currentUser.role === "ADMIN" && (
            <div className="pt-1">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Open Administrator Hub &rarr;</span>
              </Link>
            </div>
          )}
        </div>

        {/* Live Metric Cards Grid */}
        <div className="relative mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
          {/* 1. Operational Fleet */}
          <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card/90 p-4 shadow-2xs backdrop-blur-xs transition-all hover:-translate-y-0.5 hover:shadow-xs hover:border-emerald-500/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Fleet Status</span>
              <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {operationalCount}
                <span className="text-xs font-normal text-muted-foreground ml-1">/{totalResources}</span>
              </div>
              <div className="text-xs font-medium text-foreground mt-0.5">Operational Assets</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {maintenanceCount > 0 ? `${maintenanceCount} in maintenance` : "100% operational"}
              </p>
            </div>
          </div>

          {/* 2. Vacant Right Now */}
          <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card/90 p-4 shadow-2xs backdrop-blur-xs transition-all hover:-translate-y-0.5 hover:shadow-xs hover:border-teal-500/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Availability</span>
              <div className="rounded-xl bg-teal-500/10 p-2 text-teal-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground">{vacantNowCount}</div>
              <div className="text-xs font-medium text-foreground mt-0.5">Vacant Right Now</div>
              <p className="text-[10px] text-teal-600 dark:text-teal-400 font-medium mt-0.5">Free for immediate booking</p>
            </div>
          </div>

          {/* 3. Currently Occupied */}
          <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card/90 p-4 shadow-2xs backdrop-blur-xs transition-all hover:-translate-y-0.5 hover:shadow-xs hover:border-blue-500/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Live Occupancy</span>
              <div className="rounded-xl bg-blue-500/10 p-2 text-blue-600">
                <CalendarCheck2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground">{occupiedNowCount}</div>
              <div className="text-xs font-medium text-foreground mt-0.5">In Active Use</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {occupiedNowCount > 0 ? "Active sessions live" : "No ongoing sessions"}
              </p>
            </div>
          </div>

          {/* 4. Scheduled Bookings */}
          <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card/90 p-4 shadow-2xs backdrop-blur-xs transition-all hover:-translate-y-0.5 hover:shadow-xs hover:border-purple-500/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Queue</span>
              <div className="rounded-xl bg-purple-500/10 p-2 text-purple-600">
                <CalendarCheck2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground">{activeBookingsCount}</div>
              <div className="text-xs font-medium text-foreground mt-0.5">Scheduled Queue</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Active & upcoming slots</p>
            </div>
          </div>

          {/* 5. Asset Categories */}
          <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card/90 p-4 shadow-2xs backdrop-blur-xs transition-all hover:-translate-y-0.5 hover:shadow-xs hover:border-amber-500/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Classifications</span>
              <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground">{categories.length}</div>
              <div className="text-xs font-medium text-foreground mt-0.5">Asset Categories</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Classified facilities</p>
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
