# Advisor Dashboard UI Design

## Status

Design approved in conversation on 5 September 2026. This document describes the UI and frontend data work to follow; it does not authorize implementation until the user reviews this spec.

## Objective

Improve ClariFi's advisor dashboard so it reads as a dense, professional insurance-advisor console on desktop while remaining clear and interactive on mobile. The dashboard should make client priorities, coverage movement, understanding, follow-up urgency, and product pathways scannable without losing the existing advisor-only workflow.

## Scope decisions

- Use seeded historical demo data for six sessions beginning in March 2026.
- Keep the current five canonical categories: Life insurance, Investment-linked policy, Critical illness, Integrated Shield Plan, and Retirement plan.
- Use one shared icon and category-color definition for every dashboard and workspace surface.
- Use fixed category identity colors for profile and product surfaces.
- Use semantic status colors for understanding and follow-up thresholds: red below 50%, amber from 50% through 74%, and green at 75% or above.
- Use fixed seeded timestamps rather than a live clock.
- Make Session Number and Duration filters genuinely interactive and update Engagement over time, Priority mapping, and the plain-English understanding summary together.
- Display per-category coverage deltas beside current percentages as percentage-point changes from the previous session.
- Sort coverage and product categories by largest unmet need, calculated as client need minus current coverage.
- Use concise explanations for top needs instead of long "why" labels.
- Open the advisor workspace on Dashboard by default.
- Expose Session actions in a mobile bottom drawer.
- Do not add a fixed target session length or numeric time-remaining indicator.
- Do not add a single average-coverage delta KPI across the five categories.

## Non-goals

- No database schema, API contract, or persistence changes.
- No real client-level session-history implementation.
- No suitability or product-recommendation logic beyond the existing illustrative catalog.
- No change to advisor-only access controls, policy evidence permissions, recap approval, or session synchronization.
- No separate mobile application surface.

## Information architecture

The existing Dashboard, Capture, and Workspace navigation remains. Dashboard opens first after a client workspace is opened.

### Profile tab

The profile tab keeps a two-column desktop layout and stacks on mobile.

Left profile card:

- Larger blue/white avatar placeholder icon.
- Client name and profile descriptor.
- Leading session KPI: `6 sessions` with a smaller `Since March 2026` caption.
- Identity subsection containing Name, Age, and Residential status.
- Financial context subsection containing Employment and Income pattern.
- Fixed `As of` timestamp.

Right coverage card:

- Current coverage profile title and supporting explanation.
- Categories sorted by largest unmet need.
- Shared category icon and identity color.
- Coverage bar with standardized rounded ends.
- Current percentage and per-category delta in percentage points.
- Delta icon: upward arrow for improvement, downward arrow for decline, neutral line for no change.
- Small fixed comparison caption, for example `Compared with last visit`.

### Needs and engagement tab

The tab keeps the existing top needs and engagement metrics, but strengthens the hierarchy.

- Each top need has a concise explanatory tag with the key phrase emphasized.
- Engagement over time and Priority mapping are placed inside one large shared container.
- Session Number and Duration controls appear in the shared container header on desktop and stack above the charts on mobile.
- The engagement chart has short labels on early points describing the event that triggered a rise.
- Priority mapping includes explicit axis/grid labels and names the high-need/low-coverage corner `Risk zone`.
- Relative understanding and Follow-up areas remain below the shared container and stack on mobile.
- Relative understanding bars use semantic thresholds plus status icons.
- A concise plain-English summary appears below Relative understanding and recalculates for the selected session and duration.
- Sources & calculation is collapsed by default.
- Session progress includes the donut, threshold gauge, understood/attention signals, and a fixed `As of` timestamp.

### Product suggestions tab

- Keep all five categories visible.
- Sort categories by largest unmet need.
- Give each category a colored header bar using the shared category identity color.
- Use the shared category icon in the header and product rows.
- Increase product and intent type sizes so they remain legible at the card width.
- Preserve the existing advisor-controlled refinement input and illustrative-catalog disclaimer.
- Add a fixed `As of` timestamp to the data-driven panel.

### Workspace and mobile actions

Desktop Workspace continues to use the existing session-capture rail and right-side Session actions panel.

At mobile widths:

- Capture remains accessible through the existing mobile navigation.
- Session actions are opened by a clearly labelled Actions button.
- The drawer contains Coverage progress, Decision menu, and Session recap controls.
- The drawer is touch-friendly, dismissible, and does not obscure the primary navigation state.

## Seeded data model

