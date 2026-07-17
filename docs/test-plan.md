# Test Plan & QA Playbook

> Rudra's guide. What to test, how to test it, how to report bugs, how to validate features, and how to run performance tests.
> **Owner:** Rudra · **Status:** Living · Part of the [Project Blueprint](PROJECT-BLUEPRINT.md). Standards it enforces come from [`backend-guide.md`](backend-guide.md) and [`integration.md`](integration.md).

You are the quality gate. Nothing is "done" until it's tested, validated against its acceptance criteria, and free of known blocking bugs. This doc tells you exactly what that means for CampusConnect AI.

---

## 1. Testing strategy — the pyramid

Aim for many fast tests at the bottom, few slow tests at the top.

```
        ▲  E2E (Playwright) — a handful of critical user journeys
       ───  Integration — API routes vs. a real test DB; frontend hooks vs. a mock API
      ─────  Unit (Vitest) — services, utils, components, escalation logic
```

- **Unit** — pure functions, service methods, React components, the escalation post-check. Fast, run on every commit.
- **Integration** — a route against a real Postgres (testcontainers), a hook against a mocked API, the AI pipeline against a stubbed `LLMProvider`. This is where **tenant-isolation** and **contract** bugs are caught.
- **E2E** — full journeys in a browser (login → view calls → open detail; upload a document; handle an escalation). Few, high-value, run in CI on `main` and before release.

**Tooling:** Vitest (unit/integration), Playwright (e2e), testcontainers (ephemeral Postgres/Redis), MSW or a stub server (frontend API mocking), k6 or Artillery (load/performance).

**Coverage target:** ≥ 80% on `packages/types`, `api-server` services, and escalation/tenant logic (the risky parts). Coverage is a signal, not the goal — a passing cross-tenant negative test matters more than a % point.

---

## 2. What to test, by area

### 2.1 Backend (`api-server`) — with Vinay
- **Auth:** login success/failure, token refresh, expired/invalid token → 401, role checks (`super_admin`-only routes reject `admin`).
- **Tenant isolation (highest priority):** for **every** resource, a token for tenant A must never read/update/delete tenant B's row. Write this as a reusable negative test per resource. This is the single most important test family in the project.
- **Validation:** bad/missing fields → `400 VALIDATION_ERROR`; responses match the `packages/types` schema (contract test).
- **CRUD correctness:** calls list filters (status/category/language/date/search) + pagination; FAQ/document/escalation/settings create-read-update-delete.
- **AI endpoint (`/ai/answer`):** with a stubbed `LLMProvider` — valid `AiResponse` passes through; invalid/non-JSON triggers repair then safe escalation; `confidenceScore < 0.7` forces `shouldEscalate: true` regardless of model output; provider timeout → escalation/`502`.
- **Errors:** every error path returns the standard `{ error: { code, message } }` envelope.

### 2.2 Frontend (`web-admin`) — with Tanishqa & Surya
- **Components (unit):** render states — loading skeleton, empty, error, populated; `StatusBadge` colors per status; table sorting/filtering.
- **Hooks (integration):** `useCalls` etc. against a mocked API — loading→data, error surfaced, refetch on filter change, pagination.
- **No direct `fetch`:** lint/test that components import hooks, not `lib/api` or `fetch`.
- **E2E journeys:** login, dashboard metrics load, call log filter + open detail, play recording (mocked URL), FAQ create/edit, document upload progress, escalation claim → resolve with live update.

### 2.3 AI & Voice pipeline — with Tanishqa & Surya
- **Multilingual:** a fixture set of test utterances per language (**en, ta, hi, kn, te**) → expected category + language echoed back. Confirm the answer comes back in the caller's language.
- **Escalation triggers:** table-driven tests for each trigger — low confidence, payment ("money deducted"), emergency ("accident"), complaint ("this is ridiculous"), explicit ("talk to a human") → `shouldEscalate: true` with the right reason.
- **RAG grounding:** given a known FAQ, the answer cites/uses it; given no relevant FAQ, it escalates rather than inventing.
- **Voice (manual + automated where possible):** ASR accuracy on sample phone-quality audio per language; TTS intelligibility; barge-in stops playback; silence re-prompt.

### 2.4 Worker & telephony — with Vinay
- Follow-up jobs fire for `pending`/`follow_up_required` calls past their scheduled time; channel selected per tenant config; idempotent (no double-send on retry).
- Twilio webhook handling with recorded/mocked payloads; tenant resolved from dialled number.

---

## 3. Feature validation (acceptance testing)

Every feature ships with **acceptance criteria** (in its PR/issue). Your job: confirm each criterion on a real running build before it's marked done.

