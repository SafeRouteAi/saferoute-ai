export const SAFETY_TIPS = [
  "Share your live location with a trusted contact when traveling alone after dark.",
  "Trust your instincts — if a place or person feels unsafe, leave immediately.",
  "Save emergency numbers on speed dial and keep your phone charged above 30%.",
  "Walk on well-lit streets and avoid shortcuts through isolated areas.",
  "Vary your daily routine and routes to avoid being predictable.",
  "Keep keys ready in your hand before reaching your door or car.",
  "Use the Guardian Mode feature when walking alone at night.",
  "Check in with a friend before and after late-night travel.",
  "Avoid wearing both earphones at once when walking in unfamiliar areas.",
  "If followed, head to a crowded public place like a store or restaurant.",
];

export function todaySafetyTip() {
  const day = new Date().getDate();
  return SAFETY_TIPS[day % SAFETY_TIPS.length];
}

export type PlaceCategory =
  | "police" | "hospital" | "pharmacy" | "women_help" | "petrol" | "store_24x7";

export const PLACE_LABEL: Record<PlaceCategory, string> = {
  police: "Police Station",
  hospital: "Hospital",
  pharmacy: "Pharmacy",
  women_help: "Women Help Centre",
  petrol: "Petrol Pump",
  store_24x7: "24×7 Store",
};

export const PLACE_GMAPS_QUERY: Record<PlaceCategory, string> = {
  police: "police station",
  hospital: "hospital",
  pharmacy: "pharmacy",
  women_help: "women help centre",
  petrol: "petrol pump",
  store_24x7: "24 hour convenience store",
};

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// Pseudo-random but stable score from a string seed (0-100)
export function hashScore(seed: string, min = 55, max = 98) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (h % (max - min + 1));
}

export function timeOfDayRisk() {
  const h = new Date().getHours();
  if (h >= 22 || h < 5) return { label: "Late night", risk: 0.6 };
  if (h >= 19) return { label: "Evening", risk: 0.35 };
  if (h >= 5 && h < 8) return { label: "Early morning", risk: 0.25 };
  return { label: "Daytime", risk: 0.1 };
}