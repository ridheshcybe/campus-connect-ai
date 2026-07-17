# Backend Guide & Code-Checking Standards

> How `api-server` (and the other Node services) are structured, and the checklist you run when reviewing backend code.
> **Owner of this doc:** Don (backend quality / review) · **Implementation owner:** Vinay · **Status:** Standard for M1+

Your role here is **backend code checking** — making sure every backend change is layered correctly, tenant-safe, validated, and tested before it merges. This doc gives you (a) the structure code should follow and (b) the review checklist to hold it to.

---

## 1. Service structure (`api-server`)

A strict layered flow. Each layer has one job and only talks to the layer directly below it.

```
apps/api-server/src/
├── server.ts                # app bootstrap: middleware, mount routers, listen
├── app.ts                   # express app factory (used by tests without listen)
├── config/                  # env parsing (zod), constants (re-exports packages/config)
├── middleware/              # auth (JWT→req.ctx), tenant, error handler, rate limit
├── modules/
│   ├── calls/
│   │   ├── calls.routes.ts      # HTTP: path + method → controller. No logic.
│   │   ├── calls.controller.ts  # parse/validate req, call service, shape response
│   │   ├── calls.service.ts     # business logic, orchestration, tenant rules
│   │   ├── calls.repository.ts  # DB access ONLY. Every query tenant-scoped.
│   │   └── calls.test.ts        # unit/integration tests
│   ├── auth/  faqs/  documents/  escalations/  settings/  ai/  …
├── ai/                      # LLMProvider interface + adapters, retrieval, prompt build
├── lib/                     # db client, redis, storage, logger, errors
└── types/                   # request-context types; domain types come from packages/types
```

**Layer contract**

| Layer | May do | May NOT do |
|---|---|---|
| routes | map path→controller, attach middleware | contain logic, touch DB |
| controller | validate input (zod), call one service, format output | contain business rules, touch DB directly |
| service | business logic, combine repositories, enforce rules | build SQL, read `req`/`res` |
| repository | run queries, map rows→types | contain business rules, call other services |

This separation is what makes the code *checkable*: a reviewer can look at a repository file and confirm every query is tenant-scoped without reading the whole feature.

---

## 2. The request context

Auth + tenant middleware attach a typed context to every request:

```ts
// after auth middleware
req.ctx = {
  tenantId: string;      // from JWT (or validated X-Tenant-Id on /internal)
  userId: string | null;
  role: "super_admin" | "admin" | "viewer";
};
```

Services receive `ctx` explicitly (never reach into `req`): `callsService.list(ctx, filters)`. This makes services unit-testable and makes the tenant boundary a visible function argument.

---

## 3. Tenant scoping — the rule that matters most

Every repository method takes `ctx.tenantId` and includes it in the query. Two layers of defence:

1. **Application layer:** `WHERE tenant_id = $tenantId` in every query. Reviewers reject any query without it.
2. **Database layer (RLS):** the repository sets `SET LOCAL app.tenant_id = $tenantId` at the start of the transaction; RLS policies enforce it even if the `WHERE` is missing.

```ts
// calls.repository.ts
async function listCalls(tenantId: string, f: CallFilters) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL app.tenant_id = ${tenantId}`;
    return tx.call.findMany({ where: { tenantId, ...toWhere(f) }, /* … */ });
  });
}
```

> ⚠ The current stub `GET /calls` ([`apps/api-server/src/calls/index.ts`](../apps/api-server/src/calls/index.ts)) returns all tenants' rows. That is exactly what this rule forbids — the M1 rewrite must scope it.

---

## 4. Validation & types

- **Validate at the boundary.** Every controller parses its input with a Zod schema before anything else. Reject with `400 VALIDATION_ERROR` on failure.
- **Share the schema.** Request/response/entity schemas live in `packages/types`; the controller imports them. Frontend imports the same ones — one contract. See [`integration.md`](integration.md).
- **No `any` at boundaries.** Internal helpers may be loose; anything crossing an HTTP or DB boundary is typed.

```ts
// calls.controller.ts
const querySchema = CallFiltersSchema;         // from packages/types
export async function list(req, res, next) {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) return next(new ValidationError(parsed.error));
  const result = await callsService.list(req.ctx, parsed.data);
  res.json({ data: result.items, meta: result.meta });
}
```

---

## 5. Errors

- One `AppError` hierarchy in `lib/errors` (`ValidationError`, `NotFoundError`, `ForbiddenError`, `UpstreamError`, …), each with a `code` and HTTP status.
- One error-handling middleware converts any thrown `AppError` into the standard envelope ([`api-endpoints.md`](api-endpoints.md#standard-envelopes)); unknown errors become `500 INTERNAL` and are logged with the request id, never leaked to the client.
- Services throw typed errors; they never write to `res`.

---

## 6. External calls (LLM / ASR / TTS / Twilio)

- All behind interfaces in `ai/` and `lib/` — no vendor SDK imported in a controller or service directly.
- Every external call has a **timeout**, a **retry policy** (idempotent only), and a **fallback**. LLM failure → escalate. See [`ai-flow.md`](ai-flow.md#failure-handling).
- Secrets come from validated env (`config/env.ts` parses `process.env` with Zod at boot; the app refuses to start if a required var is missing).

---

## 7. Logging & observability

- Structured JSON logs (pino) with a per-request `requestId` and `tenantId` on every line.
- Never log secrets, full recordings, or full transcripts at info level; PII-aware.
- Health/readiness endpoints as in [`api-endpoints.md`](api-endpoints.md#2-health).

---

## 8. Testing expectations

Owned with Rudra (`docs/test-plan.md`), but the backend bar is:

- **Unit:** every service method, especially tenant rules and escalation post-checks.
- **Integration:** each route against a test Postgres (testcontainers) — including a **cross-tenant negative test** per resource (tenant A's token must never see tenant B's row).
- **Contract:** responses parse against the shared `packages/types` schema.
- Vitest; `pnpm --filter api-server test` green before merge.

---

## 9. Backend PR review checklist

Run this on every backend PR before approving. A "no" blocks the merge.

**Correctness & security**
- [ ] Every new query is **tenant-scoped** (`tenantId` in `WHERE` *and* RLS set).
- [ ] Protected routes have auth middleware; role checks where needed (`super_admin` for tenant provisioning).
- [ ] Input is validated with a Zod schema from `packages/types` at the controller boundary.
- [ ] No secret, token, or password is logged, returned, or committed.
- [ ] External calls have timeout + fallback; failures escalate rather than return a wrong answer.

**Structure & consistency**
- [ ] Logic is in the right layer (no DB in controllers, no `res` in services).
- [ ] Response uses the standard `{ data, meta }` / `{ error }` envelope.
- [ ] Types come from `packages/types`; enums from `packages/config` — nothing hardcoded.
- [ ] Errors thrown are typed `AppError`s with correct codes.

**Tests & hygiene**
- [ ] New/changed behaviour has tests, including a cross-tenant negative test for new resources.
- [ ] `pnpm lint`, `pnpm typecheck`, and the service's tests pass in CI.
- [ ] Migrations (if any) are forward-only and create their RLS policy in the same file.
- [ ] Public API change is reflected in [`api-endpoints.md`](api-endpoints.md).

---

## 10. Quick "is this backend code healthy?" smell test

If you only have two minutes, check these four things — they catch most real problems:

1. **Open a repository file** → is every query scoped by `tenantId`?
2. **Open a controller** → does it validate input and delegate to exactly one service?
3. **Grep for the LLM/Twilio SDK import** → is it only inside `ai/` or `lib/`?
4. **Grep for `process.env`** → is it only inside `config/`?
