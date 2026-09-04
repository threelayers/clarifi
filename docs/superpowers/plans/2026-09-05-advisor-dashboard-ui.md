# Advisor Dashboard UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved dense, responsive advisor-console redesign with seeded six-session dashboard history, shared category styling, per-category coverage deltas, interactive engagement filters, mobile Session actions drawer, and realistic demo client avatars.

**Architecture:** Keep the existing advisor-only shell and REST/session behavior unchanged. Move dashboard presentation metrics into a frontend-only seeded fixture and pure selector/threshold helpers, centralize the five category definitions for every surface, and keep live session actions sourced from existing props. Refactor the large advisor dashboard in focused presentation sections without introducing database or API changes.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 3, Lucide React, Vitest, Vite, built-in ImageGen for raster avatar assets.

**Spec:** `docs/superpowers/specs/2026-09-05-advisor-dashboard-design.md`

## Global Constraints

- Use seeded historical demo data for six sessions beginning in March 2026.
- Keep the five categories: Life insurance, Investment-linked policy, Critical illness, Integrated Shield Plan, and Retirement plan.
- Use one shared icon and category-color definition for every dashboard and workspace surface.
- Use semantic status colors: red below 50%, amber from 50% through 74%, and green at 75% or above.
- Use fixed seeded timestamps rather than a live clock.
- Make Session Number and Duration filters update Engagement over time, Priority mapping, and the plain-English summary together.
- Display per-category coverage deltas as percentage-point changes from the previous session.
- Sort coverage and product categories by `need - coverage` descending.
- Do not add a target session length, numeric time-remaining indicator, or average-coverage delta KPI.
- Preserve advisor-only access, policy evidence, recap approval, export, and session synchronization behavior.
- Keep mobile controls at least 44px high and prevent horizontal overflow.

## File Map

- Create `src/features/advisor/dashboardData.ts` for dashboard-only types, category metadata, six seeded session snapshots, selectors, sorting, delta, threshold, and summary helpers.
- Create `tests/advisorDashboardData.test.ts` for pure dashboard behavior tests.
- Create `public/avatars/tan-li-wen.png`, `public/avatars/marcus-lim.png`, `public/avatars/aisha-rahman.png`, and `public/avatars/priya-nair.png` as generated square portrait assets.
- Modify `src/features/advisor/AdvisorDashboard.tsx` to consume shared category metadata and seeded snapshots, and to render the redesigned profile, coverage, engagement, progress, and product surfaces.
- Modify `src/features/advisor/AdvisorView.tsx` to open on Dashboard by default, add the mobile Actions drawer, and use shared category metadata for the Workspace checklist.
- Modify `src/features/advisor/AdvisorClientSelector.tsx` to render the four generated client portraits while preserving existing selection and demo behavior.
- Modify `src/styles.css` for shared advisor-console tokens, drawer transitions, slider styling, status surfaces, and responsive details.
- Modify `src/types/clarifi.ts` only if the dashboard fixture types cannot remain local to `dashboardData.ts`.
- Do not modify backend routes, database schema, persistence contracts, or authentication behavior.

### Task 1: Add pure dashboard data contracts and calculation helpers

**Files:**
- Create: `src/features/advisor/dashboardData.ts`
- Test: `tests/advisorDashboardData.test.ts`

**Interfaces:**
- `DashboardCategoryId = "life" | "investment" | "critical" | "shield" | "retirement"`
- `DashboardCategory` contains `id`, `label`, `shortLabel`, `icon`, `color`, `softColor`, and `keywords`.
- `CategoryMetrics` contains `need`, `coverage`, `previousCoverage`, `understanding`, `followUpPriority`, and `why`.
- `DashboardCheckpoint` contains `durationMinutes`, `engagement`, `trigger`, and `categories: Record<DashboardCategoryId, CategoryMetrics>`.
- `DashboardSessionSnapshot` contains `sessionNumber`, `dateLabel`, `timestamp`, `durationMinutes`, and `checkpoints`.
- `selectCheckpoint(snapshot, durationMinutes): DashboardCheckpoint` returns the latest checkpoint at or below the requested duration, falling back to the first checkpoint.
- `sortCategoryIdsByUnmetNeed(categories, metrics): DashboardCategoryId[]` returns category ids ordered by `need - coverage` descending, then `need` descending, then the canonical category order.
- `coverageDelta(current, previous): number` returns the signed percentage-point difference.
- `coverageThreshold(value): { label: "ATTENTION" | "NEEDS WORK" | "SUSTAINABLE"; tone: "red" | "amber" | "green" }` uses 0–49, 50–74, and 75–100 ranges.
- `buildUnderstandingSummary(metrics, categories): string` returns one concise advisor-facing sentence derived from the selected metrics.

