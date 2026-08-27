# ClariFi Whitepaper

Updated: 27 August 2026

## Executive Summary

ClariFi is an insurance clarity copilot for advisory conversations. It is designed for the Singapore College of Insurance hackathon context and demonstrates how AI can reduce confusion before, during, and after an insurance discussion without replacing the licensed human advisor.

The product focuses on a common failure point in insurance conversations: clients hear explanations, but leave unsure about what the plan actually covers, what is excluded, and what questions they should ask next. ClariFi turns the live conversation, client notes, policy clauses, and advisor intent into structured clarity outputs.

The current prototype includes:

- A client surface with a knowledge-only AI chat, speech-to-text session capture, typed notes, iPad-ready handwriting notes, learning points, policy quotes, and read-only decision preview.
- An advisor surface with MyInfo-style profile context, pre-meeting preparation, follow-up coverage topics, a private AI copilot, coverage checklist, decision menu, policy search, evidence citations, and advisor-approved recap.
- A production-oriented backend using OpenAI structured outputs, dynamic system prompts, database-backed identity, role protection, versioned session persistence, PDF evidence extraction, audit logging, rate limits, and Vercel API routes.

ClariFi is not built to recommend products or tell the client what to buy. Its role is to explain policy knowledge neutrally, detect possible misunderstanding, confirm understanding, and route advice or suitability questions back to the licensed advisor or agent.

## Product Positioning

ClariFi sits between a generic chatbot and an insurer's internal sales tool.

It is not:

- A sales recommender.
- A replacement financial advisor.
- A product comparison engine.
- A generic FAQ bot.

It is:

- A clarity layer for live advisory sessions.
- A two-surface copilot for both client and advisor.
- A session-memory and evidence system.
- A knowledge-only AI that keeps suitability decisions with the human advisor.

The core product belief is simple: better insurance outcomes start when both sides know what has actually been understood.

## Problem Statement

Young adults and early-stage insurance customers often struggle to understand policy language, product boundaries, and the difference between related but separate risks.

The prototype centers on Tan Li Wen, a 28-year-old freelance designer. She has hospitalisation coverage, but may misunderstand the difference between:

- Hospital bill reimbursement.
- Income replacement if she cannot work.
- Critical illness lump-sum payouts.
- Standalone outpatient mental health coverage.
- Pre-existing condition exclusions.

The key misunderstanding demonstrated by the prototype is:

> "I have hospitalisation insurance, so if I cannot work because I am sick, my bills or income will be covered."

Hospitalisation insurance may reimburse eligible hospital bills, but it does not automatically replace lost salary or freelance income. For freelancers, this difference is financially important.

ClariFi addresses this by detecting possible confusion, explaining what policy clauses say, confirming understanding with teach-back prompts, and documenting the session for the advisor.

## Target Users

### Client

The client is a young adult or early-stage insurance buyer who may:

- Be afraid to ask "basic" questions.
- Mix up different types of insurance coverage.
- Need plain-language explanations during or after a meeting.
- Prefer to write private notes while listening.
- Want to confirm their own understanding without feeling judged.

### Advisor

The advisor is a licensed human professional who may:

- Need to cover many points under time pressure.
- Need a quick view of what the client appears to understand.
- Want session-specific cues without surrendering judgment to AI.
- Need evidence-backed wording for policy boundaries.
- Need a recap that can be approved and used as an audit trail.

### Insurance Company or Training Body

The organization benefits because ClariFi can:

- Reduce repeated confusion after purchase.
- Improve consistency in explanations.
- Make advisory conversations more transparent.
- Support training and quality assurance.
- Reduce reputation damage caused by misunderstanding and poor follow-up.

## Demo Storyline

The prototype uses one fixed demo persona:

- Name: Tan Li Wen
- Age: 28
- Role: Freelance Designer
- Stage: First-time / early-stage insurance customer
- Current plan: PRUShield Plus, hospitalisation and surgical coverage

The demo session shows how ClariFi helps the advisor and client separate "covered hospital bills" from "money needed while not working." It also highlights related concerns around critical illness, outpatient mental health, and pre-existing conditions.

