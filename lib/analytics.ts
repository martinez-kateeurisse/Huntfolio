// Pure analytics helpers for Huntfolio. No I/O here — these take plain
// applications + status-history rows and return a normalized object the
// Analytics page maps straight onto charts. Keeping them pure makes the funnel
// math easy to reason about and unit-test.

import { TRACKS, TRACK_LABELS, SOURCES, type Track } from "@/lib/constants";

// Funnel stage order. `closed` is terminal, not a funnel level.
export const STAGE_ORDER = [
  "saved",
  "applied",
  "screening",
  "interview",
  "offer",
] as const;
export type Stage = (typeof STAGE_ORDER)[number];

export function stageIndex(status: string): number {
  const i = STAGE_ORDER.indexOf(status as Stage);
  return i; // -1 for 'closed' or unknown
}

// The funnel levels we report (Applied and beyond).
export const FUNNEL_STAGES: Stage[] = [
  "applied",
  "screening",
  "interview",
  "offer",
];

export const STAGE_LABELS: Record<Stage, string> = {
  saved: "Saved",
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
};

// Minimal row shapes the helpers need (structurally compatible with the DB rows).
export type AppRow = {
  id: string;
  track: string | null;
  source: string | null;
  date_applied: string | null;
  status: string;
};
export type HistoryRow = {
  application_id: string;
  to_status: string;
  changed_at: string | null;
};

export type AnalyticsFilters = {
  track?: string | null; // 'all' | track
  from?: string | null; // ISO or null = no lower bound
  to?: string | null; // ISO or null = no upper bound
};

export type FunnelLevel = { stage: Stage; label: string; count: number };
export type Conversion = { from: Stage; to: Stage; rate: number };

export type TrackFunnel = {
  track: Track;
  label: string;
  applied: number;
  screening: number;
  interview: number;
  offer: number;
};

export type SourceRate = {
  source: string;
  applied: number;
  responded: number;
  rate: number; // 0..1
};

export type StageDwell = { stage: Stage; avgDays: number; n: number };

export type WeeklyPoint = { weekStart: string; label: string; count: number };

export type AnalyticsData = {
  hasEnoughData: boolean;
  totals: {
    applications: number;
    responseRate: number | null;
    interviewRate: number | null;
    offerRate: number | null;
  };
  funnel: FunnelLevel[];
  conversions: Conversion[];
  byTrack: TrackFunnel[];
  bySource: SourceRate[];
  timeInStage: StageDwell[];
  overTime: WeeklyPoint[];
};

// Highest funnel stage an application ever reached, from its history rows.
export function maxStageReached(historyForApp: HistoryRow[]): number {
  let max = -1;
  for (const h of historyForApp) {
    const idx = stageIndex(h.to_status);
    if (idx > max) max = idx;
  }
  return max;
}

function withinRange(
  iso: string | null,
  from?: string | null,
  to?: string | null,
): boolean {
  if (!iso) return false;
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
}

const MS_PER_DAY = 86_400_000;

// Groups history rows by application for repeated lookups.
function groupHistory(history: HistoryRow[]): Map<string, HistoryRow[]> {
  const map = new Map<string, HistoryRow[]>();
  for (const h of history) {
    if (!map.has(h.application_id)) map.set(h.application_id, []);
    map.get(h.application_id)!.push(h);
  }
  return map;
}

