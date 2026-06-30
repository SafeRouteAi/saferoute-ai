import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

function getGateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key);
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("No JSON in response");
  return JSON.parse(raw.slice(start, end + 1));
}

const TextResult = z.object({
  classification: z.enum(["safe", "suspicious", "emergency"]),
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
});

export const classifyText = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ content: z.string().min(1).max(2000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      messages: [
        {
          role: "system",
          content:
            "You are a women's safety AI. Classify the user's message strictly as JSON: " +
            '{"classification":"safe"|"suspicious"|"emergency","confidence":0-1,"explanation":"one short sentence"}. ' +
            "Emergency = explicit threat, distress, kidnapping, stalking, assault, or 'help me' style pleas. " +
            "Suspicious = vague threats, manipulation, coercion, late-night meet pressure. " +
            "Safe = ordinary message. Return JSON only.",
        },
        { role: "user", content: data.content },
      ],
    });
    return TextResult.parse(extractJson(text));
  });

const VoiceResult = z.object({
  intent: z.enum(["distress", "neutral", "request_help"]),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

export const classifyVoiceIntent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ transcript: z.string().min(1).max(1000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      messages: [
        {
          role: "system",
          content:
            "You detect emergency intent in spoken transcripts for a women's safety app. " +
            'Respond ONLY as JSON: {"intent":"distress"|"request_help"|"neutral","confidence":0-1,"reason":"short phrase"}. ' +
            "distress = clear danger ('help me','someone is following me','I am in danger','please save me','call the police','stop','leave me alone'). " +
            "request_help = asking for assistance without explicit danger. " +
            "neutral = casual speech. Recognize intent not just exact words. Return JSON only.",
        },
        { role: "user", content: data.transcript },
      ],
    });
    return VoiceResult.parse(extractJson(text));
  });

const RouteScore = z.object({
  safety: z.number().min(0).max(100),
  lighting: z.number().min(0).max(100),
  crowd: z.number().min(0).max(100),
  crime: z.number().min(0).max(100),
  summary: z.string(),
});

export const scoreRoute = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      label: z.string(),
      distanceMeters: z.number(),
      durationSeconds: z.number(),
      timeOfDay: z.string(),
      summary: z.string().optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const gateway = getGateway();
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      messages: [
        {
          role: "system",
          content:
            "You are a women's safety route scorer. Given a route's distance, duration, time of day, and any description, " +
            'estimate likely lighting, pedestrian crowd, and crime risk. Return ONLY JSON: {"safety":0-100,"lighting":0-100,"crowd":0-100,"crime":0-100,"summary":"one short sentence"}. ' +
            "Higher safety/lighting/crowd is better; higher crime is worse. Penalize late-night routes.",
        },
        {
          role: "user",
          content: JSON.stringify(data),
        },
      ],
    });
    return RouteScore.parse(extractJson(text));
  });