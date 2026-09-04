import { describe, expect, it } from "vitest";
import {
  buildUnderstandingSummary,
  coverageDelta,
  coverageThreshold,
  selectCheckpoint,
  sortCategoryIdsByUnmetNeed,
} from "../src/features/advisor/dashboardData";
import type { DashboardSessionSnapshot } from "../src/features/advisor/dashboardData";

describe("advisor dashboard calculations", () => {
  it("sorts categories by largest unmet need", () => {
    expect(
      sortCategoryIdsByUnmetNeed(["life", "critical", "shield"], {
        life: { need: 48, coverage: 0 },
        critical: { need: 76, coverage: 0 },
        shield: { need: 88, coverage: 72 },
      }),
    ).toEqual(["critical", "life", "shield"]);
  });

  it("returns percentage-point deltas", () => {
    expect(coverageDelta(72, 64)).toBe(8);
    expect(coverageDelta(40, 52)).toBe(-12);
  });

  it("classifies agreed threshold ranges", () => {
    expect(coverageThreshold(49).label).toBe("ATTENTION");
    expect(coverageThreshold(50).label).toBe("NEEDS WORK");
    expect(coverageThreshold(75).label).toBe("SUSTAINABLE");
    expect(coverageThreshold(90).label).toBe("SUSTAINABLE");
  });

  it("selects the latest checkpoint at or below the duration filter", () => {
    const snapshot = {
      sessionNumber: 1,
      dateLabel: "12 Mar 2026",
      timestamp: "12 Mar 2026, 10:00 AM SGT",
      durationMinutes: 24,
      checkpoints: [
        {
          durationMinutes: 4,
          engagement: 42,
          trigger: "Profile captured",
          categories: {},
        },
        {
          durationMinutes: 12,
          engagement: 68,
          trigger: "Hospital cover discussed",
          categories: {},
        },
      ],
    } as DashboardSessionSnapshot;

    expect(selectCheckpoint(snapshot, 18).durationMinutes).toBe(12);
  });

  it("summarizes the filtered understanding state in plain English", () => {
    expect(
      buildUnderstandingSummary(
        {
          shield: { need: 88, coverage: 72, understanding: 82 },
          critical: { need: 76, coverage: 0, understanding: 42 },
        },
        {
          shield: { label: "Integrated Shield Plan" },
          critical: { label: "Critical illness" },
        },
      ),
    ).toContain("understands Integrated Shield Plan");
  });
});
