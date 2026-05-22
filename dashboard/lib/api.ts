import type { Incident, Policy, Stats } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; version: string }>("/health"),

  incidents: {
    list: (params?: { limit?: number; offset?: number; severity?: string; verdict?: string }) => {
      const qs = new URLSearchParams();
      if (params?.limit)   qs.set("limit",    String(params.limit));
      if (params?.offset)  qs.set("offset",   String(params.offset));
      if (params?.severity) qs.set("severity", params.severity);
      if (params?.verdict) qs.set("verdict",  params.verdict);
      return request<Incident[]>(`/incidents?${qs}`);
    },
    get: (id: string) => request<Incident>(`/incidents/${id}`),
  },

  policies: {
    list: () => request<Policy[]>("/policies"),
    get: (id: string) => request<Policy>(`/policies/${id}`),
    create: (body: { name: string; yaml_content: string }) =>
      request<Policy>("/policies", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Policy>) =>
      request<Policy>(`/policies/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  },

  stats: {
    today: () => request<Stats>("/stats/today"),
  },
};
