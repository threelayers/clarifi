# Frontend Source Map

ClariFi's frontend is organized by responsibility so future edits land in the right place quickly.

## Folders

- `app/` - top-level React shell, app defaults, browser storage helpers, and cross-feature orchestration.
- `features/` - product surfaces grouped by user workflow.
  - `auth/` - demo login screen.
  - `client/` - client copilot surface.
  - `advisor/` - advisor dashboard and private copilot surface.
  - `sessions/` - compact session creation, join, and switching sheet.
  - `settings/` - server-managed AI model settings.
- `domain/` - demo customer, policy, MyInfo, coverage, and decision data.
- `services/` - browser API clients for `/api/*` routes.
- `shared/` - reusable components and generic utilities.
- `types/` - shared TypeScript contracts used across frontend and server demo helpers.

## Conventions

- Use `@/` imports for source files instead of deep relative paths.
- Keep feature-specific UI inside its `features/<feature>` folder.
- Put reusable visual pieces in `shared/components`.
- Put API calls in `services`; React components should not hand-build backend requests.
- Put recovery-only browser storage keys and parsing in `app/clientStorage.ts`; durable state belongs behind the session API.
- Keep product/demo data in `domain` so UI files stay focused on presentation.
