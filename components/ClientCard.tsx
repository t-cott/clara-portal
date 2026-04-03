import type { Profile, ClientConfig } from "@/lib/types";
import Link from "next/link";

export default function ClientCard({
  profile,
  config,
}: {
  profile: Profile;
  config?: ClientConfig;
}) {
  return (
    <Link
      href={`/admin/clients/${profile.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">
            {profile.full_name || profile.email}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">{profile.email}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            config
              ? "bg-green-50 text-green-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {config ? "Configured" : "Needs Setup"}
        </span>
      </div>
      {config && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">Project</p>
          <p className="text-sm text-slate-700">{config.project_name}</p>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-400">
        Joined {new Date(profile.created_at).toLocaleDateString()}
      </p>
    </Link>
  );
}
