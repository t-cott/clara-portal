"use client";

import ChatInterface from "@/components/ChatInterface";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ChatPage() {
  const params = useParams();
  const id = params.id as string;
  const [messages, setMessages] = useState<Message[] | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      setMessages(data || []);
    }
    load();
  }, [id, supabase]);

  if (messages === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return <ChatInterface conversationId={id} initialMessages={messages} />;
}
