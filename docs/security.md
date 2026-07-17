# Security & Hardening (Post-MVP Phase)

> The cybersecurity phase we start **after the MVP is stable**. Audit and harden the system before real colleges' data is in production.
> **Owners:** Tanishqa & Surya (lead), with the whole team · **Status:** Planned (Milestone M6) · Not started until MVP is done.

Security is intentionally a **dedicated phase after MVP**, not a scramble at the end. We build the MVP with secure-by-default habits (below), then run a focused hardening pass. This doc is the plan for that pass, plus the baseline everyone follows in the meantime.

---

## 1. Secure-by-default baseline (follow now, during the MVP)

These are non-negotiable even before the security phase — they're cheaper to build in than to retrofit:

- **Tenant isolation** — `tenantId` on every row + Postgres RLS; a cross-tenant negative test per resource ([`backend-guide.md`](backend-guide.md#3-tenant-scoping--the-rule-that-matters-most), [`test-plan.md`](test-plan.md)).
- **Auth** — JWT with `tenantId` + `role`; short-lived access tokens; the client never sends `tenantId` ([`integration.md`](integration.md#authentication)).
- **Secrets** — only in env, validated at boot, never committed; `.env` gitignored, `.env.example` documents keys.
- **Validation** — Zod at every input boundary; reject bad input, don't coerce.
- **No secret in logs/responses**; recordings via pre-signed URLs; PII not logged at info level.
- **TLS everywhere**; service-to-service calls use a service token.

If it's not in the MVP, the security phase can't fix a design that leaked by default — so hold this line from day one.

---

## 2. The hardening phase — scope

When M0–M5 are done and the MVP is stable, run this pass:

### 2.1 Threat model
Map the attack surface and rank risks. Key assets: tenant data (calls, transcripts, recordings), admin accounts, the Twilio numbers, the LLM keys. Key threats: cross-tenant access, auth bypass, prompt injection via caller speech, toll fraud on telephony, data exfiltration, secret leakage.

### 2.2 Authentication & authorization audit
- Token lifecycle: expiry, refresh, revocation/logout, storage (httpOnly cookie vs memory).
- Role enforcement: every route checks role; `super_admin`-only routes are truly restricted.
- Password handling: argon2id, rate-limited login, no user enumeration on forgot-password.
- Session/brute-force protections.

### 2.3 Tenant-isolation penetration test
- Attempt cross-tenant reads/writes on every endpoint with a valid token for the wrong tenant.
- Try to bypass RLS (missing `WHERE`, forged `X-Tenant-Id` on `/internal`).
- Verify object-storage paths and pre-signed URLs can't be walked across tenants.

### 2.4 Input & AI safety
- **Prompt injection**: a caller/utterance trying to make the AI ignore its instructions, leak the system prompt, or answer out-of-scope → must stay grounded or escalate.
- Injection/XSS on admin inputs (FAQ text, document filenames) rendered in the dashboard.
- File-upload safety: PDF type/size validation, malware consideration, no path traversal on storage keys.

### 2.5 Telephony & abuse
- Twilio webhook signature validation.
- Toll-fraud / abuse limits on outbound calls and messaging.
- Rate limiting and abuse detection on public endpoints (`429` with backoff).

### 2.6 Dependencies & secrets
- `pnpm audit` / SCA on dependencies; patch or pin criticals.
- Secret scanning across the repo history; rotate anything exposed.
- Review CI/CD permissions and infra IAM (least privilege).

### 2.7 Data protection & compliance
- Encryption at rest (DB, object storage) and in transit.
- Retention policy for recordings/transcripts; deletion path.
- PII handling review (Indian data-protection considerations for student data).

---

## 3. Deliverables of the phase

- A written **threat model** and a prioritized findings list (severity-ranked).
- Fixes for all **Blocker/Critical** findings (any cross-tenant or auth-bypass finding is a Blocker — see [`test-plan.md`](test-plan.md#4-bug-reporting)).
- A **security test suite** added to CI (isolation, authz, rate-limit, injection) so regressions are caught automatically — built with Rudra.
- A short **hardening checklist** kept in this doc and re-run before each release.
- `deployment.md` updated with the hardened production configuration.

---

## 4. How the team plugs in

| Member | In the security phase |
|---|---|
| **Tanishqa & Surya** | Lead the phase; own AI-safety (prompt injection) and frontend input safety. |
| **Vinay** | Backend authz, RLS, telephony abuse, secrets, infra IAM. |
| **Don & Ridhesh** | Review the threat model against the architecture; ensure the contract/integration layer has no gaps. |
| **Rudra** | Build the security test suite; run isolation & abuse pen tests. |

---

## 5. Related docs

- [`backend-guide.md`](backend-guide.md) — secure backend standards (tenant scoping, validation, errors).
- [`integration.md`](integration.md) — auth flow and the trust boundaries.
- [`architecture.md`](architecture.md#non-functional-requirements) — security among the non-functional requirements.
- [`test-plan.md`](test-plan.md) — how findings are reported and regression-tested.
