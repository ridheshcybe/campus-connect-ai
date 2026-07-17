# Application Flows

> The three end-to-end flows that define the product's behaviour: inbound call, outbound follow-up, and admin dashboard.
> **Owners:** Don & Ridhesh · **Status:** Living · Part of the [Project Blueprint](PROJECT-BLUEPRINT.md) → §4.2. The AI step is detailed in [`ai-flow.md`](ai-flow.md); the API calls in [`api-endpoints.md`](api-endpoints.md).

## Incoming Call Flow

1. **Caller dials the college's Twilio number** — The caller (student, parent, or prospective applicant) dials the dedicated phone number assigned to their college. The call is routed through the PSTN to Twilio.

2. **Twilio triggers the Voice Orchestrator webhook** — Twilio's inbound call webhook fires, sending call metadata (call SID, from number, to number) to the Voice Orchestrator service. Twilio also begins streaming the audio via Media Streams.

3. **Tenant identification** — The Voice Orchestrator looks up the `to` (dialled) number in the `phone_numbers` table to resolve the `tenantId`. Every subsequent operation — AI context retrieval, logging, escalation routing — is scoped to this tenant.

4. **Language selection** — The caller hears an IVR prompt in English and the five supported Indian languages. They can press a key to select a language, or the system can auto-detect the language from the first few seconds of speech using the ASR engine's language identification feature.

5. **Audio streamed to ASR** — The raw audio is streamed chunk-by-chunk to the Speech-to-Text engine (Google Cloud Speech-to-Text or Azure Speech). The ASR returns a real-time transcript with interim and final results. The final transcript captures the complete query.

6. **Transcript sent to `/ai/answer`** — The Voice Orchestrator packages the transcript, detected language, `tenantId`, and call metadata into a request to the backend API's `POST /ai/answer` endpoint.

7. **Backend prepares context and calls the AI layer** — The backend retrieves the tenant's FAQ/document knowledge base and embeds the query. It calls the AI Service with:
   - `transcript` — the caller's spoken query
   - `tenantId` — for scoping RAG retrieval
   - `language` — the detected or selected language
   - `callHistory` — a summary of any previous turns in this call session

8. **AI returns an `AiResponse`** — The AI Service processes the request and returns a structured response:

   ```
   {
     "answerText": "The deadline for fee payment is December 15th.",
     "confidenceScore": 0.94,
     "issueCategory": "fees",
     "shouldEscalate": false,
     "language": "en"
   }
   ```

9. **Non-escalated path — TTS plays the answer** — If `shouldEscalate` is `false`, the `answerText` is sent to the Text-to-Speech engine, which synthesises natural speech in the caller's language. The audio is streamed back through Twilio's Media Streams to the caller.

10. **Escalated path — call transferred to staff** — If `shouldEscalate` is `true`, the Voice Orchestrator plays a brief "connecting you to a staff member" message and warm-transfers the call to a human agent (or places it in an escalation queue for callback). The backend creates an `Escalation` record visible in the admin dashboard.

11. **Backend logs all call data** — Regardless of escalation, the backend persists:
    - A `Call` record (`tenantId`, caller number, call SID, start time, end time, duration, language)
    - The full transcript
    - The `AiResponse` (answer text, confidence, category, escalation flag)
    - A reference to the audio recording stored in object storage (`tenants/{tenantId}/calls/{callId}.wav`)

### Escalation Conditions

The AI sets `shouldEscalate = true` when any of the following conditions are met:

| Condition | Description |
|-----------|-------------|
| **Low confidence** | `confidenceScore < 0.7` — the AI is unsure about the answer or could not retrieve a relevant FAQ chunk. |
| **Payment issues** | The query mentions fee payment failures, refunds, transaction IDs, or banking errors. These require human verification. |
| **Emergency wording** | The caller uses words like "emergency", "urgent", "accident", "medical", "harassment", or "unsafe". |
| **Complaint / angry tone** | Sentiment analysis detects anger, frustration, or the query is categorised as a formal complaint. |
| **Explicit staff request** | The caller directly asks to speak to a human ("talk to someone", "connect me to staff", "I want to speak to the principal"). |

When escalated, the admin dashboard shows the escalation reason prominently so staff know what to expect before picking up.

## Outgoing Follow-up Flow

The **Worker** service is responsible for scheduling and executing outgoing follow-ups. These are triggered either by an admin manually scheduling a callback from the dashboard, or automatically for calls that were marked as `pending` or `followUpRequired = true` by the AI.

1. **Fetch unresolved calls** — The Worker runs on a cron schedule (every 5 minutes by default) and queries the database for calls where `status = 'pending'` or `follow_up_required = true` and that have a scheduled follow-up time in the past.

2. **Choose the communication channel** — The Worker reads the tenant's configuration to determine the preferred channel for this follow-up. The tenant can configure channel priority per issue category (e.g., payment issues always get a phone call, while general queries can go via SMS or WhatsApp).

