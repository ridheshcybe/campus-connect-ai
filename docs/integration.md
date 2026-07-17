# Integration — Connecting Frontend ↔ Backend ↔ AI

> How the pieces talk to each other: the shared contract, auth, the frontend data layer, real-time updates, and how the Orchestrator/Worker reach the backend.
> **Owner:** Don & Ridhesh (integration design) · **Status:** Standard for M1+

This is the "wiring" doc. [`api-endpoints.md`](api-endpoints.md) says *what* the endpoints are; this says *how everything connects to them cleanly*.

---

## 1. The integration map

```
┌────────────┐   shared types (packages/types)   ┌────────────┐
│ web-admin  │◄──────────── contract ───────────►│ api-server │
│            │   HTTPS  /api/v1/*  (JWT)          │            │
│  components│──► hooks ──► lib/api ──────────────►│  routes →  │
│            │◄── WS  /api/v1/realtime ───────────│  …→ repo → │──► PostgreSQL
└────────────┘                                    │            │    + pgvector
                                                  │  ai/ ──────┼──► LLMProvider
┌────────────┐  POST /api/v1/ai/answer (svc tok)  │            │
│ voice-     │──────────────────────────────────►│  /internal │
│ orchestrator│◄─ AiResponse ─────────────────────│  calls…    │
│ (Twilio)   │  POST /internal/calls (svc tok)   └────────────┘
└────────────┘                                          ▲
┌────────────┐  POST /internal/notifications/send       │
│ worker     │──────────────────────────────────────────┘
└────────────┘
```

Three integration surfaces: **admin ↔ backend** (JWT REST + WS), **AI pipeline** (Orchestrator → `/ai/answer` → LLM), and **service → backend** (Orchestrator/Worker → `/internal/*` with a service token). Every one of them uses shapes from `packages/types`.

---

## 2. The shared contract (`packages/types`)

The single most important integration decision: **request, response, and entity shapes are defined once** as Zod schemas + inferred TS types in `packages/types`, and imported by both sides.

```ts
// packages/types/src/calls.ts
export const CallFiltersSchema = z.object({
  status: z.enum(CALL_STATUSES).optional(),
  category: z.enum(ISSUE_CATEGORIES).optional(),
  language: z.enum(LANGUAGES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type CallFilters = z.infer<typeof CallFiltersSchema>;
export interface Call { /* mirrors data-model.md */ }
export interface CallDetail extends Call { turns: TranscriptTurn[]; aiResponse: AiResponse | null; recordingUrl: string | null; }
```

- **Backend** validates incoming requests and types responses with these.
- **Frontend** types `lib/api` return values with these — so a backend shape change surfaces as a **TypeScript error in the frontend at build time**, not a runtime surprise.
- **Docs** ([`data-model.md`](data-model.md), [`api-endpoints.md`](api-endpoints.md)) describe these in prose.

This is why the frontend and backend are co-owned by you — they share one contract.

---

## 3. Authentication

**Login flow**
```
web-admin  POST /auth/login {email,password,tenantSlug}
   → api-server verifies, issues accessToken (~15m) + refreshToken (~7d)
   → tokens carry { sub: userId, tenantId, role }
web-admin stores tokens, attaches Authorization: Bearer <access> to every request
   → on 401, lib/api calls /auth/refresh once, retries; if that fails → redirect to login
```

**Token storage** — recommendation: refresh token in an **httpOnly, Secure, SameSite=strict cookie**; access token in memory. Avoids XSS token theft. (localStorage is simpler but weaker — decide and document once.)

