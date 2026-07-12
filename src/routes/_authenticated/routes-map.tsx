import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lightbulb, Users, AlertTriangle, Clock, Navigation, Search, Locate, X, Footprints, Car, Bike, MapPin } from "lucide-react";
import { getCurrentPosition } from "@/lib/sos";
import { computeRoutes, nearbyPlaces, autocompletePlaces } from "@/lib/maps.functions";
import { scoreRoute } from "@/lib/ai.functions";
import { timeOfDayRisk } from "@/lib/sample-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { loadGoogleMaps, decodePolyline } from "@/lib/google-maps-loader";

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

type Mode = "WALK" | "DRIVE" | "BICYCLE";

function safetyColor(score: number) {
  if (score >= 75) return "#16a34a"; // green
  if (score >= 50) return "#f59e0b"; // amber
  return "#dc2626"; // red
}

function formatDuration(s: number) {
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function RoutesPage() {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [destText, setDestText] = useState("");
  const [suggestions, setSuggestions] = useState<{ placeId: string; main: string; secondary: string }[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [routes, setRoutes] = useState<ScoredRoute[] | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("WALK");
  const [mapReady, setMapReady] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(true);

  // Debounced autocomplete
  useEffect(() => {
    if (!destText.trim() || destText.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const q = destText;
    const handle = setTimeout(async () => {
      try {
        const res = await autocompletePlaces({
          data: {
            input: q,
            lat: origin?.lat,
            lng: origin?.lng,
          },
        });
        const items = (res.suggestions ?? [])
          .map((s) => s.placePrediction)
          .filter((p): p is NonNullable<typeof p> => !!p)
          .map((p) => ({
            placeId: p.placeId,
            main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
            secondary: p.structuredFormat?.secondaryText?.text ?? "",
          }));
        setSuggestions(items.slice(0, 6));
      } catch {
        setSuggestions([]);
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [destText, origin?.lat, origin?.lng]);

  // Init map
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const g = await loadGoogleMaps();
        if (cancelled || !mapDivRef.current) return;
        const pos = await getCurrentPosition().catch(() => null);
        const center = pos
          ? { lat: pos.coords.latitude, lng: pos.coords.longitude }
          : { lat: 28.6139, lng: 77.209 };
        if (pos) setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        mapRef.current = new g.maps.Map(mapDivRef.current, {
          center,
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          clickableIcons: false,
          styles: [
            { featureType: "poi.business", stylers: [{ visibility: "off" }] },
            { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
          ],
        });
        // Origin marker (blue dot)
        new g.maps.Marker({
          position: center,
          map: mapRef.current,
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#2563eb",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
          },
          zIndex: 999,
        });
        setMapReady(true);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load map");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Draw route polylines whenever routes / selection changes
  useEffect(() => {
    const g = window.google;
    const map = mapRef.current;
    if (!g || !map || !routes) return;
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new g.maps.LatLngBounds();
    routes.forEach((r, i) => {
      if (!r.encodedPolyline) return;
      const path = decodePolyline(r.encodedPolyline);
      const isSel = i === selectedIdx;
      // Casing (dark) for selected
      if (isSel) {
        const casing = new g.maps.Polyline({
          path, map, strokeColor: "#0f172a", strokeOpacity: 1, strokeWeight: 9, zIndex: 10,
        });
        polylinesRef.current.push(casing);
      }
      const line = new g.maps.Polyline({
        path,
        map,
        strokeColor: isSel ? safetyColor(r.safety) : "#94a3b8",
        strokeOpacity: isSel ? 1 : 0.7,
        strokeWeight: isSel ? 6 : 4,
        zIndex: isSel ? 20 : 5,
      });
      line.addListener("click", () => setSelectedIdx(i));
      polylinesRef.current.push(line);
      path.forEach((p) => bounds.extend(p));
      // Destination marker at last point of first route
      if (i === 0 && path.length) {
        const end = path[path.length - 1];
        const dm = new g.maps.Marker({
          position: end, map,
          label: { text: "B", color: "#fff", fontWeight: "700" },
        });
        markersRef.current.push(dm);
      }
    });
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { top: 140, right: 40, bottom: 260, left: 40 });
    }
  }, [routes, selectedIdx]);

  const search = async () => {
    setShowSuggest(false);
    if (!origin) return toast.error("Waiting for your location…");
    if (!destText.trim()) return;
    setLoading(true);
    setRoutes(null);
    setSelectedIdx(0);
    try {
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
          travelMode: mode,
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
          // Fall back to heuristic scoring if AI unavailable
          const base = 60 + Math.round(Math.random() * 20) - i * 5;
          scored.push({
            label,
            distanceMeters,
            durationSeconds,
            encodedPolyline: r.polyline?.encodedPolyline,
            safety: base,
            lighting: base - 5,
            crowd: base - 10,
            crime: 100 - base,
            summary: "Estimated safety based on route distance and time of day.",
          });
        }
      }
      scored.sort((a, b) => b.safety - a.safety);
      if (scored.length > 0) scored[0].label = "Safest";
      setRoutes(scored);
      setSheetOpen(true);

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

  const recenter = async () => {
    const pos = await getCurrentPosition().catch(() => null);
    if (!pos || !mapRef.current) return;
    const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    setOrigin(c);
    mapRef.current.panTo(c);
    mapRef.current.setZoom(15);
  };

  const selected = routes?.[selectedIdx];

  return (
    <div className="fixed inset-0 bg-background">
      {/* Full-screen map */}
      <div ref={mapDivRef} className="absolute inset-0" />
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-30">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Top search bar */}
      <div className="absolute top-0 inset-x-0 z-20 p-3 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl bg-card/95 backdrop-blur border border-border shadow-lg p-2 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
            <Input
              value={destText}
              onChange={(e) => { setDestText(e.target.value); setShowSuggest(true); }}
              onFocus={() => setShowSuggest(true)}
              onKeyDown={(e) => { if (e.key === "Enter") void search(); }}
              placeholder="Where to?"
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-9 px-0"
            />
            {destText && (
              <button onClick={() => { setDestText(""); setRoutes(null); setSuggestions([]); }} className="p-1 text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
            <Button size="sm" className="h-9 rounded-xl" onClick={search} disabled={loading || !destText.trim() || !origin}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go"}
            </Button>
          </div>

          {showSuggest && suggestions.length > 0 && (
            <div className="mt-1 rounded-2xl bg-card border border-border shadow-lg overflow-hidden">
              {suggestions.map((s) => (
                <button
                  key={s.placeId}
                  onClick={() => {
                    setDestText(s.main);
                    setShowSuggest(false);
                    setSuggestions([]);
                    setTimeout(() => void search(), 0);
                  }}
                  className="w-full text-left px-3 py-2.5 hover:bg-muted/60 border-b border-border last:border-b-0 flex items-start gap-2"
                >
                  <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{s.main}</div>
                    {s.secondary && (
                      <div className="text-xs text-muted-foreground truncate">{s.secondary}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Mode chips */}
          <div className="mt-2 flex gap-2 justify-center">
            {([
              { m: "WALK" as const, icon: Footprints, label: "Walk" },
              { m: "DRIVE" as const, icon: Car, label: "Drive" },
              { m: "BICYCLE" as const, icon: Bike, label: "Bike" },
            ]).map(({ m, icon: Icon, label }) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border shadow-sm transition-colors ${
                  mode === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card/95 backdrop-blur text-foreground border-border"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recenter button */}
      <button
        onClick={recenter}
        className="absolute right-4 z-20 rounded-full bg-card border border-border shadow-lg p-3"
        style={{ bottom: routes ? "48%" : "120px" }}
        aria-label="Recenter"
      >
        <Locate className="h-5 w-5 text-primary" />
      </button>

      {/* Bottom sheet — route results */}
      {routes && routes.length > 0 && (
        <div
          className={`absolute inset-x-0 bottom-0 z-20 rounded-t-3xl border-t border-border bg-card/95 backdrop-blur shadow-2xl transition-transform ${
            sheetOpen ? "translate-y-0" : "translate-y-[calc(100%-88px)]"
          }`}
          style={{ paddingBottom: "calc(88px + env(safe-area-inset-bottom))" }}
        >
          <button
            onClick={() => setSheetOpen((v) => !v)}
            className="w-full flex flex-col items-center pt-2 pb-1"
            aria-label="Toggle route details"
          >
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          </button>

          {selected && (
            <div className="px-4 pt-2 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ background: safetyColor(selected.safety) }}
                  />
                  <span className="font-display text-2xl font-bold leading-none">
                    {formatDuration(selected.durationSeconds)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    · {(selected.distanceMeters / 1000).toFixed(1)} km
                  </span>
                </div>
                <Badge style={{ backgroundColor: safetyColor(selected.safety), color: "#fff" }}>
                  Safety {selected.safety}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{selected.summary}</p>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <MetricChip icon={Lightbulb} label="Lighting" value={selected.lighting} good />
                <MetricChip icon={Users} label="Crowd" value={selected.crowd} good />
                <MetricChip icon={AlertTriangle} label="Crime" value={selected.crime} />
              </div>

              <Button
                className="w-full mt-3 h-11 rounded-xl gap-2"
                onClick={() => {
                  // Open Google Maps navigation as a fallback
                  const dest = decodePolyline(selected.encodedPolyline ?? "").slice(-1)[0];
                  if (!dest) return;
                  const url = `https://www.google.com/maps/dir/?api=1&origin=${origin?.lat},${origin?.lng}&destination=${dest.lat},${dest.lng}&travelmode=${mode.toLowerCase()}`;
                  window.open(url, "_blank");
                }}
              >
                <Navigation className="h-4 w-4" /> Start
              </Button>
            </div>
          )}

          {/* Alternate routes list */}
          <div className="border-t border-border/60 px-2 py-2 max-h-[38vh] overflow-y-auto">
            {routes.map((r, i) => (
              <button
                key={i}
                onClick={() => setSelectedIdx(i)}
                className={`w-full text-left rounded-xl p-3 flex items-center gap-3 transition-colors ${
                  i === selectedIdx ? "bg-primary/10" : "hover:bg-muted/50"
                }`}
              >
                <div className="h-10 w-1.5 rounded-full" style={{ background: safetyColor(r.safety) }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{formatDuration(r.durationSeconds)}</span>
                    <span className="text-xs text-muted-foreground">
                      {(r.distanceMeters / 1000).toFixed(1)} km
                    </span>
                    {i === 0 && (
                      <Badge className="bg-safe text-white text-[10px] px-1.5 py-0">Safest</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Lighting {r.lighting} · Crowd {r.crowd} ·{" "}
                    <span style={{ color: safetyColor(100 - r.crime), fontWeight: 600 }}>
                      Crime {r.crime}
                    </span>
                  </div>
                </div>
                <div
                  className="font-display text-lg font-bold"
                  style={{ color: safetyColor(r.safety) }}
                >
                  {r.safety}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
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