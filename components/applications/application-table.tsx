"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatSalaryRange } from "@/lib/format";
import {
  STATUSES,
  STATUS_LABELS,
  SOURCES,
  TRACKS,
  TRACK_LABELS,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  type Track,
  type Priority,
} from "@/lib/constants";
import type { Application } from "@/lib/database.types";
import { TrackPill } from "@/components/track-pill";
import { StatusBadge } from "@/components/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortKey =
  | "company"
  | "role_title"
  | "track"
  | "status"
  | "source"
  | "salary"
  | "date_applied"
  | "priority";

const ALL = "all";

export function ApplicationTable({
  applications,
}: {
  applications: Application[];
}) {
  const router = useRouter();
  const [track, setTrack] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [source, setSource] = useState(ALL);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "date_applied",
    dir: "desc",
  });

  const rows = useMemo(() => {
    let list = applications.filter((a) => {
      if (track !== ALL && a.track !== track) return false;
      if (status !== ALL && a.status !== status) return false;
      if (source !== ALL && a.source !== source) return false;
      return true;
    });

    const dir = sort.dir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      const cmp = compare(a, b, sort.key);
      return cmp * dir;
    });
    return list;
  }, [applications, track, status, source, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  const activeFilters = [track, status, source].some((f) => f !== ALL);

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          value={track}
          onChange={setTrack}
          placeholder="All tracks"
          options={TRACKS.map((t) => ({ value: t, label: TRACK_LABELS[t as Track] }))}
        />
        <FilterSelect
          value={status}
          onChange={setStatus}
          placeholder="All statuses"
          options={STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
        />
        <FilterSelect
          value={source}
          onChange={setSource}
          placeholder="All sources"
          options={SOURCES.map((s) => ({ value: s, label: s }))}
        />
        {activeFilters && (
          <button
            onClick={() => {
              setTrack(ALL);
              setStatus(ALL);
              setSource(ALL);
            }}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "application" : "applications"}
        </span>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border bg-card sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <Th onClick={() => toggleSort("company")} sort={sort} col="company">Company</Th>
              <Th onClick={() => toggleSort("role_title")} sort={sort} col="role_title">Role</Th>
              <Th onClick={() => toggleSort("track")} sort={sort} col="track">Track</Th>
              <Th onClick={() => toggleSort("status")} sort={sort} col="status">Status</Th>
              <Th onClick={() => toggleSort("source")} sort={sort} col="source">Source</Th>
              <Th onClick={() => toggleSort("salary")} sort={sort} col="salary">Salary</Th>
              <Th onClick={() => toggleSort("date_applied")} sort={sort} col="date_applied">Applied</Th>
              <Th onClick={() => toggleSort("priority")} sort={sort} col="priority">Priority</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr
                key={a.id}
                onClick={() => router.push(`/applications/${a.id}`)}
                className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
              >
                <td className="px-3 py-2.5 font-medium">{a.company}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{a.role_title}</td>
                <td className="px-3 py-2.5"><TrackPill track={a.track} /></td>
                <td className="px-3 py-2.5"><StatusBadge status={a.status} /></td>
                <td className="px-3 py-2.5 text-muted-foreground">{a.source ?? "—"}</td>
                <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                  {formatSalaryRange(a.salary_min, a.salary_max, a.salary_currency) ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                  {a.date_applied ? formatDate(a.date_applied) : "—"}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {a.priority ? PRIORITY_LABELS[a.priority as Priority] : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="flex flex-col gap-2 sm:hidden">
        {rows.map((a) => (
          <button
            key={a.id}
            onClick={() => router.push(`/applications/${a.id}`)}
            className="flex flex-col gap-1.5 rounded-lg border bg-card p-3 text-left"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{a.company}</span>
              <StatusBadge status={a.status} />
            </div>
            <span className="text-sm text-muted-foreground">{a.role_title}</span>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <TrackPill track={a.track} />
              {a.source && <span>{a.source}</span>}
              {a.date_applied && <span>· {formatDate(a.date_applied)}</span>}
            </div>
          </button>
        ))}
      </div>

      {rows.length === 0 && (
        <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          No applications match these filters.
        </p>
      )}
    </div>
  );
}

function compare(a: Application, b: Application, key: SortKey): number {
  switch (key) {
    case "salary":
      return (a.salary_min ?? 0) - (b.salary_min ?? 0);
    case "priority":
      return (
        PRIORITY_ORDER[(a.priority as Priority) ?? "medium"] -
        PRIORITY_ORDER[(b.priority as Priority) ?? "medium"]
      );
    case "date_applied": {
      const av = a.date_applied ? new Date(a.date_applied).getTime() : 0;
      const bv = b.date_applied ? new Date(b.date_applied).getTime() : 0;
      return av - bv;
    }
    default: {
      const av = (a[key] ?? "").toString().toLowerCase();
      const bv = (b[key] ?? "").toString().toLowerCase();
      return av.localeCompare(bv);
    }
  }
}

function Th({
  children,
  onClick,
  sort,
  col,
}: {
  children: React.ReactNode;
  onClick: () => void;
  sort: { key: SortKey; dir: "asc" | "desc" };
  col: SortKey;
}) {
  const active = sort.key === col;
  return (
    <th className="px-3 py-2 font-medium">
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          active && "text-foreground",
        )}
      >
        {children}
        {active ? (
          sort.dir === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-40" />
        )}
      </button>
    </th>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto min-w-36">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
