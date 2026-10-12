"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createReservationAction } from "@/actions/reservations";
import { toast } from "sonner";
import { Calendar, Clock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface ReserveModalProps {
  resource: {
    id: string;
    name: string;
    location: string | null;
    capacity: number;
    requiresApproval: boolean;
    status: string;
  };
  triggerButton?: React.ReactNode;
}

export function ReserveModal({ resource, triggerButton }: ReserveModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states with sensible defaults (tomorrow 10:00 AM - 11:00 AM)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split("T")[0];

  const [date, setDate] = useState(defaultDateStr);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:30");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg("Please provide a title or purpose for this reservation.");
      return;
    }

    const startDateTime = new Date(`${date}T${startTime}:00`).toISOString();
    const endDateTime = new Date(`${date}T${endTime}:00`).toISOString();

    setIsSubmitting(true);

    try {
      const result = await createReservationAction({
        resourceId: resource.id,
        title: title.trim(),
        description: description.trim(),
        startDateTime,
        endDateTime,
      });

      if (result.success) {
        toast.success(result.message || "Reservation successfully placed!");
        setOpen(false);
        setTitle("");
        setDescription("");
      } else {
        setErrorMsg(result.error || "Failed to create reservation.");
        toast.error("Could not place reservation", {
          description: result.error,
        });
      }
    } catch {
      setErrorMsg("An unexpected network or client error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAvailable = resource.status === "AVAILABLE";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          triggerButton ? (
            (triggerButton as React.ReactElement)
          ) : (
            <Button disabled={!isAvailable} className="w-full">
              {isAvailable ? "Reserve Resource" : "Unavailable"}
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="gap-1.5">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold">{resource.name}</DialogTitle>
              {resource.requiresApproval ? (
                <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-500/10 text-xs">
                  Requires Admin Approval
                </Badge>
              ) : (
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 text-xs">
                  Instant Confirmation
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              {resource.location ? `Location: ${resource.location} • ` : ""}
              Capacity: {resource.capacity} {resource.capacity > 1 ? "people" : "unit"}
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid gap-3.5 py-4">
            {/* Title / Purpose */}
            <div className="space-y-1.5">
              <Label htmlFor="res-title" className="text-xs font-medium">
                Title / Purpose <span className="text-destructive">*</span>
              </Label>
              <Input
                id="res-title"
                placeholder="e.g. Sprint Retrospective, Video Shoot, Testing Session"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>

            {/* Date selection */}
            <div className="space-y-1.5">
              <Label htmlFor="res-date" className="text-xs font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Reservation Date
              </Label>
              <Input
                id="res-date"
                type="date"
                value={date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>

            {/* Start and End Times */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="res-start" className="text-xs font-medium flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  Start Time
                </Label>
                <Input
                  id="res-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="res-end" className="text-xs font-medium flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  End Time
                </Label>
                <Input
                  id="res-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="res-desc" className="text-xs font-medium">
                Additional Notes (Optional)
              </Label>
              <Textarea
                id="res-desc"
                placeholder="Specify any equipment needs, agenda, or attendees..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Checking Availability...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Confirm Reservation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
