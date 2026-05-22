"use client";

import { cn } from "@/lib/utils";
import type { Incident } from "@/lib/types";
import { SeverityBadge } from "./SeverityBadge";
import { VerdictBadge } from "./VerdictBadge";
import { AttackTypePill } from "./AttackTypePill";
import { ScoreBar } from "./ScoreBar";
import { formatDistanceToNow } from "date-fns";

interface Props {
  incident: Incident;
  isSelected: boolean;
  isNew?: boolean;
  onClick: () => void;
}

const severityBorder: Record<string, string> = {
  critical: "border-l-[#ffb4ab]",
  high:     "border-l-[#fc7c78]",
  medium:   "border-l-[#adc6ff]",
  low:      "border-l-[#4edea3]",
  info:     "border-l-[#353437]",
};

export function IncidentCard({ incident, isSelected, isNew, onClick }: Props) {
  const timeAgo = formatDistanceToNow(new Date(incident.created_at), { addSuffix: true });

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative border-l-[3px] p-4 cursor-pointer transition-all duration-150",
        "border border-[#27272A] hover:border-[#3c4a42]",
        severityBorder[incident.severity],
        isSelected
          ? "bg-[#2a2a2c]"
          : "bg-[#1c1b1d] hover:bg-[#201f22]",
        isNew && "animate-slide-in"
      )}
    >
      {/* New indicator pulse */}
      {isNew && (
        <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse-emerald" />
      )}

      {/* Row 1: badges + time */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <SeverityBadge severity={incident.severity} />
          <AttackTypePill type={incident.attack_type} />
          <VerdictBadge verdict={incident.verdict} />
        </div>
        <span className="text-[11px] text-[#86948a] font-mono shrink-0">{timeAgo}</span>
      </div>

      {/* Row 2: payload preview */}
      <p className="text-[12px] font-mono text-[#bbcabf] line-clamp-1 mb-3">
        &ldquo;{incident.raw_content.slice(0, 120)}&rdquo;
      </p>

      {/* Row 3: score bar + meta */}
      <ScoreBar score={incident.score} className="mb-2" />

      <div className="flex items-center gap-4 text-[11px] font-mono">
        <span className="text-[#86948a]">
          DETECTOR <span className="text-[#bbcabf] font-semibold">{incident.detector_name}</span>
        </span>
        <span className="text-[#86948a]">
          LATENCY <span className="text-[#bbcabf] font-semibold">{incident.latency_ms}ms</span>
        </span>
      </div>
    </div>
  );
}
