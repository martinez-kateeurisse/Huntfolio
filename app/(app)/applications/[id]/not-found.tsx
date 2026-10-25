import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ApplicationNotFound() {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed bg-card/50 px-6 py-16 text-center">
      <div className="mb-3 grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="size-5" />
      </div>
      <p className="font-medium">Application not found</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        It may have been deleted, or the link is out of date.
      </p>
      <Button className="mt-4" asChild>
        <Link href="/applications">Back to applications</Link>
      </Button>
    </div>
  );
}
