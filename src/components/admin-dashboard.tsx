"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateReservationStatusAction,
} from "@/actions/reservations";
import {
  createResourceAction,
  updateResourceStatusAction,
} from "@/actions/resources";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Calendar,
  Plus,
  Loader2,
  MapPin,
  Users,
} from "lucide-react";
import { ResourceStatus, ReservationStatus } from "@prisma/client";

export type AdminReservationItem = {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  rejectionReason: string | null;
  createdAt: string;
  user: {
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

export type AdminResourceItem = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number;
  status: ResourceStatus;
  requiresApproval: boolean;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
  _count: {
    reservations: number;
  };
};

interface AdminDashboardProps {
  reservations: AdminReservationItem[];
  resources: AdminResourceItem[];
  categories: { id: string; name: string }[];
}

export function AdminDashboard({
  reservations,
  resources,
  categories,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"PENDING" | "ALL_RESERVATIONS" | "RESOURCES">(
    "PENDING"
  );
  const [isPending, startTransition] = useTransition();

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedResId, setSelectedResId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // New resource modal state
  const [newResourceOpen, setNewResourceOpen] = useState(false);
  const [resName, setResName] = useState("");
  const [resDesc, setResDesc] = useState("");
  const [resLocation, setResLocation] = useState("");
  const [resCapacity, setResCapacity] = useState("1");
  const [resCategoryId, setResCategoryId] = useState(categories[0]?.id || "");
  const [resRequiresApproval, setResRequiresApproval] = useState(false);

  const pendingReservations = reservations.filter((r) => r.status === "PENDING");

  const handleApprove = (id: string) => {
    startTransition(async () => {
      const res = await updateReservationStatusAction({
        reservationId: id,
        status: ReservationStatus.APPROVED,
      });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error("Approval failed", { description: res.error });
      }
    });
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResId) return;

    startTransition(async () => {
      const res = await updateReservationStatusAction({
        reservationId: selectedResId,
        status: ReservationStatus.REJECTED,
        rejectionReason: rejectReason.trim() || "Declined by administrator.",
      });

      if (res.success) {
        toast.success(res.message);
        setRejectModalOpen(false);
        setRejectReason("");
      } else {
        toast.error("Rejection failed", { description: res.error });
      }
    });
  };

  const handleCreateResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resName.trim() || !resCategoryId) {
      toast.error("Resource name and category are required.");
      return;
    }

    startTransition(async () => {
      const res = await createResourceAction({
        name: resName.trim(),
        description: resDesc.trim(),
        location: resLocation.trim(),
        capacity: Number(resCapacity) || 1,
        categoryId: resCategoryId,
        requiresApproval: resRequiresApproval,
      });

      if (res.success) {
        toast.success(res.message);
        setNewResourceOpen(false);
        setResName("");
        setResDesc("");
        setResLocation("");
        setResCapacity("1");
        setResRequiresApproval(false);
      } else {
        toast.error("Creation failed", { description: res.error });
      }
    });
  };

  const handleStatusChange = (resourceId: string, status: ResourceStatus) => {
    startTransition(async () => {
      const res = await updateResourceStatusAction(resourceId, status);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error("Status update failed", { description: res.error });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "PENDING"
                ? "bg-emerald-600 text-white shadow-xs font-semibold"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            Pending Requests ({pendingReservations.length})
          </button>
          <button
            onClick={() => setActiveTab("ALL_RESERVATIONS")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "ALL_RESERVATIONS"
                ? "bg-emerald-600 text-white shadow-xs font-semibold"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            All Bookings ({reservations.length})
          </button>
          <button
            onClick={() => setActiveTab("RESOURCES")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "RESOURCES"
                ? "bg-emerald-600 text-white shadow-xs font-semibold"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            Manage Facilities ({resources.length})
          </button>
        </div>

        {activeTab === "RESOURCES" && (
          <Dialog open={newResourceOpen} onOpenChange={setNewResourceOpen}>
            <DialogTrigger>
              <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Resource
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <form onSubmit={handleCreateResource}>
                <DialogHeader>
                  <DialogTitle className="text-base font-semibold">Add New Organization Resource</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Register a new meeting room, lab equipment, or shared workspace.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3.5 py-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Resource Name *</Label>
                    <Input
                      placeholder="e.g. Design Thinking Room 102"
                      value={resName}
                      onChange={(e) => setResName(e.target.value)}
                      required
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Category *</Label>
                      <Select value={resCategoryId} onValueChange={(val) => setResCategoryId(val ?? "")}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Capacity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={resCapacity}
                        onChange={(e) => setResCapacity(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Location</Label>
                    <Input
                      placeholder="e.g. Building B - Level 2"
                      value={resLocation}
                      onChange={(e) => setResLocation(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Description</Label>
                    <Textarea
                      placeholder="Details, amenities, or hardware specifications..."
                      value={resDesc}
                      onChange={(e) => setResDesc(e.target.value)}
                      rows={2}
                      className="text-xs resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="req-app"
                      checked={resRequiresApproval}
                      onChange={(e) => setResRequiresApproval(e.target.checked)}
                      className="rounded border-border text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <Label htmlFor="req-app" className="text-xs font-normal cursor-pointer">
                      Require administrator approval before confirming reservations
                    </Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" size="sm" onClick={() => setNewResourceOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending}>
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                    Save Resource
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* TAB 1: PENDING REQUESTS */}
      {activeTab === "PENDING" && (
        <div className="space-y-3.5">
          {pendingReservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">All Clear!</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                There are no pending reservation requests requiring administrator signoff right now.
              </p>
            </div>
          ) : (
            pendingReservations.map((item) => {
              const startDate = new Date(item.startTime);
              const endDate = new Date(item.endTime);

              return (
                <Card key={item.id} className="border border-border/80 shadow-xs">
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 pt-4 px-4 sm:px-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground text-base">{item.title}</h3>
                        <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-500/10 text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Awaiting Review
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                          {item.resource.name}
                        </span>
                        <span>•</span>
                        <span>Requested by <strong className="text-foreground">{item.user.name}</strong> ({item.user.email})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                        disabled={isPending}
                        onClick={() => {
                          setSelectedResId(item.id);
                          setRejectModalOpen(true);
                        }}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={isPending}
                        onClick={() => handleApprove(item.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="px-4 sm:px-6 pb-4 pt-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-foreground/70" />
                        <span className="font-medium text-foreground">
                          {startDate.toLocaleDateString(undefined, {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-foreground/70" />
                        <span>
                          {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                          {endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground ml-auto">
                        Submitted {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium text-foreground">User Notes: </span>
                        {item.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: ALL SYSTEM RESERVATIONS */}
      {activeTab === "ALL_RESERVATIONS" && (
        <div className="space-y-3">
          {reservations.map((item) => {
            const startDate = new Date(item.startTime);
            const endDate = new Date(item.endTime);

            return (
              <Card key={item.id} className="border border-border/70">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 px-4 sm:px-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-foreground">{item.title}</h4>
                      <Badge variant="secondary" className="text-[11px]">
                        {item.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>{item.resource.name}</span>
                      <span>•</span>
                      <span>{item.user.name} ({item.user.email})</span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-3">
                    <span>
                      {startDate.toLocaleDateString()} • {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {/* TAB 3: MANAGE RESOURCES */}
      {activeTab === "RESOURCES" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((res) => (
            <Card key={res.id} className="border border-border/70 flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="text-[11px]">
                    {res.category.name}
                  </Badge>
                  <Select
                    value={res.status}
                    onValueChange={(val) => val && handleStatusChange(res.id, val as ResourceStatus)}
                  >
                    <SelectTrigger className="h-7 text-xs w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AVAILABLE" className="text-xs text-emerald-600">Available</SelectItem>
                      <SelectItem value="MAINTENANCE" className="text-xs text-amber-600">Maintenance</SelectItem>
                      <SelectItem value="DECOMMISSIONED" className="text-xs text-destructive">Decommissioned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-foreground mt-2">{res.name}</CardTitle>
                  {res.description && (
                    <CardDescription className="text-xs mt-1 line-clamp-2">
                      {res.description}
                    </CardDescription>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0 text-xs text-muted-foreground space-y-2 border-t border-border/50 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{res.location || "No location set"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    <span>Capacity: {res.capacity}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span>Total lifetime reservations: {res._count.reservations}</span>
                  <span>{res.requiresApproval ? "Approval required" : "Auto-approves"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleRejectSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">Reject Reservation</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Please provide a brief reason to notify the user why this request cannot be fulfilled.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-2">
              <Label htmlFor="rej-reason" className="text-xs font-medium">Rejection Reason</Label>
              <Textarea
                id="rej-reason"
                placeholder="e.g. Room reserved for executive quarterly board meeting, maintenance scheduled..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                required
                className="text-xs"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" variant="destructive" disabled={isPending}>
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Confirm Rejection
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