The demonstration is structured around three phases:

1. Pre-session and start of session.
2. Mid-session client-advisor interaction.
3. Post-session recap and follow-up.

## Current Feature Set

### 1. Pre-Session and Start of Session

#### Demo Login and Landing Page

The app opens with a professional login surface and named demo accounts:

- Advisor demo: `advisor@clarifi.demo`
- Client demo: `client@clarifi.demo`

The login exists so the project feels deployment-ready and can support role-based workflows. Demo auth is implemented through backend API routes and JWT/session cookies.

#### MyInfo-Style Profile Import

The advisor dashboard includes a MyInfo-style imported profile:

- Personal particulars.
- Family, employment, and income signals.
- Housing, education, and CPF context.

In the current prototype, this is demo data, not a live Singpass integration. It demonstrates how ClariFi would reduce tedious factfinding by pre-filling structured context, letting the advisor focus on risk appetite, goals, and existing knowledge.

#### Pre-Meeting Preparation

ClariFi generates pre-meeting preparation for the advisor:

- Advisor brief.
- Likely concerns.
- Follow-up coverage topics.
- Client-facing clarity focus.

The advisor-side "Follow-up coverage" section intentionally shows topics instead of scripted questions. This avoids making the advisor feel undermined while still guiding them toward important coverage areas.

### 2. Mid-Session Client Functions

#### Speech-to-Text Session Capture

The client surface includes session input for live conversation capture.

Implemented behavior:

- Browser speech recognition through the Web Speech API when available.
- Language selector for English, Chinese, Malay, and Tamil.
- Manual Client/Advisor speaker toggle.
- Transcript fallback text area if speech recognition is unavailable.

Current limitation:

- The prototype does not perform true automatic speaker diarization. The user chooses whether the current speaker is Client or Advisor.

This still demonstrates the intended workflow: ClariFi listens to the shared conversation, stores it as session context, and uses it to support learning points, client replies, advisor prompts, and recap.

#### Notes Function

The client can capture private notes in two ways:

- Typed notes.
- iPad-ready handwriting canvas.

The handwriting canvas stores the drawn note as an image and sends it to the backend AI context when a live OpenAI key is available. The system prompt tells the AI to treat notes as client perception and focus signals, not policy evidence.

This matters because clients often write down what they personally find important. ClariFi can use those notes as signals of worry, interest, or misunderstanding.

#### Learning Points

The client view shows "Learning points" instead of a heavy audit-style panel.

Points are color coded:

- Green: understood well.
- Yellow/amber: needs clarification or next action.
- Red: not covered or unknown.

This is generated from AI responses and session context. It is meant to be lightweight enough for a client to scan without being overloaded.

#### Knowledge-Only Client Chat

The client can ask ClariFi questions in their own words.

The client AI follows Detect -> Explain -> Confirm:

- Detect likely confusion.
- Explain policy knowledge neutrally.
- Confirm understanding with a teach-back question.

If the client asks for advice, suitability, product choice, or what decision to make, ClariFi refuses to advise and directs the client to the licensed advisor or agent.

#### Policy Quote

The client view shows relevant policy quotes when ClariFi cites evidence. Seeded clauses keep the baseline demonstration available, while advisor-uploaded PDFs are extracted page by page and returned with document names and page numbers. The client can open the authenticated source PDF but cannot upload or alter advisor evidence.

#### Decision Menu Preview

The client can see the advisor-selected decision path in a read-only "Decision menu."

This supports transparency. The client sees what the advisor is currently focusing on, such as:

- Hospitalisation foundation.
- Income protection gap.
- Critical illness lump-sum check.
- Outpatient mental health boundary.

The client cannot change these selections from the client view. This keeps control with the advisor while reducing the feeling that decisions are hidden.

### 3. Mid-Session Advisor Functions

#### Private Advisor Copilot

The advisor has a private AI chat that receives:

- Advisor messages.
- Client chat transcript.
- Client notes.
- Speech transcript.
- Handwritten note image context when available.

