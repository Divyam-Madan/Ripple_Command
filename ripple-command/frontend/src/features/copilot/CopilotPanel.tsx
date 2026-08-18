import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";

import { askCopilot } from "@/lib/api/copilot";

interface Message {
  role: "user" | "assistant";
  text: string;
  source?: string;
}

const SUGGESTIONS = [
  "What happens if S3 is delayed by 12 hours?",
  "Why is F1 at risk?",
  "What is the cheapest recovery option?",
  "Compare the top two recovery strategies",
];

export function CopilotPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Ask me about node risk, disruption simulations, or recovery options. I only answer from live backend data \u2014 I'll say so if something isn't available." },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: askCopilot,
    onSuccess: (res) => {
      setMessages((prev) => [...prev, { role: "assistant", text: res.reply, source: res.source }]);
    },
    onError: () => {
      setMessages((prev) => [...prev, { role: "assistant", text: "The copilot service is unavailable right now." }]);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, mutation.isPending]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    mutation.mutate(trimmed);
  };

  if (!open) return null;

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-l border-graphite-300/30 bg-stone-50">
      <div className="flex items-center justify-between border-b border-graphite-300/30 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-graphite-900">AROC Copilot</div>
          <div className="text-[11px] text-graphite-500">Tool-grounded &middot; no fabricated figures</div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close copilot panel"
          className="rounded-sm px-2 py-1 text-xs text-graphite-500 hover:bg-graphite-300/20"
        >
          Close
        </button>
      </div>

      <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === "user" ? "text-right" : ""}>
            <div
              className={`inline-block max-w-[92%] whitespace-pre-wrap rounded-sm px-3 py-2 text-left text-[13px] leading-relaxed ${
                msg.role === "user"
                  ? "bg-charcoal-800 text-stone-50"
                  : "border border-graphite-300/30 bg-white text-graphite-900"
              }`}
            >
              {msg.text}
              {msg.source === "fallback" && (
                <div className="mt-1.5 text-[10px] uppercase tracking-wide text-graphite-500">
                  Deterministic fallback mode
                </div>
              )}
            </div>
          </div>
        ))}
        {mutation.isPending && (
          <div className="text-[13px] text-graphite-500">Querying backend tools&hellip;</div>
        )}
      </div>

      <div className="border-t border-graphite-300/30 px-3 py-2">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-sm border border-graphite-300/40 px-2 py-1 text-[11px] text-graphite-700 hover:bg-graphite-300/10"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about risk, simulation, or recovery"
            className="flex-1 border border-graphite-300/40 bg-white px-2.5 py-1.5 text-sm outline-none focus-visible:border-steel-600"
          />
          <button
            type="submit"
            className="bg-charcoal-800 px-3 py-1.5 text-sm font-medium text-stone-50 hover:bg-charcoal-700"
          >
            Ask
          </button>
        </form>
      </div>
    </aside>
  );
}
