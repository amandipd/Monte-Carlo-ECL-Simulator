"use client";

import { useEffect, useRef, useState } from "react";

import { useChat } from "@/hooks/useChat";

// Suggested queries from section 3.4 of CURSOR_PROMPT.md.
const SUGGESTED_QUERIES = [
  "What does this ECL mean for the portfolio?",
  "How would ECL change if unemployment hit 10%?",
  "Compare this scenario to baseline conditions",
  "What's driving the loss — unemployment, rates, or housing?",
  "Is this hazard rate realistic for a recession?",
];

export default function ChatInterface({ jobId }: { jobId: string }) {
  const { messages, sendQuery, isLoading, error } = useChat(jobId);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || isLoading) return;
    setInput("");
    void sendQuery(q);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
        Chat with your Data
      </h2>

      <div
        ref={scrollRef}
        className="h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60"
      >
        {messages.length === 0 && !isLoading && (
          <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
            Ask a question about this simulation, or pick a suggestion below.
          </p>
        )}

        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl bg-slate-200 px-3 py-2.5 dark:bg-slate-800">
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500" />
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTED_QUERIES.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              setInput("");
              void sendQuery(q);
            }}
            disabled={isLoading}
            className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-600 transition hover:border-emerald-500 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:text-emerald-400"
          >
            {q}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about these results…"
          disabled={isLoading}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </section>
  );
}
