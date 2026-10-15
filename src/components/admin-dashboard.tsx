"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  adminResetUserPasswordAction,
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
  Search,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  RadioTower,
  Building2,
  Cpu,
  Video,
  Laptop,
  Layers,
  Activity,
} from "lucide-react";
import { ResourceStatus, ReservationStatus } from "@prisma/client";
import {
  formatOrgDate,
  formatOrgTimeRange,
} from "@/lib/date-utils";
import { StatProgressCard } from "@/components/stat-progress-card";
import { BroadcastNotificationModal } from "@/components/broadcast-notification-modal";

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

function getAssetCode(categoryName: string, id: string) {
  let prefix = "AST";
  const lower = categoryName.toLowerCase();
  if (lower.includes("conference") || lower.includes("meeting")) prefix = "CR";
  else if (lower.includes("workstation") || lower.includes("lab")) prefix = "WS";
  else if (lower.includes("media") || lower.includes("production") || lower.includes("hardware") || lower.includes("equipment")) prefix = "EQ";
  else if (lower.includes("training") || lower.includes("workshop") || lower.includes("collaboration")) prefix = "TR";
  else if (lower.includes("presentation") || lower.includes("shared it") || lower.includes("it")) prefix = "IT";
  const num = Math.abs(id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 900) + 100;
  return `${prefix}-${num}`;
}

function getCategoryVisual(name: string) {
  const l = name.toLowerCase();
  if (l.includes("conference") || l.includes("meeting")) {
    return {
      icon: <Building2 className="h-3 w-3" />,
      color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    };
  }
  if (l.includes("workstation") || l.includes("lab")) {
    return {
      icon: <Cpu className="h-3 w-3" />,
      color: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20",
    };
  }
  if (l.includes("media") || l.includes("production") || l.includes("hardware") || l.includes("equipment")) {
    return {
      icon: <Video className="h-3 w-3" />,
      color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    };
  }
  if (l.includes("training") || l.includes("workshop") || l.includes("collaboration")) {
    return {
      icon: <Layers className="h-3 w-3" />,
      color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    };
  }
  return {
    icon: <Laptop className="h-3 w-3" />,
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  };
}

