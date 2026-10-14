import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { UserReservationsList, UserReservationItem } from "@/components/user-reservations-list";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function MyReservationsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirect=/reservations");
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
    <div className="container mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Enterprise Header */}
      <div className="rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-muted/30 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 border border-border/60 px-2 py-0.5 rounded">
                DISPATCH // RESERVATION LEDGER
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                PrimeWave Reserve • Colombo Lab Campus
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              Personal Reservation Ledger
            </h1>
            <p className="text-xs text-muted-foreground">
              Tracking scheduled bookings, pending administrator approvals, and equipment dispatch records.
            </p>
          </div>

          <Link href="/">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs text-xs font-semibold">
              + Reserve Resource
            </Button>
          </Link>
        </div>
      </div>

      <UserReservationsList initialReservations={serializedReservations} />
    </div>
  );
}
