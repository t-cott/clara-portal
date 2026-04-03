"use client";

import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export default function AuthGuard({
  children,
  allowedRole,
}: {
  children: ReactNode;
  allowedRole: "admin" | "client";
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!data || data.role !== allowedRole) {
        router.push(data?.role === "admin" ? "/admin" : "/client");
        return;
      }

      setProfile(data);
      setLoading(false);
    }

    checkAuth();
  }, [allowedRole, router, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
