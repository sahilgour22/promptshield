import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/types";

interface Props {
  severity: Severity;
  className?: string;
}

const styles: Record<Severity, string> = {
  critical: "bg-[#93000a] text-[#ffdad6] border-[#ffb4ab]/30",
  high:     "bg-[#fc7c78]/20 text-[#fc7c78] border-[#fc7c78]/30",
  medium:   "bg-[#adc6ff]/10 text-[#adc6ff] border-[#adc6ff]/30",
  low:      "bg-[#353437] text-[#bbcabf] border-[#3c4a42]",
  info:     "bg-[#201f22] text-[#86948a] border-[#27272A]",
};

const labels: Record<Severity, string> = {
  critical: "CRITICAL",
  high:     "HIGH",
  medium:   "MEDIUM",
  low:      "LOW",
  info:     "INFO",
};

export function SeverityBadge({ severity, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold border font-mono tracking-wider rounded-sm",
        styles[severity],
        className
      )}
    >
      {labels[severity]}
    </span>
  );
}
