# Backend Development Guide

> Vinay's guide. How to build `api-server`, `voice-orchestrator`, `worker`, the database, and the wiring to AI services and telephony.
> **Owner:** Vinay · **Reviewed against:** [`backend-guide.md`](backend-guide.md) (Don) · **Status:** Living

This is the *how to build it* companion to [`backend-guide.md`](backend-guide.md) (the *how it's reviewed* standards). Build to the contract in [`api-endpoints.md`](api-endpoints.md) and the schema in [`data-model.md`](data-model.md).

---

## 1. What you own

| Service | Purpose |
|---|---|
| `apps/api-server` | The central REST API — auth, tenant CRUD, `/ai/answer`, all DB access. |
| `apps/voice-orchestrator` | Twilio Media Streams + call state machine; calls `/ai/answer` and `/internal/*`. |
| `apps/worker` | BullMQ jobs — follow-ups, SMS/WhatsApp, summaries, cleanup, digests. |
| Database | PostgreSQL schema, migrations, indexes, RLS, seed data. |
| `infra/` | Docker Compose (local), migrations, CI/CD, env templates. |

You also own **connecting** the backend to two external worlds: **AI services** (the LLM behind `/ai/answer`) and **telephony** (Twilio). The AI *behaviour* (prompts, model tuning) is Tanishqa & Surya's — you own the plumbing that calls it.

---

## 2. Build order

Follow the milestones in the [blueprint roadmap](PROJECT-BLUEPRINT.md#7-current-state-vs-target-the-gap). Backend slice:

1. **M0** — scaffold `api-server` as a proper TS project (`app.ts` factory + `server.ts` listener), env parsing, health/ready routes, wire into the pnpm workspace.
2. **M1** — Postgres + Prisma + migrations for `tenants`, `phone_numbers`, `users`, `calls`; JWT auth; `GET /calls` + `GET /calls/:id` reading the DB (kill the dummy array); tenant middleware + RLS.
3. **M2** — `/ai/answer`: retrieval (pgvector) + `LLMProvider` call + validate/persist `AiResponse`; FAQ/document CRUD; document embedding job in the worker.
4. **M3** — `voice-orchestrator`: Twilio webhook + Media Streams, call FSM, `/internal/*` persistence.
5. **M4–M5** — escalations, settings, staff, notifications, follow-up jobs, analytics.

---

## 3. Service layering (build every feature this way)

```
route  →  controller  →  service  →  repository  →  DB
```

- **route** — path + method + middleware only.
- **controller** — validate input with a Zod schema from `packages/types`; call one service; shape the `{ data, meta }` response.
- **service** — business logic; receives `ctx` (`{ tenantId, userId, role }`) explicitly; combines repositories.
- **repository** — the only place that touches the DB; every query tenant-scoped.

Full contract and rationale: [`backend-guide.md`](backend-guide.md#1-service-structure-api-server). This is what your PRs are checked against.

---

## 4. Database integration

- **Access:** Prisma (or Drizzle) over PostgreSQL 16 + pgvector. One DB client in `lib/db`.
- **Migrations:** in `infra/migrations` (or Prisma `migrations/`). Forward-only on shared branches; one logical change each; **create the RLS policy in the same migration as the table**.
- **Tenant scoping:** every tenant-scoped query filters `tenant_id`, *and* the repository sets `SET LOCAL app.tenant_id` inside the transaction so RLS enforces it too. See [`data-model.md`](data-model.md#1-principles).
- **Indexes:** add the composite indexes in [`data-model.md`](data-model.md#6-indexing--retrieval-notes) (e.g. `calls (tenant_id, started_at desc)`), and the pgvector index on `document_chunks.embedding`.
- **Seed data:** a script that creates two tenants (`abc`, `xyz`) + an admin each — used by dev and by Rudra's cross-tenant tests.

---

## 5. Connecting to AI services

`POST /ai/answer` is yours to build; the AI *content* is Tanishqa & Surya's. Keep the seam clean:

- Depend on the **`LLMProvider` interface** ([`ai-flow.md`](ai-flow.md#the-llm-provider-abstraction)); no vendor SDK outside `api-server/ai/`.
- Pipeline: retrieve tenant chunks (pgvector, scoped) → build prompt from `packages/prompts` → `LLMProvider.complete()` → parse + validate with `AiResponseSchema` → run the deterministic escalation post-check → persist to `ai_responses` + update `calls` → return the validated `AiResponse`.
- **Never** return raw LLM text; only a validated `AiResponse`. On provider failure, return a safe escalation (or `502`). Timeouts + one bounded repair retry.
- Config picks the provider/model (`LLM_PROVIDER`, `LLM_API_KEY`), possibly per tenant.

## 6. Connecting to telephony

- **Inbound:** Twilio webhook → `voice-orchestrator` resolves `tenantId` from the dialled number (`phone_numbers` table) → opens Media Streams → runs the ASR→`/ai/answer`→TTS loop → persists via `/internal/*`.
- **Outbound/messaging:** the `worker` places Twilio calls and sends SMS/WhatsApp via `POST /internal/notifications/send`.
- Keep Twilio SDK usage inside the orchestrator/worker `lib/`; validate webhook signatures; make persistence calls idempotent (`Idempotency-Key`) so a retried webhook never double-logs.

---

## 7. Cross-cutting requirements

- **Validation** at every boundary with `packages/types` schemas; reject with `400 VALIDATION_ERROR`.
- **Errors:** one `AppError` hierarchy + one error-handling middleware → standard envelope. Services throw, never write to `res`.
- **Config/secrets:** parse `process.env` with Zod at boot (`config/env.ts`); refuse to start if a required var is missing. Only `config/` reads `process.env`. Commit `.env.example`.
- **Logging:** structured (pino) with `requestId` + `tenantId`; never log secrets, full recordings, or full transcripts at info level.
- **Auth:** JWT (access + refresh) with `tenantId` + `role`; `/internal/*` uses the service token + validated `X-Tenant-Id`.

---

## 8. Definition of done (backend)

Before you request review, confirm the [backend PR checklist](backend-guide.md#9-backend-pr-review-checklist):
- [ ] Every query tenant-scoped (WHERE + RLS); protected routes authed; roles checked.
- [ ] Input validated with `packages/types`; response uses the standard envelope.
- [ ] External calls (LLM/Twilio) have timeout + fallback; failures escalate.
- [ ] Tests pass incl. a **cross-tenant negative test** for new resources (coordinate with Rudra, [`test-plan.md`](test-plan.md)).
- [ ] Migration is forward-only with its RLS policy; API change reflected in [`api-endpoints.md`](api-endpoints.md); schema change in [`data-model.md`](data-model.md).
- [ ] No secret committed; `.env.example` updated.

---

## 9. Related docs

- [`backend-guide.md`](backend-guide.md) — the standards & review checklist (read first).
- [`api-endpoints.md`](api-endpoints.md) — the contract to implement.
- [`data-model.md`](data-model.md) — schema, RLS, enums.
- [`ai-flow.md`](ai-flow.md) — the AI pipeline you host.
- [`integration.md`](integration.md) — how the frontend and services consume your API.
