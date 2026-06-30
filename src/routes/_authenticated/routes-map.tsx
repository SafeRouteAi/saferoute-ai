import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Lightbulb, Users, AlertTriangle, Clock, MapPin, Search } from "lucide-react";
import { getCurrentPosition } from "@/lib/sos";
import { computeRoutes, nearbyPlaces } from "@/lib/maps.functions";
import { scoreRoute } from "@/lib/ai.functions";
import { timeOfDayRisk } from "@/lib/sample-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/routes-map")({ component: RoutesPage });

type ScoredRoute = {
  label: string;
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline?: string;
  safety: number;
  lighting: number;
  crowd: number;
  crime: number;
  summary: string;
};

function formatDuration(s: number) {
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function RoutesPage() {
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [destText, setDestText] = useState("");
  const [routes, setRoutes] = useState<ScoredRoute[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void getCurrentPosition().then((p) => {
      if (p) setOrigin({ lat: p.coords.latitude, lng: p.coords.longitude });
    });
  }, []);

  const search = async () => {
    if (!origin) return toast.error("Waiting for your location…");
    if (!destText.trim()) return;
    setLoading(true);
    setRoutes(null);
    try {
      // Resolve destination via Places text search biased to origin
      const placesRes = await nearbyPlaces({
        data: { lat: origin.lat, lng: origin.lng, query: destText, radius: 20000 },
      });
      const first = (placesRes as { places?: { location?: { latitude: number; longitude: number }; displayName?: { text: string } }[] }).places?.[0];
      const dest = first?.location;
      if (!dest) {
        setLoading(false);
        return toast.error("Couldn't find that destination");
      }

      const routesRes = await computeRoutes({
        data: {
          origin,
          destination: { lat: dest.latitude, lng: dest.longitude },
          travelMode: "WALK",
        },
      });
      const raw =
        (routesRes as { routes?: { duration?: string; distanceMeters?: number; polyline?: { encodedPolyline?: string }; description?: string }[] }).routes ?? [];
      if (raw.length === 0) {
        setLoading(false);
        return toast.error("No routes available");
      }

      const tod = timeOfDayRisk();
      const scored: ScoredRoute[] = [];
      for (let i = 0; i < raw.length; i++) {
        const r = raw[i];
        const distanceMeters = r.distanceMeters ?? 0;
        const durationSeconds = parseInt((r.duration ?? "0s").replace("s", ""), 10) || 0;
        const label = i === 0 ? "Recommended" : `Alternate ${i}`;
        try {
          const s = await scoreRoute({
            data: {
              label,
              distanceMeters,
              durationSeconds,
              timeOfDay: tod.label,
              summary: r.description,
            },
          });
          scored.push({
            label,
            distanceMeters,
            durationSeconds,
            encodedPolyline: r.polyline?.encodedPolyline,
            ...s,
          });
        } catch {
          // skip on failure
        }
      }
      scored.sort((a, b) => b.safety - a.safety);
      if (scored.length > 0) scored[0].label = "Safest";
      setRoutes(scored);

      // Log the choice
      const { data: u } = await supabase.auth.getUser();
      if (u.user && scored[0]) {
        await supabase.from("route_history").insert({
          user_id: u.user.id,
          origin: `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}`,
          destination: first?.displayName?.text ?? destText,
          chosen_route_label: scored[0].label,
          safety_score: scored[0].safety,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Route search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Safe Route AI" subtitle="We pick the safest, not the shortest." />

      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> From</Label>
        <Input
          readOnly
          value={origin ? `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}` : "Locating…"}
          className="bg-muted"
        />
        <Label className="text-xs">To</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Address, landmark, or place"
            value={destText}
            onChange={(e) => setDestText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void search(); }}
          />
          <Button onClick={search} disabled={loading || !destText.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        {routes?.map((r, i) => (
          <div
            key={r.label}
            className={`rounded-2xl border p-4 bg-card ${i === 0 ? "border-safe shadow-card" : "border-border"}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={i === 0 ? "bg-safe text-white" : "bg-secondary text-secondary-foreground"}>
                  {r.label}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />{formatDuration(r.durationSeconds)} • {(r.distanceMeters/1000).toFixed(1)} km
                </span>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase text-muted-foreground">Safety</div>
                <div className="font-display text-2xl font-bold leading-none text-safe">{r.safety}</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{r.summary}</p>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <MetricChip icon={Lightbulb} label="Lighting" value={r.lighting} good />
              <MetricChip icon={Users} label="Crowd" value={r.crowd} good />
              <MetricChip icon={AlertTriangle} label="Crime" value={r.crime} />
            </div>
          </div>
        ))}
        {!loading && !routes && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
            Enter a destination to compare safe routes.
          </div>
        )}
      </div>
    </div>
  );
}

function MetricChip({
  icon: Icon, label, value, good,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; good?: boolean }) {
  const tone = good
    ? value > 70 ? "text-safe bg-safe/10" : value > 40 ? "text-caution bg-caution/10" : "text-danger bg-danger/10"
    : value < 30 ? "text-safe bg-safe/10" : value < 60 ? "text-caution bg-caution/10" : "text-danger bg-danger/10";
  return (
    <div className={`rounded-xl px-2 py-2 ${tone}`}>
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide">
        <Icon className="h-3 w-3" />{label}
      </div>
      <div className="font-display text-lg font-bold leading-none mt-1">{value}</div>
    </div>
  );
}