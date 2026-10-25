"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type DetailTab = {
  value: string;
  label: string;
  count?: number;
  content: React.ReactNode;
};

// Splits the application detail into a few focused tabs instead of one long
// scroll. The active tab is mirrored into ?tab= so a refresh or a shared link
// lands on the same tab.
export function DetailTabs({
  tabs,
  defaultTab,
}: {
  tabs: DetailTab[];
  defaultTab: string;
}) {
  function onChange(value: string) {
    const url = new URL(window.location.href);
    if (value === tabs[0]?.value) url.searchParams.delete("tab");
    else url.searchParams.set("tab", value);
    window.history.replaceState(null, "", url);
  }

  return (
    <Tabs defaultValue={defaultTab} onValueChange={onChange} className="gap-4">
      {/* Inset-shadow baseline + in-box underline: nothing overflows the
          horizontally scrollable strip. */}
      <div className="overflow-x-auto shadow-[inset_0_-1px_0_var(--border)] [scrollbar-width:none]">
        <TabsList variant="line" className="h-auto gap-5 p-0">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="flex-none px-0 pb-2.5 group-data-horizontal/tabs:after:bottom-0"
            >
              {t.label}
              {t.count ? (
                <span className="rounded-full bg-muted px-1.5 text-xs font-normal text-muted-foreground">
                  {t.count}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {tabs.map((t) => (
        <TabsContent key={t.value} value={t.value} className="flex flex-col gap-4">
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
