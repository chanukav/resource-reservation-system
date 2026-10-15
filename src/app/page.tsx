import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SerializedResource, SerializedCategory } from "@/components/resource-catalog";
import { DashboardOverview } from "@/components/dashboard-overview";
import { ActivityReservationItem } from "@/components/reservation-activity-table";
import { UpcomingBookingItem } from "@/components/upcoming-bookings-widget";

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

  // Fetch Recent Activity for the main dashboard table
  const recentReservationsRaw = await prisma.reservation.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true } },
      resource: {
        select: {
          id: true,
          name: true,
          category: { select: { name: true } },
        },
      },
    },
  });

  const recentActivity: ActivityReservationItem[] = recentReservationsRaw.map((r) => ({
    id: r.id,
    title: r.title,
    userName: r.user.name,
    resourceName: r.resource.name,
    categoryName: r.resource.category.name,
    status: r.status,
    startTime: r.startTime.toISOString(),
  }));

  // Fetch Upcoming Bookings for the right-hand widget
  const upcomingReservationsRaw = await prisma.reservation.findMany({
    where: {
      status: { in: ["APPROVED", "PENDING"] },
      endTime: { gte: now },
    },
    take: 5,
    orderBy: { startTime: "asc" },
    include: {
      user: { select: { id: true, name: true } },
      resource: {
        select: {
          id: true,
          name: true,
          category: { select: { name: true } },
        },
      },
    },
  });

  const upcomingBookings: UpcomingBookingItem[] = upcomingReservationsRaw.map((r) => ({
    id: r.id,
    userName: r.user.name,
    resourceName: r.resource.name,
    categoryName: r.resource.category.name,
    startTime: r.startTime.toISOString(),
  }));

  // Compute metrics
  const totalResources = resources.length;
  const availableResources = resources.filter((r) => r.status === "AVAILABLE").length;
  const pendingReservations = await prisma.reservation.count({
    where: { status: "PENDING" },
  });
  const activeReservations = await prisma.reservation.count({
    where: {
      userId: currentUser.id,
      status: { in: ["APPROVED", "PENDING"] },
      endTime: { gte: now },
    },
  });

  return (
    <DashboardOverview
      currentUser={currentUser}
      resources={resources}
      categories={categories}
      recentActivity={recentActivity}
      upcomingBookings={upcomingBookings}
      stats={{
        totalResources,
        availableResources,
        pendingReservations,
        activeReservations,
      }}
    />
  );
}
