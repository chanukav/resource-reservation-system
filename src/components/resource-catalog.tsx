"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ReserveModal } from "@/components/reserve-modal";
import {
  Search,
  MapPin,
  Users,
  Clock,
  Sparkles,
  ShieldAlert,
  LayoutGrid,
  List,
  SlidersHorizontal,
} from "lucide-react";
import { formatOrgTime } from "@/lib/date-utils";

export type SerializedResource = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number;
  status: "AVAILABLE" | "MAINTENANCE" | "DECOMMISSIONED";
  requiresApproval: boolean;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
  reservations: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    status: string;
  }[];
};

export type SerializedCategory = {
  id: string;
  name: string;
  description: string | null;
  _count: {
    resources: number;
  };
};

interface ResourceCatalogProps {
  resources: SerializedResource[];
  categories: SerializedCategory[];
}

function getAssetCode(categoryName: string, id: string) {
  let prefix = "AST";
  const lower = categoryName.toLowerCase();
  if (lower.includes("conference") || lower.includes("meeting")) prefix = "CR";
  else if (lower.includes("workstation") || lower.includes("lab")) prefix = "WS";
  else if (lower.includes("hardware") || lower.includes("equipment") || lower.includes("media")) prefix = "EQ";
  const num = Math.abs(id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 900) + 100;
  return `${prefix}-${num}`;
}

