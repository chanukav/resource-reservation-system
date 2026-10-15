"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cancelReservationAction } from "@/actions/reservations";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  XCircle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Globe,
  X,
  User,
} from "lucide-react";
import {
  formatOrgDate,
  formatOrgDateYYYYMMDD,
  formatOrgTimeRange,
  ORGANIZATION_TIMEZONE,
} from "@/lib/date-utils";
import { EditReservationModal } from "@/components/edit-reservation-modal";

export type UserReservationItem = {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "COMPLETED";
  rejectionReason: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  resource: {
    id: string;
    name: string;
    location: string | null;
    category: {
      name: string;
    };
  };
};

interface UserReservationsListProps {
  initialReservations: UserReservationItem[];
  isAdmin?: boolean;
}

export function UserReservationsList({ initialReservations, isAdmin = false }: UserReservationsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date"); // e.g. "2026-10-15"

  const [filter, setFilter] = useState<string>("ALL");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to cancel the reservation for "${title}"?`)) {
      return;
    }

    setCancellingId(id);
    try {
      const res = await cancelReservationAction(id);
      if (res.success) {
        toast.success(res.message || "Reservation cancelled.");
      } else {
        toast.error("Failed to cancel", { description: res.error });
      }
    } catch {
      toast.error("An error occurred while cancelling.");
    } finally {
      setCancellingId(null);
    }
  };

  const filtered = initialReservations.filter((res) => {
    // If a date filter is passed from calendar click, check date match
    if (dateParam) {
      const resDateStr = formatOrgDateYYYYMMDD(res.startTime);
      if (resDateStr !== dateParam) {
        return false;
      }
    }

    if (filter === "ALL") return true;
    if (filter === "UPCOMING") {
      return (
        (res.status === "APPROVED" || res.status === "PENDING") &&
        new Date(res.endTime) >= new Date()
      );
    }
    return res.status === filter;
  });

  const getStatusBadge = (status: UserReservationItem["status"]) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/10 text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="outline" className="border-destructive/30 text-destructive bg-destructive/10 text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="outline" className="border-muted text-muted-foreground bg-muted/40 text-xs">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Timezone Guarantee Banner */}
      <div className="flex items-center justify-between rounded-lg bg-blue-500/10 px-4 py-2 text-xs text-blue-700 dark:text-blue-300 border border-blue-500/20">
        <span className="flex items-center gap-1.5 font-medium">
          <Globe className="h-4 w-4" />
          Organizational Time Zone Guarantee
        </span>
        <span className="font-mono text-xs font-semibold">
          {ORGANIZATION_TIMEZONE} (UTC+05:30)
        </span>
      </div>

      {/* Date Filter Active Banner */}
      {dateParam && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Showing reservations for:{" "}
              <strong className="font-bold underline">
                {formatOrgDate(new Date(`${dateParam}T00:00:00+05:30`), {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </strong>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 font-bold text-[10px]">
              {filtered.length} booking{filtered.length === 1 ? "" : "s"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => router.push("/reservations")}
            className="inline-flex items-center gap-1 font-bold text-xs hover:text-emerald-950 dark:hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
          >
            <X className="h-3.5 w-3.5" />
            <span>Clear date filter</span>
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        {[
          { key: "ALL", label: `All (${initialReservations.length})` },
          { key: "UPCOMING", label: "Active & Upcoming" },
          { key: "PENDING", label: "Pending Review" },
          { key: "APPROVED", label: "Approved" },
          { key: "CANCELLED", label: "Cancelled" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              filter === tab.key
                ? "bg-foreground text-background font-semibold shadow-xs"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-16 text-center bg-white dark:bg-card">
          <Calendar className="h-8 w-8 text-muted-foreground mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No reservations found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            {filter === "ALL"
              ? "You haven't placed any facility or equipment reservations yet."
              : `No reservations matching the "${filter.toLowerCase()}" filter.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((item) => {
            const startDate = new Date(item.startTime);
            const endDate = new Date(item.endTime);
            const isUpcoming = (item.status === "APPROVED" || item.status === "PENDING") && endDate >= new Date();

            return (
              <Card key={item.id} className="rounded-3xl border border-border/80 bg-white dark:bg-card shadow-xs transition-all hover:border-border hover:shadow-md">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 pt-4 px-4 sm:px-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground text-base tracking-tight">
                        {item.title}
                      </h3>
                      {getStatusBadge(item.status)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/90 flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                        {item.resource.name}
                      </span>
                      <span>•</span>
                      <span>{item.resource.category.name}</span>
                      {item.resource.location && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {item.resource.location}
                          </span>
                        </>
                      )}
                      {item.user && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                            <User className="h-3 w-3" />
                            {item.user.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {isUpcoming && (
                    <div className="flex items-center gap-2 shrink-0">
                      <EditReservationModal reservation={item} />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 shrink-0"
                        onClick={() => handleCancel(item.id, item.title)}
                        disabled={cancellingId === item.id}
                      >
                        {cancellingId === item.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          "Cancel"
                        )}
                      </Button>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="px-4 sm:px-6 pb-4 pt-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-foreground/70" />
                      <span className="font-medium text-foreground">
                        {formatOrgDate(startDate)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-foreground/70" />
                      <span>
                        {formatOrgTimeRange(startDate, endDate)}
                      </span>
                    </div>

                    <div className="text-[11px] text-muted-foreground/80 ml-auto">
                      Booked on {formatOrgDate(new Date(item.createdAt), { weekday: undefined })}
                    </div>
                  </div>

                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      <span className="font-medium text-foreground/80">Notes: </span>
                      {item.description}
                    </p>
                  )}

                  {item.rejectionReason && (
                    <div className="mt-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded-lg">
                      <span className="font-semibold">Reason for rejection: </span>
                      {item.rejectionReason}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
