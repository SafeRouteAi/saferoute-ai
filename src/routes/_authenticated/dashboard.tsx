import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { Mic, MessageSquareText, ShieldAlert, Users, Map, Activity } from "lucide-react";
import { timeOfDayRisk } from "@/lib/sample-data";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

type Counts = {
  voice: number; text: number; sos: number; contacts: number; routes: number; guardianOn: boolean;
};

function Stat({ icon: Icon, label, value, tone = "primary" }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string | number;
  tone?: "primary" | "danger" | "safe" | "navy" | "caution";
}) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    danger: "bg-danger/10 text-danger",
    safe: "bg-safe/10 text-safe",
    navy: "bg-navy/10 text-navy",
    caution: "bg-caution/15 text-caution",
  };
  return (
    <div className="rounded-2xl bg-card border border-border p-3">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${colorMap[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="font-display text-2xl font-bold mt-2 leading-none">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function Dashboard() {
  const [counts, setCounts] = useState<Counts>({
    voice: 0, text: 0, sos: 0, contacts: 0, routes: 0, guardianOn: false,
  });
  const [recentSos, setRecentSos] = useState<{ id: string; trigger_type: string; created_at: string; location_url: string | null }[]>([]);
  const [recentRoutes, setRecentRoutes] = useState<{ id: string; destination: string; safety_score: number | null; created_at: string }[]>([]);

  const tod = timeOfDayRisk();
  const safetyScore = Math.round((1 - tod.risk) * 100);

  useEffect(() => {
    void (async () => {
      const todayIso = new Date(); todayIso.setHours(0, 0, 0, 0);
      const since = todayIso.toISOString();
      const [v, t, s, c, r, settings] = await Promise.all([
        supabase.from("voice_detections").select("id", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("text_detections").select("id", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("sos_events").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("emergency_contacts").select("id", { count: "exact", head: true }),
        supabase.from("route_history").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("user_settings").select("auto_guardian").maybeSingle(),
      ]);
      setCounts({
        voice: v.count ?? 0,
        text: t.count ?? 0,
        sos: s.data?.length ?? 0,
        contacts: c.count ?? 0,
        routes: r.data?.length ?? 0,
        guardianOn: settings.data?.auto_guardian ?? false,
      });
      setRecentSos(s.data ?? []);
      setRecentRoutes(r.data ?? []);
    })();
  }, []);

  return (
    <div>
      <PageHeader title="Safety Dashboard" subtitle="Your activity at a glance" />

      <div className="rounded-2xl bg-gradient-hero text-primary-foreground p-5 shadow-card flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide opacity-80">Today's safety score</div>
          <div className="font-display text-5xl font-bold leading-none mt-1">{safetyScore}</div>
          <div className="text-xs opacity-90 mt-1">{tod.label} • AI-modeled risk</div>
        </div>
        <Activity className="h-12 w-12 opacity-30" />
      </div>

      <div className="mt-2 rounded-2xl bg-card border border-border p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${counts.guardianOn ? "bg-safe" : "bg-muted-foreground"}`} />
          <span className="text-sm font-display font-semibold">Guardian Mode</span>
        </div>
        <Link to="/guardian" className="text-xs text-primary font-medium">
          {counts.guardianOn ? "Configured" : "Setup"}
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <Stat icon={Mic} label="Voice today" value={counts.voice} tone="primary" />
        <Stat icon={MessageSquareText} label="Text today" value={counts.text} tone="navy" />
        <Stat icon={ShieldAlert} label="Recent SOS" value={counts.sos} tone="danger" />
        <Stat icon={Users} label="Contacts" value={counts.contacts} tone="caution" />
        <Stat icon={Map} label="Routes" value={counts.routes} tone="safe" />
        <Stat icon={Activity} label="Safety" value={safetyScore} tone="primary" />
      </div>

      <h3 className="font-display font-semibold text-sm mt-6 mb-2">Recent SOS</h3>
      <div className="space-y-2">
        {recentSos.length === 0 && <p className="text-xs text-muted-foreground">No SOS events yet.</p>}
        {recentSos.map((e) => (
          <div key={e.id} className="rounded-xl bg-card border border-border p-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium capitalize">{e.trigger_type} trigger</div>
              <div className="text-[11px] text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
            </div>
            {e.location_url && (
              <a href={e.location_url} target="_blank" rel="noreferrer" className="text-xs text-primary font-medium">View</a>
            )}
          </div>
        ))}
      </div>

      <h3 className="font-display font-semibold text-sm mt-6 mb-2">Recent routes</h3>
      <div className="space-y-2 pb-4">
        {recentRoutes.length === 0 && <p className="text-xs text-muted-foreground">No route history yet.</p>}
        {recentRoutes.map((r) => (
          <div key={r.id} className="rounded-xl bg-card border border-border p-3 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{r.destination}</div>
              <div className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
            </div>
            {r.safety_score !== null && (
              <span className="font-display text-lg font-bold text-safe">{r.safety_score}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}