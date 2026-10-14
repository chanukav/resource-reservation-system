import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ResourceCatalog, SerializedResource, SerializedCategory } from "@/components/resource-catalog";
import { ShieldCheck } from "lucide-react";
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



  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Enterprise Operations Control Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-muted/30 p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 border border-border/60 px-2 py-0.5 rounded">
                DISPATCH // WORKSPACE
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                Colombo Lab Campus • Zone LK-1
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              Enterprise Resource Reservation & Asset Management
            </h1>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              Centralized facility scheduling, media hardware dispatch, and laboratory workstations with authoritative PostgreSQL GiST conflict prevention.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1 lg:pt-0">
            {/* User Session Chip */}
            <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/90 px-3 py-1.5 text-xs shadow-2xs">
              <div className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <div className="flex flex-col leading-none">
                <span className="text-[10px] text-muted-foreground">Session</span>
                <span className="font-semibold text-foreground text-[11px]">{currentUser.name}</span>
              </div>
              <span
                className={`ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  currentUser.role === "ADMIN"
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                }`}
              >
                {currentUser.role}
              </span>
            </div>

            {currentUser.role === "ADMIN" && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-2 rounded-xl transition-colors shadow-2xs"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Admin Hub &rarr;</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Resource Catalog */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Facility & Equipment Inventory
            </h2>
            <p className="text-xs text-foreground font-medium">
              Real-time resource catalog and instant reservation dispatch
            </p>
          </div>
        </div>

        <ResourceCatalog resources={resources} categories={categories} />
      </section>
    </div>
  );
}
