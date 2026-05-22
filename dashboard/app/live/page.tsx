"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useIncidentStore } from "@/lib/store";
import { IncidentCard } from "@/components/dashboard/IncidentCard";
import { IncidentDetail } from "@/components/dashboard/IncidentDetail";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { cn } from "@/lib/utils";
import { Radio, PauseCircle, Filter } from "lucide-react";

const SKELETON_TTL_MS = 3000; // show skeletons for 3s, then fall through to empty state

type Filter = "all" | "critical" | "high" | "block";

// Skeleton loader for metric cards
function MetricSkeleton() {
  return (
    <div className="bg-[#1c1b1d] border border-[#27272A] p-4">
      <div className="skeleton h-3 w-32 rounded-sm mb-3" />
      <div className="skeleton h-8 w-20 rounded-sm mb-4" />
      <div className="skeleton h-8 w-full rounded-sm" />
    </div>
  );
}

// Skeleton for incident card
function IncidentSkeleton() {
  return (
    <div className="bg-[#1c1b1d] border border-[#27272A] border-l-[3px] border-l-[#353437] p-4 space-y-3">
      <div className="flex justify-between">
        <div className="flex gap-2">
          <div className="skeleton h-5 w-16 rounded-sm" />
          <div className="skeleton h-5 w-24 rounded-full" />
          <div className="skeleton h-5 w-16 rounded-sm" />
        </div>
        <div className="skeleton h-4 w-12 rounded-sm" />
      </div>
      <div className="skeleton h-4 w-full rounded-sm" />
      <div className="skeleton h-1 w-full rounded-full" />
      <div className="flex gap-4">
        <div className="skeleton h-3 w-24 rounded-sm" />
        <div className="skeleton h-3 w-20 rounded-sm" />
      </div>
    </div>
  );
}

// Empty state
function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
      <div className="w-16 h-16 rounded-full bg-[#4edea3]/10 flex items-center justify-center">
        <Radio className="w-8 h-8 text-[#4edea3] animate-pulse-emerald" />
      </div>
      <div>
        <h3 className="text-[15px] font-semibold text-[#e5e1e4] mb-1">Listening for threats&hellip;</h3>
        <p className="text-[12px] text-[#86948a] max-w-xs">
          Run an attack simulation or send a request through the gateway to see incidents appear here in real-time.
        </p>
      </div>
      <code className="text-[11px] font-mono bg-[#1c1b1d] border border-[#27272A] px-3 py-2 text-[#4edea3]">
        python attacks/attack_01_direct_injection.py
      </code>
    </div>
  );
}

