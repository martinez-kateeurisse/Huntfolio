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
import { CheckSquare, ChevronUp, Eye, EyeOff, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  PIPELINE,
  STATUS_LABELS,
  TRACKS,
  TRACK_LABELS,
  NO_RESPONSE_AFTER_DAYS,
  type Status,
} from "@/lib/constants";
import type { ApplicationWithSignals } from "@/lib/queries";
import type { Application } from "@/lib/database.types";
import {
  updateApplicationStatus,
  updateApplicationsStatus,
  deleteApplication,
} from "@/lib/actions/applications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  // Multi-select. Selecting is on while the Select button is active or while
  // anything is selected (Ctrl/⌘/Shift-click starts a selection directly).
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const selecting = selectMode || selected.size > 0;
  // Ids being dragged together when a selected card is picked up.
  const [dragGroup, setDragGroup] = useState<string[] | null>(null);

  // Dialog state for add/edit.
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);

  // Delete confirmation.
  const [deleting, setDeleting] = useState<ApplicationWithSignals | null>(null);

  // Close-reason prompt when moving one or more cards to "closed".
  const [pendingClose, setPendingClose] = useState<ApplicationWithSignals[] | null>(
    null,
  );

  // Keep local (optimistic) state in sync when the server sends fresh data,
  // using the render-time "adjust state on prop change" pattern.
  if (initialApplications !== syncedFrom) {
    setSyncedFrom(initialApplications);
    setApps(initialApplications);
  }

  // Escape leaves selection mode.
  useEffect(() => {
    if (!selecting) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelected(new Set());
        setSelectMode(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selecting]);

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
  // Only cards currently on screen count, so filters can't hide a selection.
  const selectedApps = filtered.filter(
    (a) => selected.has(a.id) && visibleStatuses.includes(a.status as Status),
  );

  function clearSelection() {
    setSelected(new Set());
    setSelectMode(false);
  }

  function toggleSelect(app: ApplicationWithSignals) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(app.id)) next.delete(app.id);
      else next.add(app.id);
      return next;
    });
  }

  function selectColumn(status: Status) {
    const ids = byStatus(status).map((a) => a.id);
    setSelected((prev) => {
      const allIn = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      for (const id of ids) {
        if (allIn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  async function applyMove(
    targets: ApplicationWithSignals[],
    status: Status,
    reason?: string | null,
  ) {
    const moving = targets.filter((a) => a.status !== status);
    if (moving.length === 0) return;
    const ids = new Set(moving.map((a) => a.id));
    const previous = apps;
    // Optimistic update.
    setApps((prev) =>
      prev.map((a) =>
        ids.has(a.id)
          ? {
              ...a,
              status,
              close_reason: status === "closed" ? (reason ?? null) : null,
            }
          : a,
      ),
    );

    const result =
      moving.length === 1
        ? await updateApplicationStatus(moving[0].id, status, reason)
        : await updateApplicationsStatus([...ids], status, reason);
    if (!result.ok) {
      setApps(previous); // revert
      toast.error(result.error);
    } else if (moving.length > 1) {
      toast.success(`Moved ${moving.length} applications to ${STATUS_LABELS[status]}`);
    } else if (status === "closed" && !showClosed) {
      // The card just left the visible board; say where it went.
      toast.success(`${moving[0].company} moved to Closed`);
    }
  }

  function requestMove(targets: ApplicationWithSignals[], status: Status) {
    if (targets.length > 1) clearSelection();
    if (status === "closed") {
      setPendingClose(targets);
    } else {
      void applyMove(targets, status);
    }
  }

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    setActiveId(id);
    // Picking up a selected card carries the whole selection with it.
    setDragGroup(
      selected.has(id) && selectedApps.length > 1
        ? selectedApps.map((a) => a.id)
        : null,
    );
  }

  function onDragEnd(e: DragEndEvent) {
    const group = dragGroup;
    setActiveId(null);
    setDragGroup(null);
    const { active, over } = e;
    if (!over) return;
    const target = String(over.id) as Status;
    if (!PIPELINE.includes(target)) return;
    if (group) {
      requestMove(
        apps.filter((a) => group.includes(a.id)),
        target,
      );
      return;
    }
    const app = apps.find((a) => a.id === String(active.id));
    if (!app || app.status === target) return;
    requestMove([app], target);
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

  function renderCard(app: ApplicationWithSignals) {
    return (
      <ApplicationCard
        key={app.id}
        app={app}
        onEdit={openEdit}
        onDelete={setDeleting}
        onMove={(a, s) => requestMove([a], s)}
        selecting={selecting}
        selected={selected.has(app.id)}
        onToggleSelect={toggleSelect}
        dimmed={Boolean(dragGroup?.includes(app.id)) && app.id !== activeId}
      />
    );
  }

  function columnSelectAction(status: Status) {
    if (!selecting || byStatus(status).length === 0) return undefined;
    return (
      <button
        type="button"
        onClick={() => selectColumn(status)}
        className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
      >
        All
      </button>
    );
  }

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
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant={selecting ? "secondary" : "ghost"}
                size="sm"
                className={cn(!selecting && "text-muted-foreground")}
                onClick={() => (selecting ? clearSelection() : setSelectMode(true))}
                title="Select several cards to move them together. Tip: Ctrl/⌘-click a card."
              >
                <CheckSquare className="size-4" />
                {selecting ? "Done" : "Select"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setShowClosed((v) => !v)}
              >
                {showClosed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                {showClosed ? "Hide closed" : `Show closed (${closedCount})`}
              </Button>
            </div>
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
              onDragCancel={() => {
                setActiveId(null);
                setDragGroup(null);
              }}
            >
              {isDesktop ? (
                <div className="overflow-x-auto pb-2">
                  <div
                    className={cn(
                      "grid gap-2.5",
                      showClosed
                        ? "min-w-[63rem] grid-cols-7"
                        : "min-w-[54rem] grid-cols-6",
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
                          headerAction={columnSelectAction(status)}
                        >
                          {items.map(renderCard)}
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
                    headerAction={columnSelectAction(currentMobileStatus)}
                  >
                    {byStatus(currentMobileStatus).map(renderCard)}
                  </Column>
                </div>
              )}

              <DragOverlay>
                {activeApp ? (
                  <div className="relative">
                    <ApplicationCard app={activeApp} overlay />
                    {dragGroup && (
                      <span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow">
                        {dragGroup.length}
                      </span>
                    )}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}

          {byStatus("no_response").length > 0 && (
            <p className="text-xs text-muted-foreground">
              Applications with no reply {NO_RESPONSE_AFTER_DAYS} days after
              applying move to No response automatically. Drag one back if
              you hear from them.
            </p>
          )}
        </>
      )}

      {/* Bulk actions for the current selection */}
      {selectedApps.length > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 md:bottom-6">
          <div className="flex items-center gap-2 rounded-xl border bg-popover py-1.5 pl-4 pr-1.5 text-popover-foreground shadow-lg">
            <span className="text-sm font-medium">
              {selectedApps.length} selected
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  Move to <ChevronUp className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="center">
                {PIPELINE.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => requestMove(selectedApps, s)}
                  >
                    {STATUS_LABELS[s]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <ApplicationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        application={editing}
      />

      {/* key resets the chosen reason for each new prompt */}
      <CloseReasonDialog
        key={pendingClose?.map((a) => a.id).join(",") ?? "none"}
        open={Boolean(pendingClose)}
        company={
          pendingClose
            ? pendingClose.length === 1
              ? pendingClose[0].company
              : `${pendingClose.length} applications`
            : null
        }
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
