"use client";

import Link from "next/link";
import { MoreVertical, ExternalLink } from "lucide-react";
import { formatOrgDate } from "@/lib/date-utils";

export interface ActivityReservationItem {
  id: string;
  title: string;
  userName: string;
  resourceName: string;
  categoryName: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "COMPLETED";
  startTime: string;
}

interface ReservationActivityTableProps {
  items: ActivityReservationItem[];
  seeAllHref?: string;
}

export function ReservationActivityTable({
  items,
  seeAllHref = "/reservations",
}: ReservationActivityTableProps) {
  const getStatusDot = (status: ActivityReservationItem["status"]) => {
    switch (status) {
      case "APPROVED":
        return { color: "bg-emerald-500", text: "Approved" };
      case "PENDING":
        return { color: "bg-amber-500", text: "Pending Review" };
      case "COMPLETED":
        return { color: "bg-blue-500", text: "Completed" };
      case "REJECTED":
        return { color: "bg-rose-500", text: "Declined" };
      case "CANCELLED":
        return { color: "bg-slate-400", text: "Cancelled" };
      default:
        return { color: "bg-slate-400", text: status };
    }
  };

  return (
    <div className="bg-white dark:bg-card rounded-3xl p-6 border border-border/80 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold tracking-tight text-foreground">
          Reservation progress
        </h3>

        <Link
          href={seeAllHref}
          className="inline-flex items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-1.5 transition-all shadow-xs"
        >
          See all
        </Link>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border/60 text-muted-foreground/80 font-medium">
              <th className="pb-3 font-medium">Full name</th>
              <th className="pb-3 font-medium">Resource / Task</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-muted-foreground">
                  No reservation activity recorded today.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const statusMeta = getStatusDot(item.status);

                return (
                  <tr key={item.id} className="group hover:bg-muted/30 transition-colors">
                    {/* User / Initiator */}
                    <td className="py-3.5 pr-3 font-semibold text-foreground">
                      <div className="flex flex-col">
                        <span>{item.userName}</span>
                        <span className="text-[10px] text-muted-foreground font-normal sm:hidden">
                          {item.resourceName}
                        </span>
                      </div>
                    </td>

                    {/* Resource / Category */}
                    <td className="py-3.5 pr-3 text-muted-foreground">
                      <span className="font-medium text-foreground/80">{item.resourceName}</span>
                      <span className="text-[11px] text-muted-foreground/70 block">
                        {item.categoryName}
                      </span>
                    </td>

                    {/* Status with Colored Dot */}
                    <td className="py-3.5 pr-3">
                      <div className="inline-flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${statusMeta.color}`} />
                        <span className="font-medium text-foreground text-xs">
                          {statusMeta.text}
                        </span>
                      </div>
                    </td>

                    {/* Action 3-dots */}
                    <td className="py-3.5 text-right text-muted-foreground/60 group-hover:text-foreground">
                      <Link
                        href={seeAllHref}
                        className="inline-flex items-center justify-center h-6 w-6 rounded-full hover:bg-muted transition-colors"
                        title="View details"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
