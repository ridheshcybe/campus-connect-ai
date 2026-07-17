# CampusConnect AI — Project Blueprint

> The single, complete "clean project idea" for CampusConnect AI. Start here.
> **Primary owner of this document:** Don & Ridhesh · **Status:** Living blueprint · **Last major revision:** 2026-07-17

This blueprint is the master reference. It states *what* we are building, *how* the pieces fit, and *who owns what*, then links out to the detailed docs for each area. Every other document in `docs/` expands one section of this one.

---

## 0. Reading order

| If you want to… | Read |
|---|---|
| Understand the whole product in 10 minutes | This file, sections 1–4 |
| Set up the repo and run it | [`../README.md`](../README.md) → [`codebase-organization.md`](codebase-organization.md) |
| Build the system architecture | [`architecture.md`](architecture.md) |
| Build a backend endpoint | [`backend-guide.md`](backend-guide.md) + [`api-endpoints.md`](api-endpoints.md) + [`data-model.md`](data-model.md) |
| Build an admin screen | [`frontend-structure.md`](frontend-structure.md) + [`integration.md`](integration.md) |
| Wire the AI answer pipeline | [`ai-flow.md`](ai-flow.md) |
| Trace a call end-to-end | [`app-flows.md`](app-flows.md) |
| Navigate all docs | [`README.md`](README.md) (docs index) |

---

## 1. The product in one paragraph

**CampusConnect AI is a 24/7 multilingual voice assistant for college help desks, delivered as a white-label multi-tenant SaaS.** Students, parents, and applicants call a college's dedicated phone number and get instant, spoken answers in one of five Indian languages — English, Hindi, Tamil, Telugu, Kannada — about admissions, fees, hostel, transport, placements, scholarships, and more. The system transcribes speech, retrieves the college's own knowledge base with RAG, generates a grounded answer with an LLM, speaks it back, and **escalates to a human** when it is unsure, when money or safety is involved, or when the caller asks. Every call is logged — transcript, recording, category, confidence — into a per-tenant database that college staff review through an admin dashboard.

**Target users**

- **Callers** (students / parents / applicants) — never see software; they just make a phone call, send an SMS, or message on WhatsApp.
- **College admins** — use the `web-admin` dashboard to review calls, manage the FAQ/document knowledge base, handle escalations, and configure their tenant.
- **Platform (super) admins** — provision new college tenants.

---

## 2. Design principles (the "clean" in "clean project idea")

These are the rules every decision is checked against. When in doubt, follow these.

1. **Tenant isolation is non-negotiable.** Every tenant-scoped row carries a `tenantId`. It is derived from the caller's dialled number (inbound) or the admin's JWT (dashboard) — **never** passed by the client as a plain parameter. Postgres Row-Level Security is the second line of defence. See [`data-model.md`](data-model.md).
2. **One source of truth for contracts.** Shared TypeScript types + Zod schemas live in `packages/types`. The backend validates with them; the frontend imports them; the docs describe them. If a shape changes, it changes in one place. See [`integration.md`](integration.md).
3. **The Voice Orchestrator stays dumb; the brain lives in the backend.** The Orchestrator only streams audio and manages call state. All AI logic (RAG, prompt building, LLM calls) sits behind `POST /ai/answer` in the `api-server`. This keeps the real-time path lean and the AI logic testable. See [`ai-flow.md`](ai-flow.md).
4. **The LLM provider is pluggable.** Code depends on an `LLMProvider` interface, not on a specific vendor. Claude, GPT-4, and Gemini are interchangeable adapters behind it. No provider SDK is imported outside `packages/prompts` / the AI service layer.
5. **The frontend never calls `fetch` directly.** All HTTP goes through `web-admin/src/lib/api`; all React state around it goes through hooks in `web-admin/src/hooks`. Components render, hooks fetch, `lib/api` transports. See [`frontend-structure.md`](frontend-structure.md).
6. **Fail safe, not silent.** Low confidence, provider errors, and timeouts all resolve to *escalate to a human*, never to a wrong-but-confident answer.
7. **Everything reviewable.** Every AI interaction is logged so a human can audit exactly what the caller asked and what the AI said.

---

## 3. System at a glance