The advisor copilot provides neutral observations, cites session context, and suggests clarification directions. It does not generate pushy sales language or recommend product decisions.

#### Coverage Checklist

The advisor action rail includes coverage checkboxes tailored to Tan Li Wen's situation:

- Hospital bills explained.
- Income loss separated.
- Critical illness checked.
- Mental health boundary.
- Pre-existing wait period.
- Affordability / CPF context.

This is not a simple pass/fail checklist. It is a structured coverage progress tool that helps the advisor track what has been clarified against the client's risk context.

#### Decision Menu

The advisor can select decision paths. Each path includes:

- Linked needs.
- Summarised effects.
- Limitations.
- Client-friendly summary.

The decision menu is not an AI recommendation engine. It is an advisor-controlled transparency layer. ClariFi can summarize how the selected path relates to the client's situation, but suitability remains with the advisor.

#### Policy Viewer

The advisor has a policy viewer/search surface.

Implemented behavior:

- Advisor-only PDF upload with size, MIME, and PDF-signature validation.
- Private Vercel Blob or S3-compatible object storage.
- PDF.js extraction with page-level text records.
- Search over extracted pages with ranked quotations.
- Authenticated access to the original source PDF.
- Retrieved uploaded-policy evidence injected into AI context.
- Seeded policy clauses retained as a fallback demonstration.

Scanned image-only PDFs currently require a future OCR service.

#### Advisor Recap and Approval

The advisor can generate a recap with:

- Confirmed covered items.
- Clarified not-covered items.
- Follow-up actions.

The advisor can approve or unapprove the recap. The generated recap and approval state are persisted in the shared session and recorded in the audit trail.

### 4. Post-Session

Post-session behavior is currently supported through continued access to:

- Client chat.
- Advisor chat.
- Session recap.
- Understanding/learning record.

The product direction is that client access after purchase can reduce conflict of interest between insurance companies and prospects, while still allowing purchased clients to use ClariFi as a knowledge support layer.

## AI Behavior and Safety Boundary

ClariFi has an explicit advice boundary in the system prompt.

The AI is instructed to:

- Provide neutral insurance knowledge.
- Explain policy wording.
- Explain trade-offs only in general terms.
- Ask teach-back questions.
- Suggest questions to ask the advisor.
- Avoid recommending products, riders, insurers, sums assured, premiums, or coverage amounts.

The AI is instructed not to:

- Tell the client what to buy.
- Tell the client whether to cancel, switch, upgrade, or downgrade.
- Decide whether a product is suitable.
- Recommend a plan or rider.
- Speak as the advisor.

When advice is requested, the backend also applies an advice-intent check and appends a redirect if needed:

> ClariFi can explain policy wording and concepts, but advice and suitability decisions must go to the licensed advisor or agent.

This boundary is applied to client replies, advisor replies, recap generation, and pre-meeting preparation prompts.

## Dynamic Prompt System

ClariFi's prompt system is dynamic because backend prompts are rebuilt on every request using the current application state.

### Inputs Used by the Prompt

The prompt may include:

- Client profile.
- Current plan.
- Policy clauses.
- Client chat history.
- Advisor chat history.
- Client notes.
- Speech transcript.
- Handwritten note image.
- Client transcript summary.

### Client Prompt

The client prompt instructs the AI to:

- Speak directly to Tan Li Wen.
- Explain in plain language.
- Detect misunderstanding.
- Cite evidence IDs from the known clause list.
- Keep replies concise.
- Return learning points.
- Avoid advice.

The client response must match a structured JSON schema:

```json
{
  "reply": "string",
  "detected": true,
  "misunderstanding": "string",
  "evidenceIds": ["C1"],
  "understanding": [
    {
      "point": "Hospital bills can be reimbursed.",
      "status": "covered"
    }
  ],
  "teachBack": "string"
}
```

### Advisor Prompt

The advisor prompt instructs the AI to:

- Speak privately to the advisor.
- Keep the human advisor in control.
- Avoid pushy sales language.
- Cite client session or profile evidence.
- Suggest neutral clarification directions.
- Keep outputs short and scannable.

