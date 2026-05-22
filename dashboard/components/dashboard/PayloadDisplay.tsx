import { cn } from "@/lib/utils";

interface Props {
  content: string;
  matchedPatterns?: Record<string, unknown>;
  className?: string;
}

export function PayloadDisplay({ content, className }: Props) {
  const preview = content.slice(0, 1200);

  return (
    <div
      className={cn(
        "bg-[#0e0e10] border border-[#27272A] p-4 font-mono text-[12px] text-[#e5e1e4]/90 whitespace-pre-wrap leading-relaxed rounded-sm overflow-auto max-h-48",
        className
      )}
    >
      {preview}
      {content.length > 1200 && (
        <span className="text-[#86948a]">… ({content.length - 1200} chars truncated)</span>
      )}
    </div>
  );
}