Add a frontend-only dashboard fixture for six sessions. Each session snapshot has a fixed session number, fixed Singapore timestamp, duration checkpoints, and category metrics.

Each category record includes:

- `id`, `label`, and `shortLabel`
- Shared icon reference and identity color token
- `need` and `coverage`
- `previousCoverage` for the per-category delta
- `understanding`
- Follow-up priority
- Optional concise need explanation

Each duration checkpoint includes:

- Elapsed minutes
- Engagement score
- Trigger label
- Category need/coverage values used by Priority mapping
- Understanding values used by the summary and bars

The dashboard selector resolves the active view by first selecting a session snapshot, then selecting the nearest seeded duration checkpoint at or below the slider value. This makes both controls deterministic and avoids inventing precision between seeded points.

The current live session checklist, notes, transcript, decisions, and recap remain sourced from the existing props and session state. Seeded history powers only the dashboard presentation metrics.

## Interaction rules

### Shared filters

- Session Number is a native/select-style dropdown with six sessions plus a latest-session default.
- Duration is a touch-friendly range slider bounded by the selected snapshot's seeded duration.
- Changing either control updates both charts and the plain-English summary.
- The selected session's fixed timestamp updates all data-driven panels.
- No filter causes horizontal scrolling on mobile.

### Status thresholds

The shared threshold helper must produce the same visual and accessible status across Relative understanding, Follow-up areas, and the session-progress gauge:

- `0–49`: ATTENTION, dark red text on a light red background, warning status icon.
- `50–74`: NEEDS WORK, dark amber/orange text on a light amber background, neutral/attention status icon.
- `75–100`: SUSTAINABLE, dark green text on a light green background, check status icon.

Status must be communicated through text and icons as well as color.

### Fixed timestamps

Do not call the system clock while rendering dashboard timestamps. Use the selected fixture's fixed timestamp and display it consistently as `As of [fixed Singapore date/time]` on every data-driven dashboard panel.

## Visual system

The visual direction is a dense professional advisor console rather than the current soft Apple-style layout.

- Use tighter card spacing and stronger section hierarchy.
- Keep the existing ClariFi blue/white brand foundation.
- Use a restrained neutral surface palette with category color accents.
- Use larger KPI values, readable bar labels, and 13–14px minimum body copy where space permits.
- Standardize every percentage bar to the same height, track color, fill treatment, and rounded end shape.
- Use at least 44px touch targets for mobile controls.
- Keep category colors distinct from semantic status colors.

The initial category-color mapping should be:

- Life insurance: blue
- Investment-linked policy: purple
- Critical illness: orange
- Integrated Shield Plan: teal
- Retirement plan: indigo

The exact accessible shades should be centralized as tokens rather than repeated inline throughout components.

## Implementation boundaries

Expected frontend work is limited to:

- `src/features/advisor/AdvisorDashboard.tsx` for dashboard composition and presentation changes.
- `src/features/advisor/AdvisorView.tsx` for Dashboard-first state and the mobile Actions drawer.
- `src/features/advisor/AdvisorClientSelector.tsx` only if the open-client transition needs to preserve Dashboard-first behavior.
- `src/domain/sessionData.ts` or a new advisor dashboard fixture module for shared category metadata and six seeded snapshots.
- `src/types/clarifi.ts` for frontend-only snapshot types if existing types are insufficient.
- `src/styles.css` and/or a focused advisor style module for shared bar, drawer, status, and responsive tokens.
- Focused frontend tests for sorting, delta calculations, threshold classification, and filter synchronization if the repository's test setup supports them without changing backend behavior.

The existing unused `ProductPathways` implementation should be removed or left untouched only if the final component composition still references it; it should not remain as a second competing product-suggestion presentation.

## Verification criteria

Before implementation is considered complete:

- TypeScript validation passes.
- Dashboard opens by default after opening the demo client.
- All five categories use identical icon/color mappings across Profile, Product Suggestions, Coverage Profile, and Workspace checklist surfaces.
- Coverage rows sort by unmet need and show correct percentage-point deltas.
- Session Number and Duration update both engagement sections and the summary together.
- Threshold labels and icons match the agreed ranges, including 90%+ as SUSTAINABLE.
- Sources & calculation is collapsed by default.
- Product cards and charts work without horizontal overflow on mobile.
- Session actions are accessible through the mobile Actions drawer.
- Fixed timestamps appear on every data-driven panel.
- Existing advisor session actions, recap controls, policy evidence, and export behavior remain functional.
