import { cn } from "@/lib/utils";

interface Props {
  score: number; // 0–1
  className?: string;
}

function scoreColor(score: number): string {
  if (score >= 0.85) return "bg-[#ffb4ab]";
  if (score >= 0.65) return "bg-[#fc7c78]";
  if (score >= 0.45) return "bg-[#adc6ff]";
  return "bg-[#4edea3]";
}

export function ScoreBar({ score, className }: Props) {
  const pct = Math.round(score * 100);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-1 bg-[#353437] rounded-full overflow-hidden">
        <div
          className={cn("h-full score-bar-fill", scoreColor(score))}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-mono font-bold text-[#bbcabf] w-8 text-right">
        {score.toFixed(2)}
      </span>
    </div>
  );
}
