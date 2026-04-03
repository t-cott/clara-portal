"use client";

import ClientCard from "@/components/ClientCard";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ClientConfig } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Stats {
  totalClients: number;
  totalConversations: number;
  messagesToday: number;
  activeClients: number;
  recentMessages: {
    id: string;
    role: string;
    content: string;
    created_at: string;
    conversation_id: string;
    client_name: string;
    conversation_title: string;
  }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [clients, setClients] = useState<
    { profile: Profile; config?: ClientConfig }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      // Load stats and client data in parallel
      const [statsRes, profilesRes, configsRes] = await Promise.all([
        fetch("/api/admin/stats").then((r) => r.json()),
        supabase
          .from("profiles")
          .select("*")
          .eq("role", "client")
          .order("created_at", { ascending: false }),
        supabase.from("client_configs").select("*"),
      ]);

      setStats(statsRes);

      if (profilesRes.data) {
        const configMap = new Map(
          (configsRes.data || []).map((c: ClientConfig) => [c.client_id, c])
        );
        setClients(
          profilesRes.data.map((p: Profile) => ({
            profile: p,
            config: configMap.get(p.id),
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Clients",
      value: stats?.totalClients ?? 0,
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Conversations",
      value: stats?.totalConversations ?? 0,
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Messages Today",
      value: stats?.messagesToday ?? 0,
      color: "bg-amber-50 text-amber-700",
    },
    {
      label: "Active Clients (7d)",
      value: stats?.activeClients ?? 0,
      color: "bg-purple-50 text-purple-700",
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-sm text-slate-500">Overview of your Clara Portal</p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <p className={`mt-1 text-3xl font-bold ${card.color} inline-block rounded-lg px-2 py-0.5`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Recent Activity
        </h3>
        {stats?.recentMessages && stats.recentMessages.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
            {stats.recentMessages.map((msg) => (
              <Link
                key={msg.id}
                href={`/admin/conversations/${msg.conversation_id}`}
                className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
              >
                <div
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                    msg.role === "user" ? "bg-blue-500" : "bg-emerald-500"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">
                      {msg.client_name}
                    </p>
                    <span className="text-xs text-slate-400">
                      {msg.role === "user" ? "sent" : "Clara replied"}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {msg.content}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-slate-400">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
            <p className="text-slate-400">No activity yet</p>
          </div>
        )}
      </div>

      {/* Clients */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Clients ({clients.length})
        </h3>
        {clients.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
            <p className="text-slate-500">
              No clients yet. They'll appear here once they sign up.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map(({ profile, config }) => (
              <ClientCard key={profile.id} profile={profile} config={config} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