- [ ] **Step 1: Write failing tests for sorting, deltas, thresholds, checkpoint selection, and summary output.**

```ts
import { describe, expect, it } from "vitest";
import {
  buildUnderstandingSummary,
  coverageDelta,
  coverageThreshold,
  selectCheckpoint,
  sortCategoryIdsByUnmetNeed,
} from "@/features/advisor/dashboardData";

describe("advisor dashboard calculations", () => {
  it("sorts categories by largest unmet need", () => {
    expect(
      sortCategoryIdsByUnmetNeed(
        ["life", "critical", "shield"],
        {
          life: { need: 48, coverage: 0 },
          critical: { need: 76, coverage: 0 },
          shield: { need: 88, coverage: 72 },
        },
      ),
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
        { durationMinutes: 4, engagement: 42, trigger: "Profile captured", categories: {} },
        { durationMinutes: 12, engagement: 68, trigger: "Hospital cover discussed", categories: {} },
      ],
    } as any;
    expect(selectCheckpoint(snapshot, 18).durationMinutes).toBe(12);
  });

  it("summarizes the filtered understanding state in plain English", () => {
    expect(
      buildUnderstandingSummary(
        {
          shield: { need: 88, coverage: 72, understanding: 82 },
          critical: { need: 76, coverage: 0, understanding: 42 },
        },
        { shield: { label: "Integrated Shield Plan" }, critical: { label: "Critical illness" } },
      ),
    ).toContain("understands Integrated Shield Plan");
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails because the dashboard module does not exist yet.**

Run: `npm test -- --run tests/advisorDashboardData.test.ts`

Expected: FAIL with module/export errors, not a test-runner configuration error.

- [ ] **Step 3: Implement the minimum exported types, category metadata, and helpers.**

```ts
export const coverageDelta = (current: number, previous: number) => current - previous;

export function coverageThreshold(value: number) {
  if (value < 50) return { label: "ATTENTION" as const, tone: "red" as const };
  if (value < 75) return { label: "NEEDS WORK" as const, tone: "amber" as const };
  return { label: "SUSTAINABLE" as const, tone: "green" as const };
}
```

Use stable canonical order only as the final tie-breaker. Keep Lucide icon references and category color tokens in this module so the Profile, Product Suggestions, Coverage Profile, Relative Understanding, Priority mapping, and Workspace checklist use the same definitions.

- [ ] **Step 4: Run the focused test and verify it passes.**

Run: `npm test -- --run tests/advisorDashboardData.test.ts`

Expected: PASS for all focused dashboard calculation tests.

- [ ] **Step 5: Commit the pure helper contract.**

```bash
git add tests/advisorDashboardData.test.ts src/features/advisor/dashboardData.ts
git commit -m "test: add advisor dashboard calculation contracts"
```

### Task 2: Add deterministic six-session dashboard fixtures

**Files:**
- Modify: `src/features/advisor/dashboardData.ts`
- Test: `tests/advisorDashboardData.test.ts`

**Interfaces:**
- Export `advisorDashboardSnapshots: DashboardSessionSnapshot[]` with exactly six sessions numbered 1 through 6.
- Export `latestDashboardSnapshot` as session 6.
- Export `getDashboardSnapshot(sessionNumber: number): DashboardSessionSnapshot` with session 6 fallback for invalid values.

- [ ] **Step 1: Add failing tests for the six-session fixture and stable current-session values.**

```ts
it("contains six fixed sessions beginning in March 2026", () => {
  expect(advisorDashboardSnapshots).toHaveLength(6);
  expect(advisorDashboardSnapshots[0].sessionNumber).toBe(1);
  expect(advisorDashboardSnapshots[0].dateLabel).toContain("Mar 2026");
  expect(advisorDashboardSnapshots.at(-1)?.sessionNumber).toBe(6);
});

