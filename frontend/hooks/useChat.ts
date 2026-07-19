"use client";

import { useCallback, useState } from "react";

import { API_BASE } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

/**
 * Send chat queries about a simulation to the backend (Ollama-backed).
 *
 * On a 503 the backend signals that Ollama is unreachable, surfaced here as a
 * friendly "start it with ollama serve" message. The optimistic user message is
 * rolled back if the request fails.
 */
export function useChat(jobId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendQuery = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || isLoading) return;

      const userMsg: ChatMessage = { role: "user", content: trimmed };
      const history = messages;
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/api/v3/chat/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_id: jobId,
            query: trimmed,
            conversation_history: history,
          }),
        });

        if (!res.ok) {
          if (res.status === 503) {
            setError("Ollama is not running. Start it with: ollama serve");
          } else {
            let detail = res.statusText;
            try {
              const data = await res.json();
              if (typeof data?.detail === "string") detail = data.detail;
            } catch {
              // keep statusText fallback
            }
            setError(`Error: ${detail}`);
          }
          setMessages((prev) => prev.slice(0, -1)); // roll back the user message
          return;
        }

        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response },
        ]);
      } catch {
        setError("Could not reach the API. Is the backend running on :8080?");
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsLoading(false);
      }
    },
    [jobId, messages, isLoading]
  );

  return { messages, sendQuery, isLoading, error };
}
