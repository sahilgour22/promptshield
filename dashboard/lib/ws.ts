"use client";

import type { WsMessage } from "./types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws/incidents";

type Handler = (msg: WsMessage) => void;
type StatusHandler = (status: "connected" | "disconnected" | "reconnecting") => void;

class PromptShieldWS {
  private ws: WebSocket | null = null;
  private handlers: Set<Handler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private retryCount = 0;
  private maxRetry = 10;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldRun = false;

  connect() {
    this.shouldRun = true;
    this.retryCount = 0;
    this._open();
  }

  disconnect() {
    this.shouldRun = false;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.ws?.close();
    this.ws = null;
  }

  on(handler: Handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onStatus(handler: StatusHandler) {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  private _open() {
    if (!this.shouldRun) return;

    try {
      this.ws = new WebSocket(WS_URL);
    } catch {
      this._scheduleRetry();
      return;
    }

    this.ws.onopen = () => {
      this.retryCount = 0;
      this._emit("connected");
    };

    this.ws.onmessage = (e) => {
      try {
        const msg: WsMessage = JSON.parse(e.data as string);
        this.handlers.forEach((h) => h(msg));
      } catch {
        // ignore malformed
      }
    };

    this.ws.onclose = () => {
      this._emit("disconnected");
      this._scheduleRetry();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private _scheduleRetry() {
    if (!this.shouldRun || this.retryCount >= this.maxRetry) return;
    const delay = Math.min(1000 * 2 ** this.retryCount, 30_000);
    this.retryCount++;
    this._emit("reconnecting");
    this.retryTimer = setTimeout(() => this._open(), delay);
  }

  private _emit(status: "connected" | "disconnected" | "reconnecting") {
    this.statusHandlers.forEach((h) => h(status));
  }
}

// Singleton — one WS connection shared across the app
export const wsClient = new PromptShieldWS();