**Validation checklist (run per feature)**
- [ ] Every acceptance criterion met, checked on a running build (not just green unit tests).
- [ ] Happy path works end to end.
- [ ] Error/edge paths behave per [`app-flows.md`](app-flows.md#error--edge-paths) (bad input, provider down, no staff, low confidence → escalate).
- [ ] Tenant isolation holds (log in as two tenants; confirm no data bleed).
- [ ] Works across the five languages where relevant.
- [ ] Responsive/accessible for UI (keyboard nav, labels, contrast).
- [ ] No console errors, no failing network calls, no secret leakage in responses/logs.

If any fails → file a bug (below) and block the "done" status.

---

## 4. Bug reporting

File bugs where the team tracks work (GitHub Issues). One reproducible problem per issue. Use this template:

```
Title: [area] Short summary of the problem

Severity: Blocker | Critical | Major | Minor | Trivial
Area: backend | web-admin | ai/voice | worker | infra | docs
Environment: local / staging · commit <sha> · browser/OS if UI

Steps to reproduce:
1. …
2. …
3. …

Expected: what should happen
Actual: what happened (include exact error text)
Evidence: logs / screenshot / request id / call id
Tenant: which tenant/user (if isolation-related)
Notes: suspected cause, related issues
```

**Severity guide**
- **Blocker** — cannot ship / data leak / auth bypass / cross-tenant access. Stop the line.
- **Critical** — core flow broken (calls not answered, dashboard won't load).
- **Major** — a feature is wrong but has a workaround.
- **Minor** — small/cosmetic; **Trivial** — nice-to-fix.

**Golden rule:** any suspected **cross-tenant data access or auth bypass is an automatic Blocker**, no matter how small it looks.

---

## 5. Performance testing

Test the numbers the product promises (targets from [`architecture.md`](architecture.md#non-functional-requirements)).

| What | Target | How |
|---|---|---|
| **Voice response latency** | < ~1.5 s from end-of-speech to start of answer | Time the ASR→`/ai/answer`→TTS path with a stubbed then real LLM; measure p50/p95. |
| **`/ai/answer` latency** | p95 under budget with real retrieval | k6/Artillery against a seeded tenant; watch retrieval + LLM time separately. |
| **API throughput** | Handles target concurrent admins + calls without errors | Ramp load on `GET /calls`, `/ai/answer`; watch error rate and p95. |
| **Concurrent calls** | N simultaneous calls per tenant without degradation | Simulate Media Stream sessions; watch Orchestrator CPU/memory and dropped audio. |
| **DB under load** | Queries stay indexed; no N+1 | Load + inspect slow-query log; confirm `tenant_id` indexes used. |

Report each run with p50/p95/p99, error rate, and the commit tested. Flag regressions vs. the last run.

---

## 6. When tests run (CI)

- **On every PR:** `pnpm lint`, `pnpm typecheck`, unit + integration tests (Turbo-cached). PR cannot merge red.
- **On merge to `main`:** the above + E2E journeys.
- **Before a release / weekly:** full E2E + a performance run.
- Own the CI test config with Vinay (backend) and Tanishqa & Surya (frontend).

---

## 7. QA focus per milestone

Match your effort to what's being built (milestones in the [blueprint roadmap](PROJECT-BLUEPRINT.md#7-current-state-vs-target-the-gap)).

| Milestone | Your focus |
|---|---|
| **M0** run | Smoke: `pnpm dev`/`build` work; lint/typecheck green; CI wired. |
| **M1** data path | The tenant-isolation negative-test suite (build it now — it protects everything after). Auth, calls CRUD, `useCalls`. |
| **M2** AI | Escalation trigger table, multilingual fixtures, RAG grounding, `AiResponse` contract & fallback. |
| **M3** voice | Latency measurement, barge-in, ASR/TTS per language, call-answered E2E. |
| **M4** admin | FAQ/document/escalation flows, live WS updates, full dashboard E2E. |
| **M5** follow-ups | Worker idempotency, SMS/WhatsApp/call follow-ups, analytics. |
| **M6** security | Support Tanishqa & Surya's hardening pass with abuse/rate-limit and isolation pen tests ([`security.md`](security.md)). |

---

## 8. Related docs

- [`app-flows.md`](app-flows.md) — the flows and their error/edge paths you validate against.
- [`backend-guide.md`](backend-guide.md) — the backend standards (incl. the cross-tenant test expectation).
- [`api-endpoints.md`](api-endpoints.md) · [`data-model.md`](data-model.md) — contracts to assert against.
- [`ai-voice-architecture.md`](ai-voice-architecture.md) — the AI/voice behaviour to verify.
