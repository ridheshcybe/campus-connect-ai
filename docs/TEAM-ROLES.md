# Team Roles & Ways of Working

> Who owns what, where the seams are, and how we collaborate day to day. Maintained by Don as project-structure/organization lead.
> **Status:** Living · Companion to the [Project Blueprint](PROJECT-BLUEPRINT.md).

This is the authoritative roles document. Each person's section says **what you own**, **what to do**, and **which docs are yours to follow and keep current.**

---

## 1. Roster at a glance

| Member | Focus | Primary docs |
|---|---|---|
| **Vinay** | Backend, APIs, database, telephony & AI-service wiring | [`backend-development.md`](backend-development.md), [`data-model.md`](data-model.md), [`api-endpoints.md`](api-endpoints.md) |
| **Rudra** | Testing & QA, bug reporting, feature validation, performance testing | [`test-plan.md`](test-plan.md) |
| **Don & Ridhesh** | Project structure & architecture, application flow, AI model layer, backend code checking, frontend↔backend↔AI integration, codebase organization | [`PROJECT-BLUEPRINT.md`](PROJECT-BLUEPRINT.md), [`architecture.md`](architecture.md), [`integration.md`](integration.md), [`codebase-organization.md`](codebase-organization.md), [`backend-guide.md`](backend-guide.md) |
| **Tanishqa & Surya** | AI dev & training, voice pipeline, multilingual support, frontend, security (post-MVP) | [`ai-voice-architecture.md`](ai-voice-architecture.md), [`frontend-development.md`](frontend-development.md), [`security.md`](security.md) |

---

## 2. Vinay — Backend

**You own:** `apps/api-server`, `apps/voice-orchestrator`, `apps/worker`, the PostgreSQL schema & migrations, and `infra/`.

