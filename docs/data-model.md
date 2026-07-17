# Data Model

> The canonical database schema and shared entity shapes. Every backend query and every `packages/types` definition traces back to this file.
> **Owners:** Vinay (DB schema) with Don & Ridhesh (`packages/types` mirror) · **Status:** Draft for M1

This document defines the entities, their columns, their relationships, and the tenant-isolation rules that apply to all of them. The TypeScript/Zod mirror of these shapes lives in [`packages/types`](codebase-organization.md#packagestypes) and is the contract shared between backend and frontend — see [`integration.md`](integration.md).

---

## 1. Principles

1. **Every tenant-scoped table has a non-null `tenant_id`** referencing `tenants.id`, and an index on `tenant_id`.
2. **Row-Level Security (RLS)** is enabled on every tenant-scoped table. The app sets the current tenant per request (`SET app.tenant_id = ...`), and RLS policies filter `tenant_id = current_setting('app.tenant_id')`. Even a query that forgets its `WHERE` clause returns nothing cross-tenant.
3. **IDs** are UUID v4 (or ULID for time-sortable). No auto-increment integers on tenant-scoped tables (avoids leaking counts across tenants).
4. **Timestamps** — every table has `created_at` and `updated_at` (UTC, `timestamptz`).
5. **Soft delete** where audit matters (`deleted_at timestamptz null`); hard delete only for genuinely transient rows.
6. **Money & durations** — durations in integer seconds; any currency in minor units (paise) as integers.

---

## 2. Entity relationship overview

```
tenants ──1─┬─< phone_numbers            (routing: dialled number → tenant)
            ├─< users                    (admin accounts)
            ├─< staff_contacts           (humans who take escalations)
            ├─< faqs                      (knowledge base Q&A)
            ├─< documents ──1──< document_chunks   (uploaded PDFs → embedded chunks)
            ├─< calls ──1──┬─< transcript_turns
            │              ├─1 ai_responses         (the AI's structured answer)
            │              └─0..1 escalations
            └─< settings   (one row per tenant)
```

`document_chunks.embedding` and (optionally) `faqs.embedding` are `vector` columns (pgvector) used for RAG retrieval.

---

## 3. Tables

### tenants
The root of isolation. One row per college. **Not** tenant-scoped (it *is* the tenant).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | e.g. logical slug stored separately as `slug` |
| slug | text unique | `"abc"` — used in subdomains and storage paths |
| name | text | "ABC College" |
| status | text | `active` / `suspended` / `provisioning` |
| branding | jsonb | logo URL, primary colour, voice prompt prefs |
| feature_flags | jsonb | enabled languages, channels, etc. |
| created_at / updated_at | timestamptz | |

### phone_numbers
Maps a dialled number to a tenant. Read by the Orchestrator on every inbound call.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK → tenants | |
| e164 | text unique | `+919876500000` |
| provider | text | `twilio` |
| label | text | "Main line" |

### users
Admin accounts for the dashboard.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK → tenants | scopes the account |
| email | text | unique **within tenant** (`unique (tenant_id, email)`) |
| password_hash | text | argon2id |
| role | text | `super_admin` / `admin` / `viewer` |
| name | text | |
| last_login_at | timestamptz null | |

> `super_admin` is the platform role that may access the `tenants/` provisioning screens; it is not scoped to a single tenant.

### staff_contacts
Humans who receive escalated calls.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | |
| name / role | text | |
| phone_e164 | text | |
| email | text null | |
| availability | jsonb | on-duty schedule |
| active | boolean | |

### faqs
The tenant's Q&A knowledge base. Multilingual via `language`.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | |
| category | text | one of the issue categories (§5) |
| language | text | `en` / `hi` / `ta` / `te` / `kn` |
| question | text | |
| answer | text | |
| embedding | vector(1536) null | optional; enables semantic FAQ match |
| updated_at | timestamptz | changes take effect on the next call |

### documents
Uploaded source files (PDFs) that get chunked and embedded.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | |
| filename | text | |
| storage_key | text | `tenants/{slug}/documents/{id}.pdf` |
| status | text | `uploading` / `processing` / `ready` / `failed` |
| pages | int null | |
| error | text null | populated when `failed` |

### document_chunks
Embedded slices of a document; the RAG retrieval target.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | denormalised for RLS + fast filter |
| document_id | uuid FK → documents | |
| chunk_index | int | order within the document |
| content | text | the chunk text |
| embedding | vector(1536) | pgvector; `ivfflat`/`hnsw` index, cosine |

### calls
The central record. One row per phone/SMS/WhatsApp session.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | |
| channel | text | `voice` / `sms` / `whatsapp` |
| caller_number | text | E.164 |
| dialled_number | text | resolves to tenant via phone_numbers |
| provider_call_sid | text | Twilio SID |
| language | text | detected/selected language code |
| issue_category | text null | filled after AI classifies (§5) |
| confidence_score | numeric(4,3) null | 0.000–1.000 |
| escalation_flag | boolean | default false |
| status | text | `in_progress` / `resolved` / `pending` / `escalated` |
| follow_up_required | boolean | default false |
| started_at / ended_at | timestamptz | |
| duration_seconds | int null | |
| recording_key | text null | `tenants/{slug}/calls/{id}.wav` |
| summary | text null | AI-generated post-call summary |

### transcript_turns
The conversation, one row per utterance. Alternatively stored as a JSON blob on `calls`; a table makes search/analytics easier.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | |
| call_id | uuid FK → calls | |
| turn_index | int | order |
| role | text | `caller` / `ai` |
| text | text | |
| started_at | timestamptz | |

### ai_responses
The structured output of `POST /ai/answer`, persisted for audit. Mirrors the `AiResponse` type exactly.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | |
| call_id | uuid FK → calls | |
| turn_index | int | which caller turn this answered |
| answer_text | text | |
| confidence_score | numeric(4,3) | |
| issue_category | text | |
| should_escalate | boolean | |
| language | text | |
| model | text | which provider/model produced it |
| retrieved_chunk_ids | uuid[] | provenance for the answer |

### escalations
Created when `should_escalate` is true.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | |
| call_id | uuid FK → calls | |
| reason | text | `low_confidence` / `payment` / `emergency` / `complaint` / `explicit_request` |
| status | text | `open` / `claimed` / `resolved` |
| claimed_by | uuid FK → users null | |
| claimed_at / resolved_at | timestamptz null | |

### settings
One row per tenant with dashboard-configurable options.

| Column | Type | Notes |
|---|---|---|
| tenant_id | uuid PK+FK | one-to-one with tenant |
| enabled_languages | text[] | subset of the five |
| business_hours | jsonb | for human-handoff windows |
| escalation_channel_priority | jsonb | per-category channel order |
| notification_defaults | jsonb | SMS/WhatsApp templates |

---

## 4. The `AiResponse` contract

This shape is produced by the LLM, validated by the backend, persisted to `ai_responses`, and consumed by both the Orchestrator and `web-admin`. It is defined once as a Zod schema in `packages/types`:

```ts
// packages/types/src/ai.ts
import { z } from "zod";

export const LANGUAGES = ["en", "hi", "ta", "te", "kn"] as const;
export const ISSUE_CATEGORIES = [
  "admission", "fees", "hostel", "transport", "placements",
  "scholarships", "office_hours", "fee_payment", "complaint", "general",
] as const;

export const AiResponseSchema = z.object({
  answerText: z.string().min(1),
  confidenceScore: z.number().min(0).max(1),
  issueCategory: z.enum(ISSUE_CATEGORIES),
  shouldEscalate: z.boolean(),
  language: z.enum(LANGUAGES),
});

export type AiResponse = z.infer<typeof AiResponseSchema>;
```

See [`ai-flow.md`](ai-flow.md) for how it is produced and post-checked.

---

## 5. Enumerations (single source of truth)

Defined in `packages/config` and reused everywhere — never hardcode these strings.

- **Languages:** `en`, `hi`, `ta`, `te`, `kn`
- **Issue categories:** `admission`, `fees`, `hostel`, `transport`, `placements`, `scholarships`, `office_hours`, `fee_payment`, `complaint`, `general`
- **Call status:** `in_progress`, `resolved`, `pending`, `escalated`
- **Channel:** `voice`, `sms`, `whatsapp`
- **Escalation reason:** `low_confidence`, `payment`, `emergency`, `complaint`, `explicit_request`
- **User role:** `super_admin`, `admin`, `viewer`

---

## 6. Indexing & retrieval notes

- Every tenant-scoped table: `index (tenant_id)`; hot query tables get composite indexes, e.g. `calls (tenant_id, started_at desc)` for the call-log listing, `escalations (tenant_id, status)` for the queue.
- `document_chunks.embedding`: pgvector HNSW index, cosine distance, filtered by `tenant_id` first.
- Retrieval query pattern: `WHERE tenant_id = $1 ORDER BY embedding <=> $queryVec LIMIT $k`.

---

## 7. Migrations

Migrations live in `infra/migrations` (or Prisma `migrations/`). Rules: forward-only in shared branches, one logical change per migration, RLS policy created in the same migration as the table it protects. Never edit a merged migration — add a new one.
