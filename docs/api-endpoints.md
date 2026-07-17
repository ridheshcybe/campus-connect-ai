# API Endpoints

> The REST contract for `api-server`. This is the interface `web-admin` (via `lib/api`), the Voice Orchestrator, and the Worker all code against.
> **Owners:** Vinay (implementation) with Don & Ridhesh (contract/integration design) · **Status:** Draft for M1–M2

Conventions, shapes, and every route in one place. Request/response bodies use the shared types from [`packages/types`](codebase-organization.md#packagestypes); entities are defined in [`data-model.md`](data-model.md).

---

## 1. Conventions

- **Base URL:** `/api/v1`. Version in the path; breaking changes bump the version.
- **Format:** JSON in, JSON out. `Content-Type: application/json`.
- **Auth:** `Authorization: Bearer <accessToken>` on every route except `/health` and `/auth/*`. The token carries `tenantId` and `role`; the server derives tenant scope from it — clients never send `tenantId` in the body or query.
- **Tenant scope:** enforced server-side from the JWT. See [`integration.md`](integration.md#authentication).
- **Internal routes:** the Orchestrator/Worker call internal endpoints authenticated with a service token (not a user JWT); these are under `/internal` and never exposed publicly.

### Standard envelopes

Success:
```json
{ "data": { /* resource or list */ }, "meta": { /* pagination, optional */ } }
```

Error (uniform across all routes):
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "language must be one of en,hi,ta,te,kn", "details": [] } }
```

Error `code` values: `VALIDATION_ERROR` (400), `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL` (500), `UPSTREAM_UNAVAILABLE` (502/503, e.g. LLM/ASR down).

### Pagination

List endpoints accept `?page=1&pageSize=25` and return:
```json
{ "data": [ ... ], "meta": { "page": 1, "pageSize": 25, "total": 143, "totalPages": 6 } }
```

---

## 2. Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | none | Liveness. Returns `{ "status": "ok" }`. |
| GET | `/api/v1/ready` | none | Readiness — checks DB, Redis, LLM reachability. |

---

## 3. Auth

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/v1/auth/login` | `{ email, password, tenantSlug }` | `{ accessToken, refreshToken, user }` |
| POST | `/api/v1/auth/refresh` | `{ refreshToken }` | `{ accessToken }` |
| POST | `/api/v1/auth/logout` | `{ refreshToken }` | `204` |
| POST | `/api/v1/auth/forgot-password` | `{ email, tenantSlug }` | `202` (always, to avoid user enumeration) |

`user` = `{ id, email, name, role, tenantId }`. Token TTLs: access ~15 min, refresh ~7 days. See [`integration.md`](integration.md#authentication) for storage guidance.

---

## 4. Calls

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/calls` | List. Filters: `status`, `category`, `language`, `channel`, `from`, `to`, `search` (caller number). Paginated. |
| GET | `/api/v1/calls/:id` | Full detail: metadata + transcript turns + `aiResponse` + recording URL (pre-signed) + summary. |
| PATCH | `/api/v1/calls/:id` | Update `status` (`resolved`/`pending`) or `followUpRequired`. |
| GET | `/api/v1/calls/export` | CSV export of the current filter set. |

`GET /calls` item shape mirrors `Call` in `data-model.md` (no transcript). `GET /calls/:id` returns `CallDetail` (call + `turns[]` + `aiResponse` + `recordingUrl`).

---

## 5. AI answer (the core AI endpoint)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/ai/answer` | user JWT **or** service token | The RAG+LLM pipeline. See [`ai-flow.md`](ai-flow.md). |

**Request**
```json
{
  "callId": "…",
  "language": "ta",
  "transcript": "Fee payment deadline eppothu?",
  "previousTurns": [
    { "role": "ai", "text": "Vanakkam, ABC College help desk…" },
    { "role": "caller", "text": "Fee deadline pathi sollunga." }
  ]
}
```
`tenantId` is **not** in the body — it comes from the token (or the service token's target header for internal calls).

**Response** — a validated `AiResponse`:
```json
{
  "data": {
    "answerText": "The fee payment deadline is December 15th…",
    "confidenceScore": 0.94,
    "issueCategory": "fees",
    "shouldEscalate": false,
    "language": "ta"
  }
}
```
On upstream failure the server returns `shouldEscalate: true` with a safe `answerText`, or `502 UPSTREAM_UNAVAILABLE` if it cannot produce anything — the Orchestrator treats both as "transfer to human".

---

## 6. FAQs

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/faqs` | List. Filters: `category`, `language`, `search`. |
| POST | `/api/v1/faqs` | Create. Body: `{ category, language, question, answer }`. |
| PATCH | `/api/v1/faqs/:id` | Update. |
| DELETE | `/api/v1/faqs/:id` | Delete. |

Edits take effect on the next call (re-embedded asynchronously if `embedding` is used).

---

## 7. Documents

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/documents` | List with `status`. |
| POST | `/api/v1/documents` | Multipart upload (PDF). Returns the doc with `status: "processing"`; the Worker chunks + embeds. |
| GET | `/api/v1/documents/:id` | Status + metadata. |
| DELETE | `/api/v1/documents/:id` | Removes doc + its chunks. |

---

## 8. Escalations

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/escalations` | Queue. Filter `status` (`open`/`claimed`/`resolved`). |
| POST | `/api/v1/escalations/:id/claim` | Current admin claims it. |
| POST | `/api/v1/escalations/:id/resolve` | Mark resolved. |

New escalations are also pushed over WebSocket (§12).

---

## 9. Staff contacts

| Method | Path |
|---|---|
| GET / POST | `/api/v1/staff-contacts` |
| PATCH / DELETE | `/api/v1/staff-contacts/:id` |

---

## 10. Settings

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/settings` | The tenant's settings row. |
| PATCH | `/api/v1/settings` | Update branding, languages, business hours, escalation channels. |

---

## 11. Notifications & follow-ups (internal + admin)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/internal/notifications/send` | service token | Called by the Worker. `{ recipientNumber, channel, templateName, referenceCallId }`. |
| POST | `/api/v1/calls/:id/follow-up` | user JWT | Admin schedules a follow-up; enqueues a Worker job. |

---

## 12. Real-time (WebSocket)

| Path | Auth | Events |
|---|---|---|
| `wss://…/api/v1/realtime` | access token as query/subprotocol | `escalation.created`, `call.updated`, `call.started` — all tenant-scoped from the token. |

The dashboard subscribes and updates the escalations queue and live-call widgets without polling. See [`integration.md`](integration.md#real-time-updates).

---

## 13. Internal service endpoints

Used by the Orchestrator to persist call data (keeps all DB access inside `api-server`):

| Method | Path | Notes |
|---|---|---|
| POST | `/internal/calls` | Create a call record at answer time. |
| PATCH | `/internal/calls/:id` | Update status/duration/recording key at hang-up. |
| POST | `/internal/calls/:id/turns` | Append transcript turns. |

All `/internal/*` routes require the service token and an explicit `X-Tenant-Id` header validated against the resource.

---

## 14. Rate limiting & idempotency

- Public routes: per-IP + per-tenant rate limits; `429 RATE_LIMITED` with `Retry-After`.
- Mutations that may be retried by the Orchestrator/Worker accept an `Idempotency-Key` header; the server dedupes.