The advisor response schema returns:

```json
{
  "reply": "string",
  "citations": [
    {
      "source": "Client session",
      "quote": "string"
    }
  ]
}
```

### Recap Prompt

The recap prompt produces:

- Covered.
- Not covered.
- Follow-ups.

The recap is meant to become an audit trail after advisor approval.

### Pre-Meeting Prompt

The pre-meeting prompt produces:

- Advisor brief.
- Likely concerns.
- Follow-up coverage topics.
- Client focus widget.

The prompt explicitly tells the model not to produce scripted questions for the follow-up coverage list. The UI displays concise coverage topics instead.

## Data Flow

### Client Message Flow

```text
Client asks question
        |
        v
React state appends user message
        |
        v
services/clarifiApi.ts sends /api/chat/client
        |
        v
Express validates request with Zod
        |
        v
server/openai.ts builds client system prompt
        |
        v
OpenAI Responses API returns structured JSON
        |
        v
Frontend renders reply, alert, quote, teach-back, learning points
```

### Advisor Message Flow

```text
Advisor asks question
        |
        v
Frontend sends advisor history + client transcript + notes context
        |
        v
/api/chat/advisor validates and calls advisor prompt
        |
        v
OpenAI returns reply + citations
        |
        v
Advisor view renders private insight and cited session evidence
```

### Notes and Speech Context Flow

```text
Speech transcript + typed notes + handwriting image
        |
        v
Debounced to the role-protected session API
        |
        v
Persisted in a versioned PostgreSQL session snapshot
        |
        v
AI treats them as client perception and session context
        |
        v
Outputs prioritize likely misunderstanding and follow-up points
```

## Technical Architecture

### Frontend

The frontend stack is:

- React
- TypeScript
- Tailwind CSS
- Vite

The source is now organized for collaboration:

- `src/app/` - app shell, defaults, storage helpers, cross-feature state orchestration.
- `src/features/` - client, advisor, auth, and settings surfaces.
- `src/shared/` - reusable UI and utilities.
- `src/services/` - browser API client.
- `src/domain/` - demo policy, persona, MyInfo, coverage, and decision data.
- `src/types/` - shared TypeScript contracts.

The main state hook is `src/app/useClariFiApp.ts`. It coordinates:

- Auth state.
- Current view.
- Client and advisor messages.
- Server-managed OpenAI model settings.
- Persistent notes, transcript, and handwriting state.
- Recap state.
- Pre-meeting prep state.
- Coverage and decision selections.

The UI uses an Apple-inspired design direction: calm surfaces, restrained hierarchy, compact rails, clear controls, and reduced client-side information overload.

### Backend

The backend stack is:

- Node.js
- Express
- TypeScript
- Zod validation
- Vercel serverless entrypoint

The main server entrypoint is:

- `api/index.ts` for Vercel.
- `server/app.ts` for Express routes.
- `server/openai.ts` for AI prompt construction and OpenAI calls.

Current API routes include:

