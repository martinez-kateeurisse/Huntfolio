"use client";

import { useState } from "react";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MIN_LENGTH = 8;

// Set or change the account password, so day-to-day sign-in is email +
// password instead of waiting for an email link.
export function SetPasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close(next: boolean) {
    if (!next) {
      setPassword("");
      setConfirm("");
      setError(null);
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setSaving(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    setSaving(false);

    if (error) {
      setError(
        isAuthRetryableFetchError(error)
          ? "Can't reach the sign-in service right now. Try again in a minute."
          : error.message,
      );
      return;
    }
    toast.success("Password saved — use it next time you sign in");
    close(false);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Set password</DialogTitle>
          <DialogDescription>
            Sign in with your email and this password from now on — no email
            link needed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={saving}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={saving}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !password || !confirm}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
