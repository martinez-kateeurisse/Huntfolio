"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, KeyRound, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { createInboxKey, disconnectInbox } from "@/lib/actions/inbox";
import { buildAppsScript } from "@/lib/inbox/apps-script";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Walks through installing the Gmail script: create a private key, copy the
// generated script, paste it into script.google.com and run it once.
export function ConnectGmailDialog({
  open,
  onOpenChange,
  connected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connected: boolean;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  // The script must call the deployed site; Google can't reach localhost.
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const isLocal = /localhost|127\.0\.0\.1/.test(origin);
  const script = token
    ? buildAppsScript({ endpoint: `${origin}/api/inbox`, token })
    : null;

  function close(next: boolean) {
    if (!next) {
      setToken(null);
      setCopied(false);
    }
    onOpenChange(next);
  }

  function createKey() {
    startTransition(async () => {
      const result = await createInboxKey();
      if (result.ok && result.data) setToken(result.data.token);
      else if (!result.ok) toast.error(result.error);
    });
  }

  function disconnect() {
    startTransition(async () => {
      const result = await disconnectInbox();
      if (result.ok) {
        toast.success("Gmail disconnected — you can delete the script in Google too");
        close(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  async function copy() {
    if (!script) return;
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      toast.success("Script copied");
    } catch {
      toast.error("Couldn't copy — select the text and copy it manually");
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{connected ? "Gmail sync" : "Connect Gmail"}</DialogTitle>
          <DialogDescription>
            A small script in your own Google account checks for job emails
            every hour and updates Huntfolio: submitted and viewed
            applications, employer messages, interviews, rejections and
            offers. Only matching emails are sent, and only their sender,
            subject, date and a short excerpt.
          </DialogDescription>
        </DialogHeader>

        {isLocal && (
          <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            You&apos;re on a local copy. Set this up from your live site so
            Google can reach it.
          </p>
        )}

        {!script ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              <span className="font-medium">Step 1.</span>{" "}
              {connected
                ? "Gmail is connected. Creating a new key replaces the old one, so the current script stops working until you paste the new version."
                : "Create your private key. It goes inside the script so Huntfolio knows the emails are yours."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={createKey} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <KeyRound className="size-4" />
                )}
                {connected ? "Create a new key" : "Create key and script"}
              </Button>
              {connected && (
                <Button
                  variant="ghost"
                  className="text-destructive"
                  onClick={disconnect}
                  disabled={isPending}
                >
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm">
                  <span className="font-medium">Step 2.</span> Copy your script.
                  It contains your key, so don&apos;t share it.
                </p>
                <Button size="sm" variant="secondary" onClick={copy}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <Textarea
                readOnly
                value={script}
                rows={6}
                className="font-mono text-[11px]"
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>

            <div className="flex flex-col gap-2 text-sm">
              <p>
                <span className="font-medium">Step 3.</span> Install it (once):
              </p>
              <ol className="list-decimal space-y-1.5 pl-5 text-muted-foreground">
                <li>
                  Open{" "}
                  <a
                    href="https://script.google.com/home/projects/create"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-2 hover:underline"
                  >
                    script.google.com <ExternalLink className="size-3" />
                  </a>{" "}
                  — it opens a new project.
                </li>
                <li>Delete the sample code, paste the script, and press Ctrl+S to save.</li>
                <li>
                  In the toolbar, pick <span className="font-mono text-foreground">setup</span>{" "}
                  and click <span className="font-medium text-foreground">Run</span>.
                </li>
                <li>
                  Allow access: choose your account →{" "}
                  <span className="text-foreground">Advanced</span> →{" "}
                  <span className="text-foreground">Go to project (unsafe)</span> →{" "}
                  <span className="text-foreground">Allow</span>. Google shows this
                  warning for any script you write yourself.
                </li>
              </ol>
              <p className="text-muted-foreground">
                That&apos;s it. It checks the last 90 days right away, then every
                hour. To stop it, delete the project in Google.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
