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
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  PIPELINE,
  STATUS_LABELS,
  CLOSE_REASONS,
  CLOSE_REASON_LABELS,
  type Status,
  type CloseReason,
} from "@/lib/constants";
import type { ApplicationWithSignals } from "@/lib/queries";
import type { Application } from "@/lib/database.types";
import { updateApplicationStatus, deleteApplication } from "@/lib/actions/applications";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  // Dialog state for add/edit.
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);

  // Delete confirmation.
  const [deleting, setDeleting] = useState<ApplicationWithSignals | null>(null);

  // Close-reason prompt when moving to "closed".
  const [pendingClose, setPendingClose] = useState<{
    app: ApplicationWithSignals;
    reason: CloseReason;
  } | null>(null);

  // Keep local (optimistic) state in sync when the server sends fresh data,
  // using the render-time "adjust state on prop change" pattern.
  if (initialApplications !== syncedFrom) {
    setSyncedFrom(initialApplications);
    setApps(initialApplications);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const byStatus = (status: Status) => apps.filter((a) => a.status === status);
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
    }
  }

  function requestMove(app: ApplicationWithSignals, status: Status) {
    if (status === "closed") {
      setPendingClose({ app, reason: "rejected" });
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
    setDeleting(null);
    setApps((prev) => prev.filter((a) => a.id !== target.id));
    const result = await deleteApplication(target.id);
    if (!result.ok) toast.error(result.error);
    else toast.success("Application deleted");
  }

  const cardHandlers = {
    onEdit: openEdit,
    onDelete: (app: ApplicationWithSignals) => setDeleting(app),
    onMove: requestMove,
  };

  const isEmpty = apps.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Pipeline</h1>
        <Button size="sm" onClick={openAdd}>
          <Plus className="size-4" /> Add application
        </Button>
      </div>

      {isEmpty ? (
        <EmptyState
          title="No applications yet"
          description="Add the first role you're eyeing or have applied to. It'll show up here on the board."
          actionLabel="Add your first application"
          onAction={openAdd}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          {isDesktop ? (
            <div className="overflow-x-auto pb-2">
              <div className="grid min-w-[64rem] grid-cols-6 gap-3">
                {PIPELINE.map((status) => {
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
                {PIPELINE.map((status) => {
                  const n = byStatus(status).length;
                  return (
                    <button
                      key={status}
                      onClick={() => setMobileStatus(status)}
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm",
                        mobileStatus === status
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
                status={mobileStatus}
                count={byStatus(mobileStatus).length}
                empty={byStatus(mobileStatus).length === 0}
              >
                {byStatus(mobileStatus).map((app) => (
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

      <ApplicationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        application={editing}
      />

      {/* Close-reason prompt */}
      <Dialog
        open={Boolean(pendingClose)}
        onOpenChange={(o) => !o && setPendingClose(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Close this application</DialogTitle>
            <DialogDescription>
              Why are you closing{" "}
              <span className="font-medium text-foreground">
                {pendingClose?.app.company}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <Select
            value={pendingClose?.reason}
            onValueChange={(v) =>
              setPendingClose((p) =>
                p ? { ...p, reason: v as CloseReason } : p,
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLOSE_REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {CLOSE_REASON_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingClose(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (pendingClose) {
                  void applyMove(pendingClose.app, "closed", pendingClose.reason);
                  setPendingClose(null);
                }
              }}
            >
              Close application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
