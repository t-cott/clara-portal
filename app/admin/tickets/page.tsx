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

interface TicketWithClient extends Ticket {
  profiles?: { full_name: string | null; email: string };
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<TicketWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithClient | null>(
    null
  );
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const supabase = createClient();

  useEffect(() => {
    loadTickets();

    const channel = supabase
      .channel("admin-tickets")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => loadTickets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadTickets() {
    const { data } = await supabase
      .from("tickets")
      .select("*, profiles(full_name, email)")
      .order("created_at", { ascending: false });

    if (data) setTickets(data as TicketWithClient[]);
    setLoading(false);
  }

  async function updateTicket(id: string, status: string) {
    setSaving(true);
    const res = await fetch(`/api/admin/tickets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, admin_notes: adminNotes }),
    });

    if (res.ok) {
      const updated = await res.json();
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updated } : t))
      );
      if (selectedTicket?.id === id) {
        setSelectedTicket({ ...selectedTicket, ...updated });
      }
    }
    setSaving(false);
  }

  // Build client list for filter dropdown
  const clientMap = new Map<
    string,
    { name: string; openCount: number; totalCount: number }
  >();
  tickets.forEach((t) => {
    const name =
      t.profiles?.full_name || t.profiles?.email || "Unknown";
    const existing = clientMap.get(t.client_id) || {
      name,
      openCount: 0,
      totalCount: 0,
    };
    existing.totalCount++;
    if (t.status === "open" || t.status === "in_progress") {
      existing.openCount++;
    }
    clientMap.set(t.client_id, existing);
  });

  // Apply filters
  const filtered = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (clientFilter !== "all" && t.client_id !== clientFilter) return false;
    return true;
  });

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
      {/* Ticket list */}
      <div
        className={`flex-1 border-r border-slate-200 flex flex-col ${
          selectedTicket ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="border-b border-slate-200 px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Support Tickets
              </h2>
              <div className="flex gap-3 mt-0.5">
                {openCount > 0 && (
                  <p className="text-sm text-red-600">{openCount} open</p>
                )}
                {inProgressCount > 0 && (
                  <p className="text-sm text-amber-600">
                    {inProgressCount} in progress
                  </p>
                )}
                {openCount === 0 && inProgressCount === 0 && (
                  <p className="text-sm text-green-600">All clear</p>
                )}
              </div>
            </div>
          </div>

          {/* Client filter */}
          <div>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">
                All Clients ({tickets.length} tickets)
              </option>
              {Array.from(clientMap.entries()).map(([id, info]) => (
                <option key={id} value={id}>
                  {info.name} ({info.totalCount} tickets
                  {info.openCount > 0 ? `, ${info.openCount} active` : ""})
                </option>
              ))}
            </select>
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-1">
            {["all", "open", "in_progress", "resolved", "closed"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === s
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

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No tickets match the current filters
            </div>
          ) : (
            filtered.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => {
                  setSelectedTicket(ticket);
                  setAdminNotes(ticket.admin_notes || "");
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
                    <p className="mt-0.5 text-sm text-slate-500">
                      {ticket.profiles?.full_name || ticket.profiles?.email}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[ticket.status]}`}
                  >
                    {statusLabels[ticket.status]}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-400">
                  {ticket.description}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(ticket.created_at).toLocaleString()}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Ticket detail */}
      {selectedTicket && (
        <div className="flex-1 overflow-y-auto p-6">
          <button
            onClick={() => setSelectedTicket(null)}
            className="mb-4 text-sm text-slate-500 hover:text-slate-700 md:hidden"
          >
            &larr; Back to list
          </button>

          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between">
                <h3 className="text-xl font-bold text-slate-900">
                  {selectedTicket.subject}
                </h3>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${statusColors[selectedTicket.status]}`}
                >
                  {statusLabels[selectedTicket.status]}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                <span>
                  From:{" "}
                  <strong>
                    {selectedTicket.profiles?.full_name ||
                      selectedTicket.profiles?.email}
                  </strong>
                </span>
                <span>
                  {new Date(selectedTicket.created_at).toLocaleString()}
                </span>
                {selectedTicket.updated_at !== selectedTicket.created_at && (
                  <span>
                    Updated{" "}
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

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase text-slate-400">
                Client's Request
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                {selectedTicket.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Admin Notes
              </label>
              <p className="mt-0.5 text-xs text-slate-400">
                Visible to the client — use this to respond or provide updates
              </p>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
                placeholder="Write a response to the client..."
                className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedTicket.status !== "in_progress" && (
                <button
                  onClick={() =>
                    updateTicket(selectedTicket.id, "in_progress")
                  }
                  disabled={saving}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  Mark In Progress
                </button>
              )}
              {selectedTicket.status !== "resolved" && (
                <button
                  onClick={() => updateTicket(selectedTicket.id, "resolved")}
                  disabled={saving}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Resolve
                </button>
              )}
              {selectedTicket.status !== "closed" && (
                <button
                  onClick={() => updateTicket(selectedTicket.id, "closed")}
                  disabled={saving}
                  className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  Close
                </button>
              )}
              {selectedTicket.status !== "open" && (
                <button
                  onClick={() => updateTicket(selectedTicket.id, "open")}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  Reopen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
