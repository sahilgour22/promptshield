// TypeScript types mirroring the gateway Pydantic schemas

export type Direction = "input" | "output";

export type AttackType =
  | "direct_injection"
  | "indirect_injection"
  | "data_exfiltration"
  | "jailbreak"
  | "none";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type Verdict = "block" | "sanitize" | "allow" | "log_only";

export interface Incident {
  id: string;
  created_at: string; // ISO timestamp
  request_id: string;
  direction: Direction;
  attack_type: AttackType;
  severity: Severity;
  score: number;
  verdict: Verdict;
  detector_name: string;
  matched_patterns: Record<string, unknown>;
  raw_content: string;
  sanitized_content: string | null;
  llm_judge_reasoning: string | null;
  latency_ms: number;
  policy_rule_id: string | null;
}

export interface Policy {
  id: string;
  name: string;
  yaml_content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Stats {
  total_incidents_today: number;
  blocked_count: number;
  avg_latency_ms: number;
  attacks_by_type: Partial<Record<AttackType, number>>;
}

// WebSocket message envelope
export type WsMessage =
  | ({ type: "incident" } & Incident)
  | ({ type: "stats" } & Stats)
  | { type: "ping" };

// UI helpers
export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export const ATTACK_TYPE_LABELS: Record<AttackType, string> = {
  direct_injection: "Direct Injection",
  indirect_injection: "Indirect Injection",
  data_exfiltration: "Data Exfiltration",
  jailbreak: "Jailbreak",
  none: "None",
};

export const VERDICT_LABELS: Record<Verdict, string> = {
  block: "Blocked",
  sanitize: "Sanitized",
  allow: "Allowed",
  log_only: "Logged",
};