export function ResourceCatalog({ resources, categories }: ResourceCatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [availabilityFilter, setAvailabilityFilter] = useState<"ALL" | "VACANT" | "INSTANT">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const now = new Date();

  const filteredResources = resources.filter((resource) => {
    const matchesCategory =
      selectedCategory === "ALL" || resource.categoryId === selectedCategory;

    const matchesSearch =
      resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (resource.location &&
        resource.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (resource.description &&
        resource.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      getAssetCode(resource.category.name, resource.id).toLowerCase().includes(searchQuery.toLowerCase());

    const isOperational = resource.status === "AVAILABLE";
    const currentActiveBooking = resource.reservations.find(
      (res) =>
        (res.status === "APPROVED" || res.status === "PENDING") &&
        new Date(res.startTime) <= now &&
        new Date(res.endTime) > now
    );
    const isOccupiedNow = Boolean(currentActiveBooking);

    let matchesAvailability = true;
    if (availabilityFilter === "VACANT") {
      matchesAvailability = isOperational && !isOccupiedNow;
    } else if (availabilityFilter === "INSTANT") {
      matchesAvailability = isOperational && !resource.requiresApproval;
    }

    return matchesCategory && matchesSearch && matchesAvailability;
  });

  return (
    <div className="space-y-5">
      {/* Resource Operations Control Bar: Filters, Search, and View Toggle */}
      <div className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-2xs backdrop-blur-xs space-y-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === "ALL"
                  ? "bg-foreground text-background shadow-2xs"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span>All Facilities</span>
              <span
                className={`rounded px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                  selectedCategory === "ALL"
                    ? "bg-background/20 text-background"
                    : "bg-background text-muted-foreground"
                }`}
              >
                {resources.length}
              </span>
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? "bg-foreground text-background shadow-2xs"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                      isSelected
                        ? "bg-background/20 text-background"
                        : "bg-background text-muted-foreground"
                    }`}
                  >
                    {cat._count.resources}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Availability Segmented Controls & View Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Availability pills */}
            <div className="flex items-center rounded-lg border border-border/70 bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setAvailabilityFilter("ALL")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  availabilityFilter === "ALL"
                    ? "bg-card text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All States
              </button>
              <button
                type="button"
                onClick={() => setAvailabilityFilter("VACANT")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  availabilityFilter === "VACANT"
                    ? "bg-card text-emerald-600 font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Vacant Now
              </button>
              <button
                type="button"
                onClick={() => setAvailabilityFilter("INSTANT")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  availabilityFilter === "INSTANT"
                    ? "bg-card text-emerald-600 font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="h-3 w-3 text-emerald-600" />
                Instant Book
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-border/70 bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Card Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === "table"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Dense Table View"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar & Result Count */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 border-t border-border/50 text-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by asset tag (e.g. CR-101), name, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8.5 pl-8 pr-8 text-xs rounded-lg border-border/80 bg-background/80 focus-visible:ring-emerald-500/50 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
            <SlidersHorizontal className="h-3 w-3" />
            <span>
              Showing <strong className="text-foreground">{filteredResources.length}</strong> of{" "}
              {resources.length} managed assets
            </span>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredResources.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/40 py-16 text-center shadow-2xs">
          <div className="rounded-xl bg-muted/60 p-3 text-muted-foreground mb-3">
            <Search className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No matching enterprise resources</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            No assets match your active filter and search criteria. Reset filters to view all facilities.
          </p>
          {(searchQuery || selectedCategory !== "ALL" || availabilityFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("ALL");
                setAvailabilityFilter("ALL");
              }}
              className="mt-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-4 cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW: High-end Asset Cards */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((resource) => {
            const isOperational = resource.status === "AVAILABLE";
            const currentActiveBooking = resource.reservations.find(
              (res) =>
                (res.status === "APPROVED" || res.status === "PENDING") &&
                new Date(res.startTime) <= now &&
                new Date(res.endTime) > now
            );
            const isOccupiedNow = Boolean(currentActiveBooking);
            const upcomingCount = resource.reservations.length;
            const assetCode = getAssetCode(resource.category.name, resource.id);

            return (
              <Card
                key={resource.id}
                className="group flex flex-col justify-between overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xs transition-all duration-200 hover:border-border hover:shadow-xs"
              >
                <CardHeader className="space-y-2.5 pb-2.5 p-4">
                  {/* Top Header: Monospace Asset Tag & Status Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted/80 border border-border/60 px-2 py-0.5 rounded">
                        {assetCode}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-medium bg-muted/60 text-muted-foreground border-none px-2 py-0.5 rounded"
                      >
                        {resource.category.name}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isOperational ? (
                        isOccupiedNow ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                            Occupied
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Vacant Now
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          <ShieldAlert className="h-3 w-3" />
                          {resource.status === "MAINTENANCE" ? "Maintenance" : "Decommissioned"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-foreground text-sm tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {resource.name}
                    </h3>
                    {resource.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {resource.description}
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-2.5 pb-3 px-4 text-xs text-muted-foreground">
                  {/* Location & Capacity Chips */}
                  <div className="flex flex-wrap items-center gap-2">
                    {resource.location && (
                      <div className="inline-flex items-center gap-1.5 rounded bg-muted/40 border border-border/50 px-2 py-0.5 text-[11px]">
                        <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span className="font-medium text-foreground/80">{resource.location}</span>
                      </div>
                    )}
                    <div className="inline-flex items-center gap-1.5 rounded bg-muted/40 border border-border/50 px-2 py-0.5 text-[11px]">
                      <Users className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span className="font-medium text-foreground/80">
                        {resource.capacity} {resource.capacity > 1 ? "persons" : "unit"} max
                      </span>
                    </div>
                  </div>

                  {/* Schedule Indicator & Policy */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                    <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                      <Clock className="h-3 w-3 text-muted-foreground/80 shrink-0" />
                      <span className="truncate">
                        {isOccupiedNow
                          ? `Booked until ${formatOrgTime(currentActiveBooking!.endTime)}`
                          : upcomingCount > 0
                          ? `${upcomingCount} upcoming slot${upcomingCount > 1 ? "s" : ""}`
                          : "Immediate slot available"}
                      </span>
                    </div>

                    {resource.requiresApproval ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium text-[10px] bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded shrink-0">
                        Approval Req.
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                        <Sparkles className="h-2.5 w-2.5" /> Instant
                      </span>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="pt-2 p-4 border-t border-border/50 bg-muted/20">
                  <ReserveModal
                    resource={resource}
                    triggerButton={
                      <button
                        type="button"
                        disabled={!isOperational}
                        className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isOperational
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-[0.99]"
                            : "bg-muted text-muted-foreground border border-border/60 cursor-not-allowed opacity-60"
                        }`}
                      >
                        {isOperational ? "Reserve Asset" : "Asset Unavailable"}
                      </button>
                    }
                  />
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW: Dense Modern Resource Grid */
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">Asset ID</th>
                  <th className="py-3 px-4">Facility / Resource</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Real-Time Status</th>
                  <th className="py-3 px-4">Dispatch Policy</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredResources.map((resource) => {
                  const isOperational = resource.status === "AVAILABLE";
                  const currentActiveBooking = resource.reservations.find(
                    (res) =>
                      (res.status === "APPROVED" || res.status === "PENDING") &&
                      new Date(res.startTime) <= now &&
                      new Date(res.endTime) > now
                  );
                  const isOccupiedNow = Boolean(currentActiveBooking);
                  const assetCode = getAssetCode(resource.category.name, resource.id);

                  return (
                    <tr
                      key={resource.id}
                      className="transition-colors hover:bg-muted/40 group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-muted-foreground text-[11px]">
                        {assetCode}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground group-hover:text-emerald-600 transition-colors">
                          {resource.name}
                        </div>
                        {resource.description && (
                          <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-xs">
                            {resource.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-foreground/80">
                          {resource.category.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {resource.location || "—"}
                      </td>
                      <td className="py-3 px-4 text-foreground/90 font-medium">
                        {resource.capacity} {resource.capacity > 1 ? "people" : "unit"}
                      </td>
                      <td className="py-3 px-4">
                        {isOperational ? (
                          isOccupiedNow ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                              Occupied
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Vacant
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                            <ShieldAlert className="h-3 w-3" />
                            {resource.status === "MAINTENANCE" ? "Maintenance" : "Decommissioned"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {resource.requiresApproval ? (
                          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                            Admin Approval
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                            <Sparkles className="h-2.5 w-2.5" /> Instant
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <ReserveModal
                          resource={resource}
                          triggerButton={
                            <button
                              type="button"
                              disabled={!isOperational}
                              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                                isOperational
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                                  : "bg-muted text-muted-foreground border border-border/60 cursor-not-allowed opacity-60"
                              }`}
                            >
                              Reserve
                            </button>
                          }
                        />
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
  );
}
