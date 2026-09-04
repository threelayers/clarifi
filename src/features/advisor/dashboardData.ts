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
  const discussedEntries = entries.filter(([, value]) => value.understanding > 0);
  const understood = discussedEntries
    .filter(([, value]) => value.understanding >= 75)
    .sort(([, a], [, b]) => b.understanding - a.understanding)[0];
  const needsWork = discussedEntries
    .filter(([, value]) => value.understanding > 0 && value.understanding < 75)
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

const categoryNeeds: Record<DashboardCategoryId, number> = {
  life: 48,
  investment: 34,
  critical: 76,
  shield: 88,
  retirement: 42,
};

const categoryWhy: Record<DashboardCategoryId, string> = {
  life: "Freelance income makes family continuity worth checking.",
  investment: "Long-term growth has not been discussed in depth yet.",
  critical: "A serious illness could create a cash need beyond hospital bills.",
  shield: "Hospital bill protection is the clearest current coverage area.",
  retirement: "Variable income makes long-term income continuity worth exploring.",
};

const emptyMetricValues = (value: number) =>
  dashboardCategoryIds.reduce(
    (result, categoryId) => ({ ...result, [categoryId]: value }),
    {} as Record<DashboardCategoryId, number>,
  );

const metricValues = (
  values: Partial<Record<DashboardCategoryId, number>>,
  fallback: number,
) => ({ ...emptyMetricValues(fallback), ...values });

const makeMetrics = (
  coverage: Partial<Record<DashboardCategoryId, number>>,
  previousCoverage: Record<DashboardCategoryId, number>,
  understanding: Partial<Record<DashboardCategoryId, number>>,
) =>
  dashboardCategoryIds.reduce(
    (result, categoryId) => {
      const currentCoverage = coverage[categoryId] || 0;
      result[categoryId] = {
        need: categoryNeeds[categoryId],
        coverage: currentCoverage,
        previousCoverage: previousCoverage[categoryId],
        understanding: understanding[categoryId] || 0,
        followUpPriority: Math.max(
          8,
          Math.min(100, categoryNeeds[categoryId] - currentCoverage + 18),
        ),
        why: categoryWhy[categoryId],
      };
      return result;
    },
    {} as Record<DashboardCategoryId, CategoryMetrics>,
  );

type CheckpointInput = {
  durationMinutes: number;
  engagement: number;
  trigger: string;
  coverage: Partial<Record<DashboardCategoryId, number>>;
  understanding: Partial<Record<DashboardCategoryId, number>>;
};

const makeSnapshot = ({
  sessionNumber,
  dateLabel,
  timestamp,
  durationMinutes,
  previousCoverage,
  checkpoints,
}: {
  sessionNumber: number;
  dateLabel: string;
  timestamp: string;
  durationMinutes: number;
  previousCoverage: Record<DashboardCategoryId, number>;
  checkpoints: CheckpointInput[];
}): DashboardSessionSnapshot => ({
  sessionNumber,
  dateLabel,
  timestamp,
  durationMinutes,
  checkpoints: checkpoints.map((checkpoint) => ({
    durationMinutes: checkpoint.durationMinutes,
    engagement: checkpoint.engagement,
    trigger: checkpoint.trigger,
    categories: makeMetrics(
      checkpoint.coverage,
      previousCoverage,
      checkpoint.understanding,
    ),
  })),
});

const noPreviousCoverage = emptyMetricValues(0);

