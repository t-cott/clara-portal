"use client";

import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/github", label: "GitHub" },
  { href: "/admin/client-management", label: "Client Management" },
  { href: "/admin/integrations", label: "Integrations" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <AuthGuard allowedRole="admin">
      <div className="flex h-screen bg-white">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed left-4 top-4 z-50 rounded-lg bg-white p-2 shadow-md md:hidden"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-slate-50 transition-transform duration-200 md:relative md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 p-4">
              <h1 className="text-lg font-bold text-slate-900">Clara Portal Admin</h1>
              <p className="text-xs text-slate-500">Manage clients & agents</p>
            </div>

            <nav className="flex-1 p-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                    pathname === item.href
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="border-t border-slate-200 p-3">
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
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </AuthGuard>
  );
}
