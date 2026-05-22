"use client";

import { create } from "zustand";
import type { Incident, Stats } from "./types";

const MAX_INCIDENTS = 200; // keep last N in memory

interface IncidentStore {
  incidents: Incident[];
  selectedId: string | null;
  stats: Stats;
  connectionStatus: "connected" | "disconnected" | "reconnecting";
  autoScroll: boolean;

  addIncident: (incident: Incident) => void;
  selectIncident: (id: string | null) => void;
  setStats: (stats: Stats) => void;
  setConnectionStatus: (status: "connected" | "disconnected" | "reconnecting") => void;
  setAutoScroll: (on: boolean) => void;
}

const defaultStats: Stats = {
  total_incidents_today: 0,
  blocked_count: 0,
  avg_latency_ms: 0,
  attacks_by_type: {},
};

export const useIncidentStore = create<IncidentStore>((set) => ({
  incidents: [],
  selectedId: null,
  stats: defaultStats,
  connectionStatus: "disconnected",
  autoScroll: true,

  addIncident: (incident) =>
    set((state) => {
      const next = [incident, ...state.incidents].slice(0, MAX_INCIDENTS);
      // auto-select first incident if none selected
      const selectedId = state.selectedId ?? incident.id;
      return { incidents: next, selectedId };
    }),

  selectIncident: (id) => set({ selectedId: id }),

  setStats: (stats) => set({ stats }),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  setAutoScroll: (autoScroll) => set({ autoScroll }),
}));
