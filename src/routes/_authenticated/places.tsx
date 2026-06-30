import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Loader2, Navigation2, Star } from "lucide-react";
import { getCurrentPosition } from "@/lib/sos";
import { nearbyPlaces } from "@/lib/maps.functions";
import { PLACE_LABEL, PLACE_GMAPS_QUERY, distanceKm, type PlaceCategory } from "@/lib/sample-data";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/places")({ component: PlacesPage });

type Place = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
};

const CATS: PlaceCategory[] = ["police","hospital","pharmacy","women_help","petrol","store_24x7"];

function PlacesPage() {
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [cat, setCat] = useState<PlaceCategory>("police");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void getCurrentPosition().then((p) => {
      if (p) setLoc({ lat: p.coords.latitude, lng: p.coords.longitude });
    });
  }, []);

  useEffect(() => {
    if (!loc) return;
    setLoading(true);
    setPlaces([]);
    nearbyPlaces({ data: { lat: loc.lat, lng: loc.lng, query: PLACE_GMAPS_QUERY[cat], radius: 3000 } })
      .then((res) => {
        const arr = (res as { places?: Place[] }).places ?? [];
        setPlaces(arr);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Search failed"))
      .finally(() => setLoading(false));
  }, [cat, loc]);

  return (
    <div>
      <PageHeader title="Nearby Safe Places" subtitle="Help within reach" />

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
              cat === c
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-foreground"
            }`}
          >
            {PLACE_LABEL[c]}
          </button>
        ))}
      </div>

      {!loc && (
        <p className="text-sm text-muted-foreground mt-6 text-center">
          Allow location access to find nearby help.
        </p>
      )}

      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      <div className="mt-3 space-y-2">
        {places.map((p) => {
          const dist =
            loc && p.location
              ? distanceKm(loc, { lat: p.location.latitude, lng: p.location.longitude })
              : null;
          return (
            <div key={p.id} className="rounded-2xl bg-card border border-border p-3 flex gap-3 items-center">
              <div className="flex-1 min-w-0">
                <div className="font-display font-semibold text-sm truncate">
                  {p.displayName?.text ?? "Unknown"}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2">{p.formattedAddress}</div>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                  {dist !== null && <span>{dist.toFixed(1)} km</span>}
                  {p.rating && (
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-caution text-caution" />{p.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
              {p.googleMapsUri && (
                <a href={p.googleMapsUri} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="secondary">
                    <Navigation2 className="h-3 w-3 mr-1" />Go
                  </Button>
                </a>
              )}
            </div>
          );
        })}
        {!loading && loc && places.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No results found nearby.</p>
        )}
      </div>
    </div>
  );
}