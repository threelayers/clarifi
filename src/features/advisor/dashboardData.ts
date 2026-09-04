import {
  CalendarClock,
  HeartPulse,
  ShieldCheck,
  TrendingUp,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type DashboardCategoryId =
  | "life"
  | "investment"
  | "critical"
  | "shield"
  | "retirement";

export type DashboardCategory = {
  id: DashboardCategoryId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  color: string;
  softColor: string;
  keywords: string[];
};

export type CategoryMetrics = {
  need: number;
  coverage: number;
  previousCoverage: number;
  understanding: number;
  followUpPriority: number;
  why: string;
};

export type DashboardCheckpoint = {
  durationMinutes: number;
  engagement: number;
  trigger: string;
  categories: Record<DashboardCategoryId, CategoryMetrics>;
};

export type DashboardSessionSnapshot = {
  sessionNumber: number;
  dateLabel: string;
  timestamp: string;
  durationMinutes: number;
  checkpoints: DashboardCheckpoint[];
};

export const dashboardCategoryIds: DashboardCategoryId[] = [
  "life",
  "investment",
  "critical",
  "shield",
  "retirement",
];

export const dashboardCategories: DashboardCategory[] = [
  {
    id: "life",
    label: "Life insurance",
    shortLabel: "Life",
    icon: UserRound,
    color: "#2563EB",
    softColor: "#EFF6FF",
    keywords: [
      "life insurance",
      "dependant",
      "dependent",
      "family protection",
      "death benefit",
    ],
  },
  {
    id: "investment",
    label: "Investment-linked policy",
    shortLabel: "Investment-linked",
    icon: TrendingUp,
    color: "#7C3AED",
    softColor: "#F5F3FF",
    keywords: ["investment", "investment-linked", "ilp", "fund", "returns"],
  },
  {
    id: "critical",
    label: "Critical illness",
    shortLabel: "Critical illness",
    icon: HeartPulse,
    color: "#C2410C",
    softColor: "#FFF7ED",
    keywords: [
      "critical illness",
      "lump-sum",
      "lump sum",
      "serious illness",
      "rider",
    ],
  },
  {
    id: "shield",
    label: "Integrated Shield Plan",
    shortLabel: "Shield plan",
    icon: ShieldCheck,
    color: "#0F766E",
    softColor: "#F0FDFA",
    keywords: [
      "hospital",
      "hospitalisation",
      "shield",
      "medishield",
      "ward",
      "surgery",
    ],
  },
  {
    id: "retirement",
    label: "Retirement plan",
    shortLabel: "Retirement",
    icon: CalendarClock,
    color: "#4F46E5",
    softColor: "#EEF2FF",
    keywords: ["retirement", "retire", "later life", "annuity", "pension"],
  },
];

const categoryOrder = new Map(
  dashboardCategoryIds.map((categoryId, index) => [categoryId, index]),
);

export function selectCheckpoint(
  snapshot: DashboardSessionSnapshot,
  durationMinutes: number,
) {
  const checkpoints = [...snapshot.checkpoints].sort(
    (a, b) => a.durationMinutes - b.durationMinutes,
  );
  return (
    checkpoints.filter(
      (checkpoint) => checkpoint.durationMinutes <= durationMinutes,
    ).at(-1) || checkpoints[0]
  );
}

type SortMetrics = Partial<
  Record<DashboardCategoryId, Pick<CategoryMetrics, "need" | "coverage">>
>;

export function sortCategoryIdsByUnmetNeed(
  ids: DashboardCategoryId[],
  metrics: SortMetrics,
) {
  return [...ids].sort((a, b) => {
    const aMetrics = metrics[a] || { need: 0, coverage: 0 };
    const bMetrics = metrics[b] || { need: 0, coverage: 0 };
    const unmetNeedDifference =
      bMetrics.need - bMetrics.coverage - (aMetrics.need - aMetrics.coverage);
    if (unmetNeedDifference !== 0) return unmetNeedDifference;
    if (bMetrics.need !== aMetrics.need) return bMetrics.need - aMetrics.need;
    return (categoryOrder.get(a) || 0) - (categoryOrder.get(b) || 0);
  });
}

export function coverageDelta(current: number, previous: number) {
  return current - previous;
}

export function coverageThreshold(value: number) {
  if (value < 50) return { label: "ATTENTION" as const, tone: "red" as const };
  if (value < 75)
    return { label: "NEEDS WORK" as const, tone: "amber" as const };
  return { label: "SUSTAINABLE" as const, tone: "green" as const };
}

type SummaryMetrics = Partial<
  Record<
    DashboardCategoryId,
    Pick<CategoryMetrics, "need" | "coverage" | "understanding">
  >
>;

type SummaryCategories = Partial<
  Record<DashboardCategoryId, Pick<DashboardCategory, "label">>
>;

export function buildUnderstandingSummary(
  metrics: SummaryMetrics,
  categories: SummaryCategories,
) {
  const entries = Object.entries(metrics) as Array<
    [DashboardCategoryId, NonNullable<SummaryMetrics[DashboardCategoryId]>]
  >;
  const understood = entries
    .filter(([, value]) => value.understanding >= 75)
    .sort(([, a], [, b]) => b.understanding - a.understanding)[0];
  const needsWork = entries
    .filter(([, value]) => value.understanding < 75)
    .sort(([, a], [, b]) => a.understanding - b.understanding)[0];

  if (understood && needsWork) {
    return `Client understands ${categories[understood[0]]?.label || "the stronger coverage area"} but still needs clarity on ${categories[needsWork[0]]?.label || "the next priority"}.`;
  }
  if (understood) {
    return `Client understands ${categories[understood[0]]?.label || "the main coverage area"} well; continue checking the remaining priorities.`;
  }
  if (needsWork) {
    return `Client still needs clarity on ${categories[needsWork[0]]?.label || "the current coverage priorities"}.`;
  }
  return "Understanding will become clearer as the session develops.";
}
