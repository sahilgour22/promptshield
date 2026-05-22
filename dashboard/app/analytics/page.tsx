"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart,
} from "recharts";
import { useIncidentStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Incident } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Globe, RefreshCw } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Range = "24h" | "7d" | "30d";

// ── Time helpers ──────────────────────────────────────────────────────────────

function getRangeStart(range: Range): Date {
  const ms = range === "24h" ? 24 : range === "7d" ? 7 * 24 : 30 * 24;
  return new Date(Date.now() - ms * 60 * 60 * 1000);
}

function getBucketKey(date: Date, range: Range): string {
  if (range === "24h") return `${date.getHours().toString().padStart(2, "0")}:00`;
  if (range === "7d")  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][date.getDay()];
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function buildTimeBuckets(range: Range): string[] {
  const now = new Date();
  if (range === "24h") {
    return Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);
  }
  const days = range === "7d" ? 7 : 30;
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now.getTime() - (days - 1 - i) * 86_400_000);
    return getBucketKey(d, range);
  });
}

// ── Derived data builders ─────────────────────────────────────────────────────

type AttackBucket = {
  time: string;
  injections: number;
  exfiltration: number;
  jailbreak: number;
  indirect: number;
  total: number;
};

function buildTimeData(incidents: Incident[], range: Range): AttackBucket[] {
  const buckets = buildTimeBuckets(range);
  const zero = () => ({ injections: 0, exfiltration: 0, jailbreak: 0, indirect: 0, total: 0 });
  const map: Record<string, ReturnType<typeof zero>> = {};
  for (const b of buckets) map[b] = zero();

  for (const inc of incidents) {
    if (inc.attack_type === "none") continue;
    const key = getBucketKey(new Date(inc.created_at), range);
    if (!map[key]) continue;
    map[key].total++;
    if (inc.attack_type === "direct_injection")   map[key].injections++;
    if (inc.attack_type === "data_exfiltration")  map[key].exfiltration++;
    if (inc.attack_type === "jailbreak")           map[key].jailbreak++;
    if (inc.attack_type === "indirect_injection")  map[key].indirect++;
  }

  return buckets.map(b => ({ time: b, ...map[b] }));
}

type VerdictSlice = { name: string; value: number; pct: number; color: string };

const VERDICT_COLORS: Record<string, string> = {
  block:     "#ffb4ab",
  sanitize:  "#adc6ff",
  allow:     "#4edea3",
  log_only:  "#86948a",
};
const VERDICT_LABELS: Record<string, string> = {
  block: "Blocked", sanitize: "Sanitized", allow: "Allowed", log_only: "Logged",
};

function buildVerdictData(incidents: Incident[]): VerdictSlice[] {
  const counts: Record<string, number> = {};
  for (const inc of incidents) {
    counts[inc.verdict] = (counts[inc.verdict] ?? 0) + 1;
  }
  const total = incidents.length || 1;
  return Object.entries(counts).map(([v, n]) => ({
    name: VERDICT_LABELS[v] ?? v,
    value: n,
    pct: Math.round((n / total) * 100),
    color: VERDICT_COLORS[v] ?? "#86948a",
  }));
}

type SeverityBar = { name: string; count: number };

const SEVERITY_ORDER = ["critical","high","medium","low","info"];
const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ffb4ab",
  high:     "#fc7c78",
  medium:   "#ffd970",
  low:      "#adc6ff",
  info:     "#86948a",
};

function buildSeverityData(incidents: Incident[]): SeverityBar[] {
  const counts: Record<string, number> = {};
  for (const inc of incidents) {
    counts[inc.severity] = (counts[inc.severity] ?? 0) + 1;
  }
  return SEVERITY_ORDER
    .filter(s => counts[s])
    .map(s => ({ name: s.charAt(0).toUpperCase() + s.slice(1), count: counts[s] }));
}

type LatencyBucket = { time: string; avg: number; max: number };

