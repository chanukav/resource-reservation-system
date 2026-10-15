import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { NotificationsView } from "@/components/notifications-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Notifications Hub | PrimeWave Reserve",
  description: "View real-time alerts, approval status updates, and campus broadcasts.",
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      reservation: {
        include: {
          resource: {
            select: { name: true, location: true },
          },
        },
      },
    },
    take: 100,
  });

  const serialized = notifications.map((n) => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
    reservation: n.reservation
      ? {
          ...n.reservation,
          startTime: n.reservation.startTime.toISOString(),
          endTime: n.reservation.endTime.toISOString(),
        }
      : null,
  }));

  return (
    <NotificationsView
      initialNotifications={serialized}
      currentUser={user}
    />
  );
}
