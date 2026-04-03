"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Mode = null | "client" | "admin";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetch("/api/auth/admin-exists")
      .then((r) => r.json())
      .then((d) => setAdminExists(d.exists))
      .catch(() => setAdminExists(true));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;

        // If signing up as admin and no admin exists, promote to admin
        if (mode === "admin" && !adminExists) {
          const res = await fetch("/api/auth/set-admin", { method: "POST" });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to set admin role");
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }

      // Check role and redirect
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        router.push(profile?.role === "admin" ? "/admin" : "/client");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Role selection screen
  if (mode === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-900">Clara Portal</h1>
            <p className="mt-2 text-sm text-slate-500">
              Choose how you'd like to sign in
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setMode("client")}
              className="w-full rounded-xl bg-blue-600 px-6 py-4 text-left transition-colors hover:bg-blue-700"
            >
              <p className="font-semibold text-white">Client Sign In</p>
              <p className="mt-0.5 text-sm text-blue-200">
                Chat with your AI assistant
              </p>
            </button>

            {adminExists === false ? (
              <button
                onClick={() => {
                  setMode("admin");
                  setIsSignUp(true);
                }}
                className="w-full rounded-xl bg-slate-800 px-6 py-4 text-left transition-colors hover:bg-slate-900"
              >
                <p className="font-semibold text-white">Admin Sign Up</p>
                <p className="mt-0.5 text-sm text-slate-400">
                  Set up your admin account
                </p>
              </button>
            ) : adminExists === true ? (
              <button
                onClick={() => setMode("admin")}
                className="mx-auto block text-sm text-slate-400 hover:text-slate-600"
              >
                Admin sign in
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // Login/signup form
  const isAdmin = mode === "admin";
  const showSignUpToggle = isAdmin ? !adminExists : true;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Clara Portal</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin ? "Admin" : "Client"} —{" "}
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl bg-white p-6 shadow-lg"
        >
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Your name"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
              isAdmin
                ? "bg-slate-800 hover:bg-slate-900 focus:ring-slate-500"
                : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
            }`}
          >
            {loading
              ? "Loading..."
              : isSignUp
                ? "Create Account"
                : "Sign In"}
          </button>

          <div className="flex items-center justify-between text-sm">
            {showSignUpToggle && (
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                }}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                {isSignUp ? "Sign in instead" : "Create account"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMode(null);
                setIsSignUp(false);
                setError("");
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              &larr; Back
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
