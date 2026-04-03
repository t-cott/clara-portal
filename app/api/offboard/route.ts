import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("offboard_requests")
    .select("*")
    .eq("client_id", user.id)
    .single();

  return Response.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if request already exists
  const { data: existing } = await supabase
    .from("offboard_requests")
    .select("id")
    .eq("client_id", user.id)
    .single();

  if (existing) {
    return Response.json(
      { error: "Offboard request already submitted" },
      { status: 409 }
    );
  }

  const { reason } = await request.json();

  const { data, error } = await supabase
    .from("offboard_requests")
    .insert({ client_id: user.id, reason: reason || null })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only allow cancelling pending requests
  const { error } = await supabase
    .from("offboard_requests")
    .delete()
    .eq("client_id", user.id)
    .eq("status", "pending");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