it("includes a fixed timestamp and all five categories at every checkpoint", () => {
  const categoryIds = ["life", "investment", "critical", "shield", "retirement"];
  for (const snapshot of advisorDashboardSnapshots) {
    expect(snapshot.timestamp).toContain("SGT");
    for (const checkpoint of snapshot.checkpoints) {
      expect(Object.keys(checkpoint.categories)).toEqual(categoryIds);
    }
  }
});
```

- [ ] **Step 2: Run the focused test and verify the fixture assertions fail.**

Run: `npm test -- --run tests/advisorDashboardData.test.ts`

Expected: FAIL because the six-session exports/data are not present.

- [ ] **Step 3: Add six fixed snapshots with three or more duration checkpoints each.**

Use plausible monotonic coverage/understanding movement with at least one category-specific decline in a later session so the UI demonstrates both upward and downward arrows. Keep session 6 aligned with the current demo storyline: strong Integrated Shield Plan coverage, an unresolved income/life/critical-illness gap, and readable trigger labels such as `Profile captured`, `Hospital cover clarified`, `Income gap surfaced`, and `Critical illness question raised`.

Use fixed fixture timestamps for every snapshot. Do not call `new Date()` when producing dashboard labels.

- [ ] **Step 4: Run the focused test and verify it passes.**

Run: `npm test -- --run tests/advisorDashboardData.test.ts`

Expected: PASS with six sessions and complete category records.

- [ ] **Step 5: Commit the fixture data.**

```bash
git add src/features/advisor/dashboardData.ts tests/advisorDashboardData.test.ts
git commit -m "feat: add seeded advisor dashboard history"
```

### Task 3: Generate and wire realistic demo client avatars

**Files:**
- Create: `public/avatars/tan-li-wen.png`
- Create: `public/avatars/marcus-lim.png`
- Create: `public/avatars/aisha-rahman.png`
- Create: `public/avatars/priya-nair.png`
- Modify: `src/features/advisor/AdvisorClientSelector.tsx`
- Modify: `src/features/advisor/AdvisorView.tsx`
- Modify: `src/features/advisor/AdvisorDashboard.tsx`

**Interfaces:**
- Add a portrait `avatarSrc` field to the client selector fixture.
- Use the same Tan Li Wen portrait in the selector, Workspace client header, and Profile dashboard.
- Preserve initials as an accessible fallback if an image fails to load.

- [ ] **Step 1: Generate four distinct square, realistic, neutral-background portrait assets with the built-in ImageGen tool.**

Use a consistent prompt structure: realistic professional headshot, centered face and shoulders, neutral soft studio background, natural expression, no text, no logos, no watermark, square crop suitable for a small UI avatar. Match each portrait to the existing fictional demo persona without adding identifying real-person likeness.

- [ ] **Step 2: Inspect each generated output and move the selected final assets into `public/avatars/` without overwriting existing files.**

Confirm each asset is square, contains one portrait, has no text/watermark, and remains legible when rendered at 40–64px.

- [ ] **Step 3: Replace initials with image avatars and keep accessible fallbacks.**

Use an image with `alt="Tan Li Wen"` (and matching names for the other clients), `object-cover`, a brand-colored border or ring, and an `onError` fallback that reveals the existing initials.

- [ ] **Step 4: Run TypeScript validation.**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit the avatar assets and wiring.**

```bash
git add public/avatars src/features/advisor/AdvisorClientSelector.tsx src/features/advisor/AdvisorView.tsx src/features/advisor/AdvisorDashboard.tsx
git commit -m "feat: add realistic demo client avatars"
```

### Task 4: Refactor profile, coverage, and product surfaces

**Files:**
- Modify: `src/features/advisor/AdvisorDashboard.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- `ProfileDashboard` consumes the selected snapshot and the shared category config.
- `CoveragePortfolio` consumes `{ categories, metrics, timestamp }` and renders sorted rows with deltas.
- `ProductSuggestionsDashboard` consumes the existing catalog plus sorted category records.

- [ ] **Step 1: Add failing pure assertions for profile ordering and per-category deltas if any new helper is introduced.**

```ts
it("places the highest unmet coverage category first", () => {
  expect(sortCategoryIdsByUnmetNeed(["life", "critical", "shield"], metrics)).toEqual([
    "critical",
    "life",
    "shield",
  ]);
});
```

- [ ] **Step 2: Run the focused test and verify the behavior is covered before JSX changes.**

Run: `npm test -- --run tests/advisorDashboardData.test.ts`

