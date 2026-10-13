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
import {
  createUserAction,
  updateUserRoleAction,
  deleteUserAction,
} from "@/actions/users";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Loader2,
  MapPin,
  Users,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Trash2,
} from "lucide-react";
import { ResourceStatus, ReservationStatus } from "@prisma/client";
import {
  formatOrgDate,
  formatOrgTimeRange,
} from "@/lib/date-utils";

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

export type AdminUserItem = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
  _count: {
    reservations: number;
  };
};

interface AdminDashboardProps {
  reservations: AdminReservationItem[];
  resources: AdminResourceItem[];
  categories: { id: string; name: string }[];
  users?: AdminUserItem[];
  currentAdminId?: string;
}

export function AdminDashboard({
  reservations,
  resources,
  categories,
  users = [],
  currentAdminId,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "PENDING" | "ALL_RESERVATIONS" | "RESOURCES" | "USERS"
  >("PENDING");
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

  // New user modal state
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState<"USER" | "ADMIN">("USER");

  // Delete user state
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUserItem | null>(null);

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

    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      toast.error("Please provide a descriptive rejection reason (minimum 5 characters).");
      return;
    }

    startTransition(async () => {
      const res = await updateReservationStatusAction({
        reservationId: selectedResId,
        status: ReservationStatus.REJECTED,
        rejectionReason: rejectReason.trim(),
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

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim() || !userPassword) {
      toast.error("Please fill in all required fields.");
      return;
    }

    startTransition(async () => {
      const res = await createUserAction({
        name: userName.trim(),
        email: userEmail.trim(),
        password: userPassword,
        role: userRole,
      });

      if (res.success) {
        toast.success(res.message);
        setNewUserOpen(false);
        setUserName("");
        setUserEmail("");
        setUserPassword("");
        setUserRole("USER");
      } else {
        toast.error("User creation failed", { description: res.error });
      }
    });
  };

  const handleRoleChange = (userId: string, newRole: "USER" | "ADMIN") => {
    startTransition(async () => {
      const res = await updateUserRoleAction({ userId, role: newRole });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error("Role update failed", { description: res.error });
      }
    });
  };

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    startTransition(async () => {
      const res = await deleteUserAction({ userId: userToDelete.id });
      if (res.success) {
        toast.success(res.message);
        setDeleteUserDialogOpen(false);
        setUserToDelete(null);
      } else {
        toast.error("Delete failed", { description: res.error });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
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
          <button
            onClick={() => setActiveTab("USERS")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "USERS"
                ? "bg-emerald-600 text-white shadow-xs font-semibold"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            User Management ({users.length})
          </button>
        </div>

        {/* Action button for active tab */}
        {activeTab === "RESOURCES" && (
          <Dialog open={newResourceOpen} onOpenChange={setNewResourceOpen}>
            <DialogTrigger
              render={
                <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Resource
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[480px]">
              <form onSubmit={handleCreateResource}>
                <DialogHeader>
                  <DialogTitle className="text-base font-semibold">Add New Organization Resource</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Register a new meeting room, lab equipment, or shared workspace.
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="res-name" className="text-xs font-medium">Resource Name</Label>
                    <Input
                      id="res-name"
                      placeholder="e.g. Conference Room Delta"
                      value={resName}
                      onChange={(e) => setResName(e.target.value)}
                      required
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="res-cat" className="text-xs font-medium">Category</Label>
                    <Select value={resCategoryId} onValueChange={(v) => v && setResCategoryId(v)}>
                      <SelectTrigger id="res-cat" className="text-xs">
                        <SelectValue />
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

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="res-loc" className="text-xs font-medium">Location</Label>
                      <Input
                        id="res-loc"
                        placeholder="e.g. 2nd Floor, West Wing"
                        value={resLocation}
                        onChange={(e) => setResLocation(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="res-cap" className="text-xs font-medium">Capacity</Label>
                      <Input
                        id="res-cap"
                        type="number"
                        min="1"
                        value={resCapacity}
                        onChange={(e) => setResCapacity(e.target.value)}
                        required
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="res-desc" className="text-xs font-medium">Description</Label>
                    <Textarea
                      id="res-desc"
                      placeholder="Brief notes on equipment, amenities, or usage restrictions..."
                      value={resDesc}
                      onChange={(e) => setResDesc(e.target.value)}
                      rows={2}
                      className="text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="res-req-app"
                      checked={resRequiresApproval}
                      onChange={(e) => setResRequiresApproval(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
                    />
                    <Label htmlFor="res-req-app" className="text-xs font-medium cursor-pointer">
                      Require administrator approval before confirming bookings
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

        {activeTab === "USERS" && (
          <Dialog open={newUserOpen} onOpenChange={setNewUserOpen}>
            <DialogTrigger
              render={
                <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                  <UserPlus className="h-3.5 w-3.5 mr-1" />
                  Add User
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[440px]">
              <form onSubmit={handleCreateUser}>
                <DialogHeader>
                  <DialogTitle className="text-base font-semibold">Create New User Account</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Register a new enterprise member or administrator in the system.
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-user-name" className="text-xs font-medium">Full Name</Label>
                    <Input
                      id="new-user-name"
                      placeholder="e.g. Kasun Perera"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      required
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="new-user-email" className="text-xs font-medium">Email Address</Label>
                    <Input
                      id="new-user-email"
                      type="email"
                      placeholder="k.perera@primewave.com"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      required
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="new-user-pass" className="text-xs font-medium">Password</Label>
                    <Input
                      id="new-user-pass"
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      required
                      minLength={6}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="new-user-role" className="text-xs font-medium">Assigned Role</Label>
                    <Select value={userRole} onValueChange={(v) => v && setUserRole(v as "USER" | "ADMIN")}>
                      <SelectTrigger id="new-user-role" className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER" className="text-xs">
                          Engineering Member (USER) — Booking privileges
                        </SelectItem>
                        <SelectItem value="ADMIN" className="text-xs">
                          Platform Administrator (ADMIN) — Full approvals & user management
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" size="sm" onClick={() => setNewUserOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending}>
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                    Create User
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* TAB 1: PENDING RESERVATIONS */}
      {activeTab === "PENDING" && (
        <div className="space-y-3">
          {pendingReservations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 p-12 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
              <h3 className="text-sm font-semibold text-foreground">All Clear! No Pending Requests</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                All reservation submissions have been evaluated. New requests requiring approval will appear here.
              </p>
            </div>
          ) : (
            pendingReservations.map((res) => (
              <Card key={res.id} className="overflow-hidden border-border/80 shadow-xs hover:border-border transition-colors">
                <CardHeader className="py-3 px-4 sm:px-6 bg-muted/20 border-b border-border/50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/5 text-xs font-semibold">
                        PENDING APPROVAL
                      </Badge>
                      <span className="text-xs text-muted-foreground font-medium">•</span>
                      <span className="text-xs font-semibold text-foreground">{res.resource.name}</span>
                      <span className="text-xs text-muted-foreground">({res.resource.category.name})</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Requested {formatOrgDate(new Date(res.createdAt))}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <h4 className="text-base font-semibold text-foreground tracking-tight">{res.title}</h4>
                      {res.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{res.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-emerald-600" />
                          <span>
                            {formatOrgDate(new Date(res.startTime))}:{" "}
                            {formatOrgTimeRange(new Date(res.startTime), new Date(res.endTime))}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          <span>{res.user.name} ({res.user.email})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                        disabled={isPending}
                        onClick={() => {
                          setSelectedResId(res.id);
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
                        onClick={() => handleApprove(res.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* TAB 2: ALL RESERVATIONS */}
      {activeTab === "ALL_RESERVATIONS" && (
        <div className="space-y-3">
          {reservations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 p-12 text-center text-xs text-muted-foreground">
              No reservations found in the system database.
            </div>
          ) : (
            reservations.map((res) => {
              const statusColors: Record<string, string> = {
                APPROVED: "text-emerald-600 border-emerald-500/30 bg-emerald-500/5",
                PENDING: "text-amber-600 border-amber-500/30 bg-amber-500/5",
                REJECTED: "text-destructive border-destructive/30 bg-destructive/5",
                CANCELLED: "text-muted-foreground border-border bg-muted/20",
                COMPLETED: "text-blue-600 border-blue-500/30 bg-blue-500/5",
              };

              return (
                <div
                  key={res.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl border border-border/80 bg-card hover:border-border transition-colors gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[11px] font-semibold ${statusColors[res.status] || ""}`}>
                        {res.status}
                      </Badge>
                      <span className="text-xs font-semibold text-foreground">{res.title}</span>
                      <span className="text-xs text-muted-foreground">• {res.resource.name}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Booked by: <strong className="text-foreground">{res.user.name}</strong> ({res.user.email})</span>
                      <span>
                        {formatOrgDate(new Date(res.startTime))},{" "}
                        {formatOrgTimeRange(new Date(res.startTime), new Date(res.endTime))}
                      </span>
                    </div>
                    {res.rejectionReason && (
                      <p className="text-xs text-destructive italic mt-1">
                        Rejection reason: &quot;{res.rejectionReason}&quot;
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: MANAGE RESOURCES */}
      {activeTab === "RESOURCES" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((res) => (
            <Card key={res.id} className="border-border/80 shadow-xs flex flex-col justify-between">
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
                      <SelectItem value="AVAILABLE" className="text-xs text-emerald-600">Operational (Ready)</SelectItem>
                      <SelectItem value="MAINTENANCE" className="text-xs text-amber-600">In Maintenance</SelectItem>
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
                  <span>Lifetime bookings: {res._count.reservations}</span>
                  <span>{res.requiresApproval ? "Approval required" : "Auto-approves"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 4: USER MANAGEMENT */}
      {activeTab === "USERS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Enterprise User Directory</h3>
              <p className="text-xs text-muted-foreground">
                Manage roles, provision new members, and inspect booking access privileges.
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              Total registered users: <strong>{users.length}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.map((u) => {
              const isCurrentAdmin = u.id === currentAdminId;

              return (
                <Card
                  key={u.id}
                  className={`border-border/80 shadow-xs transition-colors ${
                    isCurrentAdmin ? "border-emerald-500/40 bg-emerald-500/[0.02]" : ""
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-bold text-sm text-foreground">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{u.name}</span>
                            {isCurrentAdmin && (
                              <Badge className="text-[10px] px-1 py-0 bg-emerald-600 text-white">
                                You
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0.5 font-semibold ${
                          u.role === "ADMIN"
                            ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/5"
                            : "border-blue-500/40 text-blue-600 bg-blue-500/5"
                        }`}
                      >
                        {u.role === "ADMIN" ? (
                          <ShieldCheck className="h-3 w-3 mr-1" />
                        ) : (
                          <UserCheck className="h-3 w-3 mr-1" />
                        )}
                        {u.role}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                      <span>Joined {formatOrgDate(new Date(u.createdAt))}</span>
                      <span>Total bookings: {u._count.reservations}</span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      {u.role === "USER" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border-emerald-500/30"
                          disabled={isPending}
                          onClick={() => handleRoleChange(u.id, "ADMIN")}
                        >
                          <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                          Promote to Admin
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 border-amber-500/30"
                          disabled={isPending || isCurrentAdmin}
                          title={isCurrentAdmin ? "You cannot revoke your own administrator role" : undefined}
                          onClick={() => handleRoleChange(u.id, "USER")}
                        >
                          <UserCheck className="h-3.5 w-3.5 mr-1" />
                          Demote to User
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        disabled={isPending || isCurrentAdmin}
                        title={isCurrentAdmin ? "You cannot delete your own active account" : "Delete user"}
                        onClick={() => {
                          setUserToDelete(u);
                          setDeleteUserDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
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

      {/* DELETE USER CONFIRMATION MODAL */}
      <Dialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-destructive flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" />
              Confirm User Removal
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete user <strong className="text-foreground">{userToDelete?.name}</strong> ({userToDelete?.email})? All associated reservations will also be removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={handleDeleteUser}
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
