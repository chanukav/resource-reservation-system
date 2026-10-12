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
  CheckCircle,
} from "lucide-react";

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

export function ResourceCatalog({ resources, categories }: ResourceCatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredResources = resources.filter((resource) => {
    const matchesCategory =
      selectedCategory === "ALL" || resource.categoryId === selectedCategory;
    const matchesSearch =
      resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (resource.location &&
        resource.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (resource.description &&
        resource.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Search & Category Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedCategory === "ALL"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            All Resources ({resources.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedCategory === cat.id
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat.name} ({cat._count.resources})
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Grid of Resources */}
      {filteredResources.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <div className="rounded-full bg-muted p-3 text-muted-foreground mb-3">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No resources found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            Try adjusting your search terms or selecting a different category filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((resource) => {
            const isAvailable = resource.status === "AVAILABLE";
            const upcomingCount = resource.reservations.length;

            return (
              <Card
                key={resource.id}
                className="flex flex-col justify-between overflow-hidden border border-border/70 transition-all hover:shadow-md hover:border-border"
              >
                <CardHeader className="space-y-3 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="secondary" className="text-[11px] font-medium bg-muted">
                      {resource.category.name}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      {isAvailable ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[11px] font-medium"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Available
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-amber-500/30 text-amber-600 bg-amber-500/10 text-[11px] font-medium"
                        >
                          <ShieldAlert className="h-3 w-3 mr-1" />
                          {resource.status}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-foreground text-base tracking-tight leading-snug">
                      {resource.name}
                    </h3>
                    {resource.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {resource.description}
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-2.5 pb-3 text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {resource.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
                        <span>{resource.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
                      <span>
                        Capacity: {resource.capacity} {resource.capacity > 1 ? "people" : "unit"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px]">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {upcomingCount > 0
                          ? `${upcomingCount} upcoming booking${upcomingCount > 1 ? "s" : ""}`
                          : "No current bookings"}
                      </span>
                    </div>
                    {resource.requiresApproval ? (
                      <span className="text-amber-600/90 font-medium">Requires approval</span>
                    ) : (
                      <span className="text-emerald-600/90 font-medium flex items-center gap-0.5">
                        <Sparkles className="h-3 w-3" /> Auto-approves
                      </span>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="pt-2">
                  <ReserveModal resource={resource} />
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