export function computeAnalytics(
  apps: AppRow[],
  history: HistoryRow[],
  filters: AnalyticsFilters = {},
): AnalyticsData {
  const { track = "all", from = null, to = null } = filters;
  const historyByApp = groupHistory(history);

  // The analysis set: applications that reached "applied", within the track and
  // date-range filters (by date_applied — the day they entered the funnel).
  const inScope = apps.filter((a) => {
    if (track && track !== "all" && a.track !== track) return false;
    if (!withinRange(a.date_applied, from, to)) return false;
    const max = maxStageReached(historyByApp.get(a.id) ?? []);
    return max >= stageIndex("applied");
  });

  const counts = countFunnel(inScope, historyByApp);

  const funnel: FunnelLevel[] = FUNNEL_STAGES.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    count: counts[stage],
  }));

  const conversions: Conversion[] = [];
  for (let i = 0; i < FUNNEL_STAGES.length - 1; i++) {
    const a = FUNNEL_STAGES[i];
    const b = FUNNEL_STAGES[i + 1];
    conversions.push({
      from: a,
      to: b,
      rate: counts[a] === 0 ? 0 : counts[b] / counts[a],
    });
  }

  const applied = counts.applied;
  const totals = {
    applications: applied,
    responseRate: applied === 0 ? null : counts.screening / applied,
    interviewRate: applied === 0 ? null : counts.interview / applied,
    offerRate: applied === 0 ? null : counts.offer / applied,
  };

  // By track (ignores the track filter so the comparison always shows all four).
  const byTrack: TrackFunnel[] = TRACKS.map((t) => {
    const set = apps.filter((a) => {
      if (a.track !== t) return false;
      if (!withinRange(a.date_applied, from, to)) return false;
      return maxStageReached(historyByApp.get(a.id) ?? []) >= stageIndex("applied");
    });
    const c = countFunnel(set, historyByApp);
    return {
      track: t,
      label: TRACK_LABELS[t],
      applied: c.applied,
      screening: c.screening,
      interview: c.interview,
      offer: c.offer,
    };
  });

  // Response rate by source (reached screening+ ÷ applied).
  const bySource: SourceRate[] = [...SOURCES].map((src) => {
    const set = inScope.filter((a) => (a.source ?? "Other") === src);
    const c = countFunnel(set, historyByApp);
    return {
      source: src,
      applied: c.applied,
      responded: c.screening,
      rate: c.applied === 0 ? 0 : c.screening / c.applied,
    };
  }).filter((s) => s.applied > 0);

  const timeInStage = computeTimeInStage(inScope, historyByApp);
  const overTime = computeOverTime(inScope);

  return {
    hasEnoughData: applied >= 3,
    totals,
    funnel,
    conversions,
    byTrack,
    bySource,
    timeInStage,
    overTime,
  };
}

function countFunnel(
  apps: AppRow[],
  historyByApp: Map<string, HistoryRow[]>,
): Record<Stage, number> {
  const counts: Record<Stage, number> = {
    saved: 0,
    applied: 0,
    screening: 0,
    interview: 0,
    offer: 0,
  };
  for (const a of apps) {
    const max = maxStageReached(historyByApp.get(a.id) ?? []);
    for (const stage of STAGE_ORDER) {
      if (max >= stageIndex(stage)) counts[stage] += 1;
    }
  }
  return counts;
}

// Average dwell time per stage, from consecutive history timestamps. Only
// completed transitions count (the stage an app currently sits in is excluded).
export function computeTimeInStage(
  apps: AppRow[],
  historyByApp: Map<string, HistoryRow[]>,
): StageDwell[] {
  const totals = new Map<Stage, { sum: number; n: number }>();

  for (const app of apps) {
    const rows = [...(historyByApp.get(app.id) ?? [])]
      .filter((r) => r.changed_at)
      .sort((a, b) => (a.changed_at! < b.changed_at! ? -1 : 1));

    for (let i = 0; i < rows.length - 1; i++) {
      const stage = rows[i].to_status as Stage;
      if (!STAGE_ORDER.includes(stage)) continue; // skip 'closed'
      const dwellMs =
        new Date(rows[i + 1].changed_at!).getTime() -
        new Date(rows[i].changed_at!).getTime();
      if (dwellMs < 0) continue;
      const cur = totals.get(stage) ?? { sum: 0, n: 0 };
      cur.sum += dwellMs;
      cur.n += 1;
      totals.set(stage, cur);
    }
  }

  return STAGE_ORDER.filter((s) => s !== "offer") // offer is usually terminal
    .map((stage) => {
      const t = totals.get(stage);
      return {
        stage,
        avgDays: t && t.n > 0 ? t.sum / t.n / MS_PER_DAY : 0,
        n: t?.n ?? 0,
      };
    })
    .filter((d) => d.n > 0);
}

// Weekly application counts by date_applied (week starts Monday).
export function computeOverTime(apps: AppRow[]): WeeklyPoint[] {
  const buckets = new Map<string, number>();

  for (const a of apps) {
    if (!a.date_applied) continue;
    const monday = weekStart(new Date(a.date_applied));
    const key = monday.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([weekStartIso, count]) => ({
      weekStart: weekStartIso,
      label: shortWeekLabel(new Date(weekStartIso)),
      count,
    }));
}

function weekStart(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // days since Monday
  date.setDate(date.getDate() - diff);
  return date;
}

function shortWeekLabel(d: Date): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}
