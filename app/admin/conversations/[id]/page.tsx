"use client";

import MessageBubble from "@/components/MessageBubble";
import { createClient } from "@/lib/supabase/client";
import type { Conversation, Message } from "@/lib/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ConversationViewPage() {
  const params = useParams();
  const id = params.id as string;
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [convoRes, msgRes] = await Promise.all([
        supabase.from("conversations").select("*").eq("id", id).single(),
        supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", id)
          .order("created_at", { ascending: true }),
      ]);

      if (convoRes.data) setConversation(convoRes.data);
      if (msgRes.data) setMessages(msgRes.data);
      setLoading(false);
    }
    load();

    // Subscribe to new messages in real-time
    const channel = supabase
      .channel(`messages-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, supabase]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <Link
          href="/admin"
          className="mb-2 inline-flex items-center text-sm text-slate-500 hover:text-slate-700"
        >
          &larr; Back to dashboard
        </Link>
        <h2 className="text-lg font-semibold text-slate-900">
          {conversation?.title || "Conversation"}
        </h2>
        <p className="text-xs text-slate-400">
          Read-only transcript view
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-slate-400">No messages yet</p>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
      </div>
    </div>
  );
}
