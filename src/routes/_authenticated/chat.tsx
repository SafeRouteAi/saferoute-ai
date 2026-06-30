import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/_authenticated/chat")({ component: ChatPage });

type UIMsg = {
  id: string;
  role: "user" | "assistant";
  parts: { type: "text"; text: string }[];
};

const SUGGESTIONS = [
  "I think someone is following me. What should I do?",
  "Tips for walking home alone at night?",
  "How do I tell if a rideshare driver is legit?",
  "What should I keep in my purse for safety?",
];

function readSseText(line: string): string | null {
  // ai-sdk UIMessage SSE protocol uses lines like: data: {"type":"text-delta","delta":"..."}
  if (!line.startsWith("data:")) return null;
  const payload = line.slice(5).trim();
  if (payload === "[DONE]") return null;
  try {
    const j = JSON.parse(payload) as { type?: string; delta?: string; text?: string };
    if (j.type === "text-delta" && typeof j.delta === "string") return j.delta;
    if (j.type === "text" && typeof j.text === "string") return j.text;
    return null;
  } catch { return null; }
}

function ChatPage() {
  const [messages, setMessages] = useState<UIMsg[]>([
    {
      id: "welcome",
      role: "assistant",
      parts: [{
        type: "text",
        text: "Hi 👋 I'm your **SafeRoute Guardian**. Ask me anything about staying safe, getting home, or what to do in an emergency.",
      }],
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const send = async (override?: string) => {
    const content = (override ?? input).trim();
    if (!content || sending) return;
    const userMsg: UIMsg = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text: content }],
    };
    const aId = crypto.randomUUID();
    const aMsg: UIMsg = { id: aId, role: "assistant", parts: [{ type: "text", text: "" }] };
    const next = [...messages, userMsg];
    setMessages([...next, aMsg]);
    setInput("");
    setSending(true);
    scroll();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok || !res.body) throw new Error(`Chat failed: ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const delta = readSseText(line);
          if (delta) {
            acc += delta;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aId ? { ...m, parts: [{ type: "text", text: acc }] } : m,
              ),
            );
            scroll();
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aId
            ? { ...m, parts: [{ type: "text", text: `Sorry — something went wrong. ${err instanceof Error ? err.message : ""}` }] }
            : m,
        ),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <PageHeader title="Safety Chatbot" subtitle="Powered by Gemini AI" />

      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-2 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-card border border-border rounded-bl-sm"
              }`}
            >
              {m.role === "assistant" && (
                <div className="flex items-center gap-1 text-[10px] text-primary font-medium mb-1">
                  <Sparkles className="h-3 w-3" /> Guardian
                </div>
              )}
              <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-headings:my-2 dark:prose-invert">
                <ReactMarkdown>{m.parts.map((p) => p.text).join("")}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-3 py-2 text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> thinking…
            </div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 pb-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => void send(s)}
              className="text-[11px] rounded-full bg-secondary px-3 py-1.5 text-secondary-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); void send(); }}
        className="flex gap-2 pt-2 border-t border-border"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about staying safe…"
          disabled={sending}
        />
        <Button type="submit" disabled={sending || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}