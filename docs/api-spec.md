# API Spec

Documents the routes as actually implemented in `apps/api-server/src`. All
`POST`/`PATCH` bodies are validated with `zod` — an invalid request returns
`400` with the first validation error message.

## Auth APIs

### POST /auth/register
Dev-only helper to create a User so login can be tested locally. No
admin-invite flow exists yet — lock this down before anything resembling
production.

```json
// request
{ "tenantId": "abc", "email": "vinay@abc.edu", "password": "password123", "role": "admin" }

// 201 response
{ "id": "user-001", "email": "vinay@abc.edu", "role": "admin" }
// 409 if email already exists
```

### POST /auth/login
```json
// request
{ "email": "vinay@abc.edu", "password": "password123" }

// 200 response
{ "token": "<JWT, 12h expiry, contains userId/tenantId/role>" }
// 401 on wrong email or password
```

## Tenant APIs

### GET /tenants
Returns all tenants (no auth yet — see "Open items" below).

### GET /tenants/by-phone/:phoneNumber
Used internally by `POST /telephony/inbound` to resolve which college owns
an inbound call. 404 if no tenant is registered for that number.

### POST /tenants
```json
{ "name": "ABC College", "phoneNumber": "+91-4000000000", "defaultLang": "en" }
```

## Call APIs

### GET /calls
Query params: `tenantId`, `status`, `issueCategory` — all optional, ANDed together.

```json
// 200 response
[
  {
    "id": "call-001",
    "tenantId": "abc",
    "callerNumber": "+91-9876543210",
    "language": "ta",
    "issueCategory": "fees",
    "status": "resolved",
    "escalated": false,
    "createdAt": "2026-07-16T09:15:00.000Z",
    "updatedAt": "2026-07-16T09:15:00.000Z"
  }
]
```

### GET /calls/:id
404 if not found.

### POST /calls
Called by the Voice Orchestrator after a call ends.

```json
// request
{
  "tenantId": "abc",
  "callerNumber": "+91-9876543210",
  "language": "ta",
  "issueCategory": "fees",
  "status": "pending",
  "transcriptText": "..."
}
// 201 response: the created Call record
```

### PATCH /calls/:id/status
Used by the admin UI "Mark as resolved" button.

```json
// request
{ "status": "resolved" }
// 200 response: the updated Call record, 404 if not found
```

### POST /calls/:id/followup
```json
// request
{ "channel": "sms", "scheduledAt": "2026-07-18T09:00:00.000Z" }
// 201 response
{ "id": "fu-001", "callId": "call-001", "tenantId": "abc", "channel": "sms", "status": "pending", "scheduledAt": "..." }
```

## FAQ APIs

### GET /faqs
Query params: `tenantId`, `category`, `language`, `active` (`"true"`/`"false"`).

### POST /faqs
```json
{ "tenantId": "abc", "question": "When do admissions start?", "answer": "...", "category": "admission", "language": "en" }
```

### PATCH /faqs/:id
Partial update, e.g. `{ "active": false }`. 404 if not found.

## Document APIs

### GET /documents
Query params: `tenantId`, `status`.

### POST /documents
```json
{ "tenantId": "abc", "title": "Fee Structure 2026", "fileUrl": "..." }
```
New documents always start with `status: "processing"`.

## AI APIs (stub — real logic owned by Tanishga/Surya)

### POST /ai/answer
```json
// request
{ "transcript": "...", "tenantId": "abc", "language": "ta", "callId": "call-001" }

// response (AiResponse shape — see src/types/ai.ts)
{
  "answerText": "This is a placeholder answer. Real AI integration pending.",
  "confidenceScore": 0.5,
  "issueCategory": "general",
  "shouldEscalate": false,
  "language": "ta"
}
```
Every request/response is logged to the console for debugging (V3.4).

## Telephony APIs

### POST /telephony/inbound
Twilio webhook target. Looks up the tenant by the called number (`req.body.To`)
via `GET /tenants/by-phone/:phoneNumber` internally.

```json
// 200 response, tenant found
{ "received": true, "tenantResolved": true, "tenantId": "abc" }
// 200 response, no tenant registered for that number
{ "received": true, "tenantResolved": false }
```

## Notification APIs

### POST /notifications/followups
```json
{ "callId": "call-001", "channel": "sms" }
// 202 response
{ "callId": "call-001", "channel": "sms", "status": "queued" }
// 404 if callId doesn't exist
```
Doesn't actually send anything yet — logs to console (V3.2).

## Open items — not yet implemented

- **No route is actually protected by `requireAuth` yet.** The middleware
  exists (`src/middleware/auth.ts`) and issues/verifies JWTs, but no router
  currently uses it, so every endpoint above is unauthenticated. This needs
  a decision on which routes are admin-only (probably everything except
  `/health`, `/telephony/inbound`, and `/ai/answer`, which are called by
  non-logged-in systems) before this goes anywhere real.
- No route currently filters by `req.auth.tenantId` — `tenantId` is trusted
  from the request body/query on every route. Once auth is wired in, this
  needs to change so a logged-in admin can only see their own tenant's data
  regardless of what `tenantId` they pass.
