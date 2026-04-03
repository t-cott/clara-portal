# Clara Portal

**Hey Chandler — this is for you.**

I built this because you shouldn't have to answer texts at 9pm. Your clients need help, but they don't need *you* at 9pm — they need Clara. This gives every one of your clients a clean chat interface to talk to their own AI agent, and gives you a dashboard to see everything that's going on without being the middleman.

It's yours. Take it, make it your own, build it into whatever you want.

— Tre (Sharp Color Engine)

---

## What This Does

**For your clients:**
- A simple chat interface where they talk to Clara (your AI agent)
- Clara's personality and knowledge is customized per client — you write the system prompt
- They can submit support tickets instead of texting you at 9pm
- They can request offboarding when they're done

**For you:**
- A dashboard showing all client activity at a glance
- A ticket system so client requests come to you organized, not as random texts
- A GitHub integration to review client conversations and push approved work as issues
- Client management with offboarding workflows
- An integrations page where you plug in your own API keys

---

## Getting Started

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (pick any region, remember your database password)
3. Once it's ready, go to **SQL Editor** in the sidebar
4. Copy the entire contents of `supabase/migrations/001_initial_schema.sql` from this repo and paste it into the SQL Editor
5. Click **Run** — this creates all the tables, security policies, and triggers
6. Go to **Authentication > Providers > Email** — make sure the Email provider is ON and toggle OFF "Confirm email"

### Step 2: Get Your API Keys

**Supabase keys** (Settings > API in your Supabase dashboard):
- Project URL (looks like `https://xxxxx.supabase.co`)
- `anon` public key
- `service_role` secret key

**Anthropic key** (for Clara's AI):
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account and add billing
3. Go to API Keys and create a new key

### Step 3: Configure the Project

Create a file called `.env.local` in the project root with your keys:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Step 4: Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you should see the login page.

### Step 5: Create Your Admin Account

1. Click **"Admin Sign Up"** on the login page
2. Enter your email, name, and password
3. You're now the admin — the Admin Sign Up button disappears for everyone else
4. You'll land on your dashboard

### Step 6: Set Up Your First Client

1. Have your client go to the login page and click **"Client Sign In"** > **"Create account"**
2. In your admin dashboard, click their name
3. Write a system prompt that tells Clara who she is for this client — include project context, tone, what she should help with
4. Your client can now chat with Clara and submit support tickets

### Step 7: Deploy to Production

```bash
npm i -g vercel
vercel --prod
```

Then go to your Vercel project > **Settings > Environment Variables** and add the same 4 keys from your `.env.local`. Redeploy.

---

## Features

### Client Side
- **Chat with Clara** — Real-time streaming AI chat. Messages appear word-by-word.
- **Chat History** — Sidebar with all past conversations.
- **Support Tickets** — Submit requests with priority levels. See admin responses in real-time. Filter by status.
- **Offboarding** — Request to wrap up when they're done. Track the status.

### Admin Side
- **Dashboard** — Stats (total clients, conversations, messages today, active clients), recent activity feed, client overview.
- **Tickets** — All support tickets across all clients. Filter by status and by client. Add notes (visible to client in real-time). Change status.
- **GitHub** — Review client conversations. Mark as Reviewed > Approved > Push to GitHub as issues with full transcript.
- **Client Management** — Active client table. Process offboarding requests (client-initiated or admin-initiated). Complete offboarding removes the client and all their data.
- **Integrations** — Configure API keys (Supabase, Anthropic, GitHub, Vercel) with docs links and a `.env.local` template.
- **Client Config** — Per-client system prompt editor. This is where you give Clara her personality and project context for each client.
- **Conversation Viewer** — Read-only transcript of any client conversation with real-time updates.

### Security
- Clients can only see their own data (enforced at the database level with Row Level Security)
- Clients cannot access admin pages (enforced at the server level)
- Admin signup is locked after the first admin account is created
- All API keys are stored in environment variables, never in the code

### Real-time Sync
Everything between client and admin syncs instantly:
- Tickets (submit, status changes, admin notes)
- Offboarding (request, processing, completion)
- Chat messages (admin can watch conversations live)

---

## File Structure

```
clara-portal/
├── app/
│   ├── login/page.tsx                 # Two-button login (Client / Admin)
│   ├── client/                        # Client-side pages
│   │   ├── layout.tsx                 # Sidebar + offboard modal
│   │   ├── chat/[id]/page.tsx         # Chat interface
│   │   └── support/page.tsx           # Support tickets
│   ├── admin/                         # Admin-side pages
│   │   ├── page.tsx                   # Dashboard
│   │   ├── tickets/page.tsx           # Ticket management
│   │   ├── github/page.tsx            # GitHub review & push
│   │   ├── client-management/page.tsx # Client table + offboarding
│   │   ├── integrations/page.tsx      # API key config
│   │   ├── clients/[id]/page.tsx      # Client config editor
│   │   └── conversations/[id]/page.tsx # Transcript viewer
│   └── api/                           # All API routes
├── components/                        # Reusable UI components
├── lib/                               # Supabase clients, Claude wrapper, types
├── proxy.ts                           # Auth middleware + role enforcement
└── supabase/migrations/               # Database schema SQL
```

---

## Optional: GitHub Integration

If you want to review client conversations and push approved ones to GitHub:

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Create a Personal Access Token with `repo` scope
3. Add `GITHUB_TOKEN=ghp_your-token` to your `.env.local` and Vercel env vars
4. In the admin GitHub tab, enter your repo name (e.g. `your-username/client-project`)
5. Review conversations > Approve > Push to GitHub

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) |
| Styling | Tailwind CSS 4 |
| Auth | Supabase Auth |
| Database | Supabase PostgreSQL + RLS |
| AI | Anthropic Claude API (streaming) |
| Real-time | Supabase Realtime |
| Hosting | Vercel |

---

## Make It Yours

This is an MVP — a starting point. Here are some ideas for where you could take it:

- **Push notifications** when a client starts chatting or submits a ticket
- **File attachments** in chat and tickets (screenshots, docs)
- **Multiple admins** with separate client pools
- **Usage tracking** to bill clients based on AI usage
- **Voice input** for clients who prefer talking
- **Ticket threading** for back-and-forth conversations on tickets
- **Email notifications** when ticket status changes
- **Custom domains** to white-label the portal

---

No more 9pm texts. You got this.