Expected: PASS for the already-defined sorting/delta contract.

- [ ] **Step 3: Replace the profile initials tile with the generated portrait, add the six-session KPI, and split fields into Identity and Financial context.**

Use a desktop two-column card header and stack the KPI below the client identity on mobile. Keep Name, Age, and Residential status in Identity; keep Employment and Income pattern in Financial context.

- [ ] **Step 4: Render Current coverage profile from the selected checkpoint.**

For each sorted category, render the shared category icon/color, label, bar, current percentage, signed percentage-point delta, and a delta icon. Use category identity colors in this surface; do not use red/amber/green fill colors for category identity. Add a fixed `Compared with last visit` caption and the selected snapshot's fixed timestamp.

- [ ] **Step 5: Refactor Product Suggestions to use the same category config and unmet-need order.**

Apply the category color to each header bar, reuse the category icon in header and rows, increase product/intent type sizes, keep all five categories visible, and preserve the advisor-controlled catalog refinement behavior.

- [ ] **Step 6: Standardize shared percentage-bar styling and dense console surfaces.**

Create focused classes/tokens in `src/styles.css` for the bar track/fill shape, category accent, status badge, and dense panel spacing. Keep responsive padding and avoid fixed widths that cause mobile overflow.

- [ ] **Step 7: Run typecheck and the existing test suite.**

Run: `npm run typecheck`

Run: `npm test -- --run`

Expected: typecheck passes and all tests pass.

- [ ] **Step 8: Commit the profile, coverage, and product surfaces.**

```bash
git add src/features/advisor/AdvisorDashboard.tsx src/styles.css tests/advisorDashboardData.test.ts
git commit -m "feat: redesign advisor profile and coverage surfaces"
```

### Task 5: Refactor engagement, progress, and shared filters

**Files:**
- Modify: `src/features/advisor/AdvisorDashboard.tsx`
- Modify: `src/features/advisor/dashboardData.ts` only if selector helpers need a focused adjustment
- Modify: `src/styles.css`

**Interfaces:**
- Dashboard-local state stores `selectedSessionNumber` and `durationMinutes`.
- The selected checkpoint is passed to Engagement over time, Priority mapping, Relative understanding, Follow-up areas, Session progress, and the plain-English summary.
- `getDashboardView(snapshots: DashboardSessionSnapshot[], sessionNumber: number, durationMinutes: number): { snapshot: DashboardSessionSnapshot; checkpoint: DashboardCheckpoint; engagement: number; summary: string }` returns the single derived view consumed by all filtered dashboard sections.

- [ ] **Step 1: Add failing tests for filter synchronization through the selector helper.**

```ts
it("uses the selected session and duration checkpoint for all derived dashboard data", () => {
  const selected = getDashboardView(advisorDashboardSnapshots, 3, 16);
  expect(selected.snapshot.sessionNumber).toBe(3);
  expect(selected.checkpoint.durationMinutes).toBeLessThanOrEqual(16);
  expect(selected.engagement).toBe(selected.checkpoint.engagement);
  expect(selected.summary).toContain(".");
});
```

- [ ] **Step 2: Run the focused test and verify it fails before adding the selector.**

Run: `npm test -- --run tests/advisorDashboardData.test.ts`

Expected: FAIL because `getDashboardView` is not yet exported.

- [ ] **Step 3: Implement the minimal shared-view selector and wire Session Number/Duration state into the dashboard.**

The Session Number control defaults to session 6. The Duration slider defaults to the selected snapshot's maximum duration, is bounded by that duration, and uses the nearest checkpoint at or below the selected value. Changing either control must feed the same selected checkpoint to both charts and the summary.

- [ ] **Step 4: Run the focused test and verify it passes.**

Run: `npm test -- --run tests/advisorDashboardData.test.ts`

Expected: PASS.

- [ ] **Step 5: Put Engagement over time and Priority mapping inside one shared large panel.**

Add two top-right controls on desktop and stacked controls on mobile. Add trigger labels to early engagement points. Add `High need / Low coverage · Risk zone` and corresponding gridline labels to the priority map. Use shared category icons/colors for the map legend while using threshold status for the plotted urgency state.

- [ ] **Step 6: Add threshold status to Relative understanding, Follow-up areas, and Session progress.**

