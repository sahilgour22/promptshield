"use client";

import { cn } from "@/lib/utils";

type Status = "connected" | "disconnected" | "reconnecting";

interface Props {
  status: Status;
}

const labels: Record<Status, string> = {
  connected:    "LIVE",
  disconnected: "OFFLINE",
  reconnecting: "RECONNECTING",
};

const dotStyles: Record<Status, string> = {
  connected:    "bg-[#4edea3] animate-pulse-emerald",
  disconnected: "bg-[#ffb4ab]",
  reconnecting: "bg-[#adc6ff] animate-pulse",
};

const textStyles: Record<Status, string> = {
  connected:    "text-[#4edea3]",
  disconnected: "text-[#ffb4ab]",
  reconnecting: "text-[#adc6ff]",
};

export function ConnectionIndicator({ status }: Props) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <span className={cn("w-2 h-2 rounded-full shrink-0", dotStyles[status])} />
      <span className={cn("text-[10px] font-bold font-mono tracking-widest", textStyles[status])}>
        {labels[status]}
      </span>
    </div>
  );
}