```
                         ┌──────────────────────────────────────────────┐
   Caller (phone)        │                CampusConnect AI               │
        │                │                                              │
        ▼                │   ┌────────────────┐     ┌────────────────┐  │
   ┌─────────┐  audio    │   │ voice-         │     │ AI Service /   │  │
   │ Twilio  │◄─────────►│   │ orchestrator   │────►│ POST /ai/answer│  │
   │ (PSTN,  │  Media    │   │ (WS, call FSM) │     │ (RAG + LLM)    │  │
   │  SMS,   │  Streams  │   └───────┬────────┘     └───────┬────────┘  │
   │  WA)    │           │           │ ASR/TTS              │           │
   └─────────┘           │           ▼                      ▼           │
                         │   ┌────────────────┐     ┌────────────────┐  │
   Admin (browser)       │   │  api-server    │◄───►│  PostgreSQL    │  │
        │                │   │ (REST, auth,   │     │  + pgvector    │  │
        ▼                │   │  tenant CRUD)  │     └────────────────┘  │
   ┌─────────┐  HTTPS    │   └───────┬────────┘     ┌────────────────┐  │
   │web-admin│◄─────────►│           │              │  Object store  │  │
   │ (React) │  + WS     │           ▼              │  (S3 / GCS)    │  │
   └─────────┘           │   ┌────────────────┐     └────────────────┘  │
                         │   │ worker         │     ┌────────────────┐  │
                         │   │ (BullMQ jobs)  │◄───►│  Redis (queue) │  │
                         │   └────────────────┘     └────────────────┘  │
                         └──────────────────────────────────────────────┘
```

Full component descriptions and technology choices: [`architecture.md`](architecture.md).

---

## 4. The six workstreams (your roles)

This project is organised so that the areas **you (Don) own** form a coherent slice: the structure, the flows, the AI layer's contract, backend quality, and the wiring that connects everything. Each subsection below is a summary; the linked doc is the detail.

### 4.1 Project structure & architecture
**Owner:** Don & Ridhesh · **Docs:** [`architecture.md`](architecture.md), [`PROJECT-STRUCTURE.md`](PROJECT-STRUCTURE.md)

A pnpm-workspace monorepo split into `apps/` (deployable services) and `packages/` (shared libraries). Five apps, four packages, plus `docs/` and `infra/`. The architecture is a set of small services around a central `api-server` that owns all database access and enforces tenant isolation. See section 5 for the target tree and section 6 for the tech stack.

### 4.2 Overall application flow
**Owner:** Don & Ridhesh · **Doc:** [`app-flows.md`](app-flows.md)

Three primary flows: **inbound call** (caller → Twilio → Orchestrator → ASR → `/ai/answer` → TTS → caller, with logging and optional escalation), **outbound follow-up** (Worker → notifications → SMS/WhatsApp/call), and **admin dashboard** (login → metrics → call logs → call detail → knowledge-base editing). Each flow is documented step-by-step with its error and edge paths.

### 4.3 AI model layer
**Owner:** documented by Don; prompts & ASR/LLM/TTS integration by Tanishqa & Surya · **Doc:** [`ai-flow.md`](ai-flow.md)

`POST /ai/answer` is the one AI entry point. It: (1) retrieves the tenant's top-k FAQ/document chunks via pgvector similarity search, (2) builds a structured prompt from `packages/prompts`, (3) calls the `LLMProvider`, (4) parses and validates a structured `AiResponse`, (5) applies deterministic escalation post-checks, (6) persists the result. The LLM is instructed to return **strict JSON**; a schema-validation + repair step guarantees a valid `AiResponse` or a safe escalation fallback.

### 4.4 Backend code checking
**Owner:** Don (quality/review) · **Doc:** [`backend-guide.md`](backend-guide.md)

The standards and review checklist for `api-server` code: layered structure (route → controller → service → repository), Zod validation at every boundary, mandatory `tenantId` scoping on every query, uniform error envelope, typed responses using `packages/types`, and a review checklist you run before approving a PR (auth present? tenant-scoped? validated? tested? no secrets?).

### 4.5 Connecting frontend ↔ backend ↔ AI
**Owner:** Don & Ridhesh (integration design) · **Doc:** [`integration.md`](integration.md)

The contracts and glue: the REST surface ([`api-endpoints.md`](api-endpoints.md)), the shared-types package as the single contract, JWT auth flow, the frontend `lib/api` + hooks pattern, real-time updates over WebSocket, environment configuration, and how the Orchestrator and Worker call the backend's internal endpoints.

### 4.6 Organizing the codebase & integrating components
**Owner:** Don & Ridhesh · **Doc:** [`codebase-organization.md`](codebase-organization.md)

How the monorepo is wired: pnpm workspaces + Turborepo, the dependency direction (`apps` depend on `packages`, never the reverse; `packages/types` depends on nothing), naming and import conventions, how `packages/ui` components (built by Tanishqa & Surya) are consumed by `web-admin`, path aliases, and the lint/format/test tooling that keeps it consistent. You own the *wiring and conventions*; Tanishqa & Surya build the UI and AI pieces that plug into them.

---

## 5. Target repository structure

