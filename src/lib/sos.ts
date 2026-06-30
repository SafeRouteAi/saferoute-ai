import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SosTrigger = "manual" | "voice" | "text" | "shake";

export async function getCurrentPosition(): Promise<GeolocationPosition | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
    );
  });
}

export async function triggerSOS(opts: {
  trigger: SosTrigger;
  transcript?: string;
  confidence?: number;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    toast.error("Please sign in to use SOS.");
    return;
  }

  const pos = await getCurrentPosition();
  const lat = pos?.coords.latitude ?? null;
  const lng = pos?.coords.longitude ?? null;
  const mapsUrl =
    lat && lng ? `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}` : null;

  await supabase.from("sos_events").insert({
    user_id: userId,
    lat,
    lng,
    trigger_type: opts.trigger,
    transcript: opts.transcript ?? null,
    confidence: opts.confidence ?? null,
    location_url: mapsUrl,
  });

  const { data: contacts } = await supabase
    .from("emergency_contacts")
    .select("*")
    .order("priority", { ascending: true });

  const message = `I may be in danger. This is my live location: ${mapsUrl ?? "unavailable"}`;

  if (contacts && contacts.length > 0) {
    const numbers = contacts.map((c) => c.phone).join(",");
    const sep = navigator.userAgent.includes("iPhone") ? "&" : "?";
    const smsHref = `sms:${numbers}${sep}body=${encodeURIComponent(message)}`;
    try {
      window.location.href = smsHref;
    } catch {
      // ignore
    }
    toast.success(`SOS sent to ${contacts.length} contact${contacts.length > 1 ? "s" : ""}`);
  } else {
    toast.warning("No emergency contacts saved. Add one in Contacts.");
  }

  try {
    navigator.vibrate?.([200, 100, 200, 100, 400]);
  } catch {
    // ignore
  }

  return { lat, lng, mapsUrl, contactsNotified: contacts?.length ?? 0 };
}