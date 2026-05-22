"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Radio, TriangleAlert, Shield, BarChart2, Settings, ExternalLink, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const NAVIGATION = [
  { label: "Live Feed",  href: "/live",      icon: Radio,          description: "Real-time threat feed" },
  { label: "Incidents",  href: "/incidents", icon: TriangleAlert,  description: "All security events" },
  { label: "Policies",   href: "/policies",  icon: Shield,         description: "YAML policy editor" },
  { label: "Analytics",  href: "/analytics", icon: BarChart2,      description: "Charts and metrics" },
  { label: "Settings",   href: "/settings",  icon: Settings,       description: "API keys and integrations" },
];

const ACTIONS = [
  { label: "Run Direct Injection Attack",  description: "python attacks/attack_01_direct_injection.py" },
  { label: "Run Data Exfiltration Attack", description: "python attacks/attack_03_data_exfiltration.py" },
  { label: "Run Jailbreak Attack",         description: "python attacks/attack_04_jailbreak_multiturn.py" },
];

export function CommandPalette() {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState("");
  const router              = useRouter();

  const handleOpen = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setOpen((o) => !o);
    }
    if (e.key === "Escape") setOpen(false);
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleOpen);
    return () => document.removeEventListener("keydown", handleOpen);
  }, [handleOpen]);

  const navigate = (href: string) => { router.push(href); setOpen(false); setQuery(""); };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-[560px] bg-[#1c1b1d] border border-[#27272A] shadow-2xl animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <Command loop>
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#27272A]">
            <Search className="w-4 h-4 text-[#86948a] shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search pages, actions, incidents…"
              className="flex-1 bg-transparent text-[13px] text-[#e5e1e4] placeholder:text-[#86948a] outline-none"
              autoFocus
            />
            <kbd className="text-[10px] font-mono text-[#86948a] border border-[#27272A] px-1.5 py-0.5">ESC</kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-[360px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-[12px] text-[#86948a]">
              No results for &ldquo;{query}&rdquo;
            </Command.Empty>

            <Command.Group heading={<span className="px-2 py-1.5 text-[10px] font-semibold text-[#86948a] uppercase tracking-widest">Navigate</span>}>
              {NAVIGATION.map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.href}
                    value={`${item.label} ${item.description}`}
                    onSelect={() => navigate(item.href)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-sm transition-colors",
                      "aria-selected:bg-[#4edea3]/10 aria-selected:text-[#4edea3]",
                      "data-[selected=true]:bg-[#4edea3]/10",
                      "hover:bg-[#2a2a2c]"
                    )}
                  >
                    <Icon className="w-4 h-4 text-[#86948a] shrink-0" strokeWidth={1.75} />
                    <div className="flex-1">
                      <span className="text-[13px] text-[#e5e1e4]">{item.label}</span>
                      <span className="text-[11px] text-[#86948a] ml-2">{item.description}</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-[#86948a]" />
                  </Command.Item>
                );
              })}
            </Command.Group>

            <div className="h-px bg-[#27272A] my-1" />

            <Command.Group heading={<span className="px-2 py-1.5 text-[10px] font-semibold text-[#86948a] uppercase tracking-widest">Attack Simulations</span>}>
              {ACTIONS.map((action) => (
                <Command.Item
                  key={action.label}
                  value={action.label}
                  onSelect={() => { navigator.clipboard.writeText(action.description); import("sonner").then(({ toast }) => toast.success("Command copied to clipboard")); setOpen(false); }}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-sm hover:bg-[#2a2a2c] aria-selected:bg-[#4edea3]/10"
                >
                  <span className="w-4 h-4 text-[#86948a] shrink-0 flex items-center justify-center text-[12px]">⚡</span>
                  <div className="flex-1">
                    <p className="text-[13px] text-[#e5e1e4]">{action.label}</p>
                    <p className="text-[10px] font-mono text-[#4edea3]">{action.description}</p>
                  </div>
                  <span className="text-[10px] text-[#86948a] border border-[#27272A] px-1.5 py-0.5 font-mono">Copy</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          {/* Footer */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-[#27272A] text-[10px] text-[#86948a] font-mono">
            <span><kbd className="border border-[#27272A] px-1">↑↓</kbd> navigate</span>
            <span><kbd className="border border-[#27272A] px-1">↵</kbd> select</span>
            <span><kbd className="border border-[#27272A] px-1">ESC</kbd> close</span>
            <span className="ml-auto">PromptShield</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
