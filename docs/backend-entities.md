# Backend Entities

These are the core data records the backend stores and serves. Every
tenant-owned table/collection carries a `tenantId` so data from one college
never mixes with another's (see "Multi-tenant SaaS Model" in `architecture.md`).

## Call
A single phone call between a student/parent and the AI (or staff).

| Field         | Type      | Notes                                              |
|---------------|-----------|-----------------------------------------------------|
| id            | string    | UUID, primary key                                   |
| tenantId      | string    | which college this call belongs to                  |
| callerNumber  | string    | phone number of the caller                          |
| language      | string    | "en" \| "hi" \| "ta" \| "kn" \| "te"                |
| issueCategory | string    | "admission" \| "fees" \| "hostel" \| "transport" \| "placements" \| "scholarships" \| "complaint" |
| status        | string    | "pending" \| "resolved" \| "escalated"              |
| escalated     | boolean   | true if handed off to a human                       |
| transcriptText| string    | optional — full transcript text (see Transcript)    |
| createdAt     | string    | ISO timestamp                                        |
| updatedAt     | string    | ISO timestamp                                        |

Implemented in `apps/api-server/src/db.ts` (`Call` interface) and
`apps/api-server/src/calls/index.ts`.

## Transcript
The text of what was said during a call. Currently stored inline on the Call
record as `transcriptText`; broken out here as its own concept in case it
needs its own collection later (e.g. per-turn segments with speaker/timestamp).

| Field    | Type   | Notes                                  |
|----------|--------|------------------------------------------|
| id       | string | UUID, primary key                        |
| callId   | string | which Call this belongs to               |
| text     | string | full transcript text                     |
| segments | array  | optional per-turn breakdown (speaker, text, timestamp) |

## Recording
Reference to the stored audio file for a call. Not yet implemented in code —
no object storage integration exists yet.

| Field    | Type   | Notes                                            |
|----------|--------|------------------------------------------------------|
| id       | string | UUID, primary key                                  |
| callId   | string | which Call this belongs to                         |
| url      | string | e.g. `tenants/{tenantId}/calls/{callId}.wav`       |
| duration | number | seconds                                             |

## FAQ
A question/answer entry used by the AI to answer calls.

| Field     | Type    | Notes                                  |
|-----------|---------|-------------------------------------------|
| id        | string  | UUID, primary key                         |
| tenantId  | string  | which college owns this FAQ               |
| question  | string  |                                            |
| answer    | string  |                                            |
| category  | string  | same category values as Call.issueCategory |
| language  | string  | "en" \| "hi" \| "ta" \| "kn" \| "te"      |
| active    | boolean | inactive FAQs are excluded from retrieval  |
| createdAt | string  | ISO timestamp                              |

Implemented in `apps/api-server/src/db.ts` (`Faq` interface) and
`apps/api-server/src/faqs/index.ts`.

## Document
An uploaded reference file (PDF, etc.) the AI can retrieve from.

| Field      | Type   | Notes                                    |
|------------|--------|------------------------------------------|
| id         | string | UUID, primary key                             |
| tenantId   | string |                                                |
| title      | string |                                                |
| fileUrl    | string | object storage path                           |
| status     | string | "processing" \| "ready" \| "failed"          |
| uploadedAt | string | ISO timestamp                                  |

Implemented as `DocumentRecord` in `apps/api-server/src/db.ts` (named
`DocumentRecord`, not `Document`, to avoid colliding with the built-in DOM
`Document` type) and `apps/api-server/src/documents/index.ts`.

## Tenant
A subscribing college.

| Field       | Type   | Notes                                  |
|-------------|--------|--------------------------------------------|
| id          | string | UUID, primary key — this is the `tenantId` used everywhere else |
| name        | string | e.g. "ABC College"                         |
| phoneNumber | string | the dedicated Twilio number for this tenant — used by `telephony/index.ts` to resolve inbound calls |
| defaultLang | string | default language if not detected            |

Implemented in `apps/api-server/src/db.ts` and `apps/api-server/src/tenants/index.ts`.

## User
An admin staff account.

| Field     | Type   | Notes                          |
|-----------|--------|------------------------------------|
| id        | string | UUID, primary key                  |
| tenantId  | string | which college this admin belongs to |
| email     | string |                                     |
| passwordHash | string | bcrypt hash, never the raw password |
| role      | string | "admin" \| "staff"                 |

Implemented in `apps/api-server/src/db.ts` and `apps/api-server/src/auth/index.ts`
(`POST /auth/register`, `POST /auth/login`).

## FollowUp
A scheduled outbound contact after an unresolved/escalated call.

| Field     | Type   | Notes                                    |
|-----------|--------|-------------------------------------------|
| id        | string | UUID, primary key                        |
| callId    | string | which Call this follow-up is for          |
| tenantId  | string |                                            |
| channel   | string | "sms" \| "whatsapp" \| "call"             |
| status    | string | "pending" \| "sent" \| "failed"           |
| scheduledAt | string | ISO timestamp                           |

Implemented in `apps/api-server/src/db.ts` and created via
`POST /calls/:id/followup` in `apps/api-server/src/calls/index.ts`.
