import * as repo from "./ai.repository";
import { NotFoundError } from "../../lib/errors";
import { ai } from "../../lib/gemini";
import { z } from "zod";

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

  try {

const prompt = `
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

If you are unsure,
set shouldEscalate to true.

Respond ONLY with valid JSON.

{
  "answerText": "...",
  "confidenceScore": 0.95,
  "issueCategory": "...",
  "shouldEscalate": false,
  "language": "${input.language}"
}

Student question:

${input.transcript}
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

    const saved = await repo.saveAiResponse({
  tenantId,
  callId: input.callId,
  turnIndex: nextTurn, 
  answerText: parsed.answerText,
  confidenceScore: parsed.confidenceScore,
  issueCategory: parsed.issueCategory ?? null,
  shouldEscalate: parsed.shouldEscalate,
  language: parsed.language,
});
 return saved;

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
