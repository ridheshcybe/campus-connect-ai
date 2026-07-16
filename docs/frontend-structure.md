# Frontend Structure

## Admin Pages

### Login
The login page presents a tenant-aware authentication form. The admin enters their email and password, and the system verifies credentials via `POST /auth/login`. On success, a JWT containing the admin's `tenantId` and role is stored (httpOnly cookie or localStorage) and the user is redirected to the Dashboard. The page also offers a "Forgot Password" flow and shows the college's branding (logo, colours) scoped to the subdomain.

### Dashboard
The main landing page after login. It displays a summary of key metrics for the tenant: total calls today, pending escalations count, average call duration, and a 7-day call volume chart. A "Recent Calls" widget shows the 5 most recent calls with status badges. Admin can click any metric or call to drill into the Call Logs. The page polls for real-time updates so escalations and live calls appear instantly.

### Call Logs
A paginated, filterable table of all calls for the tenant. Columns: date/time, caller number, language, issue category, duration, and status (resolved / pending / escalated). Admin can filter by date range, category, language, and status. Each row is clickable and navigates to the Call Detail page. A search bar allows searching by caller number. The "Export" button downloads the current filtered view as CSV.

### Call Detail
A full view of a single call. Displays:
- **Call metadata** — caller number, dialled number, timestamp, duration, language, category, AI confidence score, escalation flag.
- **Transcript panel** — a scrollable, speaker-labelled transcript (Caller / AI) with timestamps.
- **Audio player** — an inline player for the call recording, served via a pre-signed URL from object storage.
- **AI summary** — a brief AI-generated summary of the call's purpose and outcome.
- **Actions** — admin can mark the call as resolved or unresolved, toggle the follow-up flag, and navigate to adjacent calls in the log.

### FAQ Manager
A CRUD interface for the tenant's FAQ knowledge base. Admin can browse all FAQs (grouped by category), search by keyword, create new Q&A entries, edit existing ones, and delete outdated entries. Each entry includes a question and answer in multiple languages (admin selects which language variant to edit). Changes take effect immediately — the next call on that topic uses the updated entry.

### Documents
A file management page for uploading and managing college documents (PDFs, fee structures, policy documents). Admin can upload a file, which gets processed server-side: the text is extracted, chunked, embedded, and stored in the tenant's vector DB for RAG retrieval. The page shows upload progress, processing status, and a list of previously uploaded documents with the ability to delete them.

### Settings
A configuration page for tenant-level settings. Admin can update:
- **Branding** — college name, logo, primary colour, voice prompt language preference.
- **Phone numbers** — view the assigned Twilio number and request a new one.
- **Escalation contacts** — the phone numbers/emails of human staff to receive escalated calls.
- **Languages** — enable/disable supported languages for the IVR.
- **Business hours** — the hours during which human handoff is available; outside these hours, the AI handles everything or offers a callback.

### Staff Contacts
A simple directory of human staff members who handle escalations. Admin can add, edit, or remove staff entries (name, role, phone number, email, availability schedule). When a call escalates, the system routes it to an available staff member based on these contacts. The page also shows which staff members are currently on duty.

## web-admin Folder Structure

```
web-admin/src/
  components/
  features/
    dashboard/
    calls/
    faqs/
    documents/
    settings/
    tenants/
  layouts/
  lib/api/
  hooks/
```

### components/
Contains shared, reusable UI primitives that are not tied to any specific feature — buttons, cards, tables, modals, form inputs, dropdowns, loading spinners, and empty states. These are lightweight wrappers often built on top of `packages/ui` components with project-specific styling.

### features/
Each subdirectory under `features/` corresponds to a major feature area of the admin dashboard. A feature folder contains the page component, any feature-specific sub-components, and feature-specific hooks or state. This colocation keeps related code together.

