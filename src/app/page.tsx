import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SerializedResource, SerializedCategory } from "@/components/resource-catalog";
import { DashboardOverview } from "@/components/dashboard-overview";
import { ActivityReservationItem } from "@/components/reservation-activity-table";
import { UpcomingBookingItem } from "@/components/upcoming-bookings-widget";
import { formatOrgDateYYYYMMDD } from "@/lib/date-utils";

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

  // Fetch all reservations for real-time analytics & calendar markings
  const allReservationsRaw = await prisma.reservation.findMany({
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
      status: true,
      userId: true,
      resourceId: true,
      resource: {
        select: {
          id: true,
          name: true,
          categoryId: true,
          category: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  // Calculate marked dates for the calendar
  const markedMap = new Map<string, { count: number; hasApproved: boolean; hasPending: boolean }>();
  for (const r of allReservationsRaw) {
    if (r.status !== "APPROVED" && r.status !== "PENDING") continue;
    const dateStr = formatOrgDateYYYYMMDD(r.startTime);
    if (!dateStr) continue;
    const cur = markedMap.get(dateStr) || { count: 0, hasApproved: false, hasPending: false };
    cur.count++;
    if (r.status === "APPROVED") cur.hasApproved = true;
    if (r.status === "PENDING") cur.hasPending = true;
    markedMap.set(dateStr, cur);
  }
  const markedDates = Array.from(markedMap.entries()).map(([dateStr, val]) => ({
    dateStr,
    ...val,
  }));

  // Today's date string in Asia/Colombo
  const todayDateStr = formatOrgDateYYYYMMDD(now);

  // 1. Conference & Meeting Rooms Analytics
  const conferenceCategory = categories.find((c) => {
    const l = c.name.toLowerCase();
    return l.includes("conference") || l.includes("meeting");
  });
  const conferenceRooms = resourcesRaw.filter((r) => {
    const l = r.category.name.toLowerCase();
    return l.includes("conference") || l.includes("meeting") || l.includes("room");
  });
  const totalConferenceRooms = conferenceRooms.length;
  const vacantConferenceRooms = conferenceRooms.filter((r) => {
    if (r.status !== "AVAILABLE") return false;
    const isCurrentlyBusy = r.reservations.some(
      (res) => res.status === "APPROVED" && res.startTime <= now && res.endTime >= now
    );
    return !isCurrentlyBusy;
  }).length;
  const conferencePct = totalConferenceRooms > 0
    ? Math.round((vacantConferenceRooms / totalConferenceRooms) * 100)
    : 0;

  // 2. Dedicated Workstations & Labs Analytics
  const workstationCategory = categories.find((c) => {
    const l = c.name.toLowerCase();
    return l.includes("workstation") || l.includes("lab");
  });
  const workstationResources = resourcesRaw.filter((r) => {
    const l = r.category.name.toLowerCase();
    return l.includes("workstation") || l.includes("lab") || l.includes("bench");
  });
  const totalWorkstations = workstationResources.length;
  const vacantWorkstations = workstationResources.filter((r) => {
    if (r.status !== "AVAILABLE") return false;
    const isCurrentlyBusy = r.reservations.some(
      (res) => res.status === "APPROVED" && res.startTime <= now && res.endTime >= now
    );
    return !isCurrentlyBusy;
  }).length;
  const workstationPct = totalWorkstations > 0
    ? Math.round((vacantWorkstations / totalWorkstations) * 100)
    : 0;

  // 3. Active Bookings Today Analytics
  const todayApprovedBookings = allReservationsRaw.filter((r) => {
    if (r.status !== "APPROVED") return false;
    const rDateStr = formatOrgDateYYYYMMDD(r.startTime);
    return rDateStr === todayDateStr;
  });
  const todayBookingsCount = todayApprovedBookings.length;
  const bookedResourcesToday = new Set(todayApprovedBookings.map((b) => b.resourceId)).size;
  const totalResources = resources.length;
  const availableResources = resources.filter((r) => r.status === "AVAILABLE").length;
  const todayOccupancyPct = totalResources > 0
    ? Math.min(100, Math.round((bookedResourcesToday / totalResources) * 100))
    : 0;

  // 4. Pending Reviews & Resolution Rate
  const pendingReservations = allReservationsRaw.filter((r) => r.status === "PENDING").length;
  const approvedReservations = allReservationsRaw.filter((r) => r.status === "APPROVED").length;
  const rejectedReservations = allReservationsRaw.filter((r) => r.status === "REJECTED").length;
  const totalDecided = approvedReservations + rejectedReservations;
  const totalAllReservations = allReservationsRaw.length;
  const reviewResolutionPct = totalAllReservations > 0
    ? Math.round((totalDecided / totalAllReservations) * 100)
    : 100;

  // Active reservations for current user (for welcome hero banner)
  const activeReservations = allReservationsRaw.filter(
    (r) => r.userId === currentUser.id && (r.status === "APPROVED" || r.status === "PENDING") && r.endTime >= now
  ).length;

  // Category breakdown for detailed analytics modal
  const categoryBreakdown = categories.map((cat) => {
    const catResources = resourcesRaw.filter((r) => r.categoryId === cat.id);
    const catTotal = catResources.length;
    const catVacant = catResources.filter((r) => {
      if (r.status !== "AVAILABLE") return false;
      const hasCurrent = r.reservations.some(
        (res) => res.status === "APPROVED" && res.startTime <= now && res.endTime >= now
      );
      return !hasCurrent;
    }).length;
    const catBookedToday = allReservationsRaw.filter((res) => {
      if (res.status !== "APPROVED") return false;
      const rDate = formatOrgDateYYYYMMDD(res.startTime);
      return rDate === todayDateStr && res.resource?.categoryId === cat.id;
    }).length;

    return {
      id: cat.id,
      name: cat.name,
      total: catTotal,
      vacant: catVacant,
      availabilityPct: catTotal > 0 ? Math.round((catVacant / catTotal) * 100) : 0,
      todayBookings: catBookedToday,
    };
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
        conferenceRooms: {
          total: totalConferenceRooms,
          vacant: vacantConferenceRooms,
          percentage: conferencePct,
          categoryId: conferenceCategory?.id,
        },
        workstations: {
          total: totalWorkstations,
          vacant: vacantWorkstations,
          percentage: workstationPct,
          categoryId: workstationCategory?.id,
        },
        activeBookings: {
          todayCount: todayBookingsCount,
          percentage: todayOccupancyPct,
          bookedResourcesToday,
        },
        pendingReviews: {
          count: pendingReservations,
          percentage: reviewResolutionPct,
          totalReservations: totalAllReservations,
        },
        categoryBreakdown,
      }}
      markedDates={markedDates}
    />
  );
}
