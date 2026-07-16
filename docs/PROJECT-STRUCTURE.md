# Project Structure

## Monorepo Layout

CampusConnect AI is organised as a monorepo with two top-level directories: `apps/` for deployable applications and `packages/` for shared libraries. This layout keeps service boundaries clear while enabling code reuse across the stack (shared types, UI components, configuration, and AI prompt templates).

```
campusconnect-ai/
  apps/
    web-admin/
    web-landing/
    api-server/
    voice-orchestrator/
    worker/
  packages/
    ui/
    types/
    config/
    prompts/
  docs/
  infra/
```

## Applications (apps/)

### web-admin
The admin dashboard — a React (Next.js) single-page application that college staff use to review call logs, listen to recordings, read transcripts, manage FAQs and uploaded documents, handle escalations, schedule follow-ups, and configure tenant-level settings. It consumes the api-server REST endpoints and uses WebSockets for real-time escalation and call status updates.

### web-landing
The public marketing site and tenant onboarding portal (optional in the MVP). Built with Next.js, it presents product information, use cases, language support details, and a sign-up flow for new colleges. After onboarding, the tenant is provisioned with a phone number, default voice prompts, and admin credentials.

### api-server
The central backend — a Node.js / Express (or Fastify) REST API that handles authentication, tenant management, CRUD for calls, FAQs, documents, user accounts, escalation workflows, and notifications. It also acts as a proxy to the AI Service for the `/ai/answer` endpoint. All database access passes through this service, which enforces tenant isolation via `tenantId` scoping.

### voice-orchestrator
The real-time telephony coordinator — a service that receives Twilio webhooks and Media Streams, orchestrates the ASR → AI → TTS pipeline for each call, manages call state (greeting, listening, speaking, transferring), and handles barge-in and silence detection. It communicates with the AI layer over HTTP and persists call data by calling the api-server's internal endpoints.

### worker
A background job processor (Bull / BullMQ with Redis) that handles asynchronous tasks: scheduling and placing outgoing follow-up calls, sending SMS and WhatsApp messages, generating post-call AI summaries, cleaning up stale recordings, and sending daily analytics digests to admin users. It consumes jobs from Redis queues and updates the database through the api-server.

## Shared Packages (packages/)

### ui
A React component library shared between `web-admin` and `web-landing`. Contains reusable UI primitives: cards, tables, modals, forms, buttons, inputs, data display components, and layout utilities. Built with Tailwind CSS and exported as a local package consumed via workspace references.

### types
A TypeScript package containing all shared type definitions used across the monorepo. Includes interfaces and Zod schemas for:
- `Call` — call metadata, status, duration, language, category, escalation flag
- `AiResponse` — answer text, confidence score, issue category, escalation flag, detected language
- `Tenant` — tenant configuration, branding, phone numbers, feature flags
- `Faq` — Q&A entries with tenantId, category, language
- `Document` — uploaded PDFs with processing status and embedding references
- `User` — admin user profile, roles, tenantId

These types are the source of truth for API contracts between services.

### config
Shared configuration constants and utilities used across apps: language and locale codes (`en`, `hi`, `ta`, `te`, `ml`), issue category enums, escalation rule thresholds, tenant configuration defaults, and environment variable helpers. Keeps magic strings and numbers in one place.

### prompts
A collection of AI prompt templates and routing rules. Contains the system prompts for the intent classifier, the RAG response generator, the follow-up conversation initiator, and the escalation classifier. Each template is parameterised by language and issue category. Separating prompts from code allows non-engineers (Tanishqa & Surya) to iterate on prompt quality without touching application logic.

## Other Folders

### docs/
Project documentation including architecture overview, application flows, frontend structure, AI flow, project structure, data model, API endpoints, deployment guide, and test plans. This is the single source of truth for design decisions and system understanding.

### infra/
Infrastructure-as-code scripts and configuration files: Docker Compose for local development, Terraform / Pulumi for cloud provisioning (AWS or GCP), CI/CD pipeline definitions (GitHub Actions), environment variable templates, and database migration scripts.

## Ownership

| Area | Owner(s) |
|------|----------|
| Architecture docs, project structure, application flows, frontend structure, integration design | Don & Ridhesh |
| `web-admin`, `packages/ui`, `packages/types`, `packages/config` | Don & Ridhesh (co-owners) |
| `api-server`, `voice-orchestrator`, `worker`, DB schema, telephony and AI endpoint integration | Vinay |
| `docs/test-plan.md`, test folders and suites under `api-server` and `web-admin` | Rudra |
| `docs/ai-voice-architecture.md`, `packages/prompts`, ASR/LLM/TTS integration, implementation of `web-admin` components and pages | Tanishqa & Surya |
