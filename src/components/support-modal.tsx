"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Headphones, Mail, Phone, Clock, MessageSquare, CheckCircle2 } from "lucide-react";

interface SupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportModal({ open, onOpenChange }: SupportModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-border/80 p-6">
        <DialogHeader className="text-left space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <Headphones className="h-6 w-6" />
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            PrimeWave Lab Support 24/7
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Our campus dispatch and facility operations team is available round-the-clock for scheduling assistance, keycard access, and hardware maintenance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-muted/40 border border-border/60">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background border border-border/70 text-foreground">
              <Phone className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium text-muted-foreground">Campus Dispatch Hotline</div>
              <div className="text-xs font-bold text-foreground">+94 (11) 234-5678 / Ext 402</div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-muted/40 border border-border/60">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background border border-border/70 text-foreground">
              <Mail className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium text-muted-foreground">Direct Desk Email</div>
              <div className="text-xs font-bold text-foreground">facilities@primewave.com</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-muted/40 border border-border/60">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background border border-border/70 text-foreground">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium text-muted-foreground">Operating Hours & Zone</div>
              <div className="text-xs font-bold text-foreground">24/7 Coverage • Colombo Lab Campus (LK-1)</div>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            type="button"
            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-5 shadow-xs"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
