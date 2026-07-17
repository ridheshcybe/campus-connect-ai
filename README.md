# CampusConnect AI

**A 24/7 multilingual voice assistant for college help desks — delivered as a white-label, multi-tenant SaaS.**

Students, parents, and applicants call a college's dedicated number and get instant spoken answers in **English, Hindi, Tamil, Telugu, or Kannada** about admissions, fees, hostel, transport, placements, and more. The system transcribes speech, retrieves the college's own knowledge base (RAG), generates a grounded answer with an LLM, speaks it back, and **escalates to a human** when it's unsure or when money or safety is involved. Every call is logged for staff to review in an admin dashboard.

> 📘 **Full project idea & docs → [`docs/PROJECT-BLUEPRINT.md`](docs/PROJECT-BLUEPRINT.md)** (start here) · [docs index](docs/README.md)

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

See [`docs/PROJECT-STRUCTURE.md`](docs/PROJECT-STRUCTURE.md) for the full tree and the current-state-vs-target gap.

## Tech stack

TypeScript · pnpm workspaces + Turborepo · Express · React + Vite · Next.js · PostgreSQL + pgvector · Redis + BullMQ · Twilio · pluggable LLM (Claude / GPT-4 / Gemini) · JWT auth · Zod · Tailwind · Vitest. Rationale for each choice is in [the blueprint](docs/PROJECT-BLUEPRINT.md#6-technology-decisions).

## Getting started

> ⚠️ **The repo is currently a documentation-first skeleton.** There is no `package.json` yet, so the commands below describe the *target* setup being built in milestone **M0** (see the [roadmap](docs/PROJECT-BLUEPRINT.md#7-current-state-vs-target-the-gap)).

```bash
# prerequisites: Node 20 LTS, pnpm, Docker (for Postgres + Redis)
pnpm install
cp apps/api-server/.env.example apps/api-server/.env   # fill in secrets
docker compose -f infra/docker-compose.yml up -d        # postgres, redis
pnpm dev                                                 # all apps via Turborepo
# or a single app:
pnpm --filter web-admin dev
pnpm --filter api-server dev
```

## Documentation

| Start here | Then |
|---|---|
| [Project Blueprint](docs/PROJECT-BLUEPRINT.md) | [Architecture](docs/architecture.md) · [App flows](docs/app-flows.md) · [AI flow](docs/ai-flow.md) |
| [Docs index](docs/README.md) | [Backend guide](docs/backend-guide.md) · [Integration](docs/integration.md) · [Data model](docs/data-model.md) · [API](docs/api-endpoints.md) |

## Team

| Member | Responsibilities |
|---|---|
| **Vinay** | Backend development, APIs, database integration, connecting backend with AI services & telephony (`api-server`, `voice-orchestrator`, `worker`, DB, `infra`) |
| **Rudra** | Testing & QA, bug reporting, feature validation, performance testing |
| **Don & Ridhesh** | Project structure & architecture, application flow, AI model layer, backend code checking, frontend↔backend↔AI integration, codebase organization (`packages/types`, `packages/config`, tooling) |
| **Tanishqa & Surya** | AI development & training, voice pipeline (STT/AI/TTS), multilingual support, frontend (`web-admin` UI, `web-landing`, `packages/ui`), security (post-MVP) |

Full breakdown and how we work together: [`docs/TEAM-ROLES.md`](docs/TEAM-ROLES.md).

## License

Proprietary — © CampusConnect AI. All rights reserved.
