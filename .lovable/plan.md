
# SafeRoute AI — Implementation Plan

A mobile-first **Progressive Web App** (installable on Android home screen) for women's safety, with AI voice/text detection, safer route recommendations, SOS, and a Gemini-powered chatbot.

> Note: Lovable builds web apps, not native Flutter apps. The PWA runs in mobile Chrome and can be installed via "Add to Home Screen." Native-only items (true background mic, power-button trigger, auto-place phone calls) are replaced with the closest web equivalents — called out below.

---

## 1. Design System

- Material Design 3 inspired, mobile-first (preview locked to mobile viewport)
- Palette in `src/styles.css` as oklch tokens:
  - Primary purple `#6750A4`, Primary dark `#21005D`
  - Navy `#1A237E`, Accent lavender, surface white, soft gray
  - Semantic: safe (green), caution (amber), danger (red)
- Typography: Outfit (display) + Figtree (body) via `@fontsource`
- Rounded 2xl cards, soft elevation shadows, gradient SOS button, framer-motion micro-animations
- Bottom tab nav: Home · Routes · Chat · Dashboard · Settings

## 2. Stack & Setup

- TanStack Start (existing), PWA via `vite-plugin-pwa` (manifest + offline shell, guarded for Lovable preview)
- Enable **Lovable Cloud** (Supabase auth + Postgres)
- Provision **LOVABLE_API_KEY** (Gemini via AI Gateway)
- Connect **Google Maps Platform** connector (Maps JS, Places New, Routes, Geocoding)

## 3. Data Model (Lovable Cloud)

- `profiles` (id, name, avatar)
- `emergency_contacts` (id, user_id, name, phone, relationship, priority)
- `sos_events` (id, user_id, lat, lng, trigger_type, transcript, confidence, created_at)
- `voice_detections`, `text_detections` (user_id, content, classification, confidence, ts)
- `safe_routes_history` (user_id, origin, destination, chosen_route, safety_score, ts)
- `settings` (user_id, dark_mode, language, voice_sensitivity, shake_sos, auto_guardian)
- RLS: owner-only; separate `user_roles` table per platform rules
- All tables include explicit `GRANT`s

## 4. Routes (TanStack file-based)

- `/auth` — email + Google sign-in (Lovable Cloud)
- `/_authenticated/` layout (gate)
  - `/` — Home (SOS, score, quick actions, daily tip)
  - `/guardian` — Voice Guardian Mode (foreground listening)
  - `/text-check` — AI text classifier
  - `/routes` — Safe Route AI (Google Map + ranked routes)
  - `/nearby` — Nearby safe places (Places New)
  - `/contacts` — Emergency contacts CRUD
  - `/chat` — Gemini safety chatbot
  - `/fake-call` — Schedule + realistic incoming call screen
  - `/dashboard` — Safety dashboard
  - `/settings` — Preferences
- `/api/chat` — streaming Gemini chat (server route)
- `/lib/ai.functions.ts` — `classifyText`, `classifyVoiceIntent`, `scoreRoute` (createServerFn)
- `/lib/maps.functions.ts` — geocode, compute routes, nearby places via Google Maps gateway

## 5. Feature Implementation

**Home** — Large gradient SOS button (long-press 1s to fire, prevents misfire); live GPS via `navigator.geolocation`; AI Safety Score derived from time-of-day + area sample data + recent events; quick action grid; rotating daily safety tip.

**Guardian Mode (voice)** — Web Speech API `SpeechRecognition` (foreground only; banner explains tab must stay open). Continuous transcript chunks → `classifyVoiceIntent` server fn (Gemini) returns `{intent, confidence, reason}`. ≥80% confidence triggers SOS flow. Confidence bar + last-heard phrase shown live.

**Text Detection** — Textarea → `classifyText` returns `safe|suspicious|emergency` + confidence + explanation. Emergency auto-triggers SOS (with 5s undo).

**Safe Route AI** — Google Maps JS (browser key, async + callback). User picks origin/destination via Places New autocomplete. Call Routes API `computeRoutes` with `computeAlternativeRoutes:true`. For each alternative, `scoreRoute` (Gemini + heuristics on time-of-day, route length, sample lighting/crowd/crime data) returns scores. Render route cards with Safety/Lighting/Crowd/Crime/ETA, polylines color-coded; "Recommended safest" badge.

**SOS Flow** — Single action that: gets GPS → writes `sos_events` row → opens `sms:` link prefilled `"I may be in danger. This is my live location: <maps url>"` with all contacts → opens `tel:` for top-priority contact (browser-limited: user taps confirm) → starts `MediaRecorder` audio capture stored to Cloud Storage (best effort while tab open).

**Emergency Contacts** — Full CRUD, priority ordering, validated phone input.

**Nearby Safe Places** — Places API (New) `searchNearby` via gateway for police/hospital/pharmacy/women-help/petrol/24x7; cards with distance + "Navigate" deep link to Google Maps.

**AI Chatbot** — AI SDK `useChat` → `/api/chat` → Gemini with safety-focused system prompt; markdown rendering; suggested prompts.

**Fake Call** — Timer (10s/30s/60s) → full-screen incoming call UI with ringtone, vibration (`navigator.vibrate`), accept/decline; plays canned "caller" audio on accept.

**Dashboard** — Today's score, Guardian status, counts of voice/text detections, SOS history list, contacts summary, recent routes.

**Settings** — Dark mode toggle (theme class), language (i18n stub: EN/HI/ES), voice sensitivity slider, shake-to-SOS (DeviceMotion + permission prompt on iOS), auto-start Guardian on launch, geolocation permission status. Web limitations noted inline (power-button SOS not possible).

## 6. PWA

- `manifest.webmanifest` with purple theme, standalone display, icons (generated)
- Guarded service worker registration (skip in Lovable preview/iframe)
- Install prompt banner on Android

## 7. Build Order

1. Enable Lovable Cloud + provision Lovable API key + connect Google Maps
2. Design tokens, fonts, layout shell, bottom nav, mobile viewport
3. Auth + DB migrations (all tables + RLS + grants)
4. Home + SOS + Contacts + Settings (foundation)
5. AI server fns + Guardian Mode + Text Detection + Chatbot
6. Maps integration: Safe Routes + Nearby
7. Dashboard, Fake Call, Daily tips
8. PWA manifest + service worker + icons
9. Polish, animations, empty/loading states

## Technical notes (for reference)

- TanStack: routes under `src/routes`, `_authenticated` gate, server fns in `src/lib/*.functions.ts`
- AI calls go through Lovable AI Gateway with `createLovableAiGatewayProvider` (server-only)
- Google Maps: browser key for Maps JS / Places autocomplete; gateway for Routes/Places search/Geocoding
- All Supabase access via integration clients; no service-role on client
- Sample data fallbacks for safety scoring where no live API exists

## Out of scope (web limitations)

- True background voice listening when tab is closed
- Power-button trigger
- Auto-dialing without a user tap
- Native Play Store binary (would require Capacitor wrap as a follow-up)
