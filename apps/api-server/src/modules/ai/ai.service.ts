import {
  AiResponseSchema,
  type AiAnswerRequest,
  type AiResponse,
} from "@campus/types";
import { CONFIDENCE_ESCALATION_THRESHOLD } from "@campus/config";
import { NotFoundError } from "../../lib/errors";
import { getGeminiClient } from "../../lib/gemini";
import { z } from "zod";
import * as repo from "./ai.repository";

// ---------------------------------------------------------------------------
// Internal schema – mirrors @campus/types AiResponseSchema but allows the
// nullable/optional variants that Gemini may return before we normalise.
// ---------------------------------------------------------------------------
const RawAiResponseSchema = z.object({
  answerText: z.string(),
  confidenceScore: z.number(),
  issueCategory: z.string().nullable().optional(),
  shouldEscalate: z.boolean(),
  language: z.string(),
});

// ---------------------------------------------------------------------------
// Pattern-based escalation rules applied *after* the model answers.
// ---------------------------------------------------------------------------
const HIGH_RISK_PATTERNS = [
  /money\s+(was\s+)?deducted/i,
  /payment\s+(failed|issue|problem)/i,
  /emergency|accident|unsafe|danger/i,
  /talk|speak|connect.*human|real person/i,
];

/**
 * Applies hard-coded escalation rules on top of whatever the model decided.
 * Exported so the unit-test suite can exercise it in isolation.
 */
export function applyEscalationRules(
  response: AiResponse,
  transcript: string,
): AiResponse {
  const triggeredByPattern = HIGH_RISK_PATTERNS.some((re) =>
    re.test(transcript),
  );
  const lowConfidence =
    response.confidenceScore < CONFIDENCE_ESCALATION_THRESHOLD;

  if (triggeredByPattern || lowConfidence) {
    return { ...response, shouldEscalate: true };
  }
  return response;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildConversation(
  history: { role: string; text: string }[],
): string {
  return history.map((turn) => `${turn.role}: ${turn.text}`).join("\n");
}

function cleanGeminiResponse(text: string): string {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

function buildPrompt(
  conversation: string,
  transcript: string,
  language: string,
  knowledgeContext: string,
  knowledgeBase: string,
): string {
  return `
You are CampusConnect AI, a multilingual college help desk assistant.

Your responsibilities include helping students with:

- Admissions
- Fees
- Scholarships
- Hostel
- Transport
- Timetable
- Attendance
- Examination
- Faculty
- Campus facilities

Answer politely and professionally.

Conversation History:
${conversation}

Knowledge Base FAQ:
${knowledgeContext}

Relevant Documents:
${knowledgeBase}

Latest Student Question:
${transcript}

Use the conversation history whenever necessary.

Use the FAQ and relevant documents to answer accurately.

Rules:

- Prefer information from the Knowledge Base and Relevant Documents.
- Never invent or guess college policies.
- If the required information is unavailable, set shouldEscalate to true.
- Keep responses concise (under 150 words).
- Be polite and professional.
- Answer in the student's language.

If you are unsure,
set shouldEscalate to true.

Respond ONLY with valid JSON.

Detect the student's language automatically.

Reply in the SAME language as the student.

Return the detected language code.

{
  "answerText": "...",
  "confidenceScore": 0.95,
  "issueCategory": "...",
  "shouldEscalate": false,
  "language": "${language}"
}
`;
}

// ---------------------------------------------------------------------------
// Main service function
// ---------------------------------------------------------------------------
export async function generateAnswer(
  tenantId: string,
  input: AiAnswerRequest,
): Promise<AiResponse> {
  const call = await repo.findCallById(tenantId, input.callId);

  if (!call) {
    throw new NotFoundError("Call not found");
  }

  const { history, faqs, chunks } = await repo.loadAnswerContext(
    tenantId,
    input.callId,
  );

  const conversation = buildConversation(history);

  const knowledgeContext = faqs.length
    ? faqs
        .map(
          (faq: { question: string; answer: string }) =>
            `Question: ${faq.question}\nAnswer: ${faq.answer}`,
        )
        .join("\n\n")
    : "No matching knowledge found.";

  const knowledgeBase = chunks
    .slice(0, 3)
    .map(
      (
        doc: { text: string; document: { title: string } },
        index: number,
      ) => `Document ${index + 1}:\n${doc.text}`,
    )
    .join("\n\n");

  const fallbackResponse: AiResponse = {
    answerText:
      "I'm sorry, I couldn't process your request at the moment. Your query has been marked for human assistance.",
    confidenceScore: 0,
    issueCategory: "general",
    shouldEscalate: true,
    language: input.language,
  };

  try {
    const ai = getGeminiClient();
    if (!ai) {
      // Gemini not configured — return safe fallback
      await repo.persistAnswer({
        tenantId,
        callId: input.callId,
        transcript: input.transcript,
        response: fallbackResponse,
        escalationReason: "Gemini API key not configured",
      });
      return fallbackResponse;
    }

    const prompt = buildPrompt(
      conversation,
      input.transcript,
      input.language,
      knowledgeContext,
      knowledgeBase,
    );

    const geminiResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = geminiResponse.text?.trim();

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    const cleaned = cleanGeminiResponse(text);

    const rawParsed = (() => {
      try {
        return RawAiResponseSchema.parse(JSON.parse(cleaned));
      } catch {
        throw new Error("Invalid JSON returned by Gemini.");
      }
    })();

    // Coerce to strict AiResponse shape expected by the rest of the system
    const parsed: AiResponse = AiResponseSchema.parse({
      ...rawParsed,
      issueCategory: rawParsed.issueCategory ?? "general",
      language: rawParsed.language ?? input.language,
    });

    const finalResponse = applyEscalationRules(parsed, input.transcript);

    await repo.persistAnswer({
      tenantId,
      callId: input.callId,
      transcript: input.transcript,
      response: finalResponse,
      escalationReason:
        finalResponse.shouldEscalate
          ? (finalResponse.issueCategory ?? "AI requested human assistance")
          : undefined,
    });

    return finalResponse;
  } catch (err) {
    console.error("[ai.service] generateAnswer failed:", err);

    try {
      await repo.persistAnswer({
        tenantId,
        callId: input.callId,
        transcript: input.transcript,
        response: fallbackResponse,
        escalationReason: "Gemini failed to generate a response",
      });
    } catch (dbErr) {
      console.error("[ai.service] Failed to persist fallback response:", dbErr);
    }

    return fallbackResponse;
  }
}