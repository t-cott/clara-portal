export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "client";
  created_at: string;
}

export interface ClientConfig {
  id: string;
  client_id: string;
  admin_id: string;
  project_name: string;
  system_prompt: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  client_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface OffboardRequest {
  id: string;
  client_id: string;
  reason: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  client_id: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}
