"use client";

import { useState, useTransition } from "react";
import {
  Radio,
  Send,
  X,
  RadioTower,
  Users,
  Shield,
  Megaphone,
  AlertTriangle,
  Info,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { broadcastNotificationAction } from "@/actions/notifications";

interface BroadcastModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BroadcastNotificationModal({
  open,
  onOpenChange,
}: BroadcastModalProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState<"ALL" | "USER" | "ADMIN">("ALL");
  const [alertType, setAlertType] = useState<"SYSTEM" | "APPROVAL" | "REJECTION">("SYSTEM");
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in both title and message.");
      return;
    }

    startTransition(async () => {
      const res = await broadcastNotificationAction({
        title: title.trim(),
        message: message.trim(),
        targetRole,
        type: alertType,
      });

      if (res.success) {
        toast.success("Broadcast dispatched via Redis Pub/Sub!", {
          description: res.message,
        });
        setTitle("");
        setMessage("");
        onOpenChange(false);
      } else {
        toast.error("Broadcast failed", {
          description: res.error,
        });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in-0 duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 shadow-2xl z-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center ring-1 ring-emerald-500/20">
              <RadioTower className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground">
                Targeted Alert Broadcast
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                Redis Pub/Sub &amp; Server-Sent Events dispatch
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Channel / Target Audience Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              Target Audience Channel
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetRole("ALL")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  targetRole === "ALL"
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold shadow-2xs"
                    : "bg-muted/40 border-border/70 text-muted-foreground hover:bg-muted"
                }`}
              >
                <Users className="h-4 w-4" />
                <span className="text-[11px]">All Users</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetRole("USER")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  targetRole === "USER"
                    ? "bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-400 font-bold shadow-2xs"
                    : "bg-muted/40 border-border/70 text-muted-foreground hover:bg-muted"
                }`}
              >
                <Radio className="h-4 w-4" />
                <span className="text-[11px]">Users Only</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetRole("ADMIN")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  targetRole === "ADMIN"
                    ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 font-bold shadow-2xs"
                    : "bg-muted/40 border-border/70 text-muted-foreground hover:bg-muted"
                }`}
              >
                <Shield className="h-4 w-4" />
                <span className="text-[11px]">Admins Only</span>
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Broadcasts to Redis channel:{" "}
              <code className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                notifications:broadcast:{targetRole}
              </code>
            </p>
          </div>

          {/* Alert Urgency / Level */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Alert Type</label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setAlertType("SYSTEM")}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  alertType === "SYSTEM"
                    ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs"
                    : "bg-muted/40 border-border/70 text-muted-foreground hover:bg-muted"
                }`}
              >
                <Megaphone className="h-3.5 w-3.5" />
                <span>Notice</span>
              </button>
              <button
                type="button"
                onClick={() => setAlertType("APPROVAL")}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  alertType === "APPROVAL"
                    ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                    : "bg-muted/40 border-border/70 text-muted-foreground hover:bg-muted"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Update</span>
              </button>
              <button
                type="button"
                onClick={() => setAlertType("REJECTION")}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  alertType === "REJECTION"
                    ? "bg-rose-600 text-white border-rose-600 font-bold shadow-xs"
                    : "bg-muted/40 border-border/70 text-muted-foreground hover:bg-muted"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Urgent</span>
              </button>
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Alert Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Campus Network Maintenance or Facility Advisory"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-border/80 bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>

          {/* Message Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Broadcast Message</label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write the message that all targeted users will receive in real time..."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-border/80 bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Live Preview Card */}
          {title.trim() && (
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 space-y-1 animate-in fade-in-0 duration-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Live Broadcast Preview
              </span>
              <p className="text-xs font-bold text-foreground">{title}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {message || "Message body will appear here..."}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-2xl border border-border/80 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim() || !message.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isPending ? "Broadcasting..." : "Dispatch Broadcast"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
