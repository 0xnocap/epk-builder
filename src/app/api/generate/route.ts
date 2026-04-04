import { NextRequest } from "next/server";
import { generateText } from "@/lib/gemini";

const SYSTEM_PROMPT =
  "You are an expert music publicist and copywriter. You write compelling, modern EPK copy for independent musicians. Be concise, authentic, and professional. No fluff.";

export async function POST(request: NextRequest) {
  const { type, context } = await request.json();

  let prompt: string;
  switch (type) {
    case "bio":
      prompt = `Write a compelling 2-3 sentence artist bio for ${context.artistName || "an artist"}, a ${context.genre || "music"} artist${context.location ? ` from ${context.location}` : ""}. ${context.additionalInfo || ""} Keep it professional but authentic. Write ONLY the bio text, no labels or headers.`;
      break;
    case "refine":
      prompt = `Improve this artist bio while keeping the same tone, facts, and length. Make it more compelling and professional:\n\n"${context.bio}"\n\nWrite ONLY the improved bio text.`;
      break;
    default:
      return Response.json({ error: "Unknown generation type" }, { status: 400 });
  }

  try {
    const text = await generateText(prompt, SYSTEM_PROMPT);
    return Response.json({ text: text.trim() });
  } catch (err) {
    console.error("Generation failed:", err);
    return Response.json(
      { error: "Generation temporarily unavailable" },
      { status: 503 }
    );
  }
}
