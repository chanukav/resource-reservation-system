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
import { changeOwnPasswordAction } from "@/actions/users";
import { toast } from "sonner";
import { KeyRound, Check, X, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";

interface ChangePasswordModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ChangePasswordModal({
  trigger,
  open: externalOpen,
  onOpenChange: setExternalOpen,
}: ChangePasswordModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = setExternalOpen || setInternalOpen;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Strong password requirements check
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const isStrong = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isStrong) {
      setErrorMsg("Please ensure your new password satisfies all strong password security requirements.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("New password and confirmation password do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMsg("New password must be different from your current password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changeOwnPasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        toast.success(res.message || "Your password has been changed successfully.");
        resetForm();
        setIsOpen(false);
      } else {
        setErrorMsg(res.error || "Failed to update password.");
      }
    } catch {
      setErrorMsg("An unexpected network error occurred while updating your password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        setIsOpen(next);
        if (!next) resetForm();
      }}
    >
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}

      <DialogContent className="sm:max-w-[440px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="space-y-1.5 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Change Account Password
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Update your authentication credentials with strong password protection.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {errorMsg && (
            <div className="my-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive flex items-start gap-2">
              <X className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-3.5 py-3">
            {/* Current Password */}
            <div className="space-y-1">
              <Label htmlFor="current-pwd" className="text-xs font-semibold text-foreground">
                Current Password
              </Label>
              <div className="relative">
                <Input
                  id="current-pwd"
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter your existing password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="h-8.5 pr-8 text-xs rounded-lg border-border/80"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                >
                  {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1">
              <Label htmlFor="new-pwd" className="text-xs font-semibold text-foreground">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="new-pwd"
                  type={showNew ? "text" : "password"}
                  placeholder="Enter a strong new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="h-8.5 pr-8 text-xs rounded-lg border-border/80"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                >
                  {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Strong Password Live Validation Checklist */}
              <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 mt-2 space-y-1.5 text-[11px]">
                <div className="font-semibold text-foreground text-[10px] uppercase tracking-wider flex items-center justify-between">
                  <span>Password Security Rules:</span>
                  {isStrong && (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> Strong
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px]">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                    {hasMinLength ? <Check className="h-3 w-3 shrink-0" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0 ml-1 mr-0.5" />}
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUpper ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                    {hasUpper ? <Check className="h-3 w-3 shrink-0" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0 ml-1 mr-0.5" />}
                    <span>1 uppercase letter (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasLower ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                    {hasLower ? <Check className="h-3 w-3 shrink-0" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0 ml-1 mr-0.5" />}
                    <span>1 lowercase letter (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                    {hasNumber ? <Check className="h-3 w-3 shrink-0" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0 ml-1 mr-0.5" />}
                    <span>1 number (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 sm:col-span-2 ${hasSpecial ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                    {hasSpecial ? <Check className="h-3 w-3 shrink-0" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0 ml-1 mr-0.5" />}
                    <span>1 special character (!@#$%^&*...)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1">
              <Label htmlFor="confirm-pwd" className="text-xs font-semibold text-foreground">
                Confirm New Password
              </Label>
              <Input
                id="confirm-pwd"
                type="password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-8.5 text-xs rounded-lg border-border/80"
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-[10px] text-destructive mt-1">Passwords do not match.</p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                resetForm();
                setIsOpen(false);
              }}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !isStrong || !passwordsMatch || !currentPassword}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
