import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, ShieldAlert, Loader2 } from "lucide-react";
import { classifyVoiceIntent } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { triggerSOS } from "@/lib/sos";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/guardian")({ component: GuardianPage });

type SpeechRecLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void;
  onerror: (e: { error: string }) => void;
  onend: () => void;
};

type Detection = {
  id: string;
  transcript: string;
  intent: string;
  confidence: number;
  reason: string;
  ts: number;
};

function GuardianPage() {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [interim, setInterim] = useState("");
  const [detections, setDetections] = useState<Detection[]>([]);
  const [processing, setProcessing] = useState(false);
  const recRef = useRef<SpeechRecLike | null>(null);

  useEffect(() => {
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecLike }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecLike }).webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      let finalTxt = "";
      let interimTxt = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0].transcript;
        if (r.isFinal) finalTxt += t + " ";
        else interimTxt += t;
      }
      setInterim(interimTxt);
      const ft = finalTxt.trim();
      if (ft.length > 3) {
        setInterim("");
        void analyzeUtterance(ft);
      }
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech") return;
      console.warn("speech error", e.error);
    };
    rec.onend = () => {
      // Auto-restart if still listening
      if (recRef.current && listeningRef.current) {
        try { rec.start(); } catch { /* ignore */ }
      }
    };
    recRef.current = rec;
    return () => {
      try { rec.stop(); } catch { /* ignore */ }
      recRef.current = null;
    };
  }, []);

  // Mirror listening into a ref for use inside rec.onend
  const listeningRef = useRef(false);
  useEffect(() => { listeningRef.current = listening; }, [listening]);

  const analyzeUtterance = async (transcript: string) => {
    setProcessing(true);
    try {
      const result = await classifyVoiceIntent({ data: { transcript } });
      const det: Detection = {
        id: crypto.randomUUID(),
        transcript,
        intent: result.intent,
        confidence: result.confidence,
        reason: result.reason,
        ts: Date.now(),
      };
      setDetections((d) => [det, ...d].slice(0, 20));

      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        await supabase.from("voice_detections").insert({
          user_id: u.user.id,
          transcript,
          intent: result.intent,
          confidence: result.confidence,
          reason: result.reason,
        });
      }

      if (result.intent === "distress" && result.confidence >= 0.8) {
        toast.error(`Distress detected (${Math.round(result.confidence * 100)}%) — sending SOS`);
        await triggerSOS({ trigger: "voice", transcript, confidence: result.confidence });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const toggle = () => {
    if (!recRef.current) return;
    if (listening) {
      setListening(false);
      try { recRef.current.stop(); } catch { /* ignore */ }
    } else {
      setListening(true);
      try { recRef.current.start(); } catch { /* ignore */ }
    }
  };

  return (
    <div>
      <PageHeader title="Guardian Mode" subtitle="Continuous voice intent detection" />

      <div className={`rounded-3xl p-6 text-center shadow-card border ${listening ? "bg-gradient-hero text-primary-foreground border-transparent" : "bg-card border-border"}`}>
        <button
          onClick={toggle}
          disabled={!supported}
          className={`mx-auto h-32 w-32 rounded-full flex items-center justify-center transition-all ${
            listening ? "bg-white/20 sos-pulse" : "bg-primary text-primary-foreground"
          } disabled:opacity-50`}
        >
          {listening ? <Mic className="h-12 w-12" /> : <MicOff className="h-12 w-12" />}
        </button>
        <div className="mt-4 font-display text-lg font-semibold">
          {listening ? "Listening for distress…" : "Guardian Mode is off"}
        </div>
        <div className="text-xs opacity-90 mt-1">
          {supported
            ? listening
              ? "Phrases like 'help me' or 'someone is following me' will trigger SOS."
              : "Tap the mic to start. Works in foreground only."
            : "Speech Recognition is not supported in this browser."}
        </div>
        {interim && (
          <div className="mt-3 text-sm italic opacity-90 min-h-[1.25rem]">"{interim}"</div>
        )}
        {processing && (
          <div className="mt-2 text-xs flex items-center justify-center gap-1 opacity-90">
            <Loader2 className="h-3 w-3 animate-spin" /> Analyzing intent…
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-center gap-2">
        <Button variant="secondary" onClick={() => void analyzeUtterance("Help me, someone is following me")}>
          Simulate distress
        </Button>
      </div>

      <h3 className="font-display font-semibold text-sm mt-6 mb-2">Recent detections</h3>
      <div className="space-y-2 pb-4">
        {detections.length === 0 && (
          <p className="text-xs text-muted-foreground">No utterances analyzed yet.</p>
        )}
        {detections.map((d) => (
          <div key={d.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <Badge
                variant="secondary"
                className={
                  d.intent === "distress"
                    ? "bg-danger/15 text-danger"
                    : d.intent === "request_help"
                    ? "bg-caution/20 text-caution"
                    : "bg-safe/15 text-safe"
                }
              >
                {d.intent === "distress" && <ShieldAlert className="h-3 w-3 mr-1" />}
                {d.intent.replace("_", " ")} • {Math.round(d.confidence * 100)}%
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {new Date(d.ts).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm mt-1.5">"{d.transcript}"</p>
            <p className="text-xs text-muted-foreground mt-0.5">{d.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}