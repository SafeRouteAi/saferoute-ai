import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, PhoneOff, PhoneCall } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { startRingtone, stopRingtone } from "@/lib/ringtone";

export const Route = createFileRoute("/_authenticated/fake-call")({ component: FakeCall });

const DELAYS = [
  { label: "10 seconds", value: 10 },
  { label: "30 seconds", value: 30 },
  { label: "1 minute", value: 60 },
];

function FakeCall() {
  const [callerName, setCallerName] = useState("Mom");
  const [callerNumber, setCallerNumber] = useState("+1 (555) 010-2030");
  const [armed, setArmed] = useState<number | null>(null);
  const [showCall, setShowCall] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (tick.current) clearInterval(tick.current);
    stopRingtone();
  }, []);

  const schedule = (delay: number) => {
    if (timer.current) clearTimeout(timer.current);
    setArmed(Date.now() + delay * 1000);
    timer.current = setTimeout(() => {
      setShowCall(true);
      setSeconds(0);
      try { startRingtone(); } catch { /* */ }
      tick.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }, delay * 1000);
  };

  const endCall = () => {
    setShowCall(false);
    setArmed(null);
    if (tick.current) clearInterval(tick.current);
    stopRingtone();
  };

  return (
    <div>
      <PageHeader title="Fake Call" subtitle="Schedule an incoming call as an excuse to leave" />

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Caller name</Label>
          <Input value={callerName} onChange={(e) => setCallerName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Caller number</Label>
          <Input value={callerNumber} onChange={(e) => setCallerNumber(e.target.value)} />
        </div>

        <Label>Schedule</Label>
        <div className="grid grid-cols-3 gap-2">
          {DELAYS.map((d) => (
            <Button key={d.value} variant="secondary" onClick={() => schedule(d.value)}>
              {d.label}
            </Button>
          ))}
        </div>

        {armed && !showCall && (
          <p className="text-xs text-center text-muted-foreground">
            Incoming call queued… keep this tab open.
          </p>
        )}
      </div>

      <AnimatePresence>
        {showCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gradient-hero text-primary-foreground flex flex-col items-center justify-between py-16 px-8"
          >
            <div className="text-center">
              <p className="text-sm opacity-80">Incoming call…</p>
              <div className="mx-auto mt-8 h-32 w-32 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-5xl font-display font-bold">
                {callerName.charAt(0).toUpperCase()}
              </div>
              <h2 className="font-display text-3xl font-bold mt-6">{callerName}</h2>
              <p className="text-sm opacity-80 mt-1">{callerNumber}</p>
              <p className="text-xs opacity-70 mt-3">
                {seconds > 0 ? `${seconds}s` : "ringing…"}
              </p>
            </div>
            <div className="flex items-center gap-12">
              <button onClick={endCall} className="h-16 w-16 rounded-full bg-danger flex items-center justify-center shadow-2xl">
                <PhoneOff className="h-7 w-7" />
              </button>
              <button onClick={endCall} className="h-16 w-16 rounded-full bg-safe flex items-center justify-center shadow-2xl animate-pulse">
                <Phone className="h-7 w-7" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 rounded-2xl border border-border bg-card p-4 flex gap-3 items-start">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <PhoneCall className="h-5 w-5" />
        </div>
        <p className="text-xs text-muted-foreground">
          Use a fake call to gracefully exit uncomfortable situations. Pick a delay, then put your phone face-down or in your pocket.
        </p>
      </div>
    </div>
  );
}