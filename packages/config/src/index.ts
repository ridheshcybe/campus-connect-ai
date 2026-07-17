// packages/config/src/index.ts
// Shared, non-secret constants and display labels used across apps.
// Value sets themselves live in @campus/types; labels/thresholds live here.
import type {
  CallStatus,
  EscalationReason,
  IssueCategory,
  Language,
} from "@campus/types";

/** The AI escalates when confidence drops below this. See docs/ai-flow.md. */
export const CONFIDENCE_ESCALATION_THRESHOLD = 0.7;

/** Default page size for list endpoints. */
export const DEFAULT_PAGE_SIZE = 25;

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  ta: "Tamil",
  hi: "Hindi",
  kn: "Kannada",
  te: "Telugu",
};

export const ISSUE_CATEGORY_LABELS: Record<IssueCategory, string> = {
  admission: "Admission",
  fees: "Fees",
  hostel: "Hostel",
  transport: "Transport",
  placements: "Placements",
  scholarships: "Scholarships",
  office_hours: "Office Hours",
  fee_payment: "Fee Payment",
  complaint: "Complaint",
  general: "General",
};

export const CALL_STATUS_LABELS: Record<CallStatus, string> = {
  in_progress: "In progress",
  resolved: "Resolved",
  pending: "Pending",
  escalated: "Escalated",
};

export const ESCALATION_REASON_LABELS: Record<EscalationReason, string> = {
  low_confidence: "Low confidence",
  payment: "Payment issue",
  emergency: "Emergency",
  complaint: "Complaint",
  explicit_request: "Requested a human",
};
