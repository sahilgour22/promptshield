import { cn } from "@/lib/utils";
import type { AttackType } from "@/lib/types";
import { ATTACK_TYPE_LABELS } from "@/lib/types";

interface Props {
  type: AttackType;
  className?: string;
}

const styles: Record<AttackType, string> = {
  direct_injection:   "text-[#ffb4ab] bg-[#93000a]/40 border-[#ffb4ab]/20",
  indirect_injection: "text-[#fc7c78] bg-[#fc7c78]/10 border-[#fc7c78]/20",
  data_exfiltration:  "text-[#adc6ff] bg-[#0566d9]/20 border-[#adc6ff]/20",
  jailbreak:          "text-[#ffb3af] bg-[#fc7c78]/10 border-[#ffb3af]/20",
  none:               "text-[#86948a] bg-[#201f22] border-[#27272A]",
};

export function AttackTypePill({ type, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[11px] font-semibold border rounded-full",
        styles[type],
        className
      )}
    >
      {ATTACK_TYPE_LABELS[type]}
    </span>
  );
}
