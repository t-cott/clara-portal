"use client";

import AuthGuard from "@/components/AuthGuard";
import ConversationList from "@/components/ConversationList";
import { createClient } from "@/lib/supabase/client";
import type { Conversation, OffboardRequest } from "@/lib/types";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

const offboardStatusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const offboardStatusColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export default function ClientLayout({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOffboard, setShowOffboard] = useState(false);
  const [offboardRequest, setOffboardRequest] =
    useState<OffboardRequest | null>(null);
  const [offboardReason, setOffboardReason] = useState("");
  const [submittingOffboard, setSubmittingOffboard] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadConversations();
    loadOffboardStatus();

    // Real-time sync for offboard request updates from admin
    let cleanup: (() => void) | undefined;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel("client-offboard")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "offboard_requests",
            filter: `client_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === "DELETE") {
              setOffboardRequest(null);
            } else {
              setOffboardRequest(payload.new as OffboardRequest);
            }
          }
        )
        .subscribe();

      cleanup = () => supabase.removeChannel(channel);
    })();

    return () => cleanup?.();
  }, []);

  async function loadConversations() {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data) setConversations(data);
  }

  async function loadOffboardStatus() {
    const res = await fetch("/api/offboard");
    if (res.ok) {
      const data = await res.json();
      if (data) setOffboardRequest(data);
    }
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
      setConversations((prev) => [data, ...prev]);
      router.push(`/client/chat/${data.id}`);
      setSidebarOpen(false);
    }
  }

  async function handleOffboardSubmit() {
    setSubmittingOffboard(true);
    const res = await fetch("/api/offboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: offboardReason }),
    });

    if (res.ok) {
      const data = await res.json();
      setOffboardRequest(data);
      setOffboardReason("");
      setShowOffboard(false);
    }
    setSubmittingOffboard(false);
  }

  async function handleCancelOffboard() {
    const res = await fetch("/api/offboard", { method: "DELETE" });
    if (res.ok) {
      setOffboardRequest(null);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <AuthGuard allowedRole="client">
      <div className="flex h-screen bg-white">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed left-4 top-4 z-50 rounded-lg bg-white p-2 shadow-md md:hidden"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-[calc(100%-3rem)] max-w-72 transform border-r border-slate-200 bg-slate-50 transition-transform duration-200 md:relative md:w-72 md:max-w-none md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 p-4">
              <h1 className="text-lg font-bold text-slate-900">Clara Portal</h1>
            </div>

            <div className="p-3">
              <button
                onClick={handleNewChat}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                + New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3">
              <ConversationList conversations={conversations} />
            </div>

            <div className="border-t border-slate-200 p-3 space-y-1">
              <a
                href="/client/support"
                onClick={() => setSidebarOpen(false)}
                className="block w-full rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 text-center"
              >
                Support
              </a>
              <button
                onClick={() => setShowOffboard(true)}
                className="w-full rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                {offboardRequest ? "Offboard Status" : "Request Offboarding"}
              </button>
              <button
                onClick={handleSignOut}
                className="w-full rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                Sign Out
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/20 md:hidden"
          />
        )}

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0">{children}</main>

        {/* Offboard modal */}
        {showOffboard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              {!offboardRequest ? (
                <>
                  <h3 className="text-lg font-bold text-slate-900">
                    Request Offboarding
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Let your admin know you'd like to wrap up. They'll handle
                    the offboarding process on their end.
                  </p>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700">
                      Reason (optional)
                    </label>
                    <textarea
                      value={offboardReason}
                      onChange={(e) => setOffboardReason(e.target.value)}
                      rows={3}
                      placeholder="Let your admin know why you're wrapping up..."
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={handleOffboardSubmit}
                      disabled={submittingOffboard}
                      className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
                    >
                      {submittingOffboard ? "Submitting..." : "Submit Request"}
                    </button>
                    <button
                      onClick={() => setShowOffboard(false)}
                      className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-slate-900">
                    Offboarding Status
                  </h3>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-500">Status</p>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${offboardStatusColors[offboardRequest.status]}`}
                      >
                        {offboardStatusLabels[offboardRequest.status]}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-500">Submitted</p>
                      <p className="text-sm text-slate-700">
                        {new Date(
                          offboardRequest.created_at
                        ).toLocaleDateString()}
                      </p>
                    </div>

                    {offboardRequest.reason && (
                      <div>
                        <p className="text-sm text-slate-500">Your reason</p>
                        <p className="mt-1 text-sm text-slate-700">
                          {offboardRequest.reason}
                        </p>
                      </div>
                    )}

                    {offboardRequest.admin_notes && (
                      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                        <p className="text-xs font-medium text-blue-600">
                          Admin Response
                        </p>
                        <p className="mt-1 text-sm text-blue-900">
                          {offboardRequest.admin_notes}
                        </p>
                      </div>
                    )}

                    {/* Status timeline */}
                    <div className="flex items-center gap-2 pt-2">
                      {["pending", "in_progress", "completed"].map(
                        (step, i) => {
                          const steps = [
                            "pending",
                            "in_progress",
                            "completed",
                          ];
                          const currentIdx = steps.indexOf(
                            offboardRequest.status
                          );
                          const isActive = i <= currentIdx;
                          return (
                            <div
                              key={step}
                              className="flex items-center gap-2"
                            >
                              {i > 0 && (
                                <div
                                  className={`h-0.5 w-6 ${isActive ? "bg-blue-500" : "bg-slate-200"}`}
                                />
                              )}
                              <div
                                className={`flex h-7 items-center rounded-full px-2.5 text-xs font-medium ${
                                  isActive
                                    ? offboardStatusColors[step]
                                    : "bg-slate-50 text-slate-300"
                                }`}
                              >
                                {step === "pending"
                                  ? "Requested"
                                  : step === "in_progress"
                                    ? "Processing"
                                    : "Complete"}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex gap-3">
                    {offboardRequest.status === "pending" && (
                      <button
                        onClick={handleCancelOffboard}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Cancel Request
                      </button>
                    )}
                    <button
                      onClick={() => setShowOffboard(false)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
