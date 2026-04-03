"use client";

import { createClient } from "@/lib/supabase/client";
import type { Profile, ClientConfig, OffboardRequest } from "@/lib/types";
import { useEffect, useState } from "react";

const offboardStatusColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-slate-100 text-slate-500",
};

const offboardStatusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

interface ClientRow {
  profile: Profile;
  config?: ClientConfig;
  offboard?: OffboardRequest;
}

export default function ClientManagementPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffboard, setSelectedOffboard] =
    useState<OffboardRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadClients();

    // Real-time sync for new offboard requests from clients
    const channel = supabase
      .channel("admin-offboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offboard_requests" },
        () => loadClients()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadClients() {
    const [profilesRes, configsRes, offboardRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "client")
        .order("created_at", { ascending: false }),
      supabase.from("client_configs").select("*"),
      supabase.from("offboard_requests").select("*"),
    ]);

    if (profilesRes.data) {
      const configMap = new Map(
        (configsRes.data || []).map((c: ClientConfig) => [c.client_id, c])
      );
      const offboardMap = new Map(
        (offboardRes.data || []).map((o: OffboardRequest) => [o.client_id, o])
      );
      setClients(
        profilesRes.data.map((p: Profile) => ({
          profile: p,
          config: configMap.get(p.id),
          offboard: offboardMap.get(p.id),
        }))
      );
    }
    setLoading(false);
  }

  async function updateOffboard(id: string, status: string) {
    setSaving(true);
    const res = await fetch(`/api/admin/offboard/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, admin_notes: adminNotes }),
    });

    if (res.ok) {
      if (status === "completed") {
        // Client was deleted — remove from list
        setClients((prev) =>
          prev.filter((c) => c.offboard?.id !== id)
        );
        setSelectedOffboard(null);
      } else {
        await loadClients();
        setSelectedOffboard(null);
      }
    }
    setSaving(false);
  }

  async function handleInitiateOffboard(clientId: string) {
    setDeleting(clientId);
    const res = await fetch(`/api/admin/offboard/${clientId}`, {
      method: "POST",
    });
    if (res.ok) {
      await loadClients();
      setConfirmDeleteId(null);
    }
    setDeleting(null);
  }

  const offboardPending = clients.filter(
    (c) =>
      c.offboard &&
      (c.offboard.status === "pending" || c.offboard.status === "in_progress")
  );
  const activeClients = clients.filter(
    (c) => !c.offboard || c.offboard.status === "cancelled"
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Client Management
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Manage active clients and process offboarding requests
        </p>
      </div>

      {/* Offboard requests section */}
      {offboardPending.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold text-slate-900 flex items-center gap-2">
            Offboarding Requests
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
              {offboardPending.length}
            </span>
          </h3>
          <div className="space-y-3">
            {offboardPending.map(({ profile, config, offboard }) => (
              <div
                key={offboard!.id}
                className="rounded-xl border border-amber-200 bg-amber-50/50 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {profile.full_name || profile.email}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${offboardStatusColors[offboard!.status]}`}
                      >
                        {offboardStatusLabels[offboard!.status]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {profile.email}
                      {config && ` — ${config.project_name}`}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Requested{" "}
                      {new Date(offboard!.created_at).toLocaleDateString()}
                    </p>
                    {offboard!.reason && (
                      <div className="mt-2 rounded-lg bg-white p-3">
                        <p className="text-xs font-medium text-slate-400">
                          Client's reason
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {offboard!.reason}
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedOffboard(offboard!);
                      setAdminNotes(offboard!.admin_notes || "");
                    }}
                    className="shrink-0 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
                  >
                    Process
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active clients */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">
          Active Clients ({activeClients.length})
        </h3>
        {activeClients.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
            <p className="text-slate-500">No active clients</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeClients.map(({ profile, config }) => (
                  <tr key={profile.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">
                        {profile.full_name || "No name"}
                      </p>
                      <p className="text-sm text-slate-500">{profile.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {config?.project_name || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {confirmDeleteId === profile.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-slate-500">
                            Start offboarding?
                          </span>
                          <button
                            onClick={() => handleInitiateOffboard(profile.id)}
                            disabled={deleting === profile.id}
                            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-50"
                          >
                            {deleting === profile.id
                              ? "Starting..."
                              : "Confirm"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(profile.id)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          Offboard
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Offboard processing modal */}
      {selectedOffboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Process Offboarding
            </h3>

            {selectedOffboard.reason && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-400">
                  Client's reason
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {selectedOffboard.reason}
                </p>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">
                Admin Notes
              </label>
              <p className="mt-0.5 text-xs text-slate-400">
                Visible to the client
              </p>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                placeholder="Add notes about the offboarding process..."
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {selectedOffboard.status === "pending" && (
                <button
                  onClick={() =>
                    updateOffboard(selectedOffboard.id, "in_progress")
                  }
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Start Processing
                </button>
              )}
              <button
                onClick={() =>
                  updateOffboard(selectedOffboard.id, "completed")
                }
                disabled={saving}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? "Processing..." : "Complete & Remove Client"}
              </button>
              <button
                onClick={() =>
                  updateOffboard(selectedOffboard.id, "cancelled")
                }
                disabled={saving}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel Request
              </button>
              <button
                onClick={() => setSelectedOffboard(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
