import { cn } from "@/lib/utils";
import type { Verdict } from "@/lib/types";
import { VERDICT_LABELS } from "@/lib/types";

interface Props {
  verdict: Verdict;
  className?: string;
}

const styles: Record<Verdict, string> = {
  block:    "bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/30",
  sanitize: "bg-[#adc6ff]/10 text-[#adc6ff] border-[#adc6ff]/30",
  allow:    "bg-[#353437] text-[#bbcabf] border-[#3c4a42]",
  log_only: "bg-[#201f22] text-[#86948a] border-[#27272A]",
};

export function VerdictBadge({ verdict, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold border font-mono tracking-wider rounded-sm",
        styles[verdict],
        className
      )}
    >
      {VERDICT_LABELS[verdict].toUpperCase()}
    </span>
  );
}