**Tenant scope** — the client **never** sends `tenantId`. The backend reads it from the token. This is the mechanism that makes cross-tenant leaks structurally hard. See [`backend-guide.md`](backend-guide.md#3-tenant-scoping--the-rule-that-matters-most).

**Service-to-service** — the Orchestrator and Worker authenticate to `/internal/*` with a shared service token (from env), plus an explicit `X-Tenant-Id` the backend validates against the resource. User JWTs are never used for internal calls.

---

## 4. Frontend data layer (the `lib/api` + hooks pattern)

Three layers, strict direction — this is the frontend mirror of the backend's layering.

```
component  →  hook (useCalls)  →  lib/api (getCalls)  →  fetch → api-server
 renders       React state,        transport: attach JWT,     JSON
 only          caching, errors     parse envelope, throw AppError
```

**`lib/api` — transport only.** One typed function per endpoint. It attaches the auth header, sends the request, unwraps `{ data }`, and throws a typed error on `{ error }`. It never touches React.

```ts
// web-admin/src/lib/api/calls.ts
import type { Call, CallFilters, CallDetail, Paginated } from "@campus/types";
export async function getCalls(f: CallFilters): Promise<Paginated<Call>> {
  return http.get("/calls", { params: f });   // http = wrapper with auth + envelope handling
}
export async function getCallById(id: string): Promise<CallDetail> {
  return http.get(`/calls/${id}`);
}
```

**hooks — React state.** Recommendation: **TanStack Query** wrapping `lib/api`, so caching, loading/error state, and refetch are free and consistent.

```ts
// web-admin/src/hooks/useCalls.ts
export function useCalls(filters: CallFilters) {
  return useQuery({ queryKey: ["calls", filters], queryFn: () => getCalls(filters) });
}
```

**components — render only.** They call the hook and render `data`/`isLoading`/`error`. They never import `lib/api` or call `fetch`. This is the rule that keeps the current dummy-data duplication (dashboard and table each holding their own arrays) from ever coming back.

---

## 5. Real-time updates

For escalations and live-call status the dashboard must not poll aggressively. A single WebSocket (`/api/v1/realtime`, authed by the access token) pushes tenant-scoped events:

- `escalation.created` → prepend to the escalations queue, bump the dashboard counter.
- `call.updated` / `call.started` → update the relevant row/widget.

A small `useRealtime()` hook subscribes and invalidates the matching TanStack Query keys, so the same components re-render from cache. Fallback: if the socket drops, the queries have a modest `refetchInterval` so data stays fresh.

---

## 6. The AI integration path

The Orchestrator is a **client** of the backend, not of the LLM.

```
Orchestrator (has final transcript + call context)
  → POST /api/v1/ai/answer  { callId, language, transcript, previousTurns }   (service token)
  → api-server: retrieve tenant chunks (pgvector) → build prompt (packages/prompts)
                → LLMProvider.complete() → parse+validate AiResponse → post-check escalation
                → persist to ai_responses + update call → return AiResponse
  → Orchestrator: shouldEscalate ? warm-transfer : TTS(answerText)
```

Key integration guarantees:
- The Orchestrator only ever sees a **validated `AiResponse`** — never raw LLM text.
- `tenantId` is resolved server-side (from the phone number at call start, threaded via the internal call record), not trusted from the Orchestrator payload.
- All AI logic stays in `api-server/ai/`; swapping Claude↔GPT-4↔Gemini changes an adapter, nothing else. See [`ai-flow.md`](ai-flow.md).

---

## 7. Environment & configuration

Each app has an `.env` (never committed) validated at boot with Zod (`config/env.ts`). Shared, non-secret constants (language codes, category enums, thresholds) live in `packages/config` and are imported — not duplicated per app.

Representative variables:

| App | Vars (examples) |
|---|---|
| api-server | `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `SERVICE_TOKEN`, `LLM_PROVIDER`, `LLM_API_KEY`, `S3_BUCKET`, `STORAGE_REGION` |
| voice-orchestrator | `API_BASE_URL`, `SERVICE_TOKEN`, `TWILIO_*`, `ASR_PROVIDER`, `TTS_PROVIDER`, provider keys |
| worker | `DATABASE_URL`, `REDIS_URL`, `API_BASE_URL`, `SERVICE_TOKEN`, `TWILIO_*` |
| web-admin | `VITE_API_BASE_URL`, `VITE_WS_URL` (only public, `VITE_`-prefixed vars) |
| web-landing | `NEXT_PUBLIC_API_BASE_URL` |

Commit an `.env.example` per app documenting every key with a dummy value.

---

## 8. Integration failure handling

| Failure | Behaviour |
|---|---|
| Access token expired | `lib/api` silently refreshes once, retries; then redirects to login. |
| Backend 5xx / network | hook exposes `error`; component shows a retry state; no stale write. |
| WS disconnect | auto-reconnect with backoff; queries fall back to interval refetch. |
| LLM / ASR / TTS down | `/ai/answer` returns `shouldEscalate:true` (or `502`); Orchestrator transfers to human. |
| Orchestrator → `/internal` fails | retried with `Idempotency-Key`; call still completes for the caller, logging catches up. |

The theme: **the caller never gets a broken experience because an internal hop failed** — the fallback is always a human or a retry, never a crash.

---

## 9. Integration review checklist

- [ ] New endpoint has a matching `lib/api` function and a hook — no `fetch` in a component.
- [ ] Request/response typed with `packages/types`; no shape defined twice.
- [ ] Frontend never sends `tenantId`; backend derives it from the token.
- [ ] New real-time event has a server emit **and** a client handler that invalidates the right query.
- [ ] Any new env var is in `config/env.ts` (validated) and `.env.example`.
- [ ] Contract change is reflected in [`api-endpoints.md`](api-endpoints.md) and, if structural, [`data-model.md`](data-model.md).
