"use client";

import { cn } from "@/lib/utils";
import type { Incident } from "@/lib/types";
import { ATTACK_TYPE_LABELS, VERDICT_LABELS } from "@/lib/types";
import { SeverityBadge } from "./SeverityBadge";
import { ScoreBar } from "./ScoreBar";
import { PayloadDisplay } from "./PayloadDisplay";
import { format } from "date-fns";
import { X, ShieldAlert, ShieldCheck, AlertTriangle, FileText } from "lucide-react";

interface Props {
  incident: Incident;
  onClose: () => void;
}

const verdictIcon: Record<string, React.ReactNode> = {
  block:    <ShieldAlert className="w-10 h-10 text-[#ffb4ab]" />,
  sanitize: <AlertTriangle className="w-10 h-10 text-[#adc6ff]" />,
  allow:    <ShieldCheck className="w-10 h-10 text-[#4edea3]" />,
  log_only: <FileText className="w-10 h-10 text-[#86948a]" />,
};

const verdictBg: Record<string, string> = {
  block:    "border-[#ffb4ab]/20 bg-[#ffb4ab]/5",
  sanitize: "border-[#adc6ff]/20 bg-[#adc6ff]/5",
  allow:    "border-[#4edea3]/20 bg-[#4edea3]/5",
  log_only: "border-[#353437] bg-[#201f22]",
};

const verdictColor: Record<string, string> = {
  block:    "text-[#ffb4ab]",
  sanitize: "text-[#adc6ff]",
  allow:    "text-[#4edea3]",
  log_only: "text-[#86948a]",
};

export function IncidentDetail({ incident, onClose }: Props) {
  const ts = format(new Date(incident.created_at), "MMM dd, HH:mm:ss.SS");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272A] shrink-0">
        <div>
          <p className="text-[10px] font-semibold text-[#86948a] uppercase tracking-widest mb-0.5">Incident Details</p>
          <p className="text-[12px] font-mono font-bold text-[#e5e1e4]">
            {incident.id.slice(0, 8)}&hellip;
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-[#2a2a2c] rounded transition-colors"
        >
          <X className="w-4 h-4 text-[#86948a]" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {[
            ["Timestamp",   ts],
            ["Severity",    <SeverityBadge key="sev" severity={incident.severity} />],
            ["Attack Type", ATTACK_TYPE_LABELS[incident.attack_type]],
            ["Direction",   incident.direction === "input" ? "Ingress (Prompt)" : "Egress (Response)"],
            ["Detector",    incident.detector_name],
            ["Latency",     `${incident.latency_ms}ms`],
          ].map(([k, v]) => (
            <div key={String(k)}>
              <p className="text-[10px] font-semibold text-[#86948a] uppercase tracking-widest mb-1">{k}</p>
              <div className="text-[13px] text-[#e5e1e4] font-mono">{v}</div>
            </div>
          ))}
        </div>

        {/* Verdict banner */}
        <div className={cn("p-5 border flex flex-col items-center gap-2 text-center", verdictBg[incident.verdict])}>
          {verdictIcon[incident.verdict]}
          <h4 className={cn("text-xl font-mono font-bold tracking-tight uppercase", verdictColor[incident.verdict])}>
            {VERDICT_LABELS[incident.verdict]}
          </h4>
          <p className="text-[12px] text-[#bbcabf]">
            {ATTACK_TYPE_LABELS[incident.attack_type]} detected by {incident.detector_name}
          </p>
        </div>

        {/* Score breakdown */}
        <div>
          <p className="text-[10px] font-semibold text-[#86948a] uppercase tracking-widest mb-3">Threat Score</p>
          <ScoreBar score={incident.score} />
        </div>

        {/* Payload */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-[#86948a] uppercase tracking-widest">Raw Payload</p>
            <button
              onClick={() => navigator.clipboard.writeText(incident.raw_content)}
              className="text-[11px] text-[#4edea3] hover:underline font-mono"
            >
              Copy
            </button>
          </div>
          <PayloadDisplay content={incident.raw_content} />
        </div>

        {/* Sanitized output */}
        {incident.sanitized_content && (
          <div>
            <p className="text-[10px] font-semibold text-[#86948a] uppercase tracking-widest mb-2">
              Sanitized Output
            </p>
            <PayloadDisplay content={incident.sanitized_content} />
          </div>
        )}

        {/* LLM reasoning */}
        {incident.llm_judge_reasoning && (
          <div className="bg-[#201f22] border-l-2 border-[#4edea3] p-4">
            <p className="text-[10px] font-semibold text-[#4edea3] uppercase tracking-widest mb-2">
              AI Reasoning
            </p>
            <p className="text-[12px] text-[#bbcabf] italic leading-relaxed">
              &ldquo;{incident.llm_judge_reasoning}&rdquo;
            </p>
          </div>
        )}

        {/* Policy */}
        {incident.policy_rule_id && (
          <div>
            <p className="text-[10px] font-semibold text-[#86948a] uppercase tracking-widest mb-1">Policy Rule</p>
            <span className="text-[12px] font-mono text-[#adc6ff]">{incident.policy_rule_id}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 p-4 border-t border-[#27272A] shrink-0">
        <button className="flex-1 py-2 bg-[#e5e1e4] text-[#131315] text-[12px] font-bold hover:bg-white transition-colors">
          RE-ANALYZE
        </button>
        <button className="flex-1 py-2 border border-[#27272A] text-[#e5e1e4] text-[12px] font-bold hover:bg-[#2a2a2c] transition-colors">
          WHITELIST
        </button>
      </div>
    </div>
  );
}
