import * as repo from "./ai.repository";
import { NotFoundError } from "../../lib/errors";

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

  return {
    answerText:
      "This is a placeholder AI response.",
    confidenceScore: 0.95,
    issueCategory: "general",
    shouldEscalate: false,
    language: input.language,
  };
}