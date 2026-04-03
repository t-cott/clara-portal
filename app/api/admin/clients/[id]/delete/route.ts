import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { type NextRequest } from "next/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify the target is actually a client
  const { data: target } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", clientId)
    .single();

  if (!target || target.role !== "client") {
    return Response.json({ error: "Client not found" }, { status: 404 });
  }

  // Use admin client to delete the user from auth (cascades to profile, configs, conversations, messages, tickets)
  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(clientId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