- `GET /api/health`
- `GET /api/ready`
- `GET /api/policy`
- `GET /api/auth/demo-accounts`
- `POST /api/auth/demo-login`
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/sessions`
- `GET /api/sessions/current`
- `POST /api/sessions`
- `POST /api/sessions/join`
- `GET /api/sessions/:sessionId`
- `PATCH /api/sessions/:sessionId/state`
- `GET /api/sessions/:sessionId/audit`
- `POST /api/policies/:sessionId/upload`
- `GET /api/policies/:sessionId/search`
- `GET /api/policies/:sessionId/documents/:documentId/download`
- `POST /api/chat/client`
- `POST /api/chat/advisor`
- `POST /api/recap`
- `POST /api/premeeting`

## Storage, Database, Cache, and Auth

The requested production stack is represented as follows:

| Area | Current Status |
| --- | --- |
| PostgreSQL | Implemented through a Neon-compatible Drizzle store with an explicit seeded fallback. |
| Drizzle ORM | Type-safe schema, generated SQL migration, database client, and seed command are implemented. |
| Redis | Optional Redis helper exists for cache/session support. |
| Auth | Credential login, bcrypt hashing, signed JWT cookies, demo accounts, and role authorization are implemented. |
| Document storage | Private Vercel Blob and S3-compatible adapters are implemented; memory storage is development-only. |
| OpenAI | Live Responses API integration through backend proxy. |
| Vercel | Production deployment configured through `vercel.json`. |

The app persists its shared workspace through the session API. Local storage remains a recovery cache for input continuity. Without `DATABASE_URL`, the API declares `memory-fallback`; with PostgreSQL configured, records survive devices and deployments.

## OpenAI Integration

The backend reads `OPENAI_API_KEY` from the server environment. Production browsers never store or transmit API keys. Local development can use an environment file, while model choice remains a browser preference.

If no key is configured and demo fallback is enabled, deterministic demo responses keep the prototype usable.

## Evidence Model

The prototype retains seeded clauses with IDs such as `C1`, `C4`, and `C8`, and can also index uploaded PDFs into page records.

Each AI response can return `evidenceIds`. The frontend maps those IDs back to policy clauses and displays:

- Clause code.
- Clause title.
- Relevant quote.
- Highlighted wording.

Uploaded evidence adds the document ID, file name, page number, quotation, and relevance score. Source PDF access is authenticated against the current session.

## Implementation Status

### Implemented in Current Prototype

- Landing page and demo login.
- Client and advisor role surfaces.
- Knowledge-only AI boundary.
- Client chat with misunderstanding detection.
- Advisor private copilot.
- Structured OpenAI JSON responses.
- Demo fallback responses.
- Pre-meeting preparation.
- MyInfo-style demo profile panel.
- Speech-to-text session input with language selector.
- Manual speaker toggle.
- Typed notes.
- iPad-ready handwriting canvas.
- Learning points.
- Policy quote cards.
- Advisor policy viewer/search over demo clauses.
- Coverage checklist.
- Advisor-controlled decision menu.
- Read-only client decision preview.
- Session recap generation.
- Advisor approval toggle for recap.
- Database-backed registration and credential login.
- Client/advisor role enforcement and private-response redaction.
- Versioned session persistence with PostgreSQL or declared memory fallback.
- Session creation, join codes, switching, and three-second shared synchronization.
- Persistent notes, transcript, messages, learning points, coverage, decisions, preparation, and recap.
- Real PDF upload, private object-storage adapters, page extraction, search, and source retrieval.
- Audit events, API rate limiting, upload limits, and deployment health checks.
- Automated API tests for authentication, persistence, role protection, AI fallback, and PDF evidence.
- Vercel deployment support.
- Professional source structure for collaboration.

### Demo or Externally Dependent

- MyInfo/Singpass integration is simulated with demo data.
- Speaker detection is manual, not automatic diarization.
- Multilingual speech recognition depends on browser support and is basic.
- PostgreSQL code, migrations, and seed flow are complete, but the public deployment requires a connected Neon database.
- Private PDF storage is complete, but the public deployment requires Vercel Blob or S3 credentials.
- Automatic OCR for scanned image-only PDFs is not implemented.
- Synchronization uses polling rather than push events.

## Why This Is Different

ClariFi's differentiators are:

1. Persona calibration: explanations are tailored to Tan Li Wen's profile and first-time buyer context.
2. Conversation monitoring: notes and transcripts are used to detect confusion and prioritize follow-up.
3. Two-surface output: client and advisor see different views of the same clarity process.
4. Pre-meeting preparation: advisor starts with likely concerns and follow-up coverage topics.
5. Session memory: recap and learning points preserve what was clarified.
6. Advice boundary: the AI is deliberately knowledge-only and routes decisions to the advisor.
7. Evidence grounding: claims are tied to policy clauses rather than unsupported chatbot answers.

## Business and Impact Case

For clients, ClariFi reduces:

- Fear of asking poor questions.
- Confusion after meetings.
- Reliance on memory alone.
- Misunderstanding of coverage boundaries.

For advisors, ClariFi reduces:

- Missed follow-up points.
- Repeated explanation burden.
- Risk of inconsistent wording.
- Lack of session-specific memory.

For insurers and training bodies, ClariFi supports:

- Better advisory quality.
- More transparent conversations.
- Stronger audit trail.
- Improved trust in insurance education.

## Limitations and Risks

### Advice Risk

The largest risk is accidental advice. ClariFi mitigates this through:

- System prompts.
- Advice-intent detection.
- Knowledge-only UI labels.
- Redirects to the advisor/agent.

This should be strengthened further with compliance review, logging, and automated evaluation.

### Evidence Risk

The current evidence base is seeded demo clauses. Production must ensure:

- Full policy documents are parsed correctly.
- Quotes are source-linked.
- Retrieval does not hallucinate clause references.
- Versioning tracks which policy document was active during the session.

### Privacy Risk

ClariFi can process personal data, notes, speech transcripts, and potentially sensitive financial context. Production deployment must include:

- Consent flows.
- Data retention controls.
- Encryption at rest.
- Access control by role.
- Audit logging.
- Secure deletion.

### Speech Recognition Risk

Browser speech recognition may mishear names, policy terms, or speaker identity. ClariFi mitigates this by:

- Showing transcript text.
- Allowing manual typed correction.
- Using speaker labels.
- Flagging uncertainty in prompts.

Production should use a more reliable transcription and diarization provider.

## Production Roadmap

### Near-Term

- Provision Neon PostgreSQL and private Vercel Blob for the public deployment.
- Run the generated migration and demo seed against production.
- Add OCR for scanned policy documents.
- Add automated AI citation and advice-boundary evaluations.
- Add consent, retention, export, and deletion workflows.

### Mid-Term

- Integrate Singpass/MyInfo with proper consent.
- Add robust speech-to-text with automatic speaker diarization.
- Add multilingual understanding and translation checks beyond browser speech recognition.
- Add advisor organization dashboard.
- Add policy version management.
- Add automated compliance evaluation for advice boundary violations.

### Long-Term

- Multi-client advisor workspace.
- Insurer or training-body analytics.
- Structured suitability handoff to licensed advisor workflows.
- Client post-purchase knowledge portal.
- Integrations with CRM, e-signature, and document management systems.

## Demo Accounts

| Account | Email | Password | Role |
| --- | --- | --- | --- |
| Advisor demo | `advisor@clarifi.demo` | `clarifi-advisor` | Advisor |
| Client demo | `client@clarifi.demo` | `clarifi-client` | Client |

## Deployment

The app is configured for Vercel.

Production URL:

- `https://clarifi-mu.vercel.app`

