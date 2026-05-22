"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useIncidentStore } from "@/lib/store";
import { ConnectionIndicator } from "./ConnectionIndicator";
import {
  Radio,
  TriangleAlert,
  Shield,
  BarChart2,
  Settings,
  BookOpen,
  Code2,
} from "lucide-react";

const nav = [
  { href: "/live",      label: "Live Feed",  icon: Radio },
  { href: "/incidents", label: "Incidents",  icon: TriangleAlert },
  { href: "/policies",  label: "Policies",   icon: Shield },
  { href: "/analytics", label: "Analytics",  icon: BarChart2 },
  { href: "/settings",  label: "Settings",   icon: Settings },
];

const resources = [
  { href: "#", label: "Documentation", icon: BookOpen },
  { href: "#", label: "API Reference",  icon: Code2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const status   = useIncidentStore((s) => s.connectionStatus);
  const stats    = useIncidentStore((s) => s.stats);

  return (
    <aside className="w-[240px] h-screen fixed left-0 top-0 bg-[#1c1b1d] border-r border-[#27272A] flex flex-col z-50">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#27272A]">
        <div className="w-8 h-8 bg-[#4edea3] flex items-center justify-center rounded-sm shrink-0">
          <Shield className="w-4 h-4 text-[#003824]" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-[15px] font-bold text-[#e5e1e4] tracking-tight leading-none">
            PromptShield
          </h1>
          <p className="text-[10px] text-[#86948a] mt-0.5">AI Security Gateway</p>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <p className="px-3 pt-1 pb-2 text-[10px] font-semibold text-[#86948a]/50 uppercase tracking-widest">
          Monitor
        </p>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-sm text-[13px] transition-all duration-100 group",
                active
                  ? "bg-[#4edea3]/10 text-[#4edea3] font-semibold"
                  : "text-[#bbcabf] hover:bg-[#201f22] hover:text-[#e5e1e4]"
              )}
            >
              <Icon
                className={cn("w-4 h-4 shrink-0", active ? "text-[#4edea3]" : "text-[#86948a] group-hover:text-[#e5e1e4]")}
                strokeWidth={active ? 2.5 : 1.75}
              />
              {label}
              {label === "Incidents" && stats.total_incidents_today > 0 && (
                <span className="ml-auto text-[10px] font-bold font-mono bg-[#93000a] text-[#ffdad6] px-1.5 py-0.5 rounded-full">
                  {stats.total_incidents_today > 999 ? "999+" : stats.total_incidents_today}
                </span>
              )}
            </Link>
          );
        })}

        <div className="h-px bg-[#27272A] my-3" />

        <p className="px-3 pt-1 pb-2 text-[10px] font-semibold text-[#86948a]/50 uppercase tracking-widest">
          Resources
        </p>
        {resources.map(({ href, label, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-3 px-3 py-2 rounded-sm text-[13px] text-[#86948a] hover:bg-[#201f22] hover:text-[#e5e1e4] transition-all duration-100 group"
          >
            <Icon className="w-4 h-4 shrink-0 group-hover:text-[#e5e1e4]" strokeWidth={1.75} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#27272A] py-3">
        <ConnectionIndicator status={status} />
        <div className="flex items-center gap-2 px-3 mt-1">
          <span className="bg-[#353437] text-[9px] font-bold font-mono text-[#bbcabf] px-1.5 py-0.5 rounded-sm border border-[#3c4a42] uppercase tracking-wider">
            DEV
          </span>
          <span className="text-[11px] text-[#86948a]">localhost:8000</span>
        </div>
      </div>
    </aside>
  );
}