```
campus-connect-ai/
├── apps/
│   ├── web-admin/           # React SPA (Vite) — admin dashboard        [T&S: UI · D&R: integration layer]
│   ├── web-landing/         # Next.js — marketing + tenant onboarding   [Tanishqa & Surya]
│   ├── api-server/          # Node + Express + TS — central REST API    [Vinay]
│   ├── voice-orchestrator/  # Node + WS — Twilio Media Streams + call FSM [Vinay]
│   └── worker/              # Node + BullMQ — background jobs            [Vinay]
├── packages/
│   ├── ui/                  # Shared React component library (Tailwind) [Tanishqa & Surya]
│   ├── types/               # Shared TS types + Zod schemas (contracts) [Don & Ridhesh]
│   ├── config/              # Shared constants, enums, env helpers      [Don & Ridhesh]
│   └── prompts/             # LLM prompt templates + routing            [Tanishqa & Surya]
├── docs/                    # This documentation set                   [Don & Ridhesh]
├── infra/                   # Docker Compose, IaC, CI/CD, migrations    [Vinay]
├── package.json             # workspace root
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── .gitignore               # ⚠ must be replaced — see §8
```

The tree above is the **target**. What exists **today** is a subset (2 backend files, 5 frontend files, all serving dummy data). The gap and the fill order are in section 7 and [`PROJECT-STRUCTURE.md`](PROJECT-STRUCTURE.md).

---

## 6. Technology decisions

These are recommended defaults for a clean build. Where the original docs said "X or Y", this blueprint **picks one** and notes the alternative so the codebase is consistent. Change them deliberately, in this table, not ad hoc in code.

| Layer | Decision | Alternative / note |
|---|---|---|
| Language | TypeScript everywhere (Node 20 LTS) | — |
| Monorepo | pnpm workspaces + Turborepo | npm/yarn workspaces |
| `api-server` | Express + `zod` validation | Fastify (existing code uses Express) |
| `web-admin` | React 18 + Vite + React Router + Tailwind | (docs said "Next.js"; SPA fits admin better) |
| `web-landing` | Next.js (SSR/SEO for marketing) | — |
| Frontend data | TanStack Query wrapping `lib/api` | plain hooks (query adds caching for free) |
| Database | PostgreSQL 16 + pgvector | Pinecone for vectors if scale demands |
| ORM / access | Prisma (or Drizzle) with RLS enabled | raw SQL |
| Queue | BullMQ on Redis | — |
| Telephony | Twilio (Voice, Media Streams, Messaging) | — |
| ASR / TTS | Google Cloud Speech / Azure Speech (pluggable) | — |
| LLM | `LLMProvider` interface → Claude / GPT-4 / Gemini adapters | pick per tenant/cost |
| Object storage | AWS S3 or GCS, pre-signed URLs | — |
| Auth | JWT (access + refresh), `tenantId` + `role` claims | — |
| Validation | Zod (shared in `packages/types`) | — |
| Tests | Vitest (unit/integration) + Playwright (e2e) | Jest |
| Lint/format | ESLint + Prettier, shared config | — |
| CI | GitHub Actions | — |

---

## 7. Current state vs. target (the gap)

| Area | Designed | Exists today | Gap |
|---|---|---|---|
| Repo tooling | pnpm + Turbo, tsconfig, lint | none | **no `package.json` anywhere — nothing builds** |
| `api-server` | full REST + `/ai/answer` | health check + `GET /calls` (dummy) | auth, DB, all CRUD, AI endpoint |
| `web-admin` | 7 screens, router, `lib/api`, hooks | 2 screens, no router, dummy data, not mounted | mount, router, data layer |
| `voice-orchestrator` | full call pipeline | — | entire service |
| `worker` | job processor | — | entire service |
| `packages/*` | ui, types, config, prompts | — | all four |
| `web-landing`, `infra/` | present | — | all |
| Docs | 9 docs | 5 (now expanded by this set) | data-model, api, deployment, test-plan |

**Recommended build order (milestones)**

- **M0 — Make it run.** Root `package.json` + pnpm workspace + Turbo, real `.gitignore`, `tsconfig.base.json`, `packages/types` + `packages/config`, ESLint/Prettier. Mount `web-admin` with a router; give `api-server` a real project + `.env`. *Exit: `pnpm dev` starts both, `pnpm build` passes.*
- **M1 — Real data path, one vertical.** Postgres + Prisma + migrations for `Call`/`Tenant`/`User`; JWT auth; `GET /calls` and `GET /calls/:id` reading the DB; `web-admin` `lib/api` + `useCalls` hook rendering real data. *Exit: log in → see real calls from DB.*
- **M2 — AI answer pipeline.** `packages/prompts`, `LLMProvider` interface + one adapter, pgvector retrieval, `POST /ai/answer` returning a validated `AiResponse`, escalation post-checks, logging. *Exit: POST a transcript → get a grounded, escalation-aware answer.*
- **M3 — Voice loop.** `voice-orchestrator` with Twilio Media Streams, ASR/TTS, call FSM calling `/ai/answer`. *Exit: a real phone call is answered end-to-end.*
- **M4 — Admin completeness.** FAQ manager, documents (upload → embed), settings, escalations queue with live WS updates.
- **M5 — Follow-ups & polish.** `worker` outbound follow-ups (SMS/WhatsApp/call), analytics digests, `web-landing` onboarding, deployment + tests.
- **M6 — Security hardening (post-MVP).** Once the MVP is stable, a dedicated cybersecurity phase led by Tanishqa & Surya: threat model, dependency & secrets audit, authn/authz review, tenant-isolation penetration testing, rate-limit/abuse hardening. Plan: [`security.md`](security.md).

