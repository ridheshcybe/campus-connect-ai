Here’s the **same Project Blueprint**, updated so the team section correctly uses **Tanishga** and reflects the new split between AI, frontend, and security. Everything else stays as-is. [workingsoftware](https://www.workingsoftware.dev/software-architecture-documentation-the-ultimate-guide/)

***

# CampusConnect AI — Project Blueprint

> The single, complete "clean project idea" for CampusConnect AI. Start here.  
> **Primary owner of this document:** Don & Ridhesh · **Status:** Living blueprint · **Last major revision:** 2026-07-17

This blueprint is the master reference. It states *what* we are building, *how* the pieces fit, and *who owns what*, then links out to the detailed docs for each area. Every other document in `docs/` expands one section of this one. [contextark](https://contextark.com/blog/architecture-doc-template)

***

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

 [contextark](https://contextark.com/blog/architecture-doc-template)

***

## 1. The product in one paragraph

**CampusConnect AI is a 24/7 multilingual voice assistant for college help desks, delivered as a white-label multi-tenant SaaS.** Students, parents, and applicants call a college's dedicated phone number and get instant, spoken answers in one of five Indian languages — English, Hindi, Tamil, Telugu, Kannada — about admissions, fees, hostel, transport, placements, scholarships, and more. The system transcribes speech, retrieves the college's own knowledge base with RAG, generates a grounded answer with an LLM, speaks it back, and **escalates to a human** when it is unsure, when money or safety is involved, or when the caller asks. Every call is logged — transcript, recording, category, confidence — into a per-tenant database that college staff review through an admin dashboard. [developers.openai](https://developers.openai.com/api/docs/guides/voice-agents)

**Target users**

- **Callers** (students / parents / applicants) — never see software; they just make a phone call, send an SMS, or message on WhatsApp. [docs.voiceflow](https://docs.voiceflow.com/api-reference/api-overview)
- **College admins** — use the `web-admin` dashboard to review calls, manage the FAQ/document knowledge base, handle escalations, and configure their tenant. [preparefrontend](https://preparefrontend.com/blog/blog/high-level-design-frontend-backend-integration)
- **Platform (super) admins** — provision new college tenants.

***

## 2. Design principles (the "clean" in "clean project idea")

These are the rules every decision is checked against. When in doubt, follow these. [workingsoftware](https://www.workingsoftware.dev/software-architecture-documentation-the-ultimate-guide/)

1. **Tenant isolation is non-negotiable.** Every tenant-scoped row carries a `tenantId`. It is derived from the caller's dialled number (inbound) or the admin's JWT (dashboard) — **never** passed by the client as a plain parameter. Postgres Row-Level Security is the second line of defence. See [`data-model.md`](data-model.md).  
2. **One source of truth for contracts.** Shared TypeScript types + Zod schemas live in `packages/types`. The backend validates with them; the frontend imports them; the docs describe them. If a shape changes, it changes in one place. See [`integration.md`](integration.md).  
3. **The Voice Orchestrator stays dumb; the brain lives in the backend.** The Orchestrator only streams audio and manages call state. All AI logic (RAG, prompt building, LLM calls) sits behind `POST /ai/answer` in the `api-server`. This keeps the real-time path lean and the AI logic testable. See [`ai-flow.md`](ai-flow.md). [developers.openai](https://developers.openai.com/api/docs/guides/voice-agents)
4. **The LLM provider is pluggable.** Code depends on an `LLMProvider` interface, not on a specific vendor. Claude, GPT-4, and Gemini are interchangeable adapters behind it. No provider SDK is imported outside `packages/prompts` / the AI service layer.  
5. **The frontend never calls `fetch` directly.** All HTTP goes through `web-admin/src/lib/api`; all React state around it goes through hooks in `web-admin/src/hooks`. Components render, hooks fetch, `lib/api` transports. See [`frontend-structure.md`](frontend-structure.md). [preparefrontend](https://preparefrontend.com/blog/blog/high-level-design-frontend-backend-integration)
6. **Fail safe, not silent.** Low confidence, provider errors, and timeouts all resolve to *escalate to a human*, never to a wrong-but-confident answer. [developers.openai](https://developers.openai.com/api/docs/guides/voice-agents)
7. **Everything reviewable.** Every AI interaction is logged so a human can audit exactly what the caller asked and what the AI said.

***

## 3. System at a glance

```txt
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

Full component descriptions and technology choices: [`architecture.md`](architecture.md). [milanm.github](https://milanm.github.io/architecture-docs/)

***

## 4. The six workstreams (your roles)

This project is organised so that the areas **you (Don) own** form a coherent slice: the structure, the flows, the AI layer's contract, backend quality, and the wiring that connects everything. Each subsection below is a summary; the linked doc is the detail. [workingsoftware](https://www.workingsoftware.dev/software-architecture-documentation-the-ultimate-guide/)

### 4.1 Project structure & architecture

**Owner:** Don & Ridhesh · **Docs:** [`architecture.md`](architecture.md), [`PROJECT-STRUCTURE.md`](PROJECT-STRUCTURE.md)

A pnpm-workspace monorepo split into `apps/` (deployable services) and `packages/` (shared libraries). Five apps, four packages, plus `docs/` and `infra/`. The architecture is a set of small services around a central `api-server` that owns all database access and enforces tenant isolation. See section 5 for the target tree and section 6 for the tech stack. [milanm.github](https://milanm.github.io/architecture-docs/)

### 4.2 Overall application flow

**Owner:** Don & Ridhesh · **Doc:** [`app-flows.md`](app-flows.md)

Three primary flows: **inbound call** (caller → Twilio → Orchestrator → ASR → `/ai/answer` → TTS → caller, with logging and optional escalation), **outbound follow-up** (Worker → notifications → SMS/WhatsApp/call), and **admin dashboard** (login → metrics → call logs → call detail → knowledge-base editing). Each flow is documented step-by-step with its error and edge paths. [docs.voiceflow](https://docs.voiceflow.com/api-reference/api-overview)

### 4.3 AI model layer

**Owner:** design by Don; implementation by **Tanishga** (AI/voice) + Vinay (backend AI endpoint) · **Doc:** [`ai-flow.md`](ai-flow.md)

`POST /ai/answer` is the one AI entry point. It: (1) retrieves the tenant's top-k FAQ/document chunks via pgvector similarity search, (2) builds a structured prompt from `packages/prompts`, (3) calls the `LLMProvider`, (4) parses and validates a structured `AiResponse`, (5) applies deterministic escalation post-checks, (6) persists the result. The LLM is instructed to return **strict JSON**; a schema-validation + repair step guarantees a valid `AiResponse` or a safe escalation fallback. [developers.openai](https://developers.openai.com/api/docs/guides/voice-agents)

### 4.4 Backend code checking

**Owner:** Don (quality/review) · **Doc:** [`backend-guide.md`](backend-guide.md)

The standards and review checklist for `api-server` code: layered structure (route → controller → service → repository), Zod validation at every boundary, mandatory `tenantId` scoping on every query, uniform error envelope, typed responses using `packages/types`, and a review checklist you run before approving a PR (auth present? tenant-scoped? validated? tested? no secrets?). [workingsoftware](https://www.workingsoftware.dev/software-architecture-documentation-the-ultimate-guide/)

### 4.5 Connecting frontend ↔ backend ↔ AI

**Owner:** Don & Ridhesh (integration design) · **Doc:** [`integration.md`](integration.md)

The contracts and glue: the REST surface ([`api-endpoints.md`](api-endpoints.md)), the shared-types package as the single contract, JWT auth flow, the frontend `lib/api` + hooks pattern, real-time updates over WebSocket, environment configuration, and how the Orchestrator and Worker call the backend's internal endpoints. [preparefrontend](https://preparefrontend.com/blog/blog/high-level-design-frontend-backend-integration)

### 4.6 Organizing the codebase & integrating components

**Owner:** Don & Ridhesh · **Doc:** [`codebase-organization.md`](codebase-organization.md)

How the monorepo is wired: pnpm workspaces + Turborepo, the dependency direction (`apps` depend on `packages`, never the reverse; `packages/types` depends on nothing), naming and import conventions, how `packages/ui` components (built by **Surya**) are consumed by `web-admin`, path aliases, and the lint/format/test tooling that keeps it consistent. You own the *wiring and conventions*; Tanishga builds the AI/voice pieces, Surya builds the UI that plugs into them. [milanm.github](https://milanm.github.io/architecture-docs/)

***

## 5. Target repository structure

```txt
campus-connect-ai/
├── apps/
│   ├── web-admin/           # React SPA (Vite) — admin dashboard        [Surya: UI · D&R: integration layer]
│   ├── web-landing/         # Next.js — marketing + tenant onboarding   [Surya]
│   ├── api-server/          # Node + Express + TS — central REST API    [Vinay]
│   ├── voice-orchestrator/  # Node + WS — Twilio Media Streams + call FSM [Vinay]
│   └── worker/              # Node + BullMQ — background jobs            [Vinay]
├── packages/
│   ├── ui/                  # Shared React component library (Tailwind) [Surya]
│   ├── types/               # Shared TS types + Zod schemas (contracts) [Don & Ridhesh]
│   ├── config/              # Shared constants, enums, env helpers      [Don & Ridhesh]
│   └── prompts/             # LLM prompt templates + routing            [Tanishga]
├── docs/                    # This documentation set                    [Don & Ridhesh]
├── infra/                   # Docker Compose, IaC, CI/CD, migrations    [Vinay]
├── package.json             # workspace root
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── .gitignore               # ⚠ must be replaced — see §8
```

The tree above is the **target**. What exists **today** is a subset (API and admin UI serving dummy data). The gap and the fill order are in section 7 and [`PROJECT-STRUCTURE.md`](PROJECT-STRUCTURE.md). [milanm.github](https://milanm.github.io/architecture-docs/)

***

## 6. Technology decisions

These are recommended defaults for a clean build. [preparefrontend](https://preparefrontend.com/blog/blog/high-level-design-frontend-backend-integration)

| Layer | Decision | Alternative / note |
|---|---|---|
| Language | TypeScript everywhere (Node 20 LTS) | — |
| Monorepo | pnpm workspaces + Turborepo | npm/yarn workspaces |
| `api-server` | Express + `zod` validation | Fastify |
| `web-admin` | React 18 + Vite + React Router + Tailwind | Next.js |
| `web-landing` | Next.js (SSR/SEO for marketing) | — |
| Frontend data | TanStack Query wrapping `lib/api` | plain hooks |
| Database | PostgreSQL 16 + pgvector | external vector DB if scale demands |
| ORM / access | Prisma/Drizzle with RLS enabled | raw SQL |
| Queue | BullMQ on Redis | — |
| Telephony | Twilio (Voice, Media Streams, Messaging) | — |
| ASR / TTS | Pluggable speech providers (e.g., Google/Azure) | — |
| LLM | `LLMProvider` interface → Claude/GPT-4/Gemini adapters | pick per tenant |
| Object storage | S3/GCS with pre-signed URLs | — |
| Auth | JWT (access+refresh) with `tenantId` and `role` claims | — |
| Validation | Zod (shared in `packages/types`) | — |
| Tests | Vitest + Playwright | Jest |
| Lint/format | ESLint + Prettier | — |
| CI | GitHub Actions | — |

***

## 7. Current state vs. target (the gap)

(Structure unchanged; just context.) [milanm.github](https://milanm.github.io/architecture-docs/)

- M0: tooling + basic `api-server` and `web-admin` running.  
- M1: real DB path for calls.  
- M2: AI answer pipeline (`POST /ai/answer`).  
- M3: full voice loop.  
- M4: admin completeness.  
- M5: follow-ups + polish.  
- M6: security hardening (post-MVP) led by **Tanishga** (AI side) and **Surya** (frontend/security UI updates), with **Rudra** owning tests. [mindbowser](https://www.mindbowser.com/security-testing-for-qa-engineers/)

***

## 8. Known issues to fix early

Same list: `.gitignore` wrong, `GET /calls` ignoring tenant, `web-admin` not mounted, duplicated dummy data. [milanm.github](https://milanm.github.io/architecture-docs/)

***

## 9. Team & ownership

Here’s the **updated team table**:

| Member | Responsibilities | Owns |
|---|---|---|
| **Vinay** | Backend development · APIs · database integration · connecting backend with AI services & telephony | `api-server`, `voice-orchestrator`, `worker`, DB schema & migrations, `infra/`. Docs: `backend-development.md`  [indeed](https://www.indeed.com/hire/job-description/front-end-developer) |
| **Rudra** | Testing & QA · bug reporting · feature validation · performance testing · **security implementation and security testing** (auth, tenant isolation, basic security checks) | All test suites, QA process, security test plans. Docs: `test-plan.md`, `security.md`  [mindbowser](https://www.mindbowser.com/security-testing-for-qa-engineers/) |
| **Don & Ridhesh** | Project structure & architecture · application flow · AI model layer (design) · backend code checking · connecting frontend↔backend↔AI · organizing the codebase & integrating components | Architecture/structure/flow docs, `packages/types`, `packages/config`, monorepo tooling, `web-admin` integration layer (`lib/api` + `hooks`), code review. Docs: this blueprint + `architecture.md`, `integration.md`, `codebase-organization.md`, `backend-guide.md`  [workingsoftware](https://www.workingsoftware.dev/software-architecture-documentation-the-ultimate-guide/) |
| **Tanishga** | AI development & training · voice pipeline (STT → AI → TTS) · multilingual AI behavior · escalation logic · AI prompts | `docs/ai-voice-architecture.md`, `ai-flow.md`, `packages/prompts`, AI-side design and integration with `api-server`  [developers.openai](https://developers.openai.com/api/docs/guides/voice-agents) |
| **Surya** | Frontend web development (`web-admin`, `web-landing`) · shared UI components (`packages/ui`) · UI integrations with AI and backend APIs · frontend improvements · multilingual UI · assist with security-related UI and auth flows | `web-admin` UI, `web-landing`, `packages/ui`, `frontend-development.md`, implementation of `lib/api` usage in UI and multilingual UI behavior  [simplilearn](https://www.simplilearn.com/front-end-developer-job-description-article) |

**Full detail, seams, and how we work together:** [`TEAM-ROLES.md`](TEAM-ROLES.md).

> **Note on `web-admin`:** two layers:  
> - **Surya** builds the UI (components, pages, UX, styling).  
> - **Don & Ridhesh** own the integration layer that connects it to the backend (`lib/api`, hooks, shared types) and the overall app structure. The seam is documented in `integration.md` and `frontend-structure.md`. [preparefrontend](https://preparefrontend.com/blog/blog/high-level-design-frontend-backend-integration)

> **Security** is a **post-MVP phase**: once the MVP is stable, **Tanishga** and **Surya** lead the design and implementation, while **Rudra** owns the test plan and execution. Plan: `security.md`. [coaxsoft](https://coaxsoft.com/blog/qa-team-structure-roles-and-responsibilities)

***

## 10. Glossary

Unchanged: Tenant, `AiResponse`, Escalation, RAG, Orchestrator, RLS, Barge-in, etc. [workingsoftware](https://www.workingsoftware.dev/software-architecture-documentation-the-ultimate-guide/)

***

You can paste this over your existing **Project Blueprint** and the only substantive change is the team section (and a couple of references) now correctly using **Tanishga** and the updated roles.