Recommended production environment variables:

```bash
OPENAI_API_KEY=<sensitive>
JWT_SECRET=<long random string>
SESSION_SECRET=<long random string>
APP_URL=https://clarifi-mu.vercel.app
CORS_ORIGIN=https://clarifi-mu.vercel.app
ENABLE_DEMO_FALLBACK=true
```

Persistent production services:

```bash
DATABASE_URL=<PostgreSQL URL>
BLOB_READ_WRITE_TOKEN=<private Vercel Blob token>
REDIS_URL=<Redis URL>
S3_ENDPOINT=<S3-compatible endpoint>
S3_REGION=ap-southeast-1
S3_BUCKET=<bucket>
S3_ACCESS_KEY_ID=<key>
S3_SECRET_ACCESS_KEY=<secret>
```

## Conclusion

ClariFi demonstrates a practical insurance AI product that is not trying to replace the advisor. It helps the client understand, helps the advisor track what matters, and turns the session into structured clarity data.

The strongest part of the current prototype is the combination of:

- Live conversation capture.
- Client notes and handwriting.
- Dynamic prompts.
- Evidence-grounded explanations.
- Advisor-controlled decision and recap surfaces.
- Strict knowledge-only advice boundary.

The current codebase now contains the persistent backend, role model, migration, policy extraction, synchronization, tests, and audit foundation. The remaining production work is service provisioning and regulated integration: real MyInfo consent, robust diarized transcription, OCR, and compliance review.
