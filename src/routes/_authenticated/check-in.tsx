import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimerReset, ShieldCheck, X } from "lucide-react";
import { triggerSOS } from "@/lib/sos";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/check-in")({ component: CheckInPage });

const PRESETS = [5, 15, 30, 60];

function CheckInPage() {
  const [minutes, setMinutes] = useState(15);
  const [note, setNote] = useState("");
  const [expireAt, setExpireAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  useEffect(() => {
    if (!expireAt) return;
    const tick = () => {
      const left = Math.max(0, expireAt - Date.now());
      setRemaining(left);
      if (left <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setExpireAt(null);
        toast.error("Check-in missed — sending SOS to your contacts");
        void triggerSOS({ trigger: "manual", transcript: note || "Missed safety check-in" });
      }
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [expireAt, note]);

  const start = () => {
    setExpireAt(Date.now() + minutes * 60_000);
    toast.success(`Timer armed — check in within ${minutes} min`);
  };
  const checkIn = () => {
    setExpireAt(null);
    toast.success("You're safe. Timer cleared.");
  };
  const cancel = () => {
    setExpireAt(null);
    toast.message("Timer cancelled");
  };

  const mm = Math.floor(remaining / 60000).toString().padStart(2, "0");
  const ss = Math.floor((remaining % 60000) / 1000).toString().padStart(2, "0");

  return (
    <div>
      <PageHeader title="Safety Check-In" subtitle="If you don't check in, we auto-send SOS" />

      {expireAt ? (
        <div className="rounded-3xl p-6 text-center shadow-card bg-gradient-hero text-primary-foreground">
          <TimerReset className="h-8 w-8 mx-auto opacity-80" />
          <div className="font-display text-6xl font-bold mt-3 tabular-nums">
            {mm}:{ss}
          </div>
          <div className="text-xs opacity-90 mt-1">until auto-SOS</div>
          {note && <p className="text-sm opacity-95 mt-3 italic">"{note}"</p>}
          <div className="mt-6 flex gap-2 justify-center">
            <Button size="lg" onClick={checkIn} className="bg-white text-primary hover:bg-white/90 gap-2">
              <ShieldCheck className="h-5 w-5" /> I'm safe
            </Button>
            <Button size="lg" variant="secondary" onClick={cancel} className="gap-2">
              <X className="h-5 w-5" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Timer length</Label>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMinutes(m)}
                  className={`rounded-xl border py-2 text-sm font-medium transition-colors ${
                    minutes === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border"
                  }`}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Uber from work to home"
            />
          </div>
          <Button className="w-full h-12 rounded-xl gap-2" onClick={start}>
            <TimerReset className="h-5 w-5" /> Start check-in timer
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            When the timer runs out, SafeRoute automatically sends an SOS with your live
            location to your emergency contacts. Tap "I'm safe" to cancel it any time.
          </p>
        </div>
      )}
    </div>
  );
}