"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ClientDashboard() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkConversations() {
      const { data } = await supabase
        .from("conversations")
        .select("id")
        .order("updated_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        // Redirect to most recent conversation
        router.replace(`/client/chat/${data[0].id}`);
      } else {
        setLoading(false);
      }
    }
    checkConversations();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  async function handleNewChat() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("conversations")
      .insert({ client_id: user.id, title: "New Conversation" })
      .select()
      .single();

    if (data) {
      router.push(`/client/chat/${data.id}`);
    }
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-900">
          Welcome to Clara
        </h2>
        <p className="mt-2 text-slate-500">
          Start your first conversation
        </p>
        <button
          onClick={handleNewChat}
          className="mt-6 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Start Chatting
        </button>
      </div>
    </div>
  );
}
