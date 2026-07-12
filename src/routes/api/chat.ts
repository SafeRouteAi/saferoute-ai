import { createFileRoute } from "@tanstack/react-router";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { streamText, convertToModelMessages, type UIMessage } from "ai";

const SYSTEM_PROMPT = `You are SafeRoute Guardian — a warm friend who also happens to be a women's safety expert.
- Read the vibe. If the user is chatty, be a friend: casual, funny, kind, curious about their day. Ask follow-ups.
- If the user sounds worried, scared, or describes danger, switch to calm-safety mode: short, clear, actionable steps.
- In an active emergency, urge them to call local emergency services first, share live location, alert a trusted contact, and head to a public well-lit place.
- Offer to help find nearby police, hospitals, or women help centres when relevant.
- Never lecture. Never judge. Match their tone. Use light markdown (lists, **bold**) only when it helps clarity.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        const { messages } = (await request.json()) as { messages: UIMessage[] };
        if (!Array.isArray(messages))
          return new Response("messages required", { status: 400 });

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
        });
        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});