**What to do**
- Build the REST API in [`api-endpoints.md`](api-endpoints.md) against the schema in [`data-model.md`](data-model.md), following the standards in [`backend-guide.md`](backend-guide.md).
- Implement authentication, tenant scoping (+ RLS), and all CRUD (calls, FAQs, documents, escalations, settings, staff).
- Wire the backend to **AI services** (implement `POST /ai/answer`: retrieval + `LLMProvider` call — the AI logic itself comes from Tanishqa & Surya's prompts) and to **telephony** (Twilio webhooks/Media Streams in `voice-orchestrator`, messaging in `worker`).
- Own database integration: migrations, indexes, connection pooling, seed data.

**Your build guide:** [`backend-development.md`](backend-development.md). **Reviewed by:** Don (see [`backend-guide.md`](backend-guide.md)).

---

## 3. Rudra — Testing & QA

**You own:** the test suites across every app, the QA process, feature validation, and performance testing. You are the last gate before "done."

**What to do**
- Write and maintain unit, integration, and end-to-end tests (with Vinay for backend, Tanishqa & Surya for frontend/AI).
- Validate every feature against its acceptance criteria before it's called done.
- Run and report performance tests (voice latency, API load, concurrent calls).
- Own bug reporting: reproducible issues filed with the standard template, triaged by severity.

**Your playbook:** [`test-plan.md`](test-plan.md) — it tells you exactly what to test and how.

---

## 4. Don & Ridhesh — Structure, Integration & Review

**You own:** the architecture and project structure, the overall application flow, the AI model layer's *design/contract*, backend *code checking* (review), the frontend↔backend↔AI integration layer, and codebase organization. Concretely: the architecture/flow docs, `packages/types`, `packages/config`, monorepo tooling, and the `web-admin` data layer (`lib/api` + `hooks`).

**What to do**
- Keep the blueprint, architecture, structure, and flow docs current — they're the team's map.
- Own the shared **contract** (`packages/types`) and constants (`packages/config`); every shape/enum changes here first.
- Own the **integration layer**: `lib/api`, hooks, auth flow, real-time — the glue between Tanishqa & Surya's UI and Vinay's backend.
- **Review backend PRs** against the [`backend-guide.md`](backend-guide.md) checklist (tenant scoping, validation, layering, tests).
- Keep the monorepo organized: workspaces, dependency direction, lint/format/CI.

**Your docs:** the Core set + [`integration.md`](integration.md), [`backend-guide.md`](backend-guide.md).

---

## 5. Tanishqa & Surya — AI, Voice, Multilingual, Frontend

**You own:** AI development & training, the voice pipeline (Speech-to-Text → AI response generation → Text-to-Speech), multilingual support, and the frontend UI. You lead the security phase after MVP.

**What to do**
- Build and tune the AI: prompts in `packages/prompts`, the RAG answer quality, intent classification, and the `LLMProvider` behaviour (Vinay wires the endpoint; you own what it *says*).
- Build the voice pipeline: ASR and TTS integration for all five languages, tuned for phone audio and barge-in.
- Own **multilingual support** for **English, Tamil, Hindi, Kannada, Telugu** — prompts, TTS voices, language detection, and test phrases per language.
- Build the **frontend UI**: `web-admin` components & pages and `web-landing`, plus the shared `packages/ui` library — rendering data from the hooks Don & Ridhesh provide (you don't call the API directly; you consume the integration layer).
- **Security (post-MVP):** lead the [`security.md`](security.md) hardening phase once the MVP is stable.

**Your docs:** [`ai-voice-architecture.md`](ai-voice-architecture.md), [`frontend-development.md`](frontend-development.md), [`security.md`](security.md), with [`frontend-structure.md`](frontend-structure.md) as the UI spec.

---

## 6. The seams (where two roles meet)

Most bugs live at boundaries. These are the explicit contracts between roles:

| Seam | Contract | Owned by |
|---|---|---|
| **Backend ↔ Frontend** | The REST/WS API in [`api-endpoints.md`](api-endpoints.md), typed by `packages/types`. Frontend consumes it via `lib/api`/hooks. | Contract & data layer: Don & Ridhesh · API impl: Vinay · UI: Tanishqa & Surya |
| **Backend ↔ AI** | `POST /ai/answer` returns a validated `AiResponse`. Vinay builds the endpoint; Tanishqa & Surya own prompt/model behaviour behind `LLMProvider`. | Shared — see [`ai-flow.md`](ai-flow.md) |
| **Backend ↔ Telephony** | Twilio webhooks + Media Streams → `voice-orchestrator` → `/internal/*` for persistence. | Vinay |
| **UI ↔ Integration layer** | Components render from hooks; hooks call `lib/api`; nobody calls `fetch` directly. | UI: Tanishqa & Surya · hooks/`lib/api`: Don & Ridhesh |
| **Everyone ↔ QA** | Every feature has acceptance criteria Rudra validates; bugs filed with the standard template. | Rudra |

**Rule:** if a change crosses a seam, the shape changes in `packages/types` first, and both sides review.

---

## 7. How we work together

**Branching & PRs**
- `main` is always releasable. Work on branches: `feat/<area>-<short>`, `fix/<area>-<short>`, `docs/<short>`.
- Open a PR into `main`; at least one review from the area owner. Backend PRs are reviewed by Don against the [backend checklist](backend-guide.md#9-backend-pr-review-checklist).
- Keep PRs small and focused. Link the feature/bug it addresses.

**Definition of Done** (a feature isn't done until all are true)
- [ ] Code follows the relevant guide (backend/frontend/AI) and passes `pnpm lint`, `pnpm typecheck`.
- [ ] Shapes/enums come from `packages/types` / `packages/config` — nothing hardcoded.
- [ ] Tests exist and pass (unit + integration; e2e where it's a user flow). Cross-tenant negative test for new backend resources.
- [ ] Rudra has validated it against its acceptance criteria.
- [ ] Docs updated: API changes in `api-endpoints.md`, schema changes in `data-model.md`, behaviour changes in the area doc.
- [ ] No secrets committed; `.env.example` updated if a new var was added.

**Communication**
- Decisions that change a contract or a tech choice are recorded in the blueprint (§6 for tech, the relevant doc otherwise) — not just in chat.
- Blockers at a seam → tag both owners early.

**Keeping docs alive**
- Each owner keeps their area's doc current. Don keeps the blueprint, structure, and this file as the source of truth. If a doc and the blueprint disagree, the blueprint wins (or update the blueprint first if the *decision* changed).