export function AdminDashboard({
  reservations: initialReservations,
  resources: initialResources,
  categories,
  users: initialUsers = [],
  currentAdminId,
}: AdminDashboardProps) {
  const router = useRouter();
  const [reservations, setReservations] = useState<AdminReservationItem[]>(initialReservations);
  const [resources, setResources] = useState<AdminResourceItem[]>(initialResources);
  const [users, setUsers] = useState<AdminUserItem[]>(initialUsers);

  useEffect(() => {
    setReservations(initialReservations);
  }, [initialReservations]);

  useEffect(() => {
    setResources(initialResources);
  }, [initialResources]);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const [activeTab, setActiveTab] = useState<
    "PENDING" | "ALL_RESERVATIONS" | "RESOURCES" | "USERS"
  >("PENDING");
  const [isPending, startTransition] = useTransition();

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedResId, setSelectedResId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Broadcast modal state
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);

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
  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState<"USER" | "ADMIN">("USER");

  // Delete user state
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUserItem | null>(null);

  // User search by email state
  const [userSearchEmail, setUserSearchEmail] = useState("");

  // Admin reset user password state
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [userForPasswordReset, setUserForPasswordReset] = useState<AdminUserItem | null>(null);
  const [resetUserPassword, setResetUserPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);

  const isResetPasswordStrong =
    resetUserPassword.length >= 8 &&
    /[A-Z]/.test(resetUserPassword) &&
    /[a-z]/.test(resetUserPassword) &&
    /[0-9]/.test(resetUserPassword) &&
    /[^A-Za-z0-9]/.test(resetUserPassword);

  const generateRandomStrongPassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const nums = "23456789";
    const special = "!@#$%^&*()_+";
    let pwd = "";
    pwd += upper[Math.floor(Math.random() * upper.length)];
    pwd += lower[Math.floor(Math.random() * lower.length)];
    pwd += nums[Math.floor(Math.random() * nums.length)];
    pwd += special[Math.floor(Math.random() * special.length)];
    const all = upper + lower + nums + special;
    for (let i = 0; i < 8; i++) {
      pwd += all[Math.floor(Math.random() * all.length)];
    }
    setResetUserPassword(pwd);
  };

  const handleAdminResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForPasswordReset) return;

    startTransition(async () => {
      const res = await adminResetUserPasswordAction({
        targetUserId: userForPasswordReset.id,
        newPassword: resetUserPassword,
      });

      if (res.success) {
        toast.success(res.message);
        setResetPasswordDialogOpen(false);
        setUserForPasswordReset(null);
        setResetUserPassword("");
      } else {
        toast.error("Failed to reset password", { description: res.error });
      }
    });
  };

  const pendingReservations = reservations.filter((r) => r.status === "PENDING");

  const filteredUsers = users.filter((u) => {
    const query = userSearchEmail.trim().toLowerCase();
    if (!query) return true;
    return u.email.toLowerCase().includes(query) || u.name.toLowerCase().includes(query);
  });

  const handleApprove = (id: string) => {
    startTransition(async () => {
      // Optimistically update local state so card disappears from Pending tab immediately
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: ReservationStatus.APPROVED } : r))
      );

      const res = await updateReservationStatusAction({
        reservationId: id,
        status: ReservationStatus.APPROVED,
      });
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error("Approval failed", { description: res.error });
        router.refresh();
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
      setReservations((prev) =>
        prev.map((r) =>
          r.id === selectedResId
            ? { ...r, status: ReservationStatus.REJECTED, rejectionReason: rejectReason.trim() }
            : r
        )
      );

      const res = await updateReservationStatusAction({
        reservationId: selectedResId,
        status: ReservationStatus.REJECTED,
        rejectionReason: rejectReason.trim(),
      });

      if (res.success) {
        toast.success(res.message);
        setRejectModalOpen(false);
        setRejectReason("");
        router.refresh();
      } else {
        toast.error("Rejection failed", { description: res.error });
        router.refresh();
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
        router.refresh();
      } else {
        toast.error("Creation failed", { description: res.error });
      }
    });
  };

  const handleStatusChange = (resourceId: string, status: ResourceStatus) => {
    startTransition(async () => {
      setResources((prev) =>
        prev.map((r) => (r.id === resourceId ? { ...r, status } : r))
      );
      const res = await updateResourceStatusAction(resourceId, status);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error("Status update failed", { description: res.error });
        router.refresh();
      }
    });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = `${userFirstName.trim()} ${userLastName.trim()}`.trim();
    if (!userFirstName.trim() || !userLastName.trim() || !userEmail.trim() || !userPassword) {
      toast.error("Please fill in all required fields.");
      return;
    }

    startTransition(async () => {
      const res = await createUserAction({
        name: fullName,
        email: userEmail.trim(),
        password: userPassword,
        role: userRole,
      });

      if (res.success) {
        toast.success(res.message);
        setNewUserOpen(false);
        setUserFirstName("");
        setUserLastName("");
        setUserEmail("");
        setUserPassword("");
        setUserRole("USER");
        router.refresh();
      } else {
        toast.error("User creation failed", { description: res.error });
      }
    });
  };

  const handleRoleChange = (userId: string, newRole: "USER" | "ADMIN") => {
    startTransition(async () => {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      const res = await updateUserRoleAction({ userId, role: newRole });
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error("Role update failed", { description: res.error });
        router.refresh();
      }
    });
  };

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    startTransition(async () => {
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      const res = await deleteUserAction({ userId: userToDelete.id });
      if (res.success) {
        toast.success(res.message);
        setDeleteUserDialogOpen(false);
        setUserToDelete(null);
        router.refresh();
      } else {
        toast.error("Delete failed", { description: res.error });
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-7">
      {/* Admin Metric Cards with Radial Progress Rings matching reference UI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatProgressCard
          value={pendingReservations.length}
          title="Pending Requests"
          subtitle="Action required"
          percentage={pendingReservations.length > 0 ? 45 : 0}
          color="text-amber-500"
        />
        <StatProgressCard
          value={resources.length}
          title="Fleet Facilities"
          subtitle={`${resources.filter(r => r.status === "AVAILABLE").length} operational`}
          percentage={85}
          color="text-emerald-500"
        />
        <StatProgressCard
          value={reservations.length}
          title="Total Bookings"
          subtitle="System ledger"
          percentage={75}
          color="text-teal-500"
        />
        <StatProgressCard
          value={users.length}
          title="Registered Users"
          subtitle="Enterprise members"
          percentage={90}
          color="text-blue-500"
        />
      </div>

      {/* Tab Switcher & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === "PENDING"
                ? "bg-emerald-600 text-white shadow-xs font-semibold"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            Pending Requests ({pendingReservations.length})
          </button>
          <button
            onClick={() => setActiveTab("ALL_RESERVATIONS")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === "ALL_RESERVATIONS"
                ? "bg-emerald-600 text-white shadow-xs font-semibold"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            All Bookings ({reservations.length})
          </button>
          <button
            onClick={() => setActiveTab("RESOURCES")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === "RESOURCES"
                ? "bg-emerald-600 text-white shadow-xs font-semibold"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            Manage Facilities ({resources.length})
          </button>
          <button
            onClick={() => setActiveTab("USERS")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === "USERS"
                ? "bg-emerald-600 text-white shadow-xs font-semibold"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            User Management ({users.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Targeted Broadcast Alert Action via Redis Pub/Sub */}
          <Button
            size="sm"
            type="button"
            onClick={() => setBroadcastModalOpen(true)}
            className="h-8 text-xs bg-emerald-700/90 hover:bg-emerald-700 text-white rounded-full font-semibold cursor-pointer shadow-xs"
            title="Dispatch Real-Time Broadcast Alert via Redis Pub/Sub"
          >
            <RadioTower className="h-3.5 w-3.5 mr-1" />
            Broadcast Alert
          </Button>

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
                      <SelectTrigger id="res-cat" className="w-full text-xs">
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="new-user-first-name" className="text-xs font-medium">First Name</Label>
                      <Input
                        id="new-user-first-name"
                        placeholder="e.g. Kasun"
                        value={userFirstName}
                        onChange={(e) => setUserFirstName(e.target.value)}
                        required
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="new-user-last-name" className="text-xs font-medium">Last Name</Label>
                      <Input
                        id="new-user-last-name"
                        placeholder="e.g. Perera"
                        value={userLastName}
                        onChange={(e) => setUserLastName(e.target.value)}
                        required
                        className="text-xs"
                      />
                    </div>
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
                      <SelectTrigger id="new-user-role" className="w-full text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="w-full min-w-[300px]">
                        <SelectItem value="USER" className="text-xs">
                          Engineering Member (USER)
                        </SelectItem>
                        <SelectItem value="ADMIN" className="text-xs">
                          Platform Administrator (ADMIN)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground pt-0.5">
                      {userRole === "ADMIN"
                        ? "Platform Administrator: Full approvals, resource config, and user management access."
                        : "Engineering Member: Standard resource reservations and booking access."}
                    </p>
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
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Managed Asset Fleet</h3>
              <p className="text-xs text-muted-foreground">
                Control operational statuses, inspect booking demand, and configure dispatch approval rules.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{resources.length}</span> assets registered
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {resources.map((res) => {
              const assetCode = getAssetCode(res.category.name, res.id);
              const catVisual = getCategoryVisual(res.category.name);
              const isAvailable = res.status === "AVAILABLE";
              const isMaintenance = res.status === "MAINTENANCE";

              return (
                <Card
                  key={res.id}
                  className="rounded-3xl border border-border/80 bg-white dark:bg-card shadow-xs hover:border-emerald-500/40 hover:shadow-lg transition-all duration-200 overflow-hidden group flex flex-col justify-between"
                >
                  <CardHeader className="p-5 pb-3 space-y-3">
                    {/* Top Row: Asset Code & Category Pill + Status Selector */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted/80 border border-border/60 px-2 py-0.5 rounded-md">
                          {assetCode}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${catVisual.color}`}
                        >
                          {catVisual.icon}
                          <span className="truncate max-w-[130px]">{res.category.name}</span>
                        </span>
                      </div>

                      <div className="shrink-0">
                        <Select
                          value={res.status}
                          onValueChange={(val) => val && handleStatusChange(res.id, val as ResourceStatus)}
                        >
                          <SelectTrigger
                            className={`h-7 text-[11px] font-bold rounded-full px-2.5 transition-colors border ${
                              isAvailable
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                : isMaintenance
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20"
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isAvailable ? "bg-emerald-500 animate-pulse" : isMaintenance ? "bg-amber-500" : "bg-rose-500"
                                }`}
                              />
                              <SelectValue />
                            </span>
                          </SelectTrigger>
                          <SelectContent className="rounded-xl text-xs">
                            <SelectItem value="AVAILABLE" className="text-xs text-emerald-600 font-medium">
                              Operational (Ready)
                            </SelectItem>
                            <SelectItem value="MAINTENANCE" className="text-xs text-amber-600 font-medium">
                              In Maintenance
                            </SelectItem>
                            <SelectItem value="DECOMMISSIONED" className="text-xs text-destructive font-medium">
                              Decommissioned
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <CardTitle className="text-base font-bold text-foreground tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {res.name}
                      </CardTitle>
                      {res.description && (
                        <CardDescription className="text-xs mt-1.5 line-clamp-2 leading-relaxed text-muted-foreground">
                          {res.description}
                        </CardDescription>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 space-y-3">
                    {/* Metadata Specs Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                      <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/30 border border-border/40 px-2.5 py-1.5 rounded-xl">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate font-medium text-foreground/80 text-[11px]">
                          {res.location || "No location set"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/30 border border-border/40 px-2.5 py-1.5 rounded-xl">
                        <Users className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate font-medium text-foreground/80 text-[11px]">
                          {res.capacity} {res.capacity > 1 ? "persons" : "unit"} max
                        </span>
                      </div>
                    </div>

                    {/* Dispatch Policy & Demand Banner */}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/40">
                      <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                        <Activity className="h-3.5 w-3.5 text-emerald-600" />
                        <span>
                          Lifetime bookings: <strong className="text-foreground">{res._count.reservations}</strong>
                        </span>
                      </div>

                      {res.requiresApproval ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                          <ShieldCheck className="h-3 w-3" />
                          Approval required
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                          <Sparkles className="h-3 w-3" />
                          Auto-approves
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: USER MANAGEMENT */}
      {activeTab === "USERS" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Enterprise User Directory</h3>
              <p className="text-xs text-muted-foreground">
                Manage roles, provision new members, and inspect booking access privileges.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search Users by Email Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={userSearchEmail}
                  onChange={(e) => setUserSearchEmail(e.target.value)}
                  className="h-8.5 pl-8.5 pr-8 text-xs rounded-lg border-border/80 bg-background/90 focus-visible:ring-emerald-500/50 shadow-2xs"
                />
                {userSearchEmail && (
                  <button
                    type="button"
                    onClick={() => setUserSearchEmail("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline-block">
                Total users: <strong>{users.length}</strong>
              </span>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 py-12 text-center shadow-2xs">
              <Search className="h-6 w-6 text-muted-foreground mb-2" />
              <h4 className="text-sm font-semibold text-foreground">No users found</h4>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                No user accounts matched the search query &quot;{userSearchEmail}&quot;.
              </p>
              <button
                type="button"
                onClick={() => setUserSearchEmail("")}
                className="mt-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-4 cursor-pointer"
              >
                Clear search query
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Email Address</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Joined Date</th>
                      <th className="py-3 px-4">Reservations</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredUsers.map((u) => {
                      const isCurrentAdmin = u.id === currentAdminId;

                      return (
                        <tr
                          key={u.id}
                          className={`transition-colors hover:bg-muted/40 ${
                            isCurrentAdmin ? "bg-emerald-500/[0.02]" : ""
                          }`}
                        >
                          {/* User Avatar & Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-bold text-xs text-foreground shrink-0 border border-border/60">
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground text-xs">{u.name}</span>
                                {isCurrentAdmin && (
                                  <Badge className="text-[9px] px-1 py-0 bg-emerald-600 text-white font-medium">
                                    You
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Email Address */}
                          <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                            {u.email}
                          </td>

                          {/* Role Badge */}
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-2 py-0.5 font-semibold ${
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
                          </td>

                          {/* Joined Date */}
                          <td className="py-3 px-4 text-muted-foreground text-[11px]">
                            {formatOrgDate(new Date(u.createdAt))}
                          </td>

                          {/* Reservations Count */}
                          <td className="py-3 px-4 text-muted-foreground text-[11px]">
                            <span className="font-semibold text-foreground">{u._count.reservations}</span> bookings
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {u.role === "USER" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border-emerald-500/30"
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
                                  className="h-7 px-2.5 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 border-amber-500/30"
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
                                variant="outline"
                                className="h-7 px-2 text-xs text-foreground/80 hover:text-foreground border-border/70"
                                disabled={isPending}
                                title={`Reset password for ${u.name} at user request`}
                                onClick={() => {
                                  setUserForPasswordReset(u);
                                  setResetUserPassword("");
                                  setResetPasswordDialogOpen(true);
                                }}
                              >
                                <KeyRound className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                                Reset Pwd
                              </Button>

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
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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

      {/* ADMIN RESET USER PASSWORD MODAL */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <form onSubmit={handleAdminResetPassword}>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold flex items-center gap-1.5 text-foreground">
                <KeyRound className="h-4 w-4 text-emerald-600" />
                Reset User Password
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set a strong, secure replacement password for{" "}
                <strong className="text-foreground">{userForPasswordReset?.name}</strong> (
                {userForPasswordReset?.email}) upon user request.
              </DialogDescription>
            </DialogHeader>

            <div className="py-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="admin-new-password" className="text-xs font-medium">
                  New Temporary or Permanent Password
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] text-primary hover:text-primary/90 flex items-center gap-1"
                  onClick={generateRandomStrongPassword}
                >
                  <Sparkles className="h-3 w-3" />
                  Generate Strong
                </Button>
              </div>

              <div className="relative">
                <Input
                  id="admin-new-password"
                  type={showResetPassword ? "text" : "password"}
                  value={resetUserPassword}
                  onChange={(e) => setResetUserPassword(e.target.value)}
                  placeholder="Enter strong password..."
                  className="pr-10 text-xs font-mono"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-1 hover:bg-transparent text-muted-foreground"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                >
                  {showResetPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>

              {/* Password Requirements Checklist */}
              <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 text-xs space-y-1.5">
                <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
                  Password Strength Requirements
                </p>
                <div className="grid grid-cols-1 gap-1 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${resetUserPassword.length >= 8 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                    <Check className={`h-3 w-3 ${resetUserPassword.length >= 8 ? "opacity-100" : "opacity-30"}`} />
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(resetUserPassword) ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                    <Check className={`h-3 w-3 ${/[A-Z]/.test(resetUserPassword) ? "opacity-100" : "opacity-30"}`} />
                    <span>At least one uppercase letter (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${/[a-z]/.test(resetUserPassword) ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                    <Check className={`h-3 w-3 ${/[a-z]/.test(resetUserPassword) ? "opacity-100" : "opacity-30"}`} />
                    <span>At least one lowercase letter (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${/[0-9]/.test(resetUserPassword) ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                    <Check className={`h-3 w-3 ${/[0-9]/.test(resetUserPassword) ? "opacity-100" : "opacity-30"}`} />
                    <span>At least one digit (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${/[^A-Za-z0-9]/.test(resetUserPassword) ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}`}>
                    <Check className={`h-3 w-3 ${/[^A-Za-z0-9]/.test(resetUserPassword) ? "opacity-100" : "opacity-30"}`} />
                    <span>At least one special symbol (!@#$%^&*...)</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setResetPasswordDialogOpen(false);
                  setUserForPasswordReset(null);
                  setResetUserPassword("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isPending || !isResetPasswordStrong}
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Update Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Real-Time Targeted Broadcast Alert Modal */}
      <BroadcastNotificationModal
        open={broadcastModalOpen}
        onOpenChange={setBroadcastModalOpen}
      />
    </div>
  );
}
