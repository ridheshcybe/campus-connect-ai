# Frontend Development Guide

> Tanishqa & Surya's guide to building the `web-admin` UI (and `web-landing` + `packages/ui`). The *build* companion to [`frontend-structure.md`](frontend-structure.md) (the spec) and [`integration.md`](integration.md) (the wiring, owned by Don & Ridhesh).
> **Owners:** Tanishqa & Surya (UI) · Don & Ridhesh (structure + integration layer) · **Status:** Living

You build the screens and components; Don & Ridhesh own the data layer (`lib/api` + hooks + shared types) that feeds them. The clean rule that keeps this seam working: **components render, hooks fetch, `lib/api` transports — you never call `fetch` directly.**

---

## 1. What you own

| Area | Scope |
|---|---|
| `web-admin` UI | All screens & components: Dashboard, Call Logs, Call Detail, FAQ Manager, Documents, Settings, Staff, Login. Spec: [`frontend-structure.md`](frontend-structure.md). |
| `packages/ui` | The shared component library — presentational primitives & patterns (Button, Card, Table, StatusBadge, StatsCard, DataTable, …). |
| `web-landing` | The Next.js marketing + onboarding site. |
| Design system | Tailwind tokens (color/spacing/type) in `packages/ui` — no raw hex/px scattered in app code. |

**Stack:** React 18 + Vite + React Router + Tailwind + TanStack Query. (`web-landing` uses Next.js.)

---

## 2. The three layers (and your place in them)

```
component  →  hook (useCalls)  →  lib/api (getCalls)  →  api-server
 YOU build     D&R own            D&R own
 (render)      (React state)      (transport)
```

- **You build components and pages** that consume hooks and render `data` / `isLoading` / `error`.
- **Don & Ridhesh provide the hooks and `lib/api`.** If you need a new endpoint wired, ask them to add the `lib/api` function + hook (typed with `packages/types`) — don't reach past them to `fetch`.
- This is what stops the current mess where [`DashboardPage`](../apps/web-admin/src/features/dashboard/DashboardPage.tsx) and [`CallLogTable`](../apps/web-admin/src/components/CallLogTable.tsx) each hold their own hardcoded `dummyCalls`. See [`integration.md`](integration.md#4-frontend-data-layer-the-libapi--hooks-pattern).

---

## 3. Where things go

```
web-admin/src/
├── components/     # app-specific compositions of packages/ui primitives
├── features/       # one folder per screen area (dashboard, calls, faqs, documents, settings…)
│   └── calls/      # page + feature-specific sub-components
├── hooks/          # (D&R) useCalls, useCallDetail, useFaqs… — data state
├── lib/api/        # (D&R) transport functions
├── layouts/        # MainLayout (sidebar, header, content)
└── main.tsx        # mount + router
```

- **Generic, reusable UI** → `packages/ui`. **App-specific composition** → `web-admin/src/components`. Don't put a generic table only in `web-admin` — put `DataTable` in `packages/ui` and compose `CallLogTable` from it.
- **Presentational only in `packages/ui`:** props in, no data fetching, no `lib/api`, no business logic — so it's reusable and testable.

---

## 4. Build order (matches the roadmap)

1. **M0** — mount `web-admin` (`ReactDOM.createRoot` + React Router), set up Tailwind + the `packages/ui` preset, port the existing `MainLayout`/`Dashboard` into the router. Kill the "not mounted" state.
2. **M1** — replace dummy data: render Dashboard + Call Logs from the hooks D&R provide; loading/empty/error states; delete the `dummyCalls` arrays.
3. **M2+** — Call Detail (transcript, audio player, AI summary), FAQ Manager, Documents (upload + progress), Settings, Staff, escalations queue with live WS updates.

See the refactor target in [`frontend-structure.md`](frontend-structure.md#current-state--refactor-target).

---

## 5. UI quality bar

- **States for everything:** every data view has loading (skeleton), empty, error, and populated states — not just the happy path.
- **Accessibility:** keyboard navigable, labelled inputs, sufficient contrast, focus states. (Baseline now; deeper audit in the security/quality phase.)
- **Responsive:** the dashboard works on smaller screens (collapsible sidebar).
- **Multilingual-aware:** the admin UI is in English, but it *displays* content in five languages — don't assume Latin script; test with Tamil/Kannada/Telugu strings in tables and detail views.
- **Design tokens:** use the Tailwind preset from `packages/ui`; no ad-hoc colors. Aim for a clean, professional dashboard, not a template.
- **No secrets / no direct `fetch`:** enforced by lint; components import hooks only.

---

## 6. Definition of done (frontend)

- [ ] Renders from a hook (no `fetch`, no dummy data) and handles loading/empty/error.
- [ ] Reusable UI lives in `packages/ui` (presentational); app composition in `web-admin`.
- [ ] Typed with `packages/types`; enums/labels from `packages/config`.
- [ ] Accessible + responsive; no console errors.
- [ ] Works with real API data for two different tenants (no leakage, correct scoping via the token).
- [ ] Validated by Rudra against acceptance criteria ([`test-plan.md`](test-plan.md#22-frontend-web-admin--with-tanishqa--surya)).

---

## 7. Related docs

- [`frontend-structure.md`](frontend-structure.md) — the screens & folder spec.
- [`integration.md`](integration.md) — the `lib/api` + hooks + auth + real-time layer you consume.
- [`codebase-organization.md`](codebase-organization.md) — how `packages/ui` is consumed; conventions.
- [`api-endpoints.md`](api-endpoints.md) — what data each screen has available.
