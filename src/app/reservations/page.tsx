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
    <div className="space-y-6">
      {/* Enterprise Status & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/70 border border-border/70 px-2.5 py-0.5 rounded-full">
            DISPATCH // LEDGER
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            Personal scheduled bookings, pending approvals & dispatch history
          </span>
        </div>

        <Link href="/">
          <Button size="sm" className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs text-xs font-semibold px-4 cursor-pointer">
            + Reserve Resource
          </Button>
        </Link>
      </div>

      <UserReservationsList initialReservations={serializedReservations} />
    </div>
  );
}
