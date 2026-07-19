"use client";

import { useEffect, useState } from "react";

import { API_BASE } from "@/lib/api";
import type { WSEvent } from "@/lib/types";

// Derive the ws:// (or wss://) origin from the HTTP API base.
const WS_BASE = API_BASE.replace(/^http/, "ws");

export type WSStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "closed"
  | "error";

/**
 * Connect to the simulation progress WebSocket and collect events.
 *
 * Pass `null` to stay disconnected (e.g. for already-completed jobs). When a
 * `jobId` is provided the hook opens `/api/v3/ws/simulations/{jobId}`, tracks
 * fractional `progress` from `progress` events, and captures the `final` event.
 */
export function useWebSocket(jobId: string | null) {
  const [events, setEvents] = useState<WSEvent[]>([]);
  const [status, setStatus] = useState<WSStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [finalEvent, setFinalEvent] = useState<WSEvent | null>(null);

  useEffect(() => {
    if (!jobId) return;

    setEvents([]);
    setProgress(0);
    setFinalEvent(null);
    setStatus("connecting");

    const ws = new WebSocket(`${WS_BASE}/api/v3/ws/simulations/${jobId}`);

    ws.onopen = () => setStatus("connected");

    ws.onmessage = (event) => {
      let parsed: WSEvent;
      try {
        parsed = JSON.parse(event.data) as WSEvent;
      } catch {
        return;
      }
      setEvents((prev) => [...prev, parsed]);

      if (parsed.type === "progress" && parsed.total) {
        setProgress((parsed.completed ?? 0) / parsed.total);
      }
      if (parsed.type === "final") {
        setFinalEvent(parsed);
        setProgress(1);
        setStatus("closed");
      }
      if (parsed.type === "error") {
        setStatus("error");
      }
    };

    ws.onerror = () => setStatus("error");
    ws.onclose = () =>
      setStatus((prev) => (prev === "error" ? prev : "closed"));

    return () => ws.close();
  }, [jobId]);

  return { events, status, progress, finalEvent };
}
