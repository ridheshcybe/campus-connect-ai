# Backend Stack

**Database:** NeDB (embedded datastore for speed, low overhead, and
configuration-less filesystem execution). Each entity gets its own
file-backed collection under `apps/api-server/data/` (e.g. `calls.db`,
`faqs.db`) — see `apps/api-server/src/db.ts`.

**🚨 Unresolved conflict — needs a team decision, not a code decision:**
`docs/architecture.md` states the database is **PostgreSQL with row-level
security**, and describes a `phone_numbers` mapping table and RLS policies
that don't exist anywhere in the actual code. The running code uses NeDB —
`package.json` has `nedb-promises` as a dependency and no Postgres driver
(`pg`) at all.

This is not a hypothetical difference — it affects real things NeDB cannot
do the way `architecture.md` describes:
- NeDB has no row-level security. Tenant isolation in the current code is
  enforced by the application always adding a `tenantId` filter to queries —
  if any route forgets that filter, nothing stops it from returning another
  tenant's data. Postgres RLS was specifically supposed to be the
  defence-in-depth layer for exactly that mistake.
- NeDB has no real concurrent-write guarantees at scale — fine for a couple
  of developers running this locally, not something to trust in production
  with real call volume.

Until the team confirms which one is authoritative, treat NeDB as the
local-dev / prototype datastore, and don't build anything (like actual RLS
policies) that assumes `architecture.md`'s Postgres section is current.
Whoever owns `architecture.md` should either update it to say NeDB, or the
team needs to plan an actual migration to Postgres before this goes further
than a prototype.

**HTTP framework:** Express 5 (`apps/api-server/src/app.ts`). Note Express 5
forwards rejected promises from `async` route handlers to error middleware
automatically — that's why routes can `throw new AppError(...)` directly
instead of manually wrapping every handler.

**Validation:** `zod` schemas per route (see any `POST`/`PATCH` handler in
`src/calls`, `src/faqs`, `src/documents`, `src/tenants`, `src/auth`,
`src/notifications`).

**Auth:** `bcrypt` for password hashing, `jsonwebtoken` for session tokens.
See `src/auth/index.ts` and `src/middleware/auth.ts`. **Not yet wired into
any route** — see the "Open items" section of `docs/api-spec.md`.

**Logging:** `morgan` (`"dev"` format) for HTTP request logs.

**Language/tooling:** TypeScript 7 (the new native/Go-based compiler),
run in dev via `tsx` (not `ts-node` — `ts-node` does not support TypeScript 7
yet, since it depends on compiler internals TS7 removed).
