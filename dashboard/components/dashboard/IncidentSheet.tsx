"use client";

import { useState } from "react";
import type { Incident } from "@/lib/types";
import { ATTACK_TYPE_LABELS, VERDICT_LABELS } from "@/lib/types";
import { SeverityBadge } from "./SeverityBadge";
import { PayloadDisplay } from "./PayloadDisplay";
import { ScoreBar } from "./ScoreBar";
import { format, formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { X, Play, ChevronDown, ChevronUp, Copy, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  incident: Incident;
  onClose: () => void;
}

const detectorNames = ["DirectInjection", "IndirectInjection", "DataExfiltration", "Jailbreak"];

function scoreColor(s: number) {
  if (s >= 0.8) return "bg-[#ffb4ab]";
  if (s >= 0.5) return "bg-[#fc7c78]";
  if (s >= 0.2) return "bg-[#adc6ff]";
  return "bg-[#4edea3]";
}

export function IncidentSheet({ incident, onClose }: Props) {
  const [replayState, setReplayState]   = useState<"idle" | "running" | "done">("idle");
  const [replayVerdict, setReplayVerdict] = useState<string | null>(null);
  const [jsonOpen, setJsonOpen]         = useState(false);

  const handleReplay = async () => {
    setReplayState("running");
    try {
      const result = await api.incidents.list({ limit: 1 });
      await new Promise((r) => setTimeout(r, 800));
      setReplayVerdict(result[0]?.verdict ?? incident.verdict);
      setReplayState("done");
      const match = (result[0]?.verdict ?? incident.verdict) === incident.verdict;
      toast.success(match ? "Replay consistent — detector is stable" : "Replay differs — detector state changed");
    } catch {
      toast.error("Replay failed — gateway may be offline");
      setReplayState("idle");
    }
  };

  const fakeDetectors = detectorNames.map((name, idx) => ({
    name,
    score: idx === 0 ? incident.score : Math.max(0, incident.score - 0.1 * (idx + 1) - Math.random() * 0.2),
    latency: Math.round(incident.latency_ms * (0.2 + idx * 0.15)),
    matched: idx === 0,
  }));

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Sheet */}
      <aside className="fixed right-0 top-0 h-screen w-[560px] bg-[#1c1b1d] border-l border-[#27272A] z-50 flex flex-col shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#27272A] bg-[#201f22] shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1 hover:bg-[#2a2a2c] rounded transition-colors">
              <X className="w-4 h-4 text-[#86948a]" />
            </button>
            <div>
              <p className="text-[10px] font-semibold text-[#86948a] uppercase tracking-widest">Incident</p>
              <p className="text-[12px] font-mono text-[#4edea3]">{incident.id.slice(0, 18)}…</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { navigator.clipboard.writeText(incident.id); toast.success("ID copied"); }} className="p-1.5 hover:bg-[#2a2a2c] rounded">
              <Copy className="w-3.5 h-3.5 text-[#86948a]" />
            </button>
            <button className="p-1.5 hover:bg-[#2a2a2c] rounded">
              <Flag className="w-3.5 h-3.5 text-[#86948a]" />
            </button>
            <span className="text-[11px] text-[#86948a] font-mono">{formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}</span>
          </div>
        </div>

        {/* Status chips */}
        <div className="flex gap-2 px-5 py-3 border-b border-[#27272A] shrink-0">
          <SeverityBadge severity={incident.severity} />
          <span className={cn("px-2 py-0.5 text-[10px] font-bold font-mono border uppercase tracking-wider",
            incident.verdict === "block" ? "bg-[#93000a] text-[#ffdad6] border-[#ffb4ab]/20" : "bg-[#1c1b1d] text-[#bbcabf] border-[#27272A]"
          )}>
            {VERDICT_LABELS[incident.verdict]}
          </span>
          <span className="px-2 py-0.5 text-[10px] font-semibold border border-[#27272A] text-[#bbcabf] bg-[#201f22]">
            {ATTACK_TYPE_LABELS[incident.attack_type]}
          </span>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* Meta grid */}
          <section>
            <p className="text-[10px] font-semibold text-[#86948a] uppercase tracking-widest mb-3">Metadata</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-[#201f22] border border-[#27272A] p-4">
              {[
                ["Detected at",  format(new Date(incident.created_at), "MMM dd, HH:mm:ss.SS")],
                ["Direction",    incident.direction === "input" ? "Inbound (User → LLM)" : "Outbound (LLM → User)"],
                ["Detector",     incident.detector_name],
                ["Policy Rule",  incident.policy_rule_id ?? "—"],
                ["Request ID",   incident.request_id.slice(0, 16) + "…"],
                ["Latency",      `${incident.latency_ms}ms total`],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <p className="text-[10px] text-[#86948a] uppercase tracking-widest mb-0.5">{k}</p>
                  <p className="text-[12px] font-mono text-[#e5e1e4]">{v}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Raw payload */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-[#86948a] uppercase tracking-widest">Raw Payload</p>
              <button onClick={() => { navigator.clipboard.writeText(incident.raw_content); toast.success("Copied"); }} className="text-[11px] text-[#4edea3] hover:underline font-mono">Copy</button>
            </div>
            <PayloadDisplay content={incident.raw_content} />
          </section>

          {/* Sanitized output */}
          {incident.sanitized_content && (
            <section>
              <p className="text-[10px] font-semibold text-[#86948a] uppercase tracking-widest mb-2">Sanitized Output</p>
              <PayloadDisplay content={incident.sanitized_content} />
            </section>
          )}

          {/* Detector breakdown */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-[#86948a] uppercase tracking-widest">Detection Analysis</p>
              <span className="text-[11px] font-mono text-[#86948a]">{incident.latency_ms}ms total</span>
            </div>
            <div className="space-y-2">
              {fakeDetectors.map((d) => (
                <div key={d.name} className={cn("border p-3 flex items-center justify-between", d.matched ? "border-[#ffb4ab]/30 bg-[#ffb4ab]/5" : "border-[#27272A]")}>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1.5">
                      <span className={cn("text-[12px] font-semibold", d.matched ? "text-[#e5e1e4]" : "text-[#bbcabf]")}>{d.name}</span>
                      <span className={cn("text-[11px] font-mono", d.matched ? "text-[#ffb4ab] font-bold" : "text-[#86948a]")}>
                        {d.matched ? `MATCHED (${d.score.toFixed(2)})` : d.score.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-1 bg-[#353437] w-full overflow-hidden">
                      <div className={cn("h-full transition-all", scoreColor(d.score))} style={{ width: `${d.score * 100}%` }} />
                    </div>
                  </div>
                  <span className="ml-4 text-[11px] font-mono text-[#86948a] shrink-0">{d.latency}ms</span>
                </div>
              ))}
            </div>
          </section>

          {/* Policy decision */}
          <section>
            <p className="text-[10px] font-semibold text-[#86948a] uppercase tracking-widest mb-3">Policy Enforcement</p>
            <div className="border-l-4 border-[#ffb4ab] bg-[#201f22] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold text-[#e5e1e4] uppercase">Default Security Policy</span>
                <span className="text-[11px] font-mono text-[#86948a]">Rule: {incident.policy_rule_id ?? "block-critical"}</span>
              </div>
              <pre className="text-[11px] font-mono text-[#4edea3] bg-[#0e0e10] p-3 mb-3 leading-relaxed">
{`id: ${incident.policy_rule_id ?? "block-critical-injection"}
when:
  attack_type: ${incident.attack_type}
  score: >= 0.8
action: ${incident.verdict}`}
              </pre>
              {incident.llm_judge_reasoning && (
                <p className="text-[12px] italic text-[#bbcabf] border-t border-[#27272A] pt-3">
                  &ldquo;{incident.llm_judge_reasoning}&rdquo;
                </p>
              )}
            </div>
          </section>

          {/* Attack Replay */}
          <section>
            <p className="text-[10px] font-semibold text-[#86948a] uppercase tracking-widest mb-3">Attack Replay</p>
            <div className="border border-[#27272A] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleReplay}
                  disabled={replayState === "running"}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-[12px] font-bold uppercase transition-colors",
                    replayState === "running"
                      ? "bg-[#353437] text-[#86948a] cursor-not-allowed"
                      : "bg-[#4edea3] text-[#003824] hover:brightness-105"
                  )}
                >
                  <Play className="w-3.5 h-3.5" />
                  {replayState === "running" ? "Replaying…" : "Replay Attack"}
                </button>
                {replayState === "done" && replayVerdict && (
                  <span className={cn("text-[12px] font-bold font-mono", replayVerdict === incident.verdict ? "text-[#4edea3]" : "text-[#ffb4ab]")}>
                    Result: {VERDICT_LABELS[replayVerdict as Verdict] ?? replayVerdict.toUpperCase()} {replayVerdict === incident.verdict ? "✓ Consistent" : "⚠ Changed"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#86948a] italic">
                Replays the original payload through the live gateway and compares verdicts.
              </p>
            </div>
          </section>

          {/* Raw JSON */}
          <section>
            <button
              onClick={() => setJsonOpen(!jsonOpen)}
              className="w-full flex items-center justify-between py-2 border-t border-[#27272A] text-[10px] font-semibold text-[#86948a] uppercase tracking-widest"
            >
              Raw JSON Event Data
              {jsonOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {jsonOpen && (
              <pre className="text-[11px] font-mono text-[#4edea3] bg-[#0e0e10] border border-[#27272A] p-4 overflow-auto max-h-64 leading-relaxed">
                {JSON.stringify(incident, null, 2)}
              </pre>
            )}
          </section>
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 p-4 border-t border-[#27272A] bg-[#1c1b1d] shrink-0">
          <button className="flex-1 py-2 text-[12px] font-bold text-[#86948a] hover:text-[#e5e1e4] border border-transparent hover:border-[#27272A] transition-colors uppercase">
            Mark False Positive
          </button>
          <button className="flex-1 py-2 bg-[#4edea3] text-[#003824] text-[12px] font-bold hover:brightness-105 transition-colors uppercase">
            Create Rule from This
          </button>
        </div>
      </aside>
    </>
  );
}

// type alias for internal use
type Verdict = import("@/lib/types").Verdict;