Detailed per-milestone tasks live in each area doc.

---

## 8. Known issues to fix early

1. **`.gitignore` is a Python template.** Line 17 (`lib/`) matches the planned `web-admin/src/lib/api/` — git will silently refuse to track the frontend's API layer. It also lacks `node_modules/`, `.next/`, `dist/`. **Replace it with a Node/monorepo `.gitignore` in M0.** (Not yet changed — this is a docs-only pass.)
2. **`api-server` `GET /calls` ignores tenant** and returns tenant `xyz` data alongside `abc` — the exact leak the architecture forbids. Fix when the DB lands in M1 so the *first real* version teaches the right pattern.
3. **`web-admin` is not mounted** — `main.tsx` exports `App` but never calls `ReactDOM.createRoot`, and there is no router, so `CallLogsPage` is dead code. Fix in M0.
4. **Dummy data is duplicated** across `DashboardPage`, `CallLogTable`, and the backend. Collapse to a single API source in M1.

---

## 9. Team & ownership

| Member | Responsibilities | Owns |
|---|---|---|
| **Vinay** | Backend development · APIs · database integration · connecting backend with AI services & telephony | `api-server`, `voice-orchestrator`, `worker`, DB schema & migrations, `infra/`. Docs: [`backend-development.md`](backend-development.md) |
| **Rudra** | Testing & QA · bug reporting · feature validation · performance testing | All test suites, the QA process, performance tests. Docs: [`test-plan.md`](test-plan.md) |
| **Don & Ridhesh** | Project structure & architecture · application flow · AI model layer (design) · backend code checking · connecting frontend↔backend↔AI · organizing the codebase & integrating components | Architecture/structure/flow docs, `packages/types`, `packages/config`, monorepo tooling, `web-admin` integration layer (`lib/api` + `hooks`), code review. Docs: this blueprint + [`architecture.md`](architecture.md), [`integration.md`](integration.md), [`codebase-organization.md`](codebase-organization.md), [`backend-guide.md`](backend-guide.md) |
| **Tanishqa & Surya** | AI development & training · voice pipeline (STT → AI response → TTS) · multilingual support · frontend · security (post-MVP) | `packages/prompts`, ASR/LLM/TTS integration, `web-admin` UI (components/pages), `web-landing`, `packages/ui`. Docs: [`ai-voice-architecture.md`](ai-voice-architecture.md), [`frontend-development.md`](frontend-development.md), [`security.md`](security.md) |

**Full detail, seams, and how we work together:** [`TEAM-ROLES.md`](TEAM-ROLES.md). Ownership means you review PRs touching your area and keep your area's doc current.

> **Note on `web-admin`:** two teams share it by layer — **Tanishqa & Surya** build the UI (components, pages, UX, styling); **Don & Ridhesh** own the integration layer that connects it to the backend (`lib/api`, `hooks`, shared types) and the overall app structure. The seam is documented in [`integration.md`](integration.md) and [`frontend-development.md`](frontend-development.md).

> **Security** is a **post-MVP phase**: once the MVP is stable, Tanishqa & Surya lead a cybersecurity pass to audit and harden the system. Plan: [`security.md`](security.md).

---

## 10. Glossary

| Term | Meaning |
|---|---|
| **Tenant** | One subscribing college, identified by `tenantId` (e.g. `"abc"`). All data is scoped to it. |
| **`AiResponse`** | The structured object the AI returns: `{ answerText, confidenceScore, issueCategory, shouldEscalate, language }`. |
| **Escalation** | Handing a call to a human. Triggered by low confidence, payment/emergency/complaint content, or explicit request. |
| **RAG** | Retrieval-Augmented Generation — grounding the LLM answer in the tenant's own FAQ/document chunks. |
| **Orchestrator** | `voice-orchestrator` — the real-time streaming coordinator between Twilio and the AI backend. |
| **RLS** | Postgres Row-Level Security — DB-enforced tenant isolation. |
| **Barge-in** | Caller speaking over the AI's TTS, interrupting it. |

---

*This blueprint supersedes any conflicting detail in older docs; where an area doc disagrees, update the area doc to match this file (or change this file first if the decision itself is changing).*
