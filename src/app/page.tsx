import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ResourceCatalog, SerializedResource, SerializedCategory } from "@/components/resource-catalog";
import { Building2, CalendarCheck2, Layers, CheckCircle2 } from "lucide-react";

export default async function HomePage() {
  const currentUser = await getCurrentUser();

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

  // KPI Metrics
  const totalResources = resources.length;
  const availableCount = resources.filter((r) => r.status === "AVAILABLE").length;
  const activeBookingsCount = await prisma.reservation.count({
    where: {
      status: "APPROVED",
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
            Welcome back, <span className="font-medium text-foreground">{currentUser?.name}</span>.
            Browse shared meeting rooms, media kits, and lab workstations with real-time schedule
            transparency and guaranteed double-booking prevention.
          </p>
        </div>

        {/* Live Metric Badges */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 border-t border-border/50 pt-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">{totalResources}</div>
              <div className="text-xs text-muted-foreground">Total Resources</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">{availableCount}</div>
              <div className="text-xs text-muted-foreground">Available Now</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600">
              <CalendarCheck2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">{activeBookingsCount}</div>
              <div className="text-xs text-muted-foreground">Active Bookings</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">{categories.length}</div>
              <div className="text-xs text-muted-foreground">Categories</div>
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
