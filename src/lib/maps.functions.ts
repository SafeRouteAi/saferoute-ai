import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

function gwHeaders(extra: Record<string, string> = {}) {
  const lov = process.env.LOVABLE_API_KEY;
  const gm = process.env.GOOGLE_MAPS_API_KEY;
  if (!lov || !gm) throw new Error("Google Maps connector not configured");
  return {
    Authorization: `Bearer ${lov}`,
    "X-Connection-Api-Key": gm,
    ...extra,
  };
}

export const computeRoutes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      origin: z.object({ lat: z.number(), lng: z.number() }),
      destination: z.object({ lat: z.number(), lng: z.number() }),
      travelMode: z.enum(["WALK", "DRIVE", "BICYCLE", "TRANSIT"]).default("WALK"),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const body = {
      origin: { location: { latLng: { latitude: data.origin.lat, longitude: data.origin.lng } } },
      destination: { location: { latLng: { latitude: data.destination.lat, longitude: data.destination.lng } } },
      travelMode: data.travelMode,
      computeAlternativeRoutes: true,
    };
    const res = await fetch(`${GATEWAY}/routes/directions/v2:computeRoutes`, {
      method: "POST",
      headers: gwHeaders({
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.description,routes.legs.steps.navigationInstruction",
      }),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Routes failed: ${res.status} ${await res.text()}`);
    return await res.json();
  });

export const nearbyPlaces = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      lat: z.number(),
      lng: z.number(),
      query: z.string().min(1),
      radius: z.number().default(3000),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const res = await fetch(`${GATEWAY}/places/v1/places:searchText`, {
      method: "POST",
      headers: gwHeaders({
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.googleMapsUri,places.nationalPhoneNumber",
      }),
      body: JSON.stringify({
        textQuery: data.query,
        locationBias: {
          circle: {
            center: { latitude: data.lat, longitude: data.lng },
            radius: data.radius,
          },
        },
        maxResultCount: 10,
      }),
    });
    if (!res.ok) throw new Error(`Places failed: ${res.status} ${await res.text()}`);
    return await res.json();
  });