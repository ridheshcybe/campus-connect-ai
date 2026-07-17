// packages/types/src/enums.ts
// The single source of truth for the domain's closed value sets.
// Never hardcode these strings elsewhere — import from here (labels live in @campus/config).

export const LANGUAGES = ["en", "ta", "hi", "kn", "te"] as const;
export type Language = (typeof LANGUAGES)[number];

export const ISSUE_CATEGORIES = [
  "admission",
  "fees",
  "hostel",
  "transport",
  "placements",
  "scholarships",
  "office_hours",
  "fee_payment",
  "complaint",
  "general",
] as const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const CALL_STATUSES = ["in_progress", "resolved", "pending", "escalated"] as const;
export type CallStatus = (typeof CALL_STATUSES)[number];

export const CHANNELS = ["voice", "sms", "whatsapp"] as const;
export type Channel = (typeof CHANNELS)[number];

export const ESCALATION_REASONS = [
  "low_confidence",
  "payment",
  "emergency",
  "complaint",
  "explicit_request",
] as const;
export type EscalationReason = (typeof ESCALATION_REASONS)[number];

export const USER_ROLES = ["super_admin", "admin", "viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];
