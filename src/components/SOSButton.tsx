import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { triggerSOS, type SosTrigger } from "@/lib/sos";

export function SOSButton({ trigger = "manual" as SosTrigger }: { trigger?: SosTrigger }) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    setHolding(true);
    const startTs = Date.now();
    timer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - startTs) / 1000);
      setProgress(p);
      if (p >= 1) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        void triggerSOS({ trigger });
        setHolding(false);
        setProgress(0);
      }
    }, 30);
  };
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setHolding(false);
    setProgress(0);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        whileTap={{ scale: 0.95 }}
        className="sos-pulse relative h-48 w-48 rounded-full bg-gradient-sos text-white shadow-2xl flex flex-col items-center justify-center select-none"
      >
        <ShieldAlert className="h-16 w-16 mb-1" strokeWidth={2.2} />
        <span className="font-display text-3xl font-bold">SOS</span>
        <span className="text-xs opacity-90 mt-1">Hold 1 second</span>
        {holding && (
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="47"
              fill="none" stroke="white" strokeWidth="3"
              strokeDasharray={`${progress * 295} 295`}
              opacity={0.7}
            />
          </svg>
        )}
      </motion.button>
      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Sends your live GPS to emergency contacts and logs the alert.
      </p>
    </div>
  );
}