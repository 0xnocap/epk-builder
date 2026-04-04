import { KeyRotator, type LLMBucket, type LLMResponse } from "./key-rotator";

const K1 = process.env.GEMINI_API_KEY || "";
const K2 = process.env.GEMINI_API_KEY_2 || K1;
const K3 = process.env.GEMINI_API_KEY_3 || K1;

const buckets: LLMBucket[] = [
  // Lite models first (1500 RPD each)
  { provider: "gemini", model: "gemini-2.5-flash-lite", apiKey: K1, label: "2.5-lite@K1" },
  { provider: "gemini", model: "gemini-2.5-flash-lite", apiKey: K2, label: "2.5-lite@K2" },
  { provider: "gemini", model: "gemini-2.5-flash-lite", apiKey: K3, label: "2.5-lite@K3" },
  { provider: "gemini", model: "gemini-3.1-flash-lite-preview", apiKey: K1, label: "3.1-lite@K1" },
  { provider: "gemini", model: "gemini-3.1-flash-lite-preview", apiKey: K2, label: "3.1-lite@K2" },
  { provider: "gemini", model: "gemini-3.1-flash-lite-preview", apiKey: K3, label: "3.1-lite@K3" },
  // Quality models fallback (500 RPD each)
  { provider: "gemini", model: "gemini-2.5-flash", apiKey: K1, label: "2.5-flash@K1" },
  { provider: "gemini", model: "gemini-2.5-flash", apiKey: K2, label: "2.5-flash@K2" },
  { provider: "gemini", model: "gemini-2.5-flash", apiKey: K3, label: "2.5-flash@K3" },
  { provider: "gemini", model: "gemini-3-flash-preview", apiKey: K1, label: "3-flash@K1" },
  { provider: "gemini", model: "gemini-3-flash-preview", apiKey: K2, label: "3-flash@K2" },
  { provider: "gemini", model: "gemini-3-flash-preview", apiKey: K3, label: "3-flash@K3" },
];

const rotator = new KeyRotator({ agentName: "epk-generator", buckets });

export async function generateText(
  prompt: string,
  systemInstruction?: string
): Promise<string> {
  const result = await rotator.call(
    async (bucket) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${bucket.model}:generateContent?key=${bucket.apiKey}`;
      const body: Record<string, unknown> = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
      };
      if (systemInstruction) {
        body.systemInstruction = { parts: [{ text: systemInstruction }] };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 429) throw new Error("429 rate limited");
      if (res.status === 401 || res.status === 403)
        throw new Error(`${res.status} Unauthorized`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return {
        text,
        usage: {
          inputTokens: data.usageMetadata?.promptTokenCount || 0,
          outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
        },
      } satisfies LLMResponse;
    },
    (err) => {
      const msg = (err as Error)?.message || String(err);
      return msg.includes("429");
    }
  );

  return result.text;
}
