import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { UserReservationsList, UserReservationItem } from "@/components/user-reservations-list";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function MyReservationsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirect=/reservations");
  }

  const isAdmin = currentUser.role === "ADMIN";

  const rawReservations = await prisma.reservation.findMany({
    where: isAdmin ? {} : { userId: currentUser.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
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
    user: r.user,
    resource: r.resource,
  }));

  return (
    <div className="space-y-6">
      {/* Enterprise Status & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/70 border border-border/70 px-2.5 py-0.5 rounded-full">
            {isAdmin ? "ADMIN // DISPATCH LEDGER" : "DISPATCH // LEDGER"}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {isAdmin
              ? "All organizational scheduled bookings, approval statuses & equipment logs"
              : "Personal scheduled bookings, pending approvals & dispatch history"}
          </span>
        </div>

        <Link href="/">
          <Button size="sm" className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs text-xs font-semibold px-4 cursor-pointer">
            + Reserve Resource
          </Button>
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        }
      >
        <UserReservationsList initialReservations={serializedReservations} isAdmin={isAdmin} />
      </Suspense>
    </div>
  );
}
