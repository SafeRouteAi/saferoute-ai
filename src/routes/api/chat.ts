import { createFileRoute } from "@tanstack/react-router";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { streamText, convertToModelMessages, type UIMessage } from "ai";

const SYSTEM_PROMPT = `You are SafeRoute Guardian — a warm, calm, expert women's safety assistant.
- Give practical, actionable safety advice in clear, short sentences.
- For active emergencies, urge the user to call local emergency services first.
- Offer to help locate nearby help (police, hospitals, women help centres).
- Suggest concrete next steps: share live location, alert a trusted contact, head to a public well-lit place.
- Be supportive and non-judgmental. Use light markdown (lists, bold) when useful.`;

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
          messages: convertToModelMessages(messages),
        });
        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});