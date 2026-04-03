"use client";

import { createClient } from "@/lib/supabase/client";
import type { Conversation } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

const statusColors: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  reviewed: "bg-blue-50 text-blue-700",
  approved: "bg-green-50 text-green-700",
  pushed: "bg-purple-50 text-purple-700",
};

const statusLabels: Record<string, string> = {
  pending: "Pending Review",
  reviewed: "Reviewed",
  approved: "Approved",
  pushed: "Pushed to GitHub",
};

interface ConversationWithClient extends Conversation {
  review_status: string;
  profiles?: { full_name: string | null; email: string };
  message_count?: number;
}

export default function GitHubPage() {
  const [conversations, setConversations] = useState<ConversationWithClient[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [repo, setRepo] = useState("");
  const [pushing, setPushing] = useState<string | null>(null);
  const [pushResult, setPushResult] = useState<{
    id: string;
    url?: string;
    error?: string;
  } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    const { data } = await supabase
      .from("conversations")
      .select("*, profiles(full_name, email)")
      .order("updated_at", { ascending: false });

    if (data) setConversations(data as ConversationWithClient[]);
    setLoading(false);
  }

  async function updateStatus(id: string, review_status: string) {
    const res = await fetch(`/api/admin/conversations/${id}/review`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ review_status }),
    });

    if (res.ok) {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, review_status } : c))
      );
    }
  }

  async function pushToGitHub(conversationId: string) {
    if (!repo) {
      setPushResult({
        id: conversationId,
        error: "Enter a GitHub repo (e.g. owner/repo-name)",
      });
      return;
    }

    setPushing(conversationId);
    setPushResult(null);

    const res = await fetch("/api/admin/github/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: conversationId, repo }),
    });

    const data = await res.json();

    if (res.ok) {
      setPushResult({ id: conversationId, url: data.issue_url });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, review_status: "pushed" } : c
        )
      );
    } else {
      setPushResult({ id: conversationId, error: data.error });
    }
    setPushing(null);
  }

  const filtered =
    filter === "all"
      ? conversations
      : conversations.filter((c) => c.review_status === filter);

  const pendingCount = conversations.filter(
    (c) => c.review_status === "pending"
  ).length;
  const approvedCount = conversations.filter(
    (c) => c.review_status === "approved"
  ).length;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          GitHub Review & Push
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Review client conversations, approve changes, and push to GitHub as
          issues.
        </p>
      </div>

      {/* GitHub repo config */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <label className="block text-sm font-medium text-slate-700">
          GitHub Repository
        </label>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repo-name"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Requires GITHUB_TOKEN in .env.local — configure in Integrations
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">
            {conversations.length}
          </p>
          <p className="text-xs text-slate-500">Total</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          <p className="text-xs text-slate-500">Pending</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
          <p className="text-xs text-slate-500">Approved</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">
            {conversations.filter((c) => c.review_status === "pushed").length}
          </p>
          <p className="text-xs text-slate-500">Pushed</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {["all", "pending", "reviewed", "approved", "pushed"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === s
                ? "bg-slate-800 text-white"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}
            {s === "pending" && pendingCount > 0 && (
              <span className="ml-1 rounded-full bg-red-500 px-1.5 text-xs text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Conversation list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
          <p className="text-slate-400">
            No conversations{filter !== "all" && ` with status "${filter}"`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((conv) => (
            <div
              key={conv.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/conversations/${conv.id}`}
                      className="font-medium text-slate-900 hover:text-blue-600"
                    >
                      {conv.title}
                    </Link>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[conv.review_status]}`}
                    >
                      {statusLabels[conv.review_status]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {conv.profiles?.full_name || conv.profiles?.email} &middot;{" "}
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex shrink-0 gap-2">
                  {conv.review_status === "pending" && (
                    <>
                      <Link
                        href={`/admin/conversations/${conv.id}`}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        Review
                      </Link>
                      <button
                        onClick={() => updateStatus(conv.id, "reviewed")}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        Mark Reviewed
                      </button>
                    </>
                  )}
                  {conv.review_status === "reviewed" && (
                    <button
                      onClick={() => updateStatus(conv.id, "approved")}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                    >
                      Approve
                    </button>
                  )}
                  {conv.review_status === "approved" && (
                    <button
                      onClick={() => pushToGitHub(conv.id)}
                      disabled={pushing === conv.id}
                      className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                      {pushing === conv.id
                        ? "Pushing..."
                        : "Push to GitHub"}
                    </button>
                  )}
                  {conv.review_status === "pushed" && (
                    <span className="text-xs text-purple-500">Pushed</span>
                  )}
                </div>
              </div>

              {/* Push result */}
              {pushResult?.id === conv.id && (
                <div
                  className={`mt-3 rounded-lg p-3 text-sm ${
                    pushResult.error
                      ? "bg-red-50 text-red-700"
                      : "bg-green-50 text-green-700"
                  }`}
                >
                  {pushResult.error ? (
                    pushResult.error
                  ) : (
                    <span>
                      Pushed successfully!{" "}
                      <a
                        href={pushResult.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium"
                      >
                        View issue on GitHub
                      </a>
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