function buildLatencyData(incidents: Incident[], range: Range): LatencyBucket[] {
  const buckets = buildTimeBuckets(range);
  const bucketLats: Record<string, number[]> = {};
  for (const b of buckets) bucketLats[b] = [];

  for (const inc of incidents) {
    if (!inc.latency_ms) continue;
    const key = getBucketKey(new Date(inc.created_at), range);
    if (bucketLats[key]) bucketLats[key].push(inc.latency_ms);
  }

  return buckets.map(b => {
    const lats = bucketLats[b];
    if (!lats.length) return { time: b, avg: 0, max: 0 };
    return {
      time: b,
      avg: Math.round(lats.reduce((a, x) => a + x, 0) / lats.length),
      max: Math.max(...lats),
    };
  });
}

function computePercentile(sorted: number[], pct: number): number {
  if (!sorted.length) return 0;
  const i = Math.floor(sorted.length * pct / 100);
  return sorted[Math.min(i, sorted.length - 1)];
}

// ── Static data (geographic — clearly labeled as synthetic) ───────────────────

const ATTACK_ORIGINS = [
  { lat: 37.77,  lon: -122.42, count: 45, city: "San Francisco" },
  { lat: 51.51,  lon: -0.13,   count: 32, city: "London"        },
  { lat: 35.68,  lon: 139.65,  count: 28, city: "Tokyo"         },
  { lat: 55.76,  lon: 37.62,   count: 21, city: "Moscow"        },
  { lat: -23.55, lon: -46.63,  count: 18, city: "São Paulo"     },
  { lat: 28.61,  lon: 77.21,   count: 14, city: "New Delhi"     },
  { lat: 1.35,   lon: 103.82,  count: 11, city: "Singapore"     },
  { lat: 48.86,  lon: 2.35,    count: 9,  city: "Paris"         },
];

function toMapPct(lat: number, lon: number) {
  return { x: ((lon + 180) / 360) * 100, y: ((90 - lat) / 180) * 100 };
}

// Static benchmark accuracy (from benchmark/results/report.md — these are fixed numbers)
const ACCURACY_DATA = [
  { detector: "Direct Injection",   precision: 0.97, recall: 0.88 },
  { detector: "Data Exfiltration",  precision: 1.00, recall: 0.90 },
  { detector: "Indirect Injection", precision: 0.94, recall: 0.76 },
  { detector: "Jailbreak",          precision: 0.96, recall: 0.73 },
];

// ── Constants ─────────────────────────────────────────────────────────────────

const C = {
  primary: "#4edea3",
  danger:  "#ffb4ab",
  warning: "#fc7c78",
  info:    "#adc6ff",
  muted:   "#86948a",
  border:  "#27272A",
};

const tooltipStyle = {
  backgroundColor: "#201f22",
  border: `1px solid ${C.border}`,
  borderRadius: "2px",
  fontSize: "11px",
  fontFamily: "'JetBrains Mono', monospace",
  color: "#e5e1e4",
};

