import {
  AiResponseSchema,
  ISSUE_CATEGORIES,
  LANGUAGES,
  type AiAnswerRequest,
  type AiResponse,
} from "@campus/types";
import { CONFIDENCE_ESCALATION_THRESHOLD } from "@campus/config";
import { NotFoundError } from "../../lib/errors";
import { ai } from "../../lib/gemini";
import { z } from "zod";
import * as docs from "./document.repository";
import * as escalationRepo from "./escalation.repository";

function buildConversation(history: { role: string; text: string }[]) {
  return history
    .map(turn => `${turn.role}: ${turn.text}`)
    .join("\n");
}

function cleanGeminiResponse(text: string) {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

const AiResponseSchema = z.object({
  answerText: z.string(),
  confidenceScore: z.number(),
  issueCategory: z.string().nullable().optional(),
  shouldEscalate: z.boolean(),
  language: z.string(),
});

const HIGH_RISK_PATTERNS = [
  /money\s+(was\s+)?deducted/i,
  /payment\s+(failed|issue|problem)/i,
  /emergency|accident|unsafe|danger/i,
  /talk|speak|connect.*human|real person/i,
];

function safeFallback(language: AiAnswerRequest["language"]): AiResponse {
  return {
    answerText:
      "I’m unable to verify that information right now. I’ll escalate this to the college help desk.",
    confidenceScore: 0,
    issueCategory: "general",
    shouldEscalate: true,
    language,
  };
}

function buildPrompt(
  conversation: string,
  transcript: string,
  language: string,
  knowledgeContext: string,
  knowledgeBase: string
) {
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

export async function generateAnswer(
  tenantId: string,
  input: AnswerInput
) {
  const call = await repo.findCallById(
    tenantId,
    input.callId
  );

  if (!call) {
    throw new NotFoundError("Call not found");
  }

  const history = await repo.getConversationHistory(
    tenantId,
    input.callId
  );

  const conversation = buildConversation(history);

  const knowledge = await repo.searchKnowledgeBase(
    tenantId,
    input.transcript
  );

  const knowledgeContext = knowledge.length
    ? knowledge
        .map(
          faq =>
            `Question: ${faq.question}\nAnswer: ${faq.answer}`
        )
        .join("\n\n")
    : "No matching knowledge found.";

  const documents = await docs.searchDocuments(
    tenantId,
    input.transcript
  );

  const knowledgeBase = documents
    .slice(0, 3)
    .map(
      (doc, index) =>
        `Document ${index + 1}:\n${doc.text}`
    )
    .join("\n\n");

  try {
  const prompt = buildPrompt(
    conversation,
    input.transcript,
    input.language,
    knowledgeContext,
    knowledgeBase
  );

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const text = response.text?.trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  const cleaned = cleanGeminiResponse(text);

  const parsed = (() => {
    try {
      return AiResponseSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error("Invalid JSON returned by Gemini.");
    }
  })();

  const nextTurn = await repo.getNextTurnIndex(
    tenantId,
    input.callId
  );

  await repo.saveTranscriptTurn({
    tenantId,
    callId: input.callId,
    turnIndex: nextTurn,
    role: "student",
    text: input.transcript,
  });

  await repo.saveAiResponse({
    tenantId,
    callId: input.callId,
    turnIndex: nextTurn,
    answerText: parsed.answerText,
    confidenceScore: parsed.confidenceScore,
    issueCategory: parsed.issueCategory ?? null,
    shouldEscalate: parsed.shouldEscalate,
    language: parsed.language,
  });

  await repo.saveTranscriptTurn({
    tenantId,
    callId: input.callId,
    turnIndex: nextTurn + 1,
    role: "assistant",
    text: parsed.answerText,
  });

  if (parsed.shouldEscalate) {
    await escalationRepo.createEscalation({
      tenantId,
      callId: input.callId,
      reason:
        parsed.issueCategory ||
        (parsed.confidenceScore < 0.5
          ? "Low AI confidence"
          : "Human assistance requested"),
    });
  }

  return parsed;

} catch (err) {
  console.error(err);

  try {
    const nextTurn = await repo.getNextTurnIndex(
      tenantId,
      input.callId
    );

    await repo.saveTranscriptTurn({
      tenantId,
      callId: input.callId,
      turnIndex: nextTurn,
      role: "student",
      text: input.transcript,
    });

    await repo.saveAiResponse({
      tenantId,
      callId: input.callId,
      turnIndex: nextTurn,
      answerText:
        "I'm sorry, I couldn't process your request at the moment. Your query has been marked for human assistance.",
      confidenceScore: 0,
      issueCategory: "unknown",
      shouldEscalate: true,
      language: input.language,
    });

    await repo.saveTranscriptTurn({
      tenantId,
      callId: input.callId,
      turnIndex: nextTurn + 1,
      role: "assistant",
      text:
        "I'm sorry, I couldn't process your request at the moment. Your query has been marked for human assistance.",
    });

    await escalationRepo.createEscalation({
      tenantId,
      callId: input.callId,
      reason: "Gemini failed to generate a response",
    });

  } catch (dbErr) {
    console.error(dbErr);
  }

  return {
    answerText:
      "I'm sorry, I couldn't process your request at the moment. Your query has been marked for human assistance.",
    confidenceScore: 0,
    issueCategory: "unknown",
    shouldEscalate: true,
    language: input.language,
  };
}
}