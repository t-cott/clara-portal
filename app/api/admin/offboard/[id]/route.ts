import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { type NextRequest } from "next/server";

// Admin creates an offboard request for a client
export async function POST(
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

  // Check if request already exists
  const adminClient = createAdminClient();
  const { data: existing } = await adminClient
    .from("offboard_requests")
    .select("id")
    .eq("client_id", clientId)
    .single();

  if (existing) {
    return Response.json(
      { error: "Offboard request already exists for this client" },
      { status: 409 }
    );
  }

  const { data, error } = await adminClient
    .from("offboard_requests")
    .insert({
      client_id: clientId,
      reason: "Initiated by admin",
      status: "in_progress",
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}

// Admin updates an existing offboard request
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const body = await request.json();

  const { data, error } = await supabase
    .from("offboard_requests")
    .update({
      ...(body.status && { status: body.status }),
      ...(body.admin_notes !== undefined && { admin_notes: body.admin_notes }),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // If status is "completed", delete the client's auth account (cascades everything)
  if (body.status === "completed") {
    const adminClient = createAdminClient();
    const clientId = data.client_id;
    await adminClient.auth.admin.deleteUser(clientId);
  }

  return Response.json(data);
}