const CONTINENT_PATHS = [
  "M170,52 L200,50 L225,58 L255,55 L278,76 L292,96 L282,116 L297,132 L286,157 L266,176 L240,196 L215,212 L196,228 L176,257 L155,268 L135,247 L114,212 L91,181 L80,150 L85,124 L100,100 L122,80 L146,65 Z",
  "M375,42 L415,30 L452,42 L467,66 L461,93 L430,109 L395,106 L370,85 Z",
  "M176,258 L208,236 L237,231 L264,242 L278,270 L277,312 L266,360 L250,397 L220,427 L191,430 L171,411 L159,378 L154,335 L158,296 L153,269 Z",
  "M448,94 L466,73 L491,68 L516,74 L540,81 L549,101 L540,119 L556,131 L540,149 L514,163 L491,166 L471,156 L452,140 L446,120 Z",
  "M456,88 L464,78 L472,81 L470,101 L461,106 L452,98 Z",
  "M440,161 L469,149 L509,153 L551,159 L576,183 L579,225 L569,276 L555,326 L534,369 L514,396 L491,403 L467,399 L444,373 L432,332 L430,285 L437,239 L428,196 Z",
  "M549,91 L586,69 L646,59 L712,56 L770,63 L822,69 L867,86 L883,111 L876,141 L849,166 L818,181 L790,196 L760,213 L730,236 L698,253 L662,263 L628,263 L592,253 L568,239 L560,216 L552,189 L542,162 L548,131 L542,109 Z",
  "M882,126 L893,116 L904,119 L906,136 L895,146 L882,141 Z",
  "M698,253 L712,268 L705,295 L690,310 L678,295 L682,268 Z",
  "M720,295 L762,280 L790,285 L795,300 L770,312 L735,310 Z",
  "M720,309 L763,281 L816,283 L858,306 L867,337 L853,366 L822,383 L780,389 L745,376 L718,356 L706,331 Z",
  "M877,348 L885,338 L893,342 L890,358 L881,364 L873,357 Z",
  "M0,480 Q250,468 500,474 Q750,468 1000,480 L1000,500 L0,500 Z",
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionCard({ title, children, action }: {
  title: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="bg-[#1c1b1d] border border-[#27272A] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272A]">
        <p className="text-[11px] font-semibold text-[#86948a] uppercase tracking-widest">{title}</p>
        {action}
      </div>
      <div className="flex-1 p-4">{children}</div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[120px] gap-2 text-[#86948a]">
      <span className="text-2xl">📭</span>
      <span className="text-[11px] font-mono">{label}</span>
    </div>
  );
}

function WorldMap() {
  return (
    <div className="relative w-full overflow-hidden bg-[#0a0f0c]" style={{ paddingTop: "50%" }}>
      <svg viewBox="0 0 1000 500" className="absolute inset-0 w-full h-full" style={{ display: "block" }}>
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(39,39,42,0.4)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="1000" height="500" fill="url(#grid)" />
        {CONTINENT_PATHS.map((d, i) => (
          <path key={i} d={d} fill="#1e3028" stroke="#2d4a38" strokeWidth="1" />
        ))}
        <line x1="0" y1="250" x2="1000" y2="250" stroke="rgba(78,222,163,0.12)" strokeWidth="0.8" strokeDasharray="6 4" />
        <line x1="500" y1="0" x2="500" y2="500" stroke="rgba(78,222,163,0.08)" strokeWidth="0.8" strokeDasharray="6 4" />
        {ATTACK_ORIGINS.map((o) => {
          const { x, y } = toMapPct(o.lat, o.lon);
          const r = Math.max(4, Math.min(12, o.count / 5));
          const cx = x * 10; const cy = y * 5;
          return (
            <g key={o.city}>
              <circle cx={cx} cy={cy} r={r * 2.2} fill="none" stroke="#ffb4ab" strokeWidth="0.8" opacity="0.25" />
              <circle cx={cx} cy={cy} r={r * 1.4} fill="none" stroke="#ffb4ab" strokeWidth="0.8" opacity="0.45" />
              <circle cx={cx} cy={cy} r={r} fill="#ffb4ab" opacity="0.85" />
              <text x={cx + r + 3} y={cy + 3} fontSize="7" fill="#86948a" fontFamily="JetBrains Mono, monospace">{o.city}</text>
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-2 left-2 bg-[#131315]/90 border border-[#27272A] px-2 py-1 text-[9px] font-mono text-[#86948a] flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#ffb4ab] inline-block" />
        attack origin (synthetic)
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [range, setRange]           = useState<Range>("24h");
  const [fetched, setFetched]       = useState<Incident[]>([]);
  const [loading, setLoading]       = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Live incidents from WebSocket store
  const storeIncidents = useIncidentStore((s) => s.incidents);
  const stats          = useIncidentStore((s) => s.stats);

  // Fetch historical incidents for the selected range
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch a generous batch; the backend doesn't support date filtering so we filter client-side
      const limit = range === "24h" ? 500 : 1000;
      const data = await api.incidents.list({ limit });
      setFetched(data);
      setLastRefresh(new Date());
    } catch {
      // silently keep previous data
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  // Merge fetched + live store, deduplicate by id, filter to range
  const allIncidents = useMemo<Incident[]>(() => {
    const rangeStart = getRangeStart(range);
    const map = new Map<string, Incident>();
    for (const inc of [...fetched, ...storeIncidents]) map.set(inc.id, inc);
    return Array.from(map.values())
      .filter(inc => new Date(inc.created_at) >= rangeStart)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [fetched, storeIncidents, range]);

  // ── Derived chart data ───────────────────────────────────────────────────────
  const timeData     = useMemo(() => buildTimeData(allIncidents, range),     [allIncidents, range]);
  const verdictData  = useMemo(() => buildVerdictData(allIncidents),          [allIncidents]);
  const severityData = useMemo(() => buildSeverityData(allIncidents),         [allIncidents]);
  const latencyData  = useMemo(() => buildLatencyData(allIncidents, range),   [allIncidents, range]);

  const latencyPercentiles = useMemo(() => {
    const sorted = allIncidents.map(i => i.latency_ms).filter(Boolean).sort((a, b) => a - b);
    return {
      p50: computePercentile(sorted, 50),
      p95: computePercentile(sorted, 95),
      p99: computePercentile(sorted, 99),
    };
  }, [allIncidents]);

  const attacksByType = Object.entries(stats.attacks_by_type).map(
    ([k, v]) => ({ name: k.replace(/_/g, " "), value: v }),
  );

  const hasData = allIncidents.length > 0;

  const RangeToggle = () => (
    <div className="flex bg-[#201f22] border border-[#27272A] p-0.5">
      {(["24h", "7d", "30d"] as Range[]).map((r) => (
        <button
          key={r}
          onClick={() => setRange(r)}
          className={cn(
            "px-2.5 py-1 text-[10px] font-bold font-mono uppercase transition-colors",
            range === r ? "bg-[#4edea3] text-[#003824]" : "text-[#86948a] hover:text-[#e5e1e4]",
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#27272A] shrink-0">
        <div>
          <h2 className="text-[18px] font-bold text-[#e5e1e4] tracking-tight">Analytics</h2>
          <p className="text-[11px] text-[#86948a] mt-0.5">
            {loading
              ? "Loading..."
              : `${allIncidents.length} incidents · last updated ${lastRefresh.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[#27272A] text-[#86948a] hover:text-[#e5e1e4] text-[10px] font-mono transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
            Refresh
          </button>
          <RangeToggle />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* Row 1: Attacks over time */}
        <SectionCard
          title="Attacks Over Time"
          action={
            <span className="text-[9px] font-mono text-[#4edea3]">
              {allIncidents.filter(i => i.attack_type !== "none").length} attacks
            </span>
          }
        >
          {hasData ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timeData}>
                <defs>
                  <linearGradient id="injGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.danger} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.danger} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="exfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.info} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.info} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="time" stroke={C.muted} tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} interval={range === "24h" ? 3 : range === "7d" ? 0 : 4} />
                <YAxis stroke={C.muted} tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="injections"   name="Direct Inj."   stroke={C.danger}   fill="url(#injGrad)" strokeWidth={1.5} dot={false} />
                <Area type="monotone" dataKey="exfiltration" name="Exfiltration"   stroke={C.info}     fill="url(#exfGrad)" strokeWidth={1.5} dot={false} />
                <Area type="monotone" dataKey="jailbreak"    name="Jailbreak"      stroke={C.warning}  fill="none"          strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                <Area type="monotone" dataKey="indirect"     name="Indirect Inj."  stroke={C.muted}    fill="none"          strokeWidth={1.5} dot={false} strokeDasharray="2 3" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState label={loading ? "Fetching incidents..." : "No incidents in this range"} />
          )}
        </SectionCard>

        {/* Row 2: Verdict donut + Severity breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <SectionCard title="Verdict Distribution">
            {verdictData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={verdictData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" strokeWidth={0}>
                      {verdictData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name, props) => [`${(props.payload as VerdictSlice).pct}% (${value})`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {verdictData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        <span className="text-[#bbcabf]">{d.name}</span>
                      </div>
                      <span className="font-mono font-bold text-[#e5e1e4]">{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState label={loading ? "Loading..." : "No data yet"} />
            )}
          </SectionCard>

          <SectionCard title="Attacks by Severity">
            {severityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={severityData} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                  <XAxis type="number" stroke={C.muted} tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke={C.muted} tick={{ fontSize: 11, fontFamily: "Inter", fill: "#bbcabf" }} width={70} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Incidents" radius={[0, 2, 2, 0]} maxBarSize={16}>
                    {severityData.map((entry, i) => (
                      <Cell key={i} fill={SEVERITY_COLORS[entry.name.toLowerCase()] ?? C.muted} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label={loading ? "Loading..." : "No incidents yet"} />
            )}
          </SectionCard>
        </div>

        {/* Row 3: Detection latency */}
        <SectionCard
          title="Detection Latency (ms)"
          action={
            <div className="flex gap-3 text-[10px] font-mono text-[#86948a]">
              <span>p50 <span className="text-[#4edea3] font-bold">{latencyPercentiles.p50}ms</span></span>
              <span>p95 <span className="text-[#adc6ff] font-bold">{latencyPercentiles.p95}ms</span></span>
              <span>p99 <span className="text-[#ffb4ab] font-bold">{latencyPercentiles.p99}ms</span></span>
            </div>
          }
        >
          {hasData ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="time" stroke={C.muted} tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} interval={range === "24h" ? 3 : range === "7d" ? 0 : 4} />
                <YAxis stroke={C.muted} tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} unit="ms" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="avg" name="avg ms"  stroke={C.primary} strokeWidth={2}   dot={false} connectNulls />
                <Line type="monotone" dataKey="max" name="max ms"  stroke={C.danger}  strokeWidth={1.5} dot={false} connectNulls strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState label={loading ? "Loading..." : "No latency data yet"} />
          )}
          <div className="flex gap-4 mt-2 text-[10px] font-mono text-[#86948a]">
            <span><span className="text-[#4edea3]">──</span> avg</span>
            <span><span className="text-[#ffb4ab]">╌╌</span> max</span>
          </div>
        </SectionCard>

        {/* Row 4: Benchmark accuracy + world map */}
        <div className="grid grid-cols-2 gap-4">
          <SectionCard
            title="Detector Accuracy (Benchmark)"
            action={<span className="text-[9px] font-mono text-[#86948a]">benchmark/results/report.md</span>}
          >
            <div className="space-y-4">
              {ACCURACY_DATA.map((d) => (
                <div key={d.detector}>
                  <div className="flex justify-between mb-1.5 text-[12px]">
                    <span className="text-[#bbcabf]">{d.detector}</span>
                    <span className="font-mono text-[#86948a]">
                      P:{(d.precision * 100).toFixed(0)}% R:{(d.recall * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-14 text-[9px] font-mono text-[#4edea3]">Precision</span>
                      <div className="flex-1 bg-[#27272A] h-1.5 rounded-sm overflow-hidden">
                        <div className="h-full bg-[#4edea3] rounded-sm" style={{ width: `${d.precision * 100}%` }} />
                      </div>
                      <span className="w-8 text-[9px] font-mono text-[#4edea3] text-right">{(d.precision * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-14 text-[9px] font-mono text-[#adc6ff]">Recall</span>
                      <div className="flex-1 bg-[#27272A] h-1.5 rounded-sm overflow-hidden">
                        <div className="h-full bg-[#adc6ff] rounded-sm" style={{ width: `${d.recall * 100}%` }} />
                      </div>
                      <span className="w-8 text-[9px] font-mono text-[#adc6ff] text-right">{(d.recall * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Geographic Distribution (Synthetic)"
            action={
              <div className="flex items-center gap-1.5 text-[10px] text-[#86948a]">
                <Globe className="w-3 h-3" />
                Simulated data
              </div>
            }
          >
            <WorldMap />
          </SectionCard>
        </div>

        {/* Row 5: Live attacks by type (from WebSocket stats) */}
        <SectionCard
          title="Live Attacks By Type (Today)"
          action={<span className="text-[9px] font-mono text-[#4edea3]">live · updates automatically</span>}
        >
          {attacksByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={attacksByType}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="name" stroke={C.muted} tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis stroke={C.muted} tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Count" fill={C.danger} radius={[2, 2, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState label="No attacks recorded today yet" />
          )}
        </SectionCard>

      </div>
    </div>
  );
}
