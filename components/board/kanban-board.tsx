"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Eye, EyeOff, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  PIPELINE,
  STATUS_LABELS,
  TRACKS,
  TRACK_LABELS,
  type Status,
} from "@/lib/constants";
import type { ApplicationWithSignals } from "@/lib/queries";
import type { Application } from "@/lib/database.types";
import { updateApplicationStatus, deleteApplication } from "@/lib/actions/applications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ApplicationCard } from "@/components/board/application-card";
import { Column } from "@/components/board/column";
import { ApplicationDialog } from "@/components/applications/application-dialog";
import { CloseReasonDialog } from "@/components/applications/close-reason-dialog";
import { EmptyState } from "@/components/empty-state";

// Simple mounted-aware desktop check to avoid rendering two draggable trees.
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

export function KanbanBoard({
  initialApplications,
}: {
  initialApplications: ApplicationWithSignals[];
}) {
  const [apps, setApps] = useState(initialApplications);
  const [syncedFrom, setSyncedFrom] = useState(initialApplications);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileStatus, setMobileStatus] = useState<Status>("saved");
  const isDesktop = useIsDesktop();

  // Toolbar filters. Closed applications are hidden by default: they only
  // grow over time and push the active pipeline off-screen.
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState<string>("all");
  const [showClosed, setShowClosed] = useState(false);

  // Dialog state for add/edit.
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);

  // Delete confirmation.
  const [deleting, setDeleting] = useState<ApplicationWithSignals | null>(null);

  // Close-reason prompt when moving to "closed".
  const [pendingClose, setPendingClose] = useState<ApplicationWithSignals | null>(
    null,
  );

  // Keep local (optimistic) state in sync when the server sends fresh data,
  // using the render-time "adjust state on prop change" pattern.
  if (initialApplications !== syncedFrom) {
    setSyncedFrom(initialApplications);
    setApps(initialApplications);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const q = query.trim().toLowerCase();
  const filtered = apps.filter(
    (a) =>
      (track === "all" || a.track === track) &&
      (!q ||
        a.company.toLowerCase().includes(q) ||
        a.role_title.toLowerCase().includes(q)),
  );
  const visibleStatuses = showClosed
    ? PIPELINE
    : PIPELINE.filter((s) => s !== "closed");
  const closedCount = apps.filter((a) => a.status === "closed").length;
  const currentMobileStatus = visibleStatuses.includes(mobileStatus)
    ? mobileStatus
    : visibleStatuses[0];

  const byStatus = (status: Status) =>
    filtered.filter((a) => a.status === status);
  const activeApp = apps.find((a) => a.id === activeId) ?? null;

  async function applyMove(
    app: ApplicationWithSignals,
    status: Status,
    reason?: string | null,
  ) {
    if (app.status === status) return;
    const previous = apps;
    // Optimistic update.
    setApps((prev) =>
      prev.map((a) =>
        a.id === app.id
          ? {
              ...a,
              status,
              close_reason: status === "closed" ? (reason ?? null) : null,
            }
          : a,
      ),
    );

    const result = await updateApplicationStatus(app.id, status, reason);
    if (!result.ok) {
      setApps(previous); // revert
      toast.error(result.error);
    } else if (status === "closed" && !showClosed) {
      // The card just left the visible board; say where it went.
      toast.success(`${app.company} moved to Closed`);
    }
  }

  function requestMove(app: ApplicationWithSignals, status: Status) {
    if (status === "closed") {
      setPendingClose(app);
    } else {
      void applyMove(app, status);
    }
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const app = apps.find((a) => a.id === String(active.id));
    const target = String(over.id) as Status;
    if (!app || !PIPELINE.includes(target) || app.status === target) return;
    requestMove(app, target);
  }

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(app: ApplicationWithSignals) {
    setEditing(app as unknown as Application);
    setDialogOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    const previous = apps;
    setDeleting(null);
    setApps((prev) => prev.filter((a) => a.id !== target.id));
    const result = await deleteApplication(target.id);
    if (!result.ok) {
      setApps(previous); // revert
      toast.error(result.error);
    } else {
      toast.success("Application deleted");
    }
  }

  function clearFilters() {
    setQuery("");
    setTrack("all");
  }

  const cardHandlers = {
    onEdit: openEdit,
    onDelete: (app: ApplicationWithSignals) => setDeleting(app),
    onMove: requestMove,
  };

  const isEmpty = apps.length === 0;
  const noMatches = !isEmpty && filtered.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {isEmpty ? (
        <EmptyState
          title="No applications yet"
          description="Add the first role you're eyeing or have applied to. It'll show up here on the board."
          actionLabel="Add your first application"
          onAction={openAdd}
        />
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search company or role"
                className="h-8 pl-8"
                aria-label="Search applications"
              />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto">
              {["all", ...TRACKS].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTrack(t)}
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    track === t
                      ? "border-transparent bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t === "all" ? "All tracks" : TRACK_LABELS[t as keyof typeof TRACK_LABELS]}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-muted-foreground"
              onClick={() => setShowClosed((v) => !v)}
            >
              {showClosed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              {showClosed ? "Hide closed" : `Show closed (${closedCount})`}
            </Button>
          </div>

          {noMatches ? (
            <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
              No applications match these filters.{" "}
              <button
                type="button"
                onClick={clearFilters}
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            >
              {isDesktop ? (
                <div className="overflow-x-auto pb-2">
                  <div
                    className={cn(
                      "grid gap-3",
                      showClosed
                        ? "min-w-[62rem] grid-cols-6"
                        : "min-w-[52rem] grid-cols-5",
                    )}
                  >
                    {visibleStatuses.map((status) => {
                      const items = byStatus(status);
                      return (
                        <Column
                          key={status}
                          status={status}
                          count={items.length}
                          empty={items.length === 0}
                        >
                          {items.map((app) => (
                            <ApplicationCard key={app.id} app={app} {...cardHandlers} />
                          ))}
                        </Column>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {visibleStatuses.map((status) => {
                      const n = byStatus(status).length;
                      return (
                        <button
                          key={status}
                          onClick={() => setMobileStatus(status)}
                          className={cn(
                            "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm",
                            currentMobileStatus === status
                              ? "border-transparent bg-primary text-primary-foreground"
                              : "bg-background text-muted-foreground",
                          )}
                        >
                          {STATUS_LABELS[status]}
                          <span className="text-xs opacity-70">{n}</span>
                        </button>
                      );
                    })}
                  </div>
                  <Column
                    status={currentMobileStatus}
                    count={byStatus(currentMobileStatus).length}
                    empty={byStatus(currentMobileStatus).length === 0}
                  >
                    {byStatus(currentMobileStatus).map((app) => (
                      <ApplicationCard key={app.id} app={app} {...cardHandlers} />
                    ))}
                  </Column>
                </div>
              )}

              <DragOverlay>
                {activeApp ? <ApplicationCard app={activeApp} overlay /> : null}
              </DragOverlay>
            </DndContext>
          )}
        </>
      )}

      <ApplicationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        application={editing}
      />

      {/* key resets the chosen reason for each new prompt */}
      <CloseReasonDialog
        key={pendingClose?.id ?? "none"}
        open={Boolean(pendingClose)}
        company={pendingClose?.company ?? null}
        onCancel={() => setPendingClose(null)}
        onConfirm={(reason) => {
          if (pendingClose) void applyMove(pendingClose, "closed", reason);
          setPendingClose(null);
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete application?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{" "}
              <span className="font-medium text-foreground">
                {deleting?.company}
              </span>{" "}
              and its tasks and history. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
