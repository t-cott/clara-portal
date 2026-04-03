import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

function getServiceRoleKey(): string {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  try {
    const envPath = join(process.cwd(), ".env.local");
    const envContent = readFileSync(envPath, "utf-8");
    const match = envContent.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m);
    if (match) return match[1].trim();
  } catch {}
  throw new Error("SUPABASE_SERVICE_ROLE_KEY not found");
}

function getSupabaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return process.env.NEXT_PUBLIC_SUPABASE_URL;
  }
  try {
    const envPath = join(process.cwd(), ".env.local");
    const envContent = readFileSync(envPath, "utf-8");
    const match = envContent.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m);
    if (match) return match[1].trim();
  } catch {}
  throw new Error("NEXT_PUBLIC_SUPABASE_URL not found");
}

export function createAdminClient() {
  return createClient(getSupabaseUrl(), getServiceRoleKey());
}