export const advisorDashboardSnapshots: DashboardSessionSnapshot[] = [
  makeSnapshot({
    sessionNumber: 1,
    dateLabel: "12 Mar 2026",
    timestamp: "12 Mar 2026, 10:00 AM SGT",
    durationMinutes: 22,
    previousCoverage: noPreviousCoverage,
    checkpoints: [
      {
        durationMinutes: 4,
        engagement: 36,
        trigger: "Profile captured",
        coverage: { shield: 18 },
        understanding: { shield: 34 },
      },
      {
        durationMinutes: 12,
        engagement: 55,
        trigger: "Hospital cover discussed",
        coverage: { shield: 36 },
        understanding: { shield: 52 },
      },
      {
        durationMinutes: 22,
        engagement: 72,
        trigger: "Hospital bill boundary clarified",
        coverage: { shield: 52 },
        understanding: { shield: 68 },
      },
    ],
  }),
  makeSnapshot({
    sessionNumber: 2,
    dateLabel: "9 Apr 2026",
    timestamp: "9 Apr 2026, 2:00 PM SGT",
    durationMinutes: 24,
    previousCoverage: metricValues({ shield: 52 }, 0),
    checkpoints: [
      {
        durationMinutes: 4,
        engagement: 42,
        trigger: "Previous questions revisited",
        coverage: { shield: 54 },
        understanding: { shield: 72 },
      },
      {
        durationMinutes: 13,
        engagement: 64,
        trigger: "Deductible and co-insurance discussed",
        coverage: { shield: 56 },
        understanding: { shield: 74 },
      },
      {
        durationMinutes: 24,
        engagement: 79,
        trigger: "Claim-cost expectations checked",
        coverage: { shield: 58 },
        understanding: { shield: 76 },
      },
    ],
  }),
  makeSnapshot({
    sessionNumber: 3,
    dateLabel: "7 May 2026",
    timestamp: "7 May 2026, 11:00 AM SGT",
    durationMinutes: 25,
    previousCoverage: metricValues({ shield: 58 }, 0),
    checkpoints: [
      {
        durationMinutes: 5,
        engagement: 41,
        trigger: "Hospital cover recap",
        coverage: { shield: 58 },
        understanding: { shield: 77 },
      },
      {
        durationMinutes: 14,
        engagement: 67,
        trigger: "Critical illness question raised",
        coverage: { shield: 60, critical: 6 },
        understanding: { shield: 78, critical: 36 },
      },
      {
        durationMinutes: 25,
        engagement: 82,
        trigger: "Lump-sum expectation separated",
        coverage: { shield: 64, critical: 10 },
        understanding: { shield: 80, critical: 44 },
      },
    ],
  }),
  makeSnapshot({
    sessionNumber: 4,
    dateLabel: "4 Jun 2026",
    timestamp: "4 Jun 2026, 3:30 PM SGT",
    durationMinutes: 28,
    previousCoverage: metricValues({ shield: 64, critical: 10 }, 0),
    checkpoints: [
      {
        durationMinutes: 5,
        engagement: 44,
        trigger: "Coverage priorities reviewed",
        coverage: { shield: 64 },
        understanding: { shield: 80, critical: 44 },
      },
      {
        durationMinutes: 16,
        engagement: 70,
        trigger: "Income gap surfaced",
        coverage: { shield: 66, critical: 14, life: 6 },
        understanding: { shield: 81, critical: 48, life: 38 },
      },
      {
        durationMinutes: 28,
        engagement: 86,
        trigger: "Freelance recovery risk discussed",
        coverage: { shield: 68, critical: 18, life: 12 },
        understanding: { shield: 82, critical: 54, life: 46 },
      },
    ],
  }),
  makeSnapshot({
    sessionNumber: 5,
    dateLabel: "16 Jul 2026",
    timestamp: "16 Jul 2026, 1:00 PM SGT",
    durationMinutes: 26,
    previousCoverage: metricValues({ shield: 68, critical: 18, life: 12 }, 0),
    checkpoints: [
      {
        durationMinutes: 5,
        engagement: 40,
        trigger: "Income protection recap",
        coverage: { shield: 68, critical: 18, life: 12 },
        understanding: { shield: 82, critical: 54, life: 46 },
      },
      {
        durationMinutes: 14,
        engagement: 62,
        trigger: "Family protection explored",
        coverage: { shield: 70, critical: 22, life: 16, investment: 4 },
        understanding: { shield: 83, critical: 58, life: 52, investment: 34 },
      },
      {
        durationMinutes: 26,
        engagement: 88,
        trigger: "Product pathway priorities clarified",
        coverage: { shield: 70, critical: 24, life: 18, investment: 6 },
        understanding: { shield: 84, critical: 62, life: 58, investment: 42 },
      },
    ],
  }),
  makeSnapshot({
    sessionNumber: 6,
    dateLabel: "4 Sep 2026",
    timestamp: "4 Sep 2026, 11:24 PM SGT",
    durationMinutes: 30,
    previousCoverage: metricValues(
      { shield: 70, critical: 24, life: 18, investment: 6 },
      0,
    ),
    checkpoints: [
      {
        durationMinutes: 6,
        engagement: 44,
        trigger: "Profile context refreshed",
        coverage: { shield: 70, critical: 26, life: 18, investment: 8 },
        understanding: { shield: 84, critical: 60, life: 58, investment: 42 },
      },
      {
        durationMinutes: 16,
        engagement: 72,
        trigger: "Income and work gap revisited",
        coverage: {
          shield: 72,
          critical: 24,
          life: 20,
          investment: 10,
          retirement: 4,
        },
        understanding: {
          shield: 85,
          critical: 54,
          life: 62,
          investment: 46,
          retirement: 42,
        },
      },
      {
        durationMinutes: 30,
        engagement: 91,
        trigger: "Critical illness trade-off clarified",
        coverage: {
          shield: 72,
          critical: 20,
          life: 24,
          investment: 10,
          retirement: 8,
        },
        understanding: {
          shield: 86,
          critical: 48,
          life: 66,
          investment: 50,
          retirement: 54,
        },
      },
    ],
  }),
];

export const latestDashboardSnapshot = advisorDashboardSnapshots.at(-1)!;

export function getDashboardSnapshot(sessionNumber: number) {
  return (
    advisorDashboardSnapshots.find(
      (snapshot) => snapshot.sessionNumber === sessionNumber,
    ) || latestDashboardSnapshot
  );
}