3. **Call the notifications endpoint** — The Worker calls the backend's `POST /notifications/send` endpoint with the follow-up payload:
   - `tenantId` — to scope templates and sender identity
   - `recipientNumber` — the caller's phone number
   - `channel` — `call`, `sms`, or `whatsapp`
   - `templateName` — a follow-up prompt template (e.g., `"fee_payment_followup"`)
   - `referenceCallId` — the original call being followed up on

4. **Send via provider** — The backend routes the notification through the appropriate Twilio channel:
   - **SMS** — a text message is sent with a short summary and a request to call back or reply.
   - **WhatsApp** — a richer message with optional buttons (e.g., "Call back", "Resolved") is sent via Twilio for WhatsApp.
   - **Phone call** — the Worker places an outbound Twilio call. When answered, the same Voice Orchestrator pipeline runs, but the AI uses a follow-up prompt template (e.g., "Hello, this is CampusConnect AI following up on your query about fee payment. Has your issue been resolved?").

5. **Update follow-up status** — The backend marks the follow-up as `sent`, `completed`, or `rescheduled` based on the outcome. The admin dashboard polls for these updates and refreshes the follow-ups view in real time so staff always see the latest status.

## Admin Dashboard Flow

1. **Admin logs in** — The admin navigates to their college's subdomain (e.g., `abc.campusconnect.app`) and authenticates with email and password. The backend verifies credentials, issues a JWT scoped to the admin's `tenantId`, and redirects to the dashboard.

2. **Dashboard metrics** — The home screen shows a summary of key metrics for the tenant:
   - Total calls today / this week / this month
   - Average call duration
   - Pending escalations count
   - Call volume chart (last 7 days)
   - Top issue categories (pie or bar chart)

3. **Open Call Logs** — The admin clicks the "Call Logs" nav item. A paginated table displays all calls with columns: date/time, caller number, language, issue category, duration, and status (resolved / pending / escalated). The table can be filtered by date range, category, language, and status.

4. **View Call Detail** — The admin clicks a specific call to open the detail view, which shows:
   - **Call metadata** — caller number, dialled number, timestamp, duration, language, category, confidence score, escalation flag
   - **Transcript** — the full conversation transcript, with speaker labels (Caller / AI)
   - **Recording** — an audio player with the call recording (served via pre-signed URL from object storage)
   - **AI Summary** — a brief AI-generated summary of the call's purpose and outcome
   - **Action buttons** — "Mark Resolved", "Mark Unresolved", "Schedule Follow-up"

5. **Mark call as resolved or unresolved** — The admin can toggle the call's resolution status. Resolved calls are excluded from follow-up queries. Unresolved calls trigger a prompt to schedule a follow-up.

6. **Edit FAQ / Documents** — Based on patterns they observe in call transcripts (e.g., the same question being asked repeatedly), the admin navigates to the FAQ/Docs page and can:
   - Add a new Q&A entry
   - Edit an existing entry to improve the AI's answer
   - Upload a PDF document (e.g., a fee structure PDF) which gets processed, chunked, and embedded into the tenant's vector DB
   - Delete outdated entries
   
   Changes take effect immediately — the next call on that topic will use the updated knowledge base.

## Error & Edge Paths

The happy paths above are the norm; these are the cases the system must also handle gracefully. The unifying rule: **the caller never hits a dead end — the fallback is always a human, a retry, or a callback.**

| Situation | Behaviour |
|---|---|
| **ASR can't understand / silence** | The Orchestrator re-prompts ("Sorry, I didn't catch that…") up to N times, then offers a human transfer or callback. |
| **Language not detected** | Fall back to the IVR key-press language menu; default to English if none chosen. |
| **AI low confidence (`< 0.7`)** | `shouldEscalate = true` → warm transfer or callback offer; the call is logged as `escalated`. See [`ai-flow.md`](ai-flow.md#escalation-logic). |
| **LLM / ASR / TTS provider down** | `/ai/answer` returns a safe escalation (or `502`); the Orchestrator plays "connecting you to staff" and transfers. |
| **No staff available / out of business hours** | The AI offers a callback; the Worker schedules an outbound follow-up. |
| **Backend logging call fails mid-call** | The caller experience continues; the Orchestrator retries the `/internal/calls` write with an `Idempotency-Key`, so logging catches up without duplicating. |
| **Caller barge-in (speaks over the AI)** | The Orchestrator stops TTS and switches to listening. |
| **Follow-up recipient unreachable** | The Worker reschedules per the tenant's retry policy, then marks it `rescheduled`/`failed`. |

## Related docs

- [`ai-flow.md`](ai-flow.md) — the detail of steps 6–8 (the AI answer).
- [`architecture.md`](architecture.md) — the components these flows run through.
- [`api-endpoints.md`](api-endpoints.md) — the endpoints each step calls.
- [`integration.md`](integration.md) — how the admin dashboard flow is wired to the backend.
