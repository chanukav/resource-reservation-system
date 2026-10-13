import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  AdminDashboard,
  AdminReservationItem,
  AdminResourceItem,
} from "@/components/admin-dashboard";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { switchUserAction } from "@/lib/auth";

export default async function AdminPage() {
  const currentUser = await getCurrentUser();

  // If currently browsing as regular user, provide an instant evaluator shortcut
  if (currentUser?.role !== "ADMIN") {
    return (
      <div className="container mx-auto max-w-xl px-4 py-20 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Administrator Access Required
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You are currently browsing as <strong className="text-foreground">{currentUser?.name || "Intern User"}</strong> ({currentUser?.email}).
            To evaluate the administrative approval and facility management workflow, switch to the Admin persona.
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await switchUserAction("ADMIN");
          }}
        >
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
            <ShieldCheck className="h-4 w-4 mr-1.5" />
            Switch to Admin Persona (admin@primewave.com)
          </Button>
        </form>
      </div>
    );
  }

  // Fetch all reservations
  const rawReservations = await prisma.reservation.findMany({
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      resource: {
        select: {
          id: true,
          name: true,
          location: true,
          category: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch all resources with reservation counts
  const rawResources = await prisma.resource.findMany({
    include: {
      category: {
        select: { id: true, name: true },
      },
      _count: {
        select: { reservations: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Fetch categories
  const categories = await prisma.resourceCategory.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const serializedReservations: AdminReservationItem[] = rawReservations.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    startTime: r.startTime.toISOString(),
    endTime: r.endTime.toISOString(),
    status: r.status,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt.toISOString(),
    user: r.user,
    resource: r.resource,
  }));

  const serializedResources: AdminResourceItem[] = rawResources.map((res) => ({
    id: res.id,
    name: res.name,
    description: res.description,
    location: res.location,
    capacity: res.capacity,
    status: res.status,
    requiresApproval: res.requiresApproval,
    categoryId: res.categoryId,
    category: res.category,
    _count: res._count,
  }));

  const pendingCount = serializedReservations.filter((r) => r.status === "PENDING").length;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Administrator Management Hub
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Review pending reservations, resolve scheduling bottlenecks, and configure organization resources.
          </p>
        </div>

        {pendingCount > 0 && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            {pendingCount} reservation{pendingCount > 1 ? "s" : ""} require your review
          </div>
        )}
      </div>

      <AdminDashboard
        reservations={serializedReservations}
        resources={serializedResources}
        categories={categories}
      />
    </div>
  );
}
