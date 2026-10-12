import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { UserReservationsList, UserReservationItem } from "@/components/user-reservations-list";
import { CalendarDays, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function MyReservationsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="rounded-full bg-amber-500/10 p-3 text-amber-600 inline-block mb-3">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Sign In Required</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Please select a persona in the top navigation bar to view personal reservations.
        </p>
      </div>
    );
  }

  const rawReservations = await prisma.reservation.findMany({
    where: { userId: currentUser.id },
    include: {
      resource: {
        select: {
          id: true,
          name: true,
          location: true,
          category: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { startTime: "desc" },
  });

  const serializedReservations: UserReservationItem[] = rawReservations.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    startTime: r.startTime.toISOString(),
    endTime: r.endTime.toISOString(),
    status: r.status,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt.toISOString(),
    resource: r.resource,
  }));

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
              <CalendarDays className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              My Reservations
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Tracking your scheduled facility bookings, pending reviews, and equipment reservations.
          </p>
        </div>

        <Link href="/">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
            + Book Another Resource
          </Button>
        </Link>
      </div>

      <UserReservationsList initialReservations={serializedReservations} />
    </div>
  );
}
