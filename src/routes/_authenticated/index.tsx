import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { SOSButton } from "@/components/SOSButton";
import { QuickAction } from "@/components/QuickAction";
import { Mic, TimerReset, Map, Users, Compass, PhoneCall, Sparkles, MapPin } from "lucide-react";
import { todaySafetyTip, timeOfDayRisk } from "@/lib/sample-data";
import { getCurrentPosition } from "@/lib/sos";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/")({ component: Home });

function Home() {
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locLabel, setLocLabel] = useState("Locating…");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const tod = timeOfDayRisk();
  const safetyScore = Math.round((1 - tod.risk) * 100);

  useEffect(() => {
    void getCurrentPosition().then((p) => {
      if (p) {
        setLoc({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocLabel(`${p.coords.latitude.toFixed(3)}, ${p.coords.longitude.toFixed(3)}`);
      } else {
        setLocLabel("Location unavailable");
      }
    });
    void supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as Record<string, unknown> | undefined;
      setDisplayName(
        (meta?.display_name as string | undefined) ??
          data.user?.email?.split("@")[0] ??
          null,
      );
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pt-2">
        <Logo />
        <Link to="/contacts" className="text-xs text-muted-foreground bg-card border border-border rounded-full px-3 py-1.5">
          {displayName ? `Hi, ${displayName}` : "Profile"}
        </Link>
      </div>

      <div className="rounded-2xl bg-gradient-hero text-primary-foreground p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide opacity-80 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Current location
            </div>
            <div className="font-display text-base font-semibold mt-1">{locLabel}</div>
            <div className="text-[11px] opacity-80 mt-0.5">{tod.label} • AI risk model</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide opacity-80">Safety</div>
            <div className="font-display text-4xl font-bold leading-none">{safetyScore}</div>
            <div className="text-[10px] opacity-80">out of 100</div>
          </div>
        </div>
      </div>

      <div className="flex justify-center py-2">
        <SOSButton />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <QuickAction to="/guardian" icon={Mic} label="Voice Alert" color="primary">
          Guardian Mode
        </QuickAction>
        <QuickAction to="/check-in" icon={TimerReset} label="Check-In Timer" color="navy">
          Auto-SOS if late
        </QuickAction>
        <QuickAction to="/routes-map" icon={Map} label="Safe Route" color="safe">
          Compare paths
        </QuickAction>
        <QuickAction to="/contacts" icon={Users} label="Contacts" color="caution">
          Trusted circle
        </QuickAction>
        <QuickAction to="/places" icon={Compass} label="Nearby Help" color="primary">
          Police • Hospital
        </QuickAction>
        <QuickAction to="/fake-call" icon={PhoneCall} label="Fake Call" color="navy">
          Quick escape
        </QuickAction>
      </div>

      <div className="rounded-2xl bg-card border border-border p-4 flex gap-3 items-start shadow-card">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="font-display font-semibold text-sm">Daily Safety Tip</div>
          <p className="text-sm text-muted-foreground mt-0.5">{todaySafetyTip()}</p>
        </div>
      </div>

      {loc && (
        <p className="text-[10px] text-muted-foreground text-center">
          GPS active • coordinates only used for safety features.
        </p>
      )}
    </div>
  );
}