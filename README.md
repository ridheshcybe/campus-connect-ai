# CampusConnect AI

CampusConnect AI is a white-label, multilingual college help-desk platform. Students and
parents can ask questions by phone, SMS, or WhatsApp; answers are grounded in each college's
knowledge base, uncertain or sensitive requests are escalated to staff, and every interaction
is available in an authenticated admin dashboard.

## Current working slice

The repository currently includes:

- a pnpm/Turborepo TypeScript monorepo;
- PostgreSQL + pgvector with tenant Row-Level Security and a restricted application role;
- Redis-backed JWT login, refresh, and logout;
- tenant-scoped call logs, call details, CSV export, and dashboard statistics;
- a React/Vite admin dashboard with login and authenticated API requests;
- a service-authenticated Gemini answer endpoint with validated output, deterministic
  escalation, conversation persistence, and a safe no-key fallback;
- Docker-based local infrastructure plus build, typecheck, test, and GitHub Actions checks.

The FAQ, Documents, and Settings screens are placeholders. The voice orchestrator, Twilio
streaming, ASR/TTS, worker, document ingestion, and production deployment arrive in later
milestones described in [the project blueprint](docs/PROJECT-BLUEPRINT.md).

## Run locally

Prerequisites: Node.js 20+, pnpm 9.12.3, and either Docker Desktop or a local PostgreSQL server.

```bash
pnpm install

# PowerShell
Copy-Item apps/api-server/.env.example apps/api-server/.env

# macOS/Linux
# cp apps/api-server/.env.example apps/api-server/.env

pnpm db:up
pnpm db:seed
pnpm dev
```

If Docker is unavailable but PostgreSQL is already installed, create a `campus` database,
apply `infra/migrations/0001_init.sql` as the `postgres` administrator, and then run
`pnpm db:seed`. Redis is optional for local UI development; readiness reports `degraded`
and token revocation becomes best-effort until Redis is available.

Open [http://localhost:5173](http://localhost:5173) and sign in with:

```text
College slug: abc
Email:        admin@abc.edu
Password:     Admin@1234
```

The web app runs on port `5173`, the API on `4000`, PostgreSQL on `5432`, and Redis on `6379`.
`apps/web-admin` proxies `/api` to the API server during development.

Gemini is optional for local setup. Add `GEMINI_API_KEY` to
`apps/api-server/.env` to enable generated answers; without it, the AI endpoint returns and
persists a safe human-escalation response.

## Verify

```bash
pnpm build
pnpm typecheck
pnpm test

# Runtime health
curl http://localhost:4000/health
curl http://localhost:4000/api/v1/ready
```

## Repository layout

```text
apps/api-server/    Express API, auth, tenant repositories, AI service
apps/web-admin/     React/Vite admin dashboard
packages/types/     Shared TypeScript and Zod contracts
packages/config/    Shared labels and application constants
infra/migrations/   PostgreSQL, pgvector, and RLS schema
docs/               Architecture, flows, API, security, and test plans
```

See the [documentation index](docs/README.md) for the complete design and roadmap.

## License

Proprietary — © CampusConnect AI. All rights reserved.