export default function LiveFeedPage() {
  const incidents       = useIncidentStore((s) => s.incidents);
  const selectedId      = useIncidentStore((s) => s.selectedId);
  const stats           = useIncidentStore((s) => s.stats);
  const autoScroll      = useIncidentStore((s) => s.autoScroll);
  const selectIncident  = useIncidentStore((s) => s.selectIncident);
  const setAutoScroll   = useIncidentStore((s) => s.setAutoScroll);

  const [filter, setFilter]           = useState<Filter>("all");
  const [newIds, setNewIds]           = useState<Set<string>>(new Set());
  // hovering pauses scroll locally — does NOT touch the global store toggle
  const isHovering                    = useRef(false);
  const feedRef                        = useRef<HTMLDivElement>(null);
  const prevLength                     = useRef(0);
  // skeletons only show for SKELETON_TTL_MS; after that show empty state
  const [skeletonExpired, setSkeletonExpired] = useState(false);
  const isLoading                      = incidents.length === 0 && !skeletonExpired;

  // Expire skeleton after TTL so we show the empty state, not infinite shimmer
  useEffect(() => {
    const t = setTimeout(() => setSkeletonExpired(true), SKELETON_TTL_MS);
    return () => clearTimeout(t);
  }, []);

  // Track new incident IDs for pulse animation
  useEffect(() => {
    if (incidents.length > prevLength.current) {
      const added = incidents.slice(0, incidents.length - prevLength.current);
      const ids = new Set(added.map((i) => i.id));
      setNewIds(ids);
      setTimeout(() => setNewIds(new Set()), 3000);
    }
    prevLength.current = incidents.length;
  }, [incidents]);

  // Auto-scroll to top on new incident, unless user is hovering over the feed
  useEffect(() => {
    if (autoScroll && !isHovering.current && feedRef.current && incidents.length > 0) {
      feedRef.current.scrollTop = 0;
    }
  }, [incidents.length, autoScroll]);

  const filtered = incidents.filter((i) => {
    if (filter === "all")      return true;
    if (filter === "critical") return i.severity === "critical";
    if (filter === "high")     return i.severity === "high" || i.severity === "critical";
    if (filter === "block")    return i.verdict === "block";
    return true;
  });

  const selected = incidents.find((i) => i.id === selectedId) ?? null;

  // hover sets a local ref — does NOT toggle the global store state
  const handleMouseEnter = useCallback(() => { isHovering.current = true;  }, []);
  const handleMouseLeave = useCallback(() => { isHovering.current = false; }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#27272A] bg-[#131315] shrink-0">
        <div>
          <h2 className="text-[18px] font-bold text-[#e5e1e4] tracking-tight">Live Feed</h2>
          <p className="text-[11px] text-[#86948a] mt-0.5">Real-time threat detection · WebSocket</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-scroll toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#86948a] uppercase tracking-widest">
              Auto-scroll
            </span>
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={cn(
                "w-8 h-4 rounded-full relative transition-colors duration-200",
                autoScroll ? "bg-[#10b981]" : "bg-[#353437]"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200",
                  autoScroll ? "right-0.5" : "left-0.5"
                )}
              />
            </button>
          </div>

          {!autoScroll && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#adc6ff]">
              <PauseCircle className="w-3.5 h-3.5" />
              Scroll locked
            </div>
          )}
        </div>
      </header>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-0 border-b border-[#27272A] shrink-0">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={cn(i < 3 && "border-r border-[#27272A]")}>
              <MetricSkeleton />
            </div>
          ))
        ) : (
          <>
            <div className="border-r border-[#27272A]">
              <MetricCard
                label="Threats Blocked Today"
                value={stats.blocked_count.toLocaleString()}
                valueClassName="text-[#ffb4ab]"
                sparkline={{ values: [0.4, 0.6, 0.5, 0.8, 0.9, 1.0], color: "bg-[#ffb4ab]" }}
              />
            </div>
            <div className="border-r border-[#27272A]">
              <MetricCard
                label="Requests Inspected"
                value={stats.total_incidents_today.toLocaleString()}
                valueClassName="text-[#e5e1e4]"
                sparkline={{ values: [0.8, 0.7, 0.85, 0.65, 0.75, 0.8], color: "bg-[#4edea3]" }}
              />
            </div>
            <div className="border-r border-[#27272A]">
              <MetricCard
                label="Avg Detection Latency"
                value={`${Math.round(stats.avg_latency_ms)}ms`}
                sub="p50"
                valueClassName="text-[#e5e1e4]"
                sparkline={{ values: [0.4, 0.3, 0.35, 0.45, 0.4, 0.35], color: "bg-[#4edea3]" }}
              />
            </div>
            <div>
              <MetricCard
                label="Active Policies"
                value={Object.keys(stats.attacks_by_type).length || 3}
                sub="Balanced mode"
                valueClassName="text-[#e5e1e4]"
                sparkline={{ values: [1, 1, 1, 1], color: "bg-[#4edea3]" }}
              />
            </div>
          </>
        )}
      </div>

      {/* Main split view */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: incident feed ─────────────────────────────── */}
        <div className="flex flex-col w-[60%] border-r border-[#27272A] overflow-hidden">
          {/* Feed toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#27272A] bg-[#1c1b1d] shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-semibold text-[#e5e1e4]">Recent Incidents</h3>
              <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse-emerald" />
              {incidents.length > 0 && (
                <span className="text-[11px] font-mono text-[#86948a]">
                  ({incidents.length})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Filter className="w-3 h-3 text-[#86948a] mr-1" />
              {(["all", "critical", "high", "block"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-2 py-1 text-[10px] font-bold font-mono uppercase tracking-wider transition-colors",
                    filter === f
                      ? "bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/30"
                      : "text-[#86948a] border border-transparent hover:border-[#27272A] hover:text-[#e5e1e4]"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Feed list */}
          <div
            ref={feedRef}
            className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-grid"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <IncidentSkeleton key={i} />)
            ) : filtered.length === 0 ? (
              <EmptyFeed />
            ) : (
              filtered.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  isSelected={incident.id === selectedId}
                  isNew={newIds.has(incident.id)}
                  onClick={() => selectIncident(incident.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right: detail panel ──────────────────────────────── */}
        <div className="w-[40%] overflow-hidden bg-[#1c1b1d]">
          {selected ? (
            <IncidentDetail
              incident={selected}
              onClose={() => selectIncident(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
              <div className="w-12 h-12 rounded-sm bg-[#201f22] border border-[#27272A] flex items-center justify-center">
                <Radio className="w-5 h-5 text-[#353437]" />
              </div>
              <p className="text-[13px] font-semibold text-[#e5e1e4]">No incident selected</p>
              <p className="text-[12px] text-[#86948a]">Click any incident in the feed to inspect its payload and detector reasoning.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
