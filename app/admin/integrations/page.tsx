"use client";

import { useState } from "react";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  fields: { key: string; label: string; placeholder: string; secret?: boolean }[];
  docsUrl: string;
}

const integrations: Integration[] = [
  {
    id: "supabase",
    name: "Supabase",
    description:
      "Database, authentication, and real-time subscriptions. Powers the entire backend.",
    icon: "S",
    fields: [
      {
        key: "NEXT_PUBLIC_SUPABASE_URL",
        label: "Project URL",
        placeholder: "https://your-project.supabase.co",
      },
      {
        key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        label: "Anon (Public) Key",
        placeholder: "eyJhbGciOiJIUzI1NiIs...",
        secret: true,
      },
      {
        key: "SUPABASE_SERVICE_ROLE_KEY",
        label: "Service Role Key",
        placeholder: "sb_secret_...",
        secret: true,
      },
    ],
    docsUrl: "https://supabase.com/docs/guides/getting-started",
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude AI)",
    description:
      "Powers Clara's AI responses. Handles all chat completions with streaming.",
    icon: "A",
    fields: [
      {
        key: "ANTHROPIC_API_KEY",
        label: "API Key",
        placeholder: "sk-ant-api03-...",
        secret: true,
      },
    ],
    docsUrl: "https://console.anthropic.com/",
  },
  {
    id: "github",
    name: "GitHub",
    description:
      "Review client conversations and push approved requests as GitHub issues.",
    icon: "G",
    fields: [
      {
        key: "GITHUB_TOKEN",
        label: "Personal Access Token",
        placeholder: "ghp_...",
        secret: true,
      },
    ],
    docsUrl: "https://github.com/settings/tokens",
  },
  {
    id: "vercel",
    name: "Vercel",
    description:
      "Hosting and deployment. Deploy Clara Portal with a single command.",
    icon: "V",
    fields: [
      {
        key: "VERCEL_TOKEN",
        label: "Deploy Token",
        placeholder: "your-vercel-token",
        secret: true,
      },
    ],
    docsUrl: "https://vercel.com/docs/rest-api#creating-an-access-token",
  },
];

export default function IntegrationsPage() {
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>({});

  function handleChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave(integrationId: string) {
    // Placeholder — in production, this would save to .env or a settings table
    setSaved((prev) => ({ ...prev, [integrationId]: true }));
    setTimeout(
      () => setSaved((prev) => ({ ...prev, [integrationId]: false })),
      2000
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Integrations</h2>
        <p className="mt-1 text-sm text-slate-500">
          Configure the API keys and services that power Clara Portal.
          Add your own keys to each integration below.
        </p>
      </div>

      {/* Setup guide banner */}
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-5">
        <h3 className="font-semibold text-blue-900">Quick Setup Guide</h3>
        <ol className="mt-2 space-y-1 text-sm text-blue-800 list-decimal list-inside">
          <li>
            Create a{" "}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              Supabase
            </a>{" "}
            project and run the migration SQL in the SQL Editor
          </li>
          <li>
            Get your API key from{" "}
            <a
              href="https://console.anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              Anthropic Console
            </a>
          </li>
          <li>
            Add all keys to your{" "}
            <code className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-mono">
              .env.local
            </code>{" "}
            file in the project root
          </li>
          <li>
            Deploy to{" "}
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              Vercel
            </a>{" "}
            and add the same keys in the project settings
          </li>
        </ol>
      </div>

      {/* Integration cards */}
      <div className="space-y-6">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="rounded-xl border border-slate-200 bg-white overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-4">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white ${
                  integration.id === "supabase"
                    ? "bg-emerald-600"
                    : integration.id === "anthropic"
                      ? "bg-orange-600"
                      : "bg-slate-900"
                }`}
              >
                {integration.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">
                  {integration.name}
                </h3>
                <p className="text-sm text-slate-500">
                  {integration.description}
                </p>
              </div>
              <a
                href={integration.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Docs
              </a>
            </div>

            {/* Fields */}
            <div className="px-6 py-4 space-y-4">
              {integration.fields.map((field) => (
                <div key={field.key}>
                  <div className="flex items-center gap-2">
                    <label className="block text-sm font-medium text-slate-700">
                      {field.label}
                    </label>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-500">
                      {field.key}
                    </code>
                  </div>
                  <input
                    type={field.secret ? "password" : "text"}
                    value={values[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              ))}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleSave(integration.id)}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
                >
                  Save
                </button>
                {saved[integration.id] && (
                  <span className="text-sm text-green-600">
                    Saved (add to .env.local to take effect)
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Env file reference */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
        <h3 className="font-semibold text-slate-900">
          .env.local File Reference
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Copy this template and fill in your keys:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-300">
{`# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-your-key-here`}
        </pre>
      </div>
    </div>
  );
}
