"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import {
  CalendarClock,
  CircleSlash,
  Loader2,
  Mail,
  PartyPopper,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { InboxStatus } from "@/lib/queries";
import { addInboxEmailsNow } from "@/lib/actions/inbox";
import { Button } from "@/components/ui/button";
import { ConnectGmailDialog } from "@/components/inbox/connect-gmail-dialog";

const KIND_ICON: Record<string, React.ElementType> = {
  applied: Send,
  screening: Sparkles,
  interview: CalendarClock,
  offer: PartyPopper,
  rejection: XCircle,
};

// What the Gmail script recently changed, so automatic updates are never
// invisible. Each entry links to the application, which stays fully editable.
export function InboxPanel({ status }: { status: InboxStatus }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function addNow() {
    startTransition(async () => {
      const result = await addInboxEmailsNow();
      if (!result.ok) toast.error(result.error);
      else toast.success(`Added ${result.data?.applied ?? 0} email(s) from your inbox`);
    });
  }

  if (!status.available) return null;

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <Mail className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">From your inbox</h2>
        {status.connected && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Settings
          </button>
        )}
      </div>

      {!status.connected ? (
        <div>
          <p className="text-sm text-muted-foreground">
            Connect Gmail and Huntfolio adds applications, interviews,
            rejections and offers from your email automatically.
          </p>
          <Button size="sm" className="mt-3" onClick={() => setOpen(true)}>
            Connect Gmail
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Relative time can tick over between server render and hydration. */}
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            {status.lastSeenAt
              ? `Checked ${formatDistanceToNowStrict(new Date(status.lastSeenAt))} ago · every hour`
              : "Waiting for the script's first check — run setup in Google if you haven't."}
          </p>

          {status.pending > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-xs">
              <span>
                {status.pending} new {status.pending === 1 ? "email" : "emails"} to add
              </span>
              <Button size="xs" variant="secondary" onClick={addNow} disabled={isPending}>
                {isPending && <Loader2 className="size-3 animate-spin" />}
                Add now
              </Button>
            </div>
          )}

          {status.recent.length === 0 ? (
            <p className="py-1 text-sm text-muted-foreground">
              Nothing in the last two weeks. Confirmations, invites and replies
              will show up here.
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {status.recent.map((ev) => {
                const skipped = ev.status === "skipped";
                const Icon = skipped ? CircleSlash : (KIND_ICON[ev.kind] ?? Mail);
                const body = (
                  <>
                    <Icon
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        skipped ? "text-muted-foreground" : "text-foreground/70",
                      )}
                    />
                    <div className="min-w-0">
                      <p className={cn("truncate text-sm", skipped && "text-muted-foreground")}>
                        {ev.result ?? ev.subject}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {ev.subject}
                      </p>
                    </div>
                  </>
                );
                return (
                  <li key={ev.id}>
                    {ev.application_id ? (
                      <Link
                        href={`/applications/${ev.application_id}`}
                        className="-mx-2 flex items-start gap-2.5 rounded-md px-2 py-2 hover:bg-muted/60"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div className="flex items-start gap-2.5 py-2">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <ConnectGmailDialog
        open={open}
        onOpenChange={setOpen}
        connected={status.connected}
      />
    </section>
  );
}
