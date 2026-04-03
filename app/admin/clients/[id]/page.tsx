"use client";

import ConversationList from "@/components/ConversationList";
import SystemPromptEditor from "@/components/SystemPromptEditor";
import { createClient } from "@/lib/supabase/client";
import type { ClientConfig, Conversation, Profile } from "@/lib/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [profileRes, configRes, convoRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", clientId).single(),
        supabase
          .from("client_configs")
          .select("*")
          .eq("client_id", clientId)
          .single(),
        supabase
          .from("conversations")
          .select("*")
          .eq("client_id", clientId)
          .order("updated_at", { ascending: false }),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (configRes.data) setConfig(configRes.data);
      if (convoRes.data) setConversations(convoRes.data);
      setLoading(false);
    }
    load();
  }, [clientId, supabase]);

  async function handleCreateConfig() {
    setCreating(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("client_configs")
      .insert({
        client_id: clientId,
        admin_id: user.id,
        project_name: "My Project",
        system_prompt: "You are Clara, a helpful AI assistant.",
      })
      .select()
      .single();

    if (data) setConfig(data);
    setCreating(false);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-500">Client not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center text-sm text-slate-500 hover:text-slate-700"
      >
        &larr; Back to clients
      </Link>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">
          {profile.full_name || profile.email}
        </h2>
        <p className="text-sm text-slate-500">{profile.email}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Config editor */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            Agent Configuration
          </h3>
          {config ? (
            <SystemPromptEditor
              clientId={clientId}
              initialProjectName={config.project_name}
              initialSystemPrompt={config.system_prompt}
            />
          ) : (
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
              <p className="mb-4 text-slate-500">
                No configuration yet. Set up Clara for this client.
              </p>
              <button
                onClick={handleCreateConfig}
                disabled={creating}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Configuration"}
              </button>
            </div>
          )}
        </div>

        {/* Conversations */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            Conversations ({conversations.length})
          </h3>
          {conversations.length === 0 ? (
            <p className="text-sm text-slate-400">
              No conversations yet
            </p>
          ) : (
            <ConversationList
              conversations={conversations}
              basePath="/admin/conversations"
            />
          )}
        </div>
      </div>
    </div>
  );
}
