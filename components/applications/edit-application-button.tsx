"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApplicationDialog } from "@/components/applications/application-dialog";
import type { Application } from "@/lib/database.types";

export function EditApplicationButton({
  application,
}: {
  application: Application;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-4" /> Edit
      </Button>
      <ApplicationDialog
        open={open}
        onOpenChange={setOpen}
        application={application}
      />
    </>
  );
}
