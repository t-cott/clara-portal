"use client";

import { createClient } from "@/lib/supabase/client";
import type { Ticket } from "@/lib/types";
import { useEffect, useState } from "react";

const statusColors: Record<string, string> = {
  open: "bg-red-50 text-red-700",
  in_progress: "bg-amber-50 text-amber-700",
  resolved: "bg-green-50 text-green-700",
  closed: "bg-slate-100 text-slate-500",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const priorityColors: Record<string, string> = {
  low: "text-slate-400",
  normal: "text-blue-500",
  high: "text-amber-500",
  urgent: "text-red-500",
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      // Get current user ID for filtering
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await loadTickets();

      // Real-time subscription filtered to this client's tickets only
      const channel = supabase
        .channel("client-tickets")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tickets",
            filter: `client_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setTickets((prev) => [payload.new as Ticket, ...prev]);
            } else if (payload.eventType === "UPDATE") {
              const updated = payload.new as Ticket;
              setTickets((prev) =>
                prev.map((t) => (t.id === updated.id ? updated : t))
              );
              setSelectedTicket((prev) =>
                prev?.id === updated.id ? updated : prev
              );
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    init();
  }, []);

  async function loadTickets() {
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTickets(data);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, description, priority }),
    });

    if (res.ok) {
      setSubject("");
      setDescription("");
      setPriority("normal");
      setShowForm(false);
    }
    setSubmitting(false);
  }

  const filtered =
    filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter(
    (t) => t.status === "in_progress"
  ).length;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Ticket list panel */}
      <div
        className={`flex-1 border-r border-slate-200 flex flex-col ${
          selectedTicket || showForm ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Support</h2>
              <div className="flex gap-3 mt-0.5">
                {openCount > 0 && (
                  <p className="text-sm text-red-600">
                    {openCount} open
                  </p>
                )}
                {inProgressCount > 0 && (
                  <p className="text-sm text-amber-600">
                    {inProgressCount} in progress
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setShowForm(true);
                setSelectedTicket(null);
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              New Request
            </button>
          </div>

          {/* Filter tabs */}
          <div className="mt-3 flex gap-1">
            {["all", "open", "in_progress", "resolved", "closed"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === s
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {s === "all"
                  ? "All"
                  : s === "in_progress"
                    ? "In Progress"
                    : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Ticket list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {filter === "all"
                ? 'No support requests yet. Click "New Request" to submit one.'
                : `No ${filter.replace("_", " ")} tickets`}
            </div>
          ) : (
            filtered.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => {
                  setSelectedTicket(ticket);
                  setShowForm(false);
                }}
                className={`w-full px-6 py-4 text-left hover:bg-slate-50 transition-colors ${
                  selectedTicket?.id === ticket.id ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold ${priorityColors[ticket.priority]}`}
                      >
                        {ticket.priority === "urgent"
                          ? "URGENT"
                          : ticket.priority === "high"
                            ? "HIGH"
                            : ""}
                      </span>
                      <p className="truncate font-medium text-slate-900">
                        {ticket.subject}
                      </p>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-400">
                      {ticket.description}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[ticket.status]}`}
                  >
                    {statusLabels[ticket.status]}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                  <span>
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </span>
                  {ticket.updated_at !== ticket.created_at && (
                    <span>
                      Updated{" "}
                      {new Date(ticket.updated_at).toLocaleDateString()}
                    </span>
                  )}
                  {ticket.admin_notes && (
                    <span className="text-blue-500">Has response</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail / Form panel */}
      <div
        className={`flex-1 overflow-y-auto ${
          !selectedTicket && !showForm ? "hidden md:flex md:items-center md:justify-center" : ""
        }`}
      >
        {/* New ticket form */}
        {showForm && (
          <div className="p-6 max-w-lg mx-auto w-full">
            <button
              onClick={() => setShowForm(false)}
              className="mb-4 text-sm text-slate-500 hover:text-slate-700 md:hidden"
            >
              &larr; Back to tickets
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-4">
              New Support Request
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your request"
                  required
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you need help with in detail..."
                  required
                  rows={6}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="low">Low — No rush</option>
                  <option value="normal">Normal — When you get a chance</option>
                  <option value="high">High — Need this soon</option>
                  <option value="urgent">Urgent — Blocking my work</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Ticket detail view */}
        {selectedTicket && !showForm && (
          <div className="p-6">
            <button
              onClick={() => setSelectedTicket(null)}
              className="mb-4 text-sm text-slate-500 hover:text-slate-700 md:hidden"
            >
              &larr; Back to tickets
            </button>

            <div className="space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedTicket.subject}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${statusColors[selectedTicket.status]}`}
                  >
                    {statusLabels[selectedTicket.status]}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                  <span>
                    Submitted{" "}
                    {new Date(selectedTicket.created_at).toLocaleString()}
                  </span>
                  {selectedTicket.updated_at !== selectedTicket.created_at && (
                    <span>
                      Last updated{" "}
                      {new Date(selectedTicket.updated_at).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="mt-1">
                  <span
                    className={`text-xs font-semibold ${priorityColors[selectedTicket.priority]}`}
                  >
                    {priorityLabels[selectedTicket.priority]} Priority
                  </span>
                </div>
              </div>

              {/* Status timeline */}
              <div className="flex items-center gap-2">
                {["open", "in_progress", "resolved", "closed"].map(
                  (step, i) => {
                    const steps = [
                      "open",
                      "in_progress",
                      "resolved",
                      "closed",
                    ];
                    const currentIdx = steps.indexOf(selectedTicket.status);
                    const isActive = i <= currentIdx;
                    return (
                      <div key={step} className="flex items-center gap-2">
                        {i > 0 && (
                          <div
                            className={`h-0.5 w-6 ${isActive ? "bg-blue-500" : "bg-slate-200"}`}
                          />
                        )}
                        <div
                          className={`flex h-7 items-center rounded-full px-2.5 text-xs font-medium ${
                            isActive
                              ? statusColors[step]
                              : "bg-slate-50 text-slate-300"
                          }`}
                        >
                          {statusLabels[step]}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>

              {/* Description */}
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase text-slate-400">
                  Your Request
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Admin response */}
              {selectedTicket.admin_notes ? (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                  <p className="text-xs font-medium uppercase text-blue-600">
                    Admin Response
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-blue-900">
                    {selectedTicket.admin_notes}
                  </p>
                </div>
              ) : (
                selectedTicket.status === "open" && (
                  <div className="rounded-lg border-2 border-dashed border-slate-200 p-4 text-center">
                    <p className="text-sm text-slate-400">
                      Waiting for admin response...
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Empty state for desktop */}
        {!selectedTicket && !showForm && (
          <div className="text-center text-slate-400 p-8">
            <p>Select a ticket to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
