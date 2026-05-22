"use client";

import { useEffect } from "react";
import { wsClient } from "@/lib/ws";
import { useIncidentStore } from "@/lib/store";
import type { WsMessage } from "@/lib/types";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export function WsProvider({ children }: { children: React.ReactNode }) {
  const addIncident    = useIncidentStore((s) => s.addIncident);
  const setStats       = useIncidentStore((s) => s.setStats);
  const setConnStatus  = useIncidentStore((s) => s.setConnectionStatus);

  useEffect(() => {
    const offMsg = wsClient.on((msg: WsMessage) => {
      if (msg.type === "incident") {
        const { type: _t, ...inc } = msg;
        addIncident(inc as Parameters<typeof addIncident>[0]);
      } else if (msg.type === "stats") {
        const { type: _t, ...stats } = msg;
        setStats(stats as Parameters<typeof setStats>[0]);
      }
    });

    const offStatus = wsClient.onStatus((status) => {
      setConnStatus(status);
      if (status === "connected")    toast.success("Connected to PromptShield gateway");
      if (status === "disconnected") toast.error("Disconnected — retrying…");
      if (status === "reconnecting") toast.warning("Reconnecting…");
    });

    wsClient.connect();

    return () => {
      offMsg();
      offStatus();
      wsClient.disconnect();
    };
  }, [addIncident, setStats, setConnStatus]);

  return (
    <>
      {children}
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#1c1b1d",
            border: "1px solid #27272A",
            color: "#e5e1e4",
            fontFamily: "Inter, sans-serif",
            fontSize: "13px",
          },
        }}
      />
    </>
  );
}
