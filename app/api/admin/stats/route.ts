import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

  // Total clients
  const { count: totalClients } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "client");

  // Total conversations
  const { count: totalConversations } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true });

  // Messages today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count: messagesToday } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .gte("created_at", todayStart.toISOString());

  // Active clients (sent messages in last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { data: activeConvos } = await supabase
    .from("conversations")
    .select("client_id")
    .gte("updated_at", weekAgo.toISOString());

  const activeClients = new Set(
    (activeConvos || []).map((c) => c.client_id)
  ).size;

  // Recent messages with client info
  const { data: recentMessages } = await supabase
    .from("messages")
    .select(
      "id, role, content, created_at, conversation_id, conversations(client_id, title, profiles(full_name, email))"
    )
    .order("created_at", { ascending: false })
    .limit(10);

  return Response.json({
    totalClients: totalClients ?? 0,
    totalConversations: totalConversations ?? 0,
    messagesToday: messagesToday ?? 0,
    activeClients,
    recentMessages: (recentMessages || []).map((m) => {
      const conv = m.conversations as unknown as { client_id: string; title: string; profiles: { full_name: string; email: string } } | null;
      return {
        id: m.id,
        role: m.role,
        content:
          m.content.length > 100
            ? m.content.substring(0, 100) + "..."
            : m.content,
        created_at: m.created_at,
        conversation_id: m.conversation_id,
        client_name: conv?.profiles?.full_name || conv?.profiles?.email || "Unknown",
        conversation_title: conv?.title || "Untitled",
      };
    }),
  });
}
