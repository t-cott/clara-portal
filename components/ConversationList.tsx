"use client";

import type { Conversation } from "@/lib/types";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ConversationList({
  conversations,
  basePath = "/client/chat",
}: {
  conversations: Conversation[];
  basePath?: string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-1">
      {conversations.length === 0 ? (
        <p className="px-3 py-2 text-sm text-slate-400">No conversations yet</p>
      ) : (
        conversations.map((conv) => {
          const isActive = pathname === `${basePath}/${conv.id}`;
          return (
            <Link
              key={conv.id}
              href={`${basePath}/${conv.id}`}
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <p className="truncate">{conv.title}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {new Date(conv.updated_at).toLocaleDateString()}
              </p>
            </Link>
          );
        })
      )}
    </div>
  );
}
