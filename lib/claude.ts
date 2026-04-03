import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";

function getAnthropicKey(): string {
  // Try process.env first
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  // Fallback: read from .env.local directly
  try {
    const envPath = join(process.cwd(), ".env.local");
    const envContent = readFileSync(envPath, "utf-8");
    const match = envContent.match(/^ANTHROPIC_API_KEY=(.+)$/m);
    if (match) return match[1].trim();
  } catch {}

  throw new Error("ANTHROPIC_API_KEY not found");
}

export async function streamClaude(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[]
) {
  const anthropic = new Anthropic({
    apiKey: getAnthropicKey(),
  });

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  });

  return stream;
}
