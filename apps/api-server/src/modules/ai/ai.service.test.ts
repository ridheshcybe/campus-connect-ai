import { describe, expect, it } from "vitest";
import type { AiResponse } from "@campus/types";
import { applyEscalationRules } from "./ai.service";

const confidentAnswer: AiResponse = {
  answerText: "Admissions open in August.",
  confidenceScore: 0.92,
  issueCategory: "admission",
  shouldEscalate: false,
  language: "en",
};

describe("AI escalation rules", () => {
  it("keeps a grounded, high-confidence answer automated", () => {
    expect(applyEscalationRules(confidentAnswer, "When do admissions open?").shouldEscalate).toBe(
      false,
    );
  });

  it("escalates low-confidence responses", () => {
    const result = applyEscalationRules(
      { ...confidentAnswer, confidenceScore: 0.4 },
      "When do admissions open?",
    );
    expect(result.shouldEscalate).toBe(true);
  });

  it("escalates payment problems regardless of model confidence", () => {
    const result = applyEscalationRules(confidentAnswer, "My money was deducted twice");
    expect(result.shouldEscalate).toBe(true);
  });
});
