# Codebase Organization & Component Integration

> How the monorepo is wired together — workspaces, dependency direction, shared packages, conventions, and tooling — so that many people can work in it without stepping on each other.
> **Owner:** Don & Ridhesh · **Status:** Standard for M0+

Your role here is **organizing the codebase and integrating components**: deciding how the packages depend on each other, how shared UI/types/config are consumed, and the conventions that keep five apps and four packages coherent.

---

## 1. Monorepo tooling

- **pnpm workspaces** — one lockfile, fast installs, strict dependency resolution (a package can only import what it declares). Root `pnpm-workspace.yaml`:
  ```yaml
  packages:
    - "apps/*"
    - "packages/*"
  ```
- **Turborepo** — task graph + caching for `build`, `lint`, `typecheck`, `test`. Root `turbo.json` declares that an app's `build` depends on its packages' `build` (`"dependsOn": ["^build"]`), so Turbo builds `packages/types` before the apps that consume it and caches unchanged work.
- **Root scripts** (`package.json`): `pnpm dev` (Turbo runs all apps' dev), `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`. Filter to one app with `pnpm --filter web-admin dev`.
- **Node 20 LTS**, pinned via `.nvmrc` / `engines`.

---

## 2. Dependency direction (the one rule)

```
        apps/*  ──────depend on────►  packages/*
   (web-admin, api-server, …)      (ui, types, config, prompts)

        packages/ui ─► packages/types, packages/config
        packages/config ─► packages/types           (or nothing)
        packages/types ─► (nothing — the root of the graph)
```

**Rules:**
1. `apps` may depend on any `package`. A `package` may **never** depend on an `app`.
2. `apps` do **not** import from each other. Cross-app communication is over HTTP/WS only (see [`integration.md`](integration.md)).
3. `packages/types` depends on nothing (except `zod`). Everything can safely depend on it.
4. No circular dependencies — Turbo/pnpm will error, and that error is a design signal, not a nuisance.

Enforced with ESLint `no-restricted-imports` / an import-boundary rule so a violation fails CI, not just review.

---

## 3. Workspace references

Packages are consumed by their workspace name, not relative paths:

```jsonc
// apps/web-admin/package.json
{
  "dependencies": {
    "@campus/ui": "workspace:*",
    "@campus/types": "workspace:*",
    "@campus/config": "workspace:*"
  }
}
```

```ts
import { Button, Card } from "@campus/ui";
import type { Call } from "@campus/types";
import { LANGUAGES, ISSUE_CATEGORIES } from "@campus/config";
```

Namespace: **`@campus/*`**. Path aliases inside an app (e.g. `@/components`) are configured in that app's `tsconfig.json` + bundler; cross-package imports always use `@campus/*`.

---

## 4. The shared packages

### packages/types
The contract layer. Zod schemas + inferred TS types for every entity and every request/response ([`data-model.md`](data-model.md), [`api-endpoints.md`](api-endpoints.md)). Depends only on `zod`. Changing a type here is a deliberate, reviewed act because it ripples to both backend and frontend at compile time — which is exactly what we want.

```
packages/types/src/
├── index.ts        # re-exports
├── ai.ts           # AiResponse, LANGUAGES, ISSUE_CATEGORIES schemas
├── calls.ts        # Call, CallDetail, CallFilters, TranscriptTurn
├── faqs.ts  documents.ts  escalations.ts  users.ts  settings.ts  common.ts (Paginated, ApiError)
```

### packages/config
Constants and small pure helpers used across apps: language/locale codes, issue-category enums, escalation thresholds (`CONFIDENCE_ESCALATION_THRESHOLD = 0.7`), tenant defaults, and env-parsing helpers. No app-specific logic. This is where "magic strings/numbers" go to be named once.

### packages/ui
The shared React component library (Tailwind). Consumed by `web-admin` and `web-landing`. Presentational and prop-driven — **no data fetching, no `lib/api`, no business logic**. Components receive data via props so they stay reusable and Storybook-able.

```
packages/ui/src/
├── primitives/     # Button, Card, Input, Badge, Modal, Table, Spinner…
├── patterns/       # StatsCard, StatusBadge, DataTable, EmptyState…
├── styles/         # tailwind preset, tokens, globals
└── index.ts
```

Design-system tokens (color, spacing, type) are defined here as the single Tailwind preset both web apps extend — no raw hex/px scattered in app code. (See the global design guidance in the repo.)

### packages/prompts
LLM prompt templates + routing rules, parameterised by language and category. Owned by Tanishqa & Surya so prompt iteration doesn't touch app logic. Consumed by `api-server/ai`. See [`ai-flow.md`](ai-flow.md).

---

## 5. Component integration: how a shared component reaches a screen

The clean path, using the Call Log table as the example — note each layer's single responsibility:

```
packages/ui: <DataTable/> , <StatusBadge/>        ← presentational, prop-driven
        │  imported by
web-admin/src/components/CallLogTable.tsx          ← composes ui primitives for THIS app,
        │  used by                                   maps a Call[] to columns. Still no fetching.
web-admin/src/features/calls/CallLogsPage.tsx      ← page: calls the hook, passes data down
        │  gets data from
web-admin/src/hooks/useCalls.ts                    ← React state around lib/api
        │  calls
web-admin/src/lib/api/calls.ts                     ← transport (getCalls)
        │  types from
@campus/types (Call, CallFilters)                  ← the shared contract
```

Compare with **today's** code, which collapses these into two files each carrying their own hardcoded `dummyCalls` array ([`CallLogTable.tsx`](../apps/web-admin/src/components/CallLogTable.tsx), [`DashboardPage.tsx`](../apps/web-admin/src/features/dashboard/DashboardPage.tsx)). The refactor in M1 is: push generic table UI into `packages/ui`, keep app-specific composition in `components/`, move data to a hook, delete the dummy arrays.

---

## 6. Directory conventions

- **Backend module folders** are feature-based and self-contained: `routes / controller / service / repository / test` per feature ([`backend-guide.md`](backend-guide.md#1-service-structure-api-server)).
- **Frontend** is feature-based under `features/`, with cross-cutting `components/`, `hooks/`, `lib/`, `layouts/` ([`frontend-structure.md`](frontend-structure.md)).
- **File naming:** `kebab-case.ts` for modules, `PascalCase.tsx` for React components, `camelCase` for functions/vars, `SCREAMING_SNAKE` for constants.
- **Barrel files** (`index.ts`) only at package roots, not deep inside apps (avoids circular-import surprises and slow builds).
- **Tests** live next to the code they test (`*.test.ts`) or in a `__tests__` folder for e2e.

---

## 7. Tooling & consistency

| Concern | Tool | Config location |
|---|---|---|
| Types | TypeScript project refs | `tsconfig.base.json` + per-package `tsconfig.json` |
| Lint | ESLint (shared config package) | `packages/config` or `eslint.config.js` at root |
| Format | Prettier | root `.prettierrc` |
| Import boundaries | ESLint `no-restricted-imports` | root eslint config |
| Tests | Vitest (+ Playwright e2e) | per-app |
| Hooks/CI | Husky + lint-staged; GitHub Actions | `.husky/`, `infra/` |

CI runs `turbo run lint typecheck test build` on every PR; Turbo caching keeps it fast by skipping unchanged packages.

---

## 8. `.gitignore` (fix in M0)

The committed `.gitignore` is a **Python** template and must be replaced with a Node/monorepo one. Minimum it must ignore: `node_modules/`, `dist/`, `build/`, `.next/`, `.turbo/`, `coverage/`, `*.local`, `.env` (and `.env.*` except `.env.example`), editor/OS files (`.DS_Store`, `.idea/`, `.vscode/*` except shared). **It must NOT ignore `lib/`** — the current one does (line 17), which would silently drop `web-admin/src/lib/api/`. See the blueprint's known-issues list.

---

## 9. Codebase-organization checklist

- [ ] New package is namespaced `@campus/*`, added to `pnpm-workspace.yaml`, referenced via `workspace:*`.
- [ ] Dependency direction respected (no `package → app`, no `app → app` import).
- [ ] Shared shapes go in `packages/types`; shared constants in `packages/config` — not duplicated.
- [ ] New shared UI is presentational (props in, no fetching) and lives in `packages/ui`.
- [ ] File/naming conventions followed; no deep barrel files.
- [ ] `turbo run build` still succeeds from a clean install (`pnpm i && pnpm build`).
