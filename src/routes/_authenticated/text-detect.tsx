import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";
import { classifyText } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { triggerSOS } from "@/lib/sos";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/text-detect")({ component: TextDetect });

const SAMPLES = [
  "Running late, see you at the cafe at 6!",
  "He says he'll come find me if I don't answer his calls tonight.",
  "I am scared, someone is following me on the street, please help",
];

function TextDetect() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    classification: "safe" | "suspicious" | "emergency";
    confidence: number;
    explanation: string;
  } | null>(null);

  const analyze = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await classifyText({ data: { content } });
      setResult(r);
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        await supabase.from("text_detections").insert({
          user_id: u.user.id,
          content,
          classification: r.classification,
          confidence: r.confidence,
          explanation: r.explanation,
        });
      }
      if (r.classification === "emergency") {
        toast.error("Emergency text detected — sending SOS");
        await triggerSOS({ trigger: "text", transcript: content, confidence: r.confidence });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const Icon =
    result?.classification === "emergency" ? ShieldAlert
    : result?.classification === "suspicious" ? AlertTriangle
    : ShieldCheck;

  return (
    <div>
      <PageHeader title="Text Alert" subtitle="AI classifies messages as safe / suspicious / emergency" />

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste a message you received or want to send…"
        className="min-h-32"
      />

      <div className="flex flex-wrap gap-2 mt-3">
        {SAMPLES.map((s) => (
          <button
            key={s}
            onClick={() => setContent(s)}
            className="text-[11px] rounded-full bg-secondary px-3 py-1.5 text-secondary-foreground"
          >
            {s.slice(0, 32)}…
          </button>
        ))}
      </div>

      <Button className="w-full mt-4" onClick={analyze} disabled={loading || !content.trim()}>
        {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
        Analyze with AI
      </Button>

      {result && (
        <div className="mt-5 rounded-2xl border border-border p-4 bg-card">
          <div className="flex items-center justify-between">
            <Badge
              className={
                result.classification === "emergency"
                  ? "bg-danger/15 text-danger"
                  : result.classification === "suspicious"
                  ? "bg-caution/20 text-caution"
                  : "bg-safe/15 text-safe"
              }
            >
              <Icon className="h-3 w-3 mr-1" />
              {result.classification.toUpperCase()}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Confidence {Math.round(result.confidence * 100)}%
            </span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={
                result.classification === "emergency"
                  ? "h-full bg-danger"
                  : result.classification === "suspicious"
                  ? "h-full bg-caution"
                  : "h-full bg-safe"
              }
              style={{ width: `${Math.round(result.confidence * 100)}%` }}
            />
          </div>
          <p className="text-sm mt-3 text-muted-foreground">{result.explanation}</p>
        </div>
      )}
    </div>
  );
}