- **dashboard/** — Home page with metric cards, charts, recent calls widget.
- **calls/** — Call Logs table, Call Detail page, transcript viewer, audio player, resolution actions.
- **faqs/** — FAQ Manager page, FAQ editor forms, category groupings, language tabs.
- **documents/** — Documents page, upload widget, file list, processing status indicators.
- **settings/** — Settings page with branding, phone, escalation, and language configuration forms.
- **tenants/** — Super-admin pages for provisioning new tenants (only accessible to platform-level users).

### layouts/
Contains the root layout components that wrap every page: the sidebar navigation, top header bar (with college branding and user avatar), and a main content area. The layout also handles responsive breakpoints (collapsible sidebar on mobile) and loads the tenant's theme (brand colours, logo) from settings.

### lib/api/
A typed API client layer that wraps every backend REST endpoint. Exports functions like `getCalls`, `getCallById`, `updateCallStatus`, `getFaqs`, `createFaq`, `updateFaq`, `deleteFaq`, `getDocuments`, `uploadDocument`, `getSettings`, `updateSettings`, `getStaffContacts`, etc. Each function attaches the JWT (containing `tenantId`) as an `Authorization` header and handles error responses uniformly. This is the only layer that makes HTTP calls — feature code never calls `fetch` directly.

### hooks/
Custom React hooks that bridge `lib/api` with React state. Each feature area typically has a corresponding hook (e.g., `useCalls`, `useCallDetail`, `useFaqs`, `useDocuments`, `useSettings`). Hooks manage loading state, error state, pagination, filtering, and provide memoised data and mutation callbacks to the UI components. This separates data fetching logic from rendering logic.

## Reusable UI Components (packages/ui)

| Component | Description |
|-----------|-------------|
| **StatsCard** | A compact metric card used on the Dashboard — displays a label, a numeric value, an optional trend indicator (up/down), and an icon. Supports loading skeleton state. |
| **CallLogTable** | A feature-rich table for listing calls with sortable columns, multi-field filtering (date, category, language, status), pagination, row selection, and an "Export" button. Each row links to the Call Detail page. |
| **TranscriptViewer** | A scrollable panel that renders a call transcript with speaker labels (Caller / AI), timestamps, and an auto-scroll-to-bottom behaviour during live calls. Supports highlighting of keywords from the search query. |
| **AudioPlayer** | An inline audio player with play/pause, scrubbing, speed control (0.5×–2×), and a waveform visualisation. Loads audio via pre-signed URLs and handles large files gracefully. |
| **FAQEditor** | A form component for creating and editing FAQ entries. Includes fields for question (in multiple languages via language tabs), answer (rich text or plain text), category selector, and a "Save" / "Cancel" footer. |
| **DocumentUploader** | A drag-and-drop file upload widget with progress bar, file type validation (PDF only), and a processing status indicator (uploading → processing → ready / failed). Supports uploading multiple documents in sequence. |
| **StatusBadge** | A small coloured badge that displays a call's status: green for resolved, amber for pending, red for escalated. Also used for escalation reasons (low confidence, payment, emergency, etc.) with colour-coded chips. |

## Frontend ↔ Backend Integration

The `lib/api` directory acts as the sole gateway between the React frontend and the `api-server` backend. It is organised as a collection of typed functions that mirror the backend's REST endpoints:

```typescript
// Example: lib/api/calls.ts
export async function getCalls(params: CallFilterParams): Promise<PaginatedResponse<Call>>;
export async function getCallById(id: string): Promise<CallDetail>;
export async function updateCallStatus(id: string, status: CallStatus): Promise<Call>;
export async function getFaqs(tenantId: string, category?: string): Promise<Faq[]>;
export async function updateFaq(faq: FaqUpdate): Promise<Faq>;
export async function getDocuments(tenantId: string): Promise<Document[]>;
// ...
```

Feature pages never call these functions directly. Instead, they use custom hooks that wrap the API calls with React state management:

- **`useCalls(filters)`** — fetches the paginated call list, re-fetches when filters change, and returns `{ calls, loading, error, totalPages, refetch }`.
- **`useCallDetail(callId)`** — fetches a single call's full data and returns `{ call, loading, error }`.
- **`useFaqs(category?)`** — fetches FAQ entries and provides `createFaq`, `updateFaq`, `deleteFaq` mutation callbacks.
- **`useDocuments()`** — fetches the document list and provides `uploadDocument`, `deleteDocument` mutation callbacks.

For example, the `features/calls/CallLogTable` page imports `useCalls` from `hooks/useCalls`, which internally calls `getCalls` from `lib/api/calls.ts`. The hook manages loading states, pagination, and refetch triggers, and the page component simply renders the data.

**Tenant isolation** is handled automatically: the `lib/api` layer reads the JWT from the auth context and includes it in every request's `Authorization` header. The backend decodes the JWT, extracts the `tenantId`, and scopes all database queries to that tenant. The frontend never manually passes `tenantId` — it's embedded in the token.

All API responses are scoped to the current tenant. An admin from College ABC will only ever see ABC's calls, FAQs, documents, and settings — the backend enforces this at the query level and the RLS policies provide a second layer of defence.