Use the shared `coverageThreshold` helper, status text, status icon, and semantic badge styles. Add the plain-English summary below Relative understanding and derive it from the selected checkpoint. Collapse Sources & calculation by default using a native disclosure element or an equivalent accessible control.

- [ ] **Step 7: Add the session-progress threshold gauge and fixed timestamps.**

Keep the donut, add the ATTENTION/NEEDS WORK/SUSTAINABLE gauge beneath it, and add fixed `As of` labels to every data-driven panel. Do not add target duration or average-coverage delta content.

- [ ] **Step 8: Run typecheck, focused tests, and full tests.**

Run: `npm run typecheck`

Run: `npm test -- --run tests/advisorDashboardData.test.ts`

Run: `npm test -- --run`

Expected: all commands pass.

- [ ] **Step 9: Commit engagement and progress behavior.**

```bash
git add src/features/advisor/AdvisorDashboard.tsx src/features/advisor/dashboardData.ts src/styles.css tests/advisorDashboardData.test.ts
git commit -m "feat: add interactive advisor engagement metrics"
```

### Task 6: Add Dashboard-first navigation and mobile Session actions drawer

**Files:**
- Modify: `src/features/advisor/AdvisorView.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- `AdvisorView` initializes `tab` to `"dashboard"`.
- `AdvisorView` owns `actionsDrawerOpen` only for mobile presentation state.
- Existing `CoverageChecklist`, `DecisionMenu`, and `RecapActions` remain the single source of action behavior and are rendered inside the drawer on mobile.

- [ ] **Step 1: Add a focused interaction test if the existing test environment can render React; otherwise document this as a browser verification.**

The required behavior is that a fresh `AdvisorView` starts on Dashboard and the mobile Actions control opens a drawer containing the existing Coverage progress, Decision menu, and Session recap controls.

- [ ] **Step 2: Change the initial tab to Dashboard and confirm the existing desktop Workspace flow remains reachable.**

Do not remove the Workspace or Capture tabs.

- [ ] **Step 3: Add a mobile Actions control and bottom drawer.**

The control must be at least 44px high, have an accessible label, and be visible only where the desktop right rail is hidden. The drawer must be dismissible by close button, backdrop, and Escape key; it must not change the selected top-level tab.

- [ ] **Step 4: Ensure the Workspace checklist uses the shared category icon/color map.**

Keep checklist selection and recap actions wired to existing callbacks.

- [ ] **Step 5: Run typecheck and full tests.**

Run: `npm run typecheck`

Run: `npm test -- --run`

Expected: all commands pass.

- [ ] **Step 6: Commit navigation and drawer behavior.**

```bash
git add src/features/advisor/AdvisorView.tsx src/styles.css
git commit -m "feat: add dashboard-first mobile session actions"
```

### Task 7: Verify the finished dashboard across desktop and mobile

**Files:**
- Verify: `src/features/advisor/AdvisorDashboard.tsx`
- Verify: `src/features/advisor/AdvisorView.tsx`
- Verify: `src/features/advisor/AdvisorClientSelector.tsx`
- Verify: `src/features/advisor/dashboardData.ts`
- Verify: `public/avatars/*.png`

- [ ] **Step 1: Run the complete quality gate.**

Run: `npm run typecheck`

Run: `npm test -- --run`

Run: `npm run build`

Expected: all commands pass without TypeScript, test, or build errors.

- [ ] **Step 2: Start the local app with the existing project command and inspect the advisor demo at desktop width.**

Verify Dashboard is the first view; the profile card shows the portrait, `6 sessions`, grouped fields, and fixed timestamp; coverage rows are sorted and show deltas; products share category colors/icons; engagement sections share one container and filters update both sections; threshold labels and status icons are readable.

- [ ] **Step 3: Inspect the mobile layout at a phone-width viewport.**

Verify there is no horizontal overflow; cards and controls stack; the Session actions button opens the drawer; coverage, decision, and recap controls remain interactable; avatars and chart labels remain legible.

- [ ] **Step 4: Verify filter and status edge cases.**

Check session 1, session 6, minimum duration, maximum duration, 49%, 50%, 74%, 75%, and 90% threshold states. Confirm downward category deltas render with the correct icon and wording.

- [ ] **Step 5: Re-run the complete quality gate after manual verification.**

Run: `npm run typecheck`

Run: `npm test -- --run`

Run: `npm run build`

Expected: all commands pass.
