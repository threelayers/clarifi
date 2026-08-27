# ClariFi Architecture

## Request Flow

```text
React client
  -> typed REST client
  -> Express route + Zod validation
  -> authentication and role check
  -> PostgreSQL or seeded memory store
  -> OpenAI / PDF / object storage service
  -> versioned session response
  -> React state and three-second synchronization
```

## Trust Boundaries

- The browser receives only its authorized session projection.
- Client responses never include private advisor messages or audit events.
- Advisor-only routes protect policy upload, advisor chat, recap generation, decisions, and audit records.
- OpenAI credentials are server-only.
- Policy downloads require an authenticated user assigned to the session.
- PDF uploads are limited to one 12 MB file, MIME-checked, signature-checked, and text-extracted before metadata is committed.

## Persistence

`AppStore` defines the persistence boundary. `PostgresStore` is selected when `DATABASE_URL` exists. `MemoryStore` is a seeded fallback for local use and resilient hackathon demonstrations.

The conversation state is a versioned JSON snapshot because the client and advisor update one shared workspace frequently. Policy pages and audit events use separate rows for search and compliance inspection.

## Synchronization

The client polls the active session every three seconds. It only hydrates a newer version and pauses polling while a local save is pending. Text notes and transcripts are debounced; checklist and decision actions save immediately. This works within Vercel's request-based runtime and can later be replaced with realtime events without changing the session contract.

## Policy Evidence

Advisor upload -> private Blob/S3 storage -> PDF.js page extraction -> policy page rows -> keyword ranking -> page quotation -> authenticated original PDF.

When an AI question matches uploaded pages, the top evidence snippets are added to the dynamic prompt and returned to the UI with document and page metadata.

## Deployment Order

1. Provision PostgreSQL and private Blob or S3 storage.
2. Configure production environment variables.
3. Run `npm run db:migrate` and `npm run db:seed` against production PostgreSQL.
4. Run `npm run check`.
5. Deploy a preview and verify login, persistence, upload, search, synchronization, and AI.
6. Promote the verified artifact to production.
