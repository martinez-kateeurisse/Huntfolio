"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApplicationDialog } from "@/components/applications/application-dialog";

export function AddApplicationButton({
  label = "Add application",
}: {
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> {label}
      </Button>
      <ApplicationDialog open={open} onOpenChange={setOpen} application={null} />
    </>
  );
}
