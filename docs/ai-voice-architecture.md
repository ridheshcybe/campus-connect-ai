# AI & Voice Architecture

> Tanishqa & Surya's guide. The voice pipeline (Speech-to-Text → AI response generation → Text-to-Speech), AI development & training, prompts, and multilingual support.
> **Owners:** Tanishqa & Surya · **Status:** Living · The endpoint/contract design is in [`ai-flow.md`](ai-flow.md) (Don & Ridhesh); you own the *content and quality* behind it.

You own what the AI **says** and how it **sounds** in five languages. The backend ([`backend-development.md`](backend-development.md)) hosts the endpoints; you own the prompts, the models, the voice quality, and the multilingual behaviour.

---

## 1. The voice pipeline

```
 Caller audio ─► ASR (Speech-to-Text) ─► transcript
                                           │
                                           ▼
                    AI response generation (RAG + LLM)  ──► AiResponse
                                           │
                                           ▼
                     TTS (Text-to-Speech) ─► spoken answer ─► Caller
```

Three stages, each language-aware. The Voice Orchestrator (Vinay) moves audio between them; you own the quality of each stage.

### 1.1 Speech-to-Text (ASR)
- Engine: Google Cloud Speech-to-Text or Azure Speech (pluggable — choose per language quality/cost).
- Requirements: streaming/partial results, phone-quality (8kHz) robustness, per-language models, and language identification for auto-detect.
- Tune: silence/end-of-speech thresholds (with Vinay), and handle code-mixing (e.g. English words inside a Tamil sentence — common on campus).
- Output: a final transcript + detected `language` handed to the AI stage.

### 1.2 AI response generation
This is the heart of your work — see §2. Produces a validated `AiResponse`.

### 1.3 Text-to-Speech (TTS)
- Engine: Google Cloud TTS or Azure TTS. Pick a natural voice per language.
- Requirements: correct pronunciation per language, sensible pacing for phone, and low time-to-first-audio (stream it).
- Handle barge-in: TTS must be interruptible when the caller starts speaking.

---

## 2. AI development & training

The AI does three jobs: **classify** the query, **retrieve** grounding, and **generate** a grounded answer + escalation decision — returned as a structured `AiResponse`.

### 2.1 Prompts (`packages/prompts`)
You own this package. Keep prompts out of app code so you can iterate freely. It contains templates for:
- **Intent/category classifier** — maps the query to one of the issue categories.
- **RAG response generator** — answers grounded in retrieved FAQ/document chunks, in the caller's language.
- **Escalation classifier** — the rules that set `shouldEscalate` (reinforced by a deterministic backend post-check).
- **Follow-up initiator** — the outbound follow-up opener.

Each template is parameterised by `language` and `issueCategory`. Version prompts and note what changed and why.

### 2.2 The `AiResponse` contract
Everything you produce must fit the one shared shape (defined in [`data-model.md`](data-model.md#4-the-airesponse-contract)):

```json
{ "answerText": "…", "confidenceScore": 0.94, "issueCategory": "fees", "shouldEscalate": false, "language": "ta" }
```

The LLM must return **strict JSON** matching it. The backend validates and, on failure, repairs once then falls back to a safe escalation — so malformed output never reaches a caller, but it *does* hurt quality. Make the JSON contract explicit and few-shot it in the prompt.

### 2.3 RAG grounding
- Answers must be grounded in the tenant's FAQ/document chunks (retrieved via pgvector). **No relevant chunk → escalate**, don't invent.
- Work with Vinay on chunking size, embedding model, and top-k so retrieval quality is good. Keep the embedding model consistent between indexing and querying.
- Include retrieved-chunk provenance so answers are auditable.

### 2.4 Escalation quality
The rules (low confidence < 0.7, payment, emergency, complaint, explicit request) live in [`ai-flow.md`](ai-flow.md#escalation-logic). Your job: make the model detect them reliably across languages (e.g. an angry Tamil sentence, a Hindi request for a human). Build a labelled fixture set per trigger per language and tune against it with Rudra.

### 2.5 Provider choice
The code is provider-agnostic via `LLMProvider` (Claude / GPT-4 / Gemini). Evaluate providers on: multilingual quality (esp. Kannada & Telugu), JSON reliability, latency, and cost. Recommend a default in the [blueprint decision table](PROJECT-BLUEPRINT.md#6-technology-decisions); it can differ per tenant.

---

## 3. Multilingual support

**Supported languages: English (`en`), Tamil (`ta`), Hindi (`hi`), Kannada (`kn`), Telugu (`te`).**

For **each** language, own the full chain:

| Stage | What to provide per language |
|---|---|
| ASR | A model/config that transcribes it well on phone audio; handle code-mixing with English. |
| Detection | Reliable language identification (or IVR key-press fallback). |
| Prompts | Category, RAG, and escalation prompts that work in that language; the answer must come back **in the caller's language**. |
| TTS | A natural voice with correct pronunciation and pacing. |
| Test set | A fixture of real-sounding utterances per category per language (share with Rudra, [`test-plan.md`](test-plan.md#23-ai--voice-pipeline--with-tanishqa--surya)). |

**Rules**
- Language codes come from `packages/config` — never hardcode the strings.
- Default to English if detection is uncertain, but always offer the language menu.
- Keep an eye on transliteration/script issues (e.g. Kannada/Telugu scripts, romanized input).

---

## 4. How your work plugs into the system

- The Orchestrator (Vinay) streams audio to ASR and speaks TTS; you configure/own those engines' behaviour.
- `POST /ai/answer` (Vinay builds the endpoint) calls your prompts via `LLMProvider`; you own the prompts and model choice.
- You never call the DB or write endpoints — you provide the AI content; the backend hosts and persists it. Seam detail: [`TEAM-ROLES.md`](TEAM-ROLES.md#6-the-seams-where-two-roles-meet).

---

## 5. Definition of done (AI/voice)

- [ ] Prompt/model change is versioned in `packages/prompts` with a note on what/why.
- [ ] Output validates against `AiResponse` (strict JSON) in tests.
- [ ] Works across all five languages for the affected category; answer returns in the caller's language.
- [ ] Escalation triggers fire correctly (validated against the fixture set with Rudra).
- [ ] RAG answers are grounded (no relevant chunk → escalate, no hallucination).
- [ ] Latency within the voice budget ([`architecture.md`](architecture.md#non-functional-requirements)).

---

## 6. Related docs

- [`ai-flow.md`](ai-flow.md) — the endpoint pipeline, provider abstraction, failure handling (the contract you fill).
- [`data-model.md`](data-model.md) — `AiResponse`, `document_chunks`, enums.
- [`app-flows.md`](app-flows.md) — where voice sits in the full call flow.
- [`test-plan.md`](test-plan.md) — how the AI/voice is validated.
