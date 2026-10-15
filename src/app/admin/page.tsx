import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  AdminDashboard,
  AdminReservationItem,
  AdminResourceItem,
  AdminUserItem,
} from "@/components/admin-dashboard";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LottiePlayer } from "@/components/ui/lottie-player";

export const metadata = {
  title: "Admin Management Hub | PrimeWave Reserve",
  description: "Enterprise administration console for managing reservations, resources, and user accounts.",
};

export default async function AdminPage() {
  const currentUser = await getCurrentUser();

  // If unauthenticated, redirect to login page
  if (!currentUser) {
    redirect("/login?redirect=/admin");
  }

  // Strict RBAC: If not an administrator, access is strictly forbidden
  if (currentUser.role !== "ADMIN") {
    return (
      <div className="container mx-auto max-w-lg px-4 py-24 text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 shadow-xs">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <Badge variant="outline" className="text-destructive border-destructive/30 px-2.5 py-0.5 text-xs font-semibold">
            403 Forbidden
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Access Denied
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
            You are currently signed in as <strong className="text-foreground">{currentUser.name}</strong> ({currentUser.email}) with the <strong className="text-foreground">{currentUser.role}</strong> role. Regular users cannot access the administration console, manage facilities, or configure user permissions.
          </p>
        </div>
        <div className="pt-2">
          <Link href="/">
            <Button variant="outline" size="sm" className="text-xs">
              Return to Resource Catalog
            </Button>
          </Link>
        </div>
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

  // Fetch all registered users
  const rawUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: { reservations: true },
      },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
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

  const serializedUsers: AdminUserItem[] = rawUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    _count: u._count,
  }));

  const pendingCount = serializedReservations.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Enterprise Status & Operations Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/70 border border-border/70 px-2.5 py-0.5 rounded-full">
            GOVERNANCE // OPERATIONS
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            Facility scheduling, pending request approvals, and RBAC control
          </span>
        </div>

        {pendingCount > 0 ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span>{pendingCount} review{pendingCount > 1 ? "s" : ""} pending approval</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 shadow-2xs">
            <LottiePlayer src="/animations/success-check.json" className="h-4 w-4" />
            <span>All Requests Processed</span>
          </div>
        )}
      </div>

      <AdminDashboard
        reservations={serializedReservations}
        resources={serializedResources}
        categories={categories}
        users={serializedUsers}
        currentAdminId={currentUser.id}
      />
    </div>
  );
}
