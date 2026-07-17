# CampusConnect AI — Documentation

The complete documentation set for CampusConnect AI. **New here? Start with the [Project Blueprint](PROJECT-BLUEPRINT.md), then read [TEAM-ROLES.md](TEAM-ROLES.md) to find your area.**

---

## Core (read first)

| Doc | What it covers | Owner |
|---|---|---|
| ⭐ [PROJECT-BLUEPRINT.md](PROJECT-BLUEPRINT.md) | The complete clean project idea — product, principles, structure, stack, roadmap. | Don & Ridhesh |
| [TEAM-ROLES.md](TEAM-ROLES.md) | Who does what, the seams between roles, and how we work together (git, PRs, definition of done). | Don & Ridhesh |
| [architecture.md](architecture.md) | System components, tech decisions, multi-tenant model, non-functional requirements. | Don & Ridhesh |
| [PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md) | The monorepo tree, current state vs. target. | Don & Ridhesh |
| [codebase-organization.md](codebase-organization.md) | Workspace wiring, dependency direction, shared packages, conventions. | Don & Ridhesh |
| [app-flows.md](app-flows.md) | End-to-end flows: inbound call, outbound follow-up, admin dashboard. | Don & Ridhesh |

## By role

### Vinay — backend, APIs, DB, telephony & AI wiring
| Doc | What it covers |
|---|---|
| [backend-development.md](backend-development.md) | How to build the backend: services, APIs, DB, connecting AI & telephony. **Your build guide.** |
| [backend-guide.md](backend-guide.md) | The standards your code is reviewed against (layering, tenant scoping, validation). |
| [data-model.md](data-model.md) | Database schema, entities, `AiResponse`, enums, RLS. |
| [api-endpoints.md](api-endpoints.md) | The REST + WebSocket API contract to implement. |

### Rudra — testing & QA
| Doc | What it covers |
|---|---|
| [test-plan.md](test-plan.md) | **Your playbook:** what to test, how, bug reporting, feature validation, performance testing. |

### Don & Ridhesh — structure, integration, code review
| Doc | What it covers |
|---|---|
| [integration.md](integration.md) | Connecting frontend ↔ backend ↔ AI: contract, auth, data layer, real-time. |
| [ai-flow.md](ai-flow.md) | The AI model layer: `/ai/answer`, RAG, `AiResponse`, escalation (design/contract). |
| (plus all Core docs above) | |

### Tanishqa & Surya — AI, voice, multilingual, frontend, security
| Doc | What it covers |
|---|---|
| [ai-voice-architecture.md](ai-voice-architecture.md) | **Your AI/voice guide:** STT → AI response → TTS, model training, prompts, multilingual (en/ta/hi/kn/te). |
| [frontend-development.md](frontend-development.md) | **Your frontend build guide:** how to build `web-admin` UI against the integration layer. |
| [frontend-structure.md](frontend-structure.md) | The `web-admin` screens & structure spec. |
| [security.md](security.md) | The post-MVP cybersecurity hardening phase (later). |

---

## How these fit together

```
              ┌─────────────────────────┐
              │   PROJECT-BLUEPRINT.md   │  ← the map; links to everything
              │   + TEAM-ROLES.md        │  ← who owns each part
              └───────────┬─────────────┘
        ┌─────────────────┼───────────────────────┐
        ▼                 ▼                        ▼
  architecture.md    app-flows.md            ai-flow.md ─► ai-voice-architecture.md
  PROJECT-STRUCTURE  (how it behaves)        (the AI layer)   (voice pipeline + training)
  codebase-org       │                        │
        │            ▼                        ▼
        │   frontend-structure.md ──► frontend-development.md   ┌──────────────┐
        │            │                                          │ integration  │
        │            └──────────────────────────────────────────┤    .md       │
        ▼                                                       └──────┬───────┘
  backend-guide.md ──► backend-development.md                          ▼
        │                        │                       data-model.md ◄──► api-endpoints.md
        ▼                        ▼                              (shared contracts)
  test-plan.md (Rudra validates all of it)          security.md (post-MVP hardening)
```

## Conventions for editing docs

- The **blueprint is canonical**. If a detail doc conflicts with it, fix the detail doc (or change the blueprint first if the decision itself is changing).
- Keep the owner + status line at the top of each doc current.
- Cross-link rather than duplicate. Enums and shapes have exactly one home: `packages/config` / `packages/types`, described in `data-model.md`.

## Still planned

| Doc | Owner |
|---|---|
| `deployment.md` — infra, CI/CD, environments | Vinay |
