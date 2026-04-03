import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  // Verify the caller is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use admin client to check if any admin exists
  const adminClient = createAdminClient();

  const { count } = await adminClient
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");

  if ((count ?? 0) > 0) {
    return Response.json(
      { error: "Admin account already exists" },
      { status: 403 }
    );
  }

  // Promote this user to admin
  const { error } = await adminClient
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
