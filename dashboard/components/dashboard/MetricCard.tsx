import { cn } from "@/lib/utils";

interface Sparkline {
  values: number[]; // relative heights 0–1
  color: string;    // tailwind bg class
}

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  valueClassName?: string;
  sparkline?: Sparkline;
  className?: string;
}

export function MetricCard({ label, value, sub, valueClassName, sparkline, className }: Props) {
  return (
    <div
      className={cn(
        "bg-[#1c1b1d] border border-[#27272A] p-4 flex flex-col gap-1 hover:border-[#3c4a42] transition-colors duration-200",
        className
      )}
    >
      <p className="text-[11px] font-semibold text-[#bbcabf]/60 uppercase tracking-widest font-sans">
        {label}
      </p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className={cn("text-2xl font-mono font-bold leading-none", valueClassName)}>
          {value}
        </span>
        {sub && (
          <span className="text-[11px] text-[#bbcabf] font-mono">{sub}</span>
        )}
      </div>
      {sparkline && (
        <div className="mt-3 h-8 flex items-end gap-px">
          {sparkline.values.map((v, i) => (
            <div
              key={i}
              className={cn("flex-1 min-h-[2px] rounded-sm", sparkline.color)}
              style={{ height: `${Math.max(v * 100, 2)}%`, opacity: i === sparkline.values.length - 1 ? 1 : 0.3 + (i / sparkline.values.length) * 0.7 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
