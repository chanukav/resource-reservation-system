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
import { editReservationAction } from "@/actions/reservations";
import { toast } from "sonner";
import { Calendar, Clock, AlertCircle, CheckCircle2, Loader2, Edit3, Globe, Moon } from "lucide-react";
import { ORGANIZATION_TIMEZONE } from "@/lib/date-utils";

interface EditReservationModalProps {
  reservation: {
    id: string;
    title: string;
    description: string | null;
    startTime: string;
    endTime: string;
    resource: {
      name: string;
    };
  };
}

export function EditReservationModal({ reservation }: EditReservationModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Derive initial values in Asia/Colombo time
  const startDateObj = new Date(reservation.startTime);
  const endDateObj = new Date(reservation.endTime);

  // Format to YYYY-MM-DD in Colombo
  const colomboFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ORGANIZATION_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: ORGANIZATION_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const initDate = colomboFormatter.format(startDateObj);
  const initEndDate = colomboFormatter.format(endDateObj);
  const initStartTime = timeFormatter.format(startDateObj);
  const initEndTime = timeFormatter.format(endDateObj);
  const initIsOvernight = initDate !== initEndDate;

  const [date, setDate] = useState(initDate);
  const [startTime, setStartTime] = useState(initStartTime);
  const [endTime, setEndTime] = useState(initEndTime);
  const [isOvernight, setIsOvernight] = useState(initIsOvernight);
  const [endDate, setEndDate] = useState(initEndDate);
  const [title, setTitle] = useState(reservation.title);
  const [description, setDescription] = useState(reservation.description || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg("Please provide a title or purpose for this reservation.");
      return;
    }

    if (!isOvernight && endTime <= startTime) {
      setErrorMsg("End time must be after start time. Toggle 'Crosses Midnight / Overnight Session' for next-day reservations.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await editReservationAction({
        reservationId: reservation.id,
        title: title.trim(),
        description: description.trim(),
        startDate: date,
        startTime,
        endDate: isOvernight ? endDate : date,
        endTime,
      });

      if (result.success) {
        toast.success(result.message || "Reservation successfully modified!");
        setOpen(false);
      } else {
        setErrorMsg(result.error || "Failed to modify reservation.");
        toast.error("Could not update reservation", {
          description: result.error,
        });
      }
    } catch {
      setErrorMsg("An unexpected network or client error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs shrink-0 flex items-center gap-1.5"
          >
            <Edit3 className="h-3 w-3" />
            Modify Time
          </Button>
        }
      />

      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="gap-1.5">
            <DialogTitle className="text-lg font-semibold">
              Modify Reservation: {reservation.resource.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Adjust booking times or purpose. The system ensures concurrency safety and detects any schedule conflicts.
            </DialogDescription>
          </DialogHeader>

          {/* Timezone Guarantee Banner */}
          <div className="mt-2.5 flex items-center justify-between rounded-md bg-blue-500/10 px-3 py-1.5 text-[11px] text-blue-700 dark:text-blue-300 border border-blue-500/20">
            <span className="flex items-center gap-1.5 font-medium">
              <Globe className="h-3.5 w-3.5" />
              Standardized Timezone
            </span>
            <span className="font-mono font-semibold">{ORGANIZATION_TIMEZONE} (UTC+05:30)</span>
          </div>

          {errorMsg && (
            <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid gap-3.5 py-4">
            {/* Title / Purpose */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-title" className="text-xs font-medium">
                Title / Purpose <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>

            {/* Date selection */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-date" className="text-xs font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Reservation Date
              </Label>
              <Input
                id="edit-date"
                type="date"
                value={date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  setDate(e.target.value);
                  const nextD = new Date(e.target.value);
                  nextD.setDate(nextD.getDate() + 1);
                  setEndDate(nextD.toISOString().split("T")[0]);
                }}
                required
                className="h-9 text-sm"
              />
            </div>

            {/* Start and End Times */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-start" className="text-xs font-medium flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  Start Time
                </Label>
                <Input
                  id="edit-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-end" className="text-xs font-medium flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  End Time
                </Label>
                <Input
                  id="edit-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Overnight / Midnight Crossing Option */}
            <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="edit-overnight-toggle"
                  className="flex items-center gap-2 text-xs font-medium cursor-pointer"
                >
                  <Moon className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Crosses Midnight / Overnight Session</span>
                </label>
                <input
                  id="edit-overnight-toggle"
                  type="checkbox"
                  checked={isOvernight}
                  onChange={(e) => setIsOvernight(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {isOvernight && (
                <div className="mt-2.5 pt-2.5 border-t border-border/50">
                  <Label htmlFor="edit-end-date" className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    End Date (Next Day)
                  </Label>
                  <Input
                    id="edit-end-date"
                    type="date"
                    value={endDate}
                    min={date}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc" className="text-xs font-medium">
                Additional Notes
              </Label>
              <Textarea
                id="edit-desc"
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
              className="bg-primary text-primary-foreground"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
