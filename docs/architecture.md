# Architecture

> System components, the multi-tenant model, and the technology behind each service.
> **Owners:** Don & Ridhesh · **Status:** Living · Part of the [Project Blueprint](PROJECT-BLUEPRINT.md) → §4.1. For the picked tech stack see the [blueprint's decision table](PROJECT-BLUEPRINT.md#6-technology-decisions).

## Product Overview

CampusConnect AI is a 24/7 multilingual voice assistant purpose-built for college help desks. It handles inbound and outbound phone calls, SMS, and WhatsApp messages across five Indian languages — English, Hindi, Tamil, Telugu, and Kannada — so that students, parents, and prospective applicants can get instant answers without waiting on hold during business hours. The system understands natural speech, retrieves relevant information from each college's knowledge base, and responds in the caller's own language using text-to-speech.

Core features include FAQ answering across categories such as admissions, fees, hostel, transport, placements, scholarships, office hours, fee payment, and complaints; intelligent escalation of doubtful, angry, payment-related, or emergency calls to human staff; automatic logging of transcripts, recordings, caller numbers, and issue categories; and a full admin dashboard for call review, FAQ/document management, and follow-up scheduling.

CampusConnect AI is deployed as a white-label SaaS platform. Each subscribing college is a fully isolated tenant with its own phone number, branded voice prompts, custom FAQ knowledge base, and admin accounts. The platform handles tenant isolation at the database and application layers so that no data leaks between colleges.

## System Components

- **Telephony Provider** — Twilio handles all PSTN telephony: inbound call routing, SIP trunking, outbound dialling, and SMS/WhatsApp messaging. Each tenant receives a dedicated phone number that maps to a specific college. Twilio's Media Streams pipe raw audio to the Voice Orchestrator in real time.

- **Voice Orchestrator Service** — A dedicated microservice that coordinates the real-time call pipeline. It receives audio streams from Twilio, sends them to the ASR engine, passes the transcribed text to the AI layer, and streams the synthesised response back through Twilio to the caller. It also detects silence, handles barge-in, and manages call state (greeting, listening, speaking, transferring).

- **AI Service / LLM** — A stateless service hosting the intent classifier and response generator. It uses a fine-tuned small LLM for fast intent classification (admissions vs. fees vs. complaint, etc.) and a larger LLM (GPT-4 / Gemini) augmented with retrieval-augmented generation (RAG) to produce natural, context-aware answers grounded in the tenant's FAQ and document corpus.

- **Backend API (api-server)** — The central REST API responsible for tenant management, call logging, FAQ/document CRUD, escalation workflows, user authentication, and billing data. It enforces tenant isolation by reading the tenant ID from the authenticated request context and scoping all queries accordingly.

- **Worker (background jobs)** — A job queue consumer (Bull / Sidekiq) that handles asynchronous tasks: scheduling and placing outgoing follow-up calls, generating post-call summaries, sending SMS/WhatsApp notifications, cleaning up stale recordings, and sending daily analytics digests to admin users.

- **Admin Frontend (web-admin)** — A React single-page application built with **Vite** (the marketing site `web-landing` uses Next.js for SSR/SEO; the data-heavy admin app is a pure SPA). It serves as the administrative interface: admins view live and historical call logs, listen to recordings, read transcripts, manage FAQs and uploaded documents, handle escalations, schedule callbacks, and configure tenant-level settings. See [`frontend-structure.md`](frontend-structure.md).

- **Database** — PostgreSQL with a multi-tenant schema. Every row in tenant-scoped tables (calls, faqs, documents, users, settings) carries a `tenant_id` column. Row-level security (RLS) policies or application-layer filters ensure queries never cross tenant boundaries. The database also stores the mapping between phone numbers and tenant IDs used during inbound call routing.

- **Storage** — An object store (AWS S3 / GCS) for call recordings and large transcripts. Audio files are organised by tenant (`tenants/{tenantId}/calls/{callId}.wav`) and served through pre-signed URLs from the admin frontend. Transcripts are stored as both raw text and structured JSON for search and analysis.

## Multi-tenant SaaS Model

Each subscribing college is a **tenant** identified by a unique `tenantId` (e.g., `"abc"` for "ABC College"). This ID is attached to every tenant-scoped entity: **Calls**, **FAQs**, **Documents**, **Users**, and **Settings**. No table or collection holds data from more than one tenant unless it is a shared lookup table (e.g., country codes).

**How `tenantId` is determined:**

- **Incoming call** — When a call arrives via Twilio, the Voice Orchestrator looks up the called phone number in a `phone_numbers` table to find the matching `tenantId`. This `tenantId` is then carried through the entire call lifecycle — logging, AI context retrieval, escalation routing, and storage paths.
- **Admin login** — When an admin user authenticates via the admin frontend, the backend verifies their credentials and issues a JWT containing their `tenantId`. Every subsequent API request scopes itself to that `tenantId` from the token.

**Data isolation:**

All SQL queries in the backend include a `WHERE tenant_id = :tenantId` clause. PostgreSQL Row-Level Security (RLS) policies provide a defence-in-depth layer — even if a query omits the tenant filter, RLS silently excludes rows from other tenants. Object storage paths likewise include the `tenantId` segment.

**Example:** College ABC has `tenantId = 'abc'`. When a student calls ABC's dedicated phone number, the system creates a `Call` record with `tenant_id = 'abc'`. The AI service retrieves only ABC's FAQs. The admin for ABC logs in and sees only ABC's calls. College XYZ, with `tenantId = 'xyz'`, goes through the exact same flows but never sees ABC's data.

## High-Level Architecture Diagram (Text)

Below is the primary data flow for a single inbound call:

```
 1. Caller dials college's Twilio number
         │
         ▼
 2. Twilio routes call, opens Media Streams
         │
         ▼
 3. Voice Orchestrator receives raw audio
         │
         ▼
 4. ASR (Google/Azure Speech-to-Text)
    ─────────────────────────────────
    • Transcribes audio → text
    • Detects language (en/hi/ta/te/kn)
         │
         ▼
 5. AI Service
    ───────────
    a. Intent Classifier — maps query → category
       (admissions, fees, hostel, etc.)
    b. RAG — retrieves top-k FAQ chunks for tenant
       (vector DB lookup scoped to tenantId)
    c. Response Generator — LLM synthesises answer
       in caller's language
         │
         ▼
 6. Voice Orchestrator receives text response
         │
         ▼
 7. TTS (Google/Azure Text-to-Speech)
    ─────────────────────────────────
    • Converts text → natural speech
    • Sends audio back through Twilio Media Streams
         │
         ├──→ 8a. Caller hears the answer
         │
         └──→ 8b. Backend API (async, via message queue)
                     │
                     ▼
                  9. Database
                     • Call record created (tenantId, caller, duration)
                     • Transcript persisted
                     • Category & escalation flag stored
                     │
                     ▼
                  10. Object Storage
                      • Recording saved (tenants/{tenantId}/calls/{callId}.wav)
                      • Full transcript JSON stored

 11. If escalation flag is set:
     ──────────────────────────
     • Backend creates an Escalation record
     • Admin dashboard shows new escalation in real time
     • Staff can claim, review, and mark as resolved
```

**SMS / WhatsApp flow** follows the same AI pipeline (steps 4–5) but skips ASR and TTS — the user's text comes directly from Twilio Messaging, and the response text is sent back as a message instead of audio.

**Outbound follow-up flow** is triggered by the Worker service, which places a Twilio outbound call and then follows the same Voice Orchestrator → AI pipeline, injecting a follow-up prompt template so the AI initiates the conversation appropriately.

## Non-Functional Requirements

These shape the architecture as much as the features do.

| Concern | Target / approach |
|---|---|
| **Latency (voice)** | Perceived response < ~1.5 s from end-of-speech to start-of-answer. Stream ASR partials, retrieve top-k in a single indexed query, stream LLM + TTS. Keep the Orchestrator lean (§ design principle 3 in the blueprint). |
| **Availability** | Stateless services (`api-server`, `voice-orchestrator`, AI layer) scale horizontally behind a load balancer. Call state lives in the Orchestrator per-connection; durable state in Postgres/Redis. |
| **Tenant isolation** | `tenantId` on every row + Postgres RLS as defence-in-depth. No shared mutable state across tenants. See [`data-model.md`](data-model.md). |
| **Security** | JWT auth (`tenantId`+`role`), service tokens for internal calls, secrets from validated env, pre-signed URLs for recordings, TLS everywhere. See [`integration.md`](integration.md#authentication). |
| **Reliability of AI** | Fail safe: LLM/ASR/TTS errors and low confidence resolve to human escalation, never a confident-wrong answer. See [`ai-flow.md`](ai-flow.md#failure-handling). |
| **Observability** | Structured logs with `requestId`+`tenantId`, health/readiness endpoints, per-call audit trail. |
| **Data residency / PII** | Recordings and transcripts are per-tenant in object storage; PII is not logged at info level. |

## Related docs

- [Project Blueprint](PROJECT-BLUEPRINT.md) — the map of everything.
- [`PROJECT-STRUCTURE.md`](PROJECT-STRUCTURE.md) — how these components map to the repo tree.
- [`app-flows.md`](app-flows.md) — these components in motion.
- [`data-model.md`](data-model.md) · [`api-endpoints.md`](api-endpoints.md) — the persistence and API contracts.
