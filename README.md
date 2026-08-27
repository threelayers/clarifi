# ClariFi - Insurance Clarity Copilot

ClariFi is a two-surface insurance clarity copilot for live client-advisor conversations. It explains policy knowledge, detects possible misunderstanding, records learning points, and keeps advice and suitability decisions with the licensed human advisor.

Production demo: `https://clarifi-mu.vercel.app/ClariFi.dc.html`

## Stack

- Frontend: React 18, TypeScript, Tailwind CSS, Vite
- Backend: Node.js, Express, TypeScript, Vercel Functions
- AI: OpenAI Responses API with strict structured outputs
- Database: Neon-compatible PostgreSQL with Drizzle ORM and SQL migrations
- Authentication: bcrypt credentials, signed JWT cookies, advisor/client roles
- Documents: private Vercel Blob, S3-compatible storage, or memory-only local adapter
- PDF evidence: page-level extraction with PDF.js and authenticated source retrieval
- Synchronization: versioned session snapshots with three-second polling
- Cache: optional Redis for sessions and policy metadata
- Validation and protection: Zod, rate limiting, upload validation, audit events, security headers
- Tests: Vitest, Supertest, generated PDF fixtures

## Implemented Flows

- Database-backed registration and credential login when PostgreSQL is configured.
- Seeded advisor and client demo accounts in both PostgreSQL and fallback mode.
- Role-protected client/advisor APIs and redaction of private advisor messages.
- Persistent messages, notes, transcript, handwriting, Learning Points, coverage, decisions, preparation, recap, and approval state.
- Session creation, client join codes, session switching, and shared polling synchronization.
- Real advisor-only PDF upload, storage, page extraction, evidence search, and authenticated original-PDF access.
- Uploaded-policy evidence injected into client and advisor AI context.
- Deterministic AI fallback when OpenAI is unavailable.
- Audit records for authentication, sessions, state changes, AI outputs, uploads, joins, and approvals.
- Readiness endpoints that report database, Redis, OpenAI, authentication-secret, and document-storage modes.

## Demo Accounts

| Account | Email | Password | Role |
| --- | --- | --- | --- |
| Advisor demo | `advisor@clarifi.demo` | `clarifi-advisor` | Advisor |
| Client demo | `client@clarifi.demo` | `clarifi-client` | Client |

The seeded demo session uses join code `LIWEN28`. One-click demo login remains available for judging.

## Local Development

Requirements: Node.js 20+, npm, and optionally Docker Desktop for PostgreSQL.

```bash
npm install
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

`npm run dev` starts Express on port 3000 and Vite on port 5173. Vite proxies `/api/*` to Express.

If PostgreSQL is unavailable, the application uses a seeded in-memory adapter. This keeps the demo usable, but records do not survive a process restart.

## Quality Gates

```bash
npm run typecheck
npm test
npm run build
npm run check
npm audit --omit=dev
npm run check:deployment
```

`npm run check` runs TypeScript validation, API integration tests, and the Vite production build.
`npm run check:deployment` smoke-tests the deployed page, API health endpoint, and demo-account endpoint. Set `DEPLOYMENT_URL` for previews and `REQUIRE_MANAGED_SERVICES=1` when the release must fail unless Postgres and storage are connected.

## Database

- Schema: `server/db/schema.ts`
- Drizzle configuration: `drizzle.config.ts`
- SQL migrations: `drizzle/`
- Seed command: `npm run db:seed`

The primary tables are `users`, `conversations`, `policy_documents`, `policy_pages`, and `audit_events`. Each conversation stores a versioned shared workspace snapshot, while policy pages and audit events remain independently queryable.

## API Surface

Authentication:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/demo-login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Sessions:

- `GET /api/sessions`
- `GET /api/sessions/current`
- `POST /api/sessions`
- `POST /api/sessions/join`
- `GET /api/sessions/:sessionId`
- `PATCH /api/sessions/:sessionId/state`
- `GET /api/sessions/:sessionId/audit`

Policy evidence:

- `POST /api/policies/:sessionId/upload`
- `GET /api/policies/:sessionId/search?q=...`
- `GET /api/policies/:sessionId/documents/:documentId/download`

AI:

- `POST /api/chat/client`
- `POST /api/chat/advisor`
- `POST /api/premeeting`
- `POST /api/recap`

Operations:

- `GET /api/health`
- `GET /api/ready`

## Environment

Copy `.env.example` to `.env` for local development. Never commit actual values.

Required for persistent production deployment:

```bash
DATABASE_URL=<Neon pooled PostgreSQL URL>
OPENAI_API_KEY=<server-side secret>
JWT_SECRET=<32+ character random secret>
SESSION_SECRET=<32+ character random secret>
BLOB_READ_WRITE_TOKEN=<private Vercel Blob token>
APP_URL=https://clarifi-mu.vercel.app
CORS_ORIGIN=https://clarifi-mu.vercel.app
ENABLE_DEMO_FALLBACK=true
```

S3-compatible storage can replace Vercel Blob using the `S3_*` variables in `.env.example`. Redis is optional.

The browser never stores or transmits an OpenAI API key. Model selection remains a client preference; credentials stay on the server.

## Production Modes

- With `DATABASE_URL`, records use PostgreSQL. Without it, the API explicitly reports `memory-fallback`.
- With `BLOB_READ_WRITE_TOKEN`, PDFs use private Vercel Blob. S3 is the second choice. Production uploads are rejected when neither is configured.
- With `REDIS_URL`, Express sessions and cached policy metadata use Redis. Otherwise production uses JWT-only cookies.
- With no OpenAI key and `ENABLE_DEMO_FALLBACK=true`, deterministic responses keep the demonstration functional.

## Project Structure

- `src/app/` - application state and shared-session orchestration
- `src/features/` - auth, client, advisor, sessions, and settings UI
- `src/services/` - typed browser API client
- `server/routes/` - authentication, session, policy, and AI endpoints
- `server/repositories/` - PostgreSQL/in-memory persistence abstraction
- `server/services/` - OpenAI, Redis, PDF, and document storage services
- `server/db/` - Drizzle schema, database client, and seed script
- `drizzle/` - generated SQL migrations
- `tests/` - API integration tests
- `api/index.ts` - Vercel Function entrypoint

See `docs/ARCHITECTURE.md` for boundaries and deployment behavior.
