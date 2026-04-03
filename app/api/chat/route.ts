import { createClient } from "@/lib/supabase/server";
import { streamClaude } from "@/lib/claude";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversation_id, message } = await request.json();

  if (!conversation_id || !message) {
    return Response.json(
      { error: "conversation_id and message are required" },
      { status: 400 }
    );
  }

  // Verify the conversation belongs to this user
  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversation_id)
    .eq("client_id", user.id)
    .single();

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Get the client's system prompt
  const { data: config } = await supabase
    .from("client_configs")
    .select("system_prompt")
    .eq("client_id", user.id)
    .single();

  const systemPrompt =
    config?.system_prompt || "You are Clara, a helpful AI assistant.";

  // Save the user message
  await supabase.from("messages").insert({
    conversation_id,
    role: "user",
    content: message,
  });

  // Get conversation history
  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversation_id)
    .order("created_at", { ascending: true });

  const messages = (history || [])
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // Stream Claude response
  let stream;
  try {
    stream = await streamClaude(systemPrompt, messages);
  } catch (err: unknown) {
    console.error("Claude API error:", err);
    const errMsg = err instanceof Error ? err.message : "Claude API error";
    return Response.json({ error: errMsg }, { status: 502 });
  }

  let fullResponse = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const text = event.delta.text;
            fullResponse += text;
            controller.enqueue(new TextEncoder().encode(text));
          }
        }

        // Save the assistant response
        await supabase.from("messages").insert({
          conversation_id,
          role: "assistant",
          content: fullResponse,
        });

        // Update conversation title if this is the first exchange
        if (messages.length <= 1) {
          const title =
            message.length > 50 ? message.substring(0, 50) + "..." : message;
          await supabase
            .from("conversations")
            .update({ title })
            .eq("id", conversation_id);
        }

        controller.close();
      } catch (err) {
        console.error("Stream error:", err);
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
