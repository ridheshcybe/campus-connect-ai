# CampusConnect AI

**A 24/7 multilingual voice assistant for college help desks — delivered as a white-label, multi-tenant SaaS.**

Students, parents, and applicants call a college's dedicated number and get instant spoken answers in **English, Hindi, Tamil, Telugu, or Kannada** about admissions, fees, hostel, transport, placements, and more. The system transcribes speech, retrieves the college's own knowledge base (RAG), generates a grounded answer with an LLM, speaks it back, and **escalates to a human** when it's unsure or when money or safety is involved. Every call is logged for staff to review in an admin dashboard.

> 📘 **Full project idea & docs → `docs/PROJECT-BLUEPRINT.md`** (start here) · docs index

---

## Monorepo layout

```
apps/
  web-admin/           React SPA (Vite) — admin dashboard
  web-landing/         Next.js — marketing + tenant onboarding
  api-server/          Node + Express — central REST API (owns all DB access)
  voice-orchestrator/  Node + WS — Twilio Media Streams + call state machine
  worker/              Node + BullMQ — background jobs (follow-ups, summaries)
packages/
  ui/                  Shared React component library (Tailwind)
  types/               Shared TypeScript types + Zod schemas (the contract)
  config/              Shared constants, enums, env helpers
  prompts/             LLM prompt templates + routing
docs/                  Architecture, flows, and integration documentation
infra/                 Docker Compose, IaC, CI/CD, DB migrations
```

See `docs/PROJECT-STRUCTURE.md` for the full tree and the current-state-vs-target gap.

## Tech stack

TypeScript · pnpm workspaces + Turborepo · Express · React + Vite · Next.js · PostgreSQL + pgvector · Redis + BullMQ · Twilio · pluggable LLM (Claude / GPT-4 / Gemini) · JWT auth · Zod · Tailwind · Vitest. Rationale for each choice is in the blueprint.

## Getting started

> ✅ **Milestone M0 is done — the app runs.** The monorepo (pnpm + Turborepo), `packages/types` + `packages/config`, the `api-server`, and a working `web-admin` dashboard are in place. The database, auth, and the AI/voice pipeline land in M1+ (see the roadmap).

```bash
# prerequisites: Node 20+ and pnpm.
# If you don't have pnpm:  corepack prepare pnpm@9.12.3 --activate   (or: npm i -g pnpm)

pnpm install
pnpm dev            # starts api-server (:4000) + web-admin (:5173) via Turborepo
# then open http://localhost:5173

# other commands
pnpm build          # build every package/app
pnpm typecheck      # typecheck the whole workspace
pnpm --filter @campus/web-admin dev   # run a single app
pnpm --filter @campus/api-server dev
```

The web-admin dev server proxies `/api` to the api-server, so no extra config is needed. In M0 the api-server serves typed mock data; the database replaces it in M1.

## Documentation

| Start here | Then |
|---|---|
| Project Blueprint | Architecture · App flows · AI flow |
| Docs index | Backend guide · Integration · Data model · API |

## Team

| Member | Responsibilities |
|---|---|
| **Vinay** | Backend development, APIs, database integration, connecting backend with AI services & telephony (`api-server`, `voice-orchestrator`, `worker`, DB, `infra`) |
| **Rudra** | Testing & QA, bug reporting, feature validation, performance testing |
| **Don & Ridhesh** | Project structure & architecture, application flow, AI model layer, backend code checking, frontend↔backend↔AI integration, codebase organization (`packages/types`, `packages/config`, tooling) |
| **Tanishqa & Surya** | AI development & training, voice pipeline (STT/AI/TTS), multilingual support, frontend (`web-admin` UI, `web-landing`, `packages/ui`), security (post-MVP) |

Full breakdown and how we work together: `docs/TEAM-ROLES.md`.

## License

Proprietary — © CampusConnect AI. All rights reserved.
