"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { Incident, AttackType, Severity, Verdict } from "@/lib/types";
import { ATTACK_TYPE_LABELS, VERDICT_LABELS } from "@/lib/types";
import { SeverityBadge } from "@/components/dashboard/SeverityBadge";
import { VerdictBadge } from "@/components/dashboard/VerdictBadge";
import { AttackTypePill } from "@/components/dashboard/AttackTypePill";
import { ScoreBar } from "@/components/dashboard/ScoreBar";
import { IncidentSheet } from "@/components/dashboard/IncidentSheet";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { Search, Download, ChevronLeft, ChevronRight, SlidersHorizontal, Bot } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 50;

const ATTACK_TYPES: AttackType[] = ["direct_injection", "indirect_injection", "data_exfiltration", "jailbreak", "none"];
const SEVERITIES: Severity[]    = ["critical", "high", "medium", "low", "info"];
const VERDICTS: Verdict[]       = ["block", "sanitize", "allow", "log_only"];

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-[#27272A]">
          {Array.from({ length: 9 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="skeleton h-4 rounded-sm" style={{ width: `${40 + (i * 9 + j) * 7 % 60}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <tr>
      <td colSpan={10} className="py-20 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-sm bg-[#1c1b1d] border border-[#27272A] flex items-center justify-center">
            <Bot className="w-6 h-6 text-[#353437]" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[#e5e1e4] mb-1">No incidents found</p>
            <p className="text-[12px] text-[#86948a] mb-3">
              Try adjusting your filters or run an attack simulation to generate data.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={onReset} className="px-3 py-1.5 border border-[#27272A] text-[12px] text-[#bbcabf] hover:bg-[#1c1b1d] transition-colors">
              Clear filters
            </button>
            <code className="px-3 py-1.5 bg-[#1c1b1d] border border-[#27272A] text-[11px] font-mono text-[#4edea3]">
              python attacks/attack_01_direct_injection.py
            </code>
          </div>
        </div>
      </td>
    </tr>
  );
}

type FilterState = {
  search: string;
  attackTypes: Set<AttackType>;
  severities: Set<Severity>;
  verdicts: Set<Verdict>;
};

function MultiSelect<T extends string>({
  label, options, selected, onToggle, labelMap,
}: {
  label: string;
  options: T[];
  selected: Set<T>;
  onToggle: (v: T) => void;
  labelMap: Record<T, string>;
}) {
  const [open, setOpen] = useState(false);
  const active = selected.size > 0 && selected.size < options.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-[12px] border transition-colors",
          active
            ? "border-[#4edea3]/50 bg-[#4edea3]/5 text-[#4edea3]"
            : "border-[#27272A] bg-[#1c1b1d] text-[#bbcabf] hover:border-[#3c4a42]"
        )}
      >
        {label}
        {active && <span className="ml-1 bg-[#4edea3] text-[#003824] text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{selected.size}</span>}
        <SlidersHorizontal className="w-3 h-3 ml-1" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-[#1c1b1d] border border-[#27272A] z-50 min-w-[160px] shadow-xl">
          {options.map((o) => (
            <label key={o} className="flex items-center gap-2 px-3 py-2 hover:bg-[#2a2a2c] cursor-pointer text-[12px] text-[#bbcabf]">
              <input
                type="checkbox"
                checked={selected.has(o)}
                onChange={() => onToggle(o)}
                className="accent-[#4edea3] w-3 h-3"
              />
              {labelMap[o]}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function IncidentsPage() {
  const [incidents, setIncidents]     = useState<Incident[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(0);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [sheetIncident, setSheetIncident] = useState<Incident | null>(null);
  const [filters, setFilters]         = useState<FilterState>({
    search: "",
    attackTypes: new Set(),
    severities: new Set(),
    verdicts: new Set(),
  });

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.incidents.list({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      setIncidents(data);
      setTotal(data.length < PAGE_SIZE ? page * PAGE_SIZE + data.length : (page + 2) * PAGE_SIZE);
    } catch {
      toast.error("Failed to load incidents");
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  const filtered = incidents.filter((i) => {
    if (filters.search && !i.raw_content.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.attackTypes.size > 0 && !filters.attackTypes.has(i.attack_type)) return false;
    if (filters.severities.size > 0  && !filters.severities.has(i.severity))    return false;
    if (filters.verdicts.size > 0    && !filters.verdicts.has(i.verdict))        return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((i) => i.id)));
  };

  const exportSelected = () => {
    const rows = filtered.filter((i) => selected.has(i.id));
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url;
    a.download = `promptshield-incidents-${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} incident(s)`);
  };

  const resetFilters = () => setFilters({ search: "", attackTypes: new Set(), severities: new Set(), verdicts: new Set() });

  const toggleFilter = <T extends string>(key: keyof FilterState, val: T) => {
    setFilters((f) => {
      const set = new Set(f[key] as Set<T>);
      set.has(val) ? set.delete(val) : set.add(val);
      return { ...f, [key]: set };
    });
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#27272A] shrink-0">
        <div>
          <h2 className="text-[18px] font-bold text-[#e5e1e4] tracking-tight">Incidents</h2>
          <p className="text-[11px] text-[#86948a] mt-0.5">All security events across your agents</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={exportSelected} className="flex items-center gap-1.5 px-3 py-1.5 border border-[#27272A] text-[12px] text-[#bbcabf] hover:bg-[#1c1b1d] transition-colors">
              <Download className="w-3.5 h-3.5" />
              Export {selected.size} selected
            </button>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#86948a]" />
            <input
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search payloads…"
              className="bg-[#1c1b1d] border border-[#27272A] pl-8 pr-3 py-1.5 text-[12px] text-[#e5e1e4] placeholder:text-[#86948a] focus:outline-none focus:border-[#4edea3] w-60 transition-colors"
            />
          </div>
        </div>
      </header>

      {/* Filter bar */}
      <div className="flex items-center gap-2 px-6 py-2.5 border-b border-[#27272A] bg-[#1c1b1d] shrink-0">
        <MultiSelect label="Attack Type" options={ATTACK_TYPES}  selected={filters.attackTypes} onToggle={(v) => toggleFilter("attackTypes", v)} labelMap={ATTACK_TYPE_LABELS as Record<AttackType, string>} />
        <MultiSelect label="Severity"    options={SEVERITIES}     selected={filters.severities}  onToggle={(v) => toggleFilter("severities",  v)} labelMap={Object.fromEntries(SEVERITIES.map((s) => [s, s.charAt(0).toUpperCase() + s.slice(1)])) as Record<Severity, string>} />
        <MultiSelect label="Verdict"     options={VERDICTS}        selected={filters.verdicts}    onToggle={(v) => toggleFilter("verdicts",    v)} labelMap={VERDICT_LABELS as Record<Verdict, string>} />

        <div className="ml-auto flex items-center gap-3 text-[11px] text-[#86948a] font-mono">
          <span><span className="text-[#e5e1e4] font-semibold">{filtered.length}</span> incidents</span>
          {(filters.attackTypes.size > 0 || filters.severities.size > 0 || filters.verdicts.size > 0 || filters.search) && (
            <button onClick={resetFilters} className="text-[#4edea3] hover:underline">Clear all</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 bg-[#1c1b1d] border-b border-[#27272A] z-10">
            <tr className="h-9">
              <th className="pl-4 w-8">
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="accent-[#4edea3] w-3.5 h-3.5" />
              </th>
              {["Time", "Attack Type", "Severity", "Score", "Verdict", "Detector", "Payload Preview", "Latency"].map((h) => (
                <th key={h} className="px-4 text-[10px] font-semibold text-[#86948a] uppercase tracking-widest whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272A]">
            {loading ? (
              <TableSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyState onReset={resetFilters} />
            ) : (
              filtered.map((incident) => (
                <tr
                  key={incident.id}
                  onClick={() => setSheetIncident(incident)}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-[#201f22] group",
                    sheetIncident?.id === incident.id && "bg-[#2a2a2c] border-l-2 border-l-[#4edea3]"
                  )}
                >
                  <td className="pl-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(incident.id)} onChange={() => toggleSelect(incident.id)} className="accent-[#4edea3] w-3.5 h-3.5" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[12px] font-mono text-[#e5e1e4]">{format(new Date(incident.created_at), "HH:mm:ss")}</div>
                    <div className="text-[10px] text-[#86948a]">{formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}</div>
                  </td>
                  <td className="px-4 py-3">
                    <AttackTypePill type={incident.attack_type} />
                  </td>
                  <td className="px-4 py-3">
                    <SeverityBadge severity={incident.severity} />
                  </td>
                  <td className="px-4 py-3 w-32">
                    <ScoreBar score={incident.score} />
                  </td>
                  <td className="px-4 py-3">
                    <VerdictBadge verdict={incident.verdict} />
                  </td>
                  <td className="px-4 py-3 text-[11px] font-mono text-[#86948a] whitespace-nowrap">{incident.detector_name}</td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <p className="text-[12px] font-mono text-[#86948a] truncate">&ldquo;{incident.raw_content.slice(0, 80)}&rdquo;</p>
                  </td>
                  <td className="px-4 py-3 text-[12px] font-mono text-[#86948a] text-right whitespace-nowrap">{incident.latency_ms}ms</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <footer className="h-11 border-t border-[#27272A] px-6 flex items-center justify-between bg-[#1c1b1d] shrink-0">
        <span className="text-[12px] text-[#86948a] font-mono">
          Showing <span className="text-[#e5e1e4]">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)}</span> of <span className="text-[#e5e1e4]">{total}</span>
        </span>
        <div className="flex items-center gap-1">
          <button disabled={page === 0} onClick={() => setPage(page - 1)} className="p-1.5 border border-[#27272A] text-[#86948a] disabled:opacity-30 hover:bg-[#2a2a2c] transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
            <button key={i} onClick={() => setPage(i)} className={cn("w-7 h-7 text-[12px] font-mono border transition-colors", page === i ? "bg-[#4edea3] text-[#003824] border-[#4edea3] font-bold" : "border-[#27272A] text-[#86948a] hover:bg-[#2a2a2c]")}>
              {i + 1}
            </button>
          ))}
          <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="p-1.5 border border-[#27272A] text-[#86948a] disabled:opacity-30 hover:bg-[#2a2a2c] transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Side sheet */}
      {sheetIncident && (
        <IncidentSheet incident={sheetIncident} onClose={() => setSheetIncident(null)} />
      )}
    </div>
  );
}
