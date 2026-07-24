import * as repo from "./ai.repository";
import { NotFoundError } from "../../lib/errors";
import { ai } from "../../lib/gemini";
import { z } from "zod";
import * as docs from "./document.repository";
import * as escalationRepo from "./escalation.repository";

const AiResponseSchema = z.object({
  answerText: z.string(),
  confidenceScore: z.number(),
  issueCategory: z.string().nullable().optional(),
  shouldEscalate: z.boolean(),
  language: z.string(),
});

interface AnswerInput {
  transcript: string;
  language: string;
  callId: string;
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

const conversation = history
  .map(turn => `${turn.role}: ${turn.text}`)
  .join("\n");

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
  .map(doc => doc.text)
  .join("\n\n");

  try {

const prompt = `
You are CampusConnect AI, a multilingual AI assistant for a college help desk.

Your goal is to provide accurate, concise, and helpful answers to students.

Responsibilities include:
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

Rules:

- Be polite and professional.
- Answer only what the student asked.
- Never invent college-specific information.
- Prefer the College Knowledge Base over your own knowledge.
- If you are uncertain, set shouldEscalate to true.
- Confidence scores should follow:

1.00 = Exact answer from College Knowledge Base
0.90–0.99 = Very confident
0.70–0.89 = Reasonably confident
0.50–0.69 = Partial information
Below 0.50 = Escalate

Issue categories should be one of:

admissions
fees
scholarships
hostel
transport
timetable
attendance
examination
faculty
campus
technical
general
unknown

Below is the conversation so far.

College Knowledge Base:

${knowledgeContext}

Rules:

1. If the knowledge base contains the answer, ALWAYS use it.
2. Do NOT change facts, numbers, dates, fees or policies from the knowledge base.
3. Only use your general knowledge if the answer is NOT found in the knowledge base.
4. If the knowledge base does not contain enough information, politely say you 
are unsure and set shouldEscalate to true.
5. Never invent college-specific information.

If the conversation history is empty, answer normally.
Otherwise, use it to understand context and follow-up questions.

Knowledge Base:

${knowledgeBase}

Use the above college information whenever it answers the student's question.
If the answer is not present, use general reasoning but set shouldEscalate to
true if you're not confident.

Conversation History:
${conversation}

Latest Student Question:
${input.transcript}

Use the conversation history to answer naturally.
If the latest question refers to something mentioned earlier,
use the previous context instead of treating it as a new conversation.

If you are unsure,
set shouldEscalate to true.

Respond ONLY with valid JSON.

Detect the student's language automatically.

Reply in the SAME language that the student used.

Return the detected language code
(for example: en, hi, ta, te, kn).

{
  "answerText": "...",
  "confidenceScore": 0.95,
  "issueCategory": "...",
  "shouldEscalate": false,
  "language": "detected-language-code"
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text ?? "";

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = AiResponseSchema.parse(JSON.parse(cleaned));

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

await repo.saveTranscriptTurn({
  tenantId,
  callId: input.callId,
  turnIndex: nextTurn + 1,
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
      parsed.issueCategory ??
      "AI confidence too low",
  });
}

return parsed;

if (parsed.shouldEscalate) {
  await escalationRepo.createEscalation({
    tenantId,
    callId: input.callId,
    reason:
      parsed.issueCategory ??
      "AI confidence too low",
  });
}
'v'

return parsed;

  } catch (err) {

    console.error(err);

    return {
      answerText: "Sorry, I'm unable to generate a response right now.",
      confidenceScore: 0,
      issueCategory: "unknown",
      shouldEscalate: true,
      language: input.language,
    };

  }
}
