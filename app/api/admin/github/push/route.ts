import { createClient } from "@/lib/supabase/server";
import { readFileSync } from "fs";
import { join } from "path";

function getGitHubToken(): string | null {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const envPath = join(process.cwd(), ".env.local");
    const envContent = readFileSync(envPath, "utf-8");
    const match = envContent.match(/^GITHUB_TOKEN=(.+)$/m);
    if (match) return match[1].trim();
  } catch {}
  return null;
}

export async function POST(request: Request) {
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

  const { conversation_id, repo, branch } = await request.json();

  if (!conversation_id || !repo) {
    return Response.json(
      { error: "conversation_id and repo are required" },
      { status: 400 }
    );
  }

  const token = getGitHubToken();
  if (!token) {
    return Response.json(
      { error: "GitHub token not configured. Add GITHUB_TOKEN to .env.local" },
      { status: 400 }
    );
  }

  // Fetch conversation + messages + client info
  const { data: conversation } = await supabase
    .from("conversations")
    .select("*, profiles(full_name, email)")
    .eq("id", conversation_id)
    .single();

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversation_id)
    .order("created_at", { ascending: true });

  // Build the markdown content for the issue
  const conv = conversation as unknown as {
    title: string;
    created_at: string;
    profiles: { full_name: string | null; email: string };
  };
  const clientName = conv.profiles?.full_name || conv.profiles?.email || "Unknown";

  const body = [
    `## Client Request: ${conv.title}`,
    "",
    `**Client:** ${clientName}`,
    `**Date:** ${new Date(conv.created_at).toLocaleDateString()}`,
    `**Status:** Approved by admin`,
    "",
    "---",
    "",
    "### Conversation Transcript",
    "",
    ...(messages || []).map((m) => {
      const role = m.role === "user" ? `**${clientName}**` : "**Clara (AI)**";
      return `${role}: ${m.content}\n`;
    }),
  ].join("\n");

  // Create a GitHub issue
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: `[Clara Portal] ${conv.title}`,
        body,
        labels: ["clara-portal", "client-request"],
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return Response.json(
        { error: `GitHub API error: ${err.message || res.statusText}` },
        { status: res.status }
      );
    }

    const issue = await res.json();

    // Mark conversation as pushed
    await supabase
      .from("conversations")
      .update({ review_status: "pushed" })
      .eq("id", conversation_id);

    return Response.json({
      success: true,
      issue_url: issue.html_url,
      issue_number: issue.number,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to push to GitHub" },
      { status: 500 }
    );
  }
}
