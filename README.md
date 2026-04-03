# Clara Portal — MVP

**Built by Tre (Sharp Color Engine) as a gift for Chandler.**

A mobile-friendly web app that lets your non-technical clients interact with an AI agent (Clara) through a simple chat interface, while giving you an admin dashboard to monitor conversations, manage clients, handle support tickets, and push approved work to GitHub.

**Live Demo:** https://clara-portal-mauve.vercel.app
**Repo:** https://github.com/t-cott/clara-portal

---

## The Problem

You're fielding late-night texts, walking clients through basic UI tasks, and manually relaying what clients want to their AI systems. This creates burnout and doesn't scale.

## The Solution

Clara Portal gives each client a clean, mobile-friendly chat interface to talk directly to their AI agent. You get a dashboard to monitor everything, configure each client's agent, handle support requests through a ticket system, and push approved work to GitHub — all without being the middleman.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router, Turbopack) |
| Styling | Tailwind CSS 4 |
| Auth | Supabase Auth (email/password) |
| Database | Supabase (PostgreSQL + Row Level Security) |
| AI | Anthropic Claude API (streaming) |
| Hosting | Vercel |
| Real-time | Supabase Realtime (WebSockets) |

---

## What's Included

### Client Side

| Feature | Description |
|---------|-------------|
| **Chat with Clara** | Real-time streaming chat powered by Claude. Messages appear word-by-word as Clara responds. |
| **Chat History** | Sidebar shows all past conversations. Click to revisit any conversation. |
| **Support Tickets** | Submit requests with subject, description, and priority (Low/Normal/High/Urgent). See admin responses in real-time. Filter by status. Full detail view with status timeline. |
| **Offboarding** | "Request Offboarding" button in sidebar. Provide an optional reason, track the status as admin processes it. Can cancel pending requests. |

### Admin Side

| Feature | Description |
|---------|-------------|
| **Dashboard** | Stats cards (total clients, conversations, messages today, active clients in last 7 days). Recent activity feed showing the latest messages across all clients — click to view full transcript. Client card grid below. |
| **Tickets** | View all support tickets from all clients. Filter by status (Open/In Progress/Resolved/Closed) and by specific client. Click a ticket to see full details, add admin notes (visible to client in real-time), and change status. |
| **GitHub Review & Push** | Review client conversations, mark as Reviewed then Approved. Push approved conversations to GitHub as issues with full transcript, tagged with `clara-portal` and `client-request` labels. Stats show pending/approved/pushed counts. |
| **Client Management** | Table of all active clients with project info. Offboarding requests appear at the top with a red badge. Process offboarding with notes (visible to client), or initiate offboarding yourself. "Complete & Remove" deletes the client and all their data. |
| **Integrations** | Configuration page for all API keys: Supabase (URL, Anon Key, Service Role Key), Anthropic (API Key), GitHub (Personal Access Token), Vercel (Deploy Token). Quick setup guide and `.env.local` template included. |
| **Client Config** | Click any client card to configure their AI agent — set project name and system prompt that defines Clara's personality and context for that specific client. |
| **Conversation Viewer** | Read-only transcript view of any client conversation with real-time updates as new messages come in. |

### Auth & Security

| Feature | Description |
|---------|-------------|
| **Two-button login** | Landing page shows "Client Sign In" and "Admin Sign Up" (or "Admin sign in" link if admin exists). Clear role separation from the start. |
| **Admin signup lockout** | Once the first admin signs up, the Admin Sign Up button disappears. Existing admins sign in via the subtle link. |
| **Role enforcement** | Proxy middleware blocks clients from `/admin/*` and admins from `/client/*` at the server level. AuthGuard component provides client-side backup. |
| **Row Level Security** | All database queries go through Supabase RLS. Clients can only see their own data. Admins can see data for their assigned clients. |

### Real-time Sync

Everything syncs in real-time between client and admin via Supabase Realtime:

- Client submits a ticket → admin sees it instantly
- Admin changes ticket status or adds notes → client sees it instantly
- Client requests offboarding → admin sees the request with a badge
- Admin starts processing offboarding → client sees status update live
- New messages in conversations → admin transcript viewer updates live

---

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User info + role (admin/client). Auto-created on signup via trigger. |
| `client_configs` | Per-client AI configuration: project name + system prompt. |
| `conversations` | Chat sessions with review status (pending/reviewed/approved/pushed). |
| `messages` | Individual chat messages (user/assistant/system). |
| `tickets` | Support requests with subject, description, priority, status, admin notes. |
| `offboard_requests` | Client offboarding requests with reason, status, admin notes. |

### RLS Policies

- Clients read/write only their own conversations, messages, tickets, and offboard requests
- Admins read all data for their assigned clients
- Admins manage client configs, tickets, and offboard requests
- `is_admin()` helper function checks the current user's role

---

## File Structure

```
clara-portal/
├── app/
│   ├── layout.tsx                          # Root layout
│   ├── page.tsx                            # Root redirect (→ /admin or /client)
│   ├── login/page.tsx                      # Two-button login/signup
│   ├── auth/callback/route.ts              # OAuth callback
│   ├── client/
│   │   ├── layout.tsx                      # Client shell (sidebar + offboard modal)
│   │   ├── page.tsx                        # Auto-redirect to latest chat
│   │   ├── chat/[id]/page.tsx              # Chat interface
│   │   └── support/page.tsx                # Support ticket submission + history
│   ├── admin/
│   │   ├── layout.tsx                      # Admin shell (sidebar nav)
│   │   ├── page.tsx                        # Dashboard (stats + activity + clients)
│   │   ├── tickets/page.tsx                # Ticket management
│   │   ├── github/page.tsx                 # GitHub review & push
│   │   ├── client-management/page.tsx      # Client table + offboarding
│   │   ├── integrations/page.tsx           # API key configuration
│   │   ├── clients/[id]/page.tsx           # Client detail + config editor
│   │   └── conversations/[id]/page.tsx     # Transcript viewer
│   └── api/
│       ├── chat/route.ts                   # POST: stream Claude response
│       ├── conversations/route.ts          # GET/POST: list/create conversations
│       ├── conversations/[id]/messages/route.ts  # GET: fetch messages
│       ├── tickets/route.ts                # GET/POST: client ticket CRUD
│       ├── offboard/route.ts               # GET/POST/DELETE: client offboard requests
│       ├── auth/admin-exists/route.ts      # GET: check if admin exists
│       ├── auth/set-admin/route.ts         # POST: promote first user to admin
│       ├── admin/clients/route.ts          # GET: list admin's clients
│       ├── admin/clients/[id]/config/route.ts    # PUT: update client config
│       ├── admin/clients/[id]/delete/route.ts    # DELETE: remove client
│       ├── admin/stats/route.ts            # GET: dashboard statistics
│       ├── admin/tickets/[id]/route.ts     # PUT: update ticket status/notes
│       ├── admin/offboard/[id]/route.ts    # POST/PUT: manage offboard requests
│       ├── admin/conversations/[id]/review/route.ts  # PUT: review status
│       └── admin/github/push/route.ts      # POST: push to GitHub as issue
├── components/
│   ├── AuthGuard.tsx                       # Role-based route protection
│   ├── ChatInterface.tsx                   # Chat UI with streaming
│   ├── MessageBubble.tsx                   # Message display (user vs assistant)
│   ├── ConversationList.tsx                # Sidebar conversation list
│   ├── ClientCard.tsx                      # Admin client overview card
│   └── SystemPromptEditor.tsx              # System prompt + project name editor
├── lib/
│   ├── types.ts                            # TypeScript interfaces
│   ├── claude.ts                           # Claude API streaming wrapper
│   └── supabase/
│       ├── client.ts                       # Browser Supabase client
│       ├── server.ts                       # Server Supabase client (cookie-based)
│       └── admin.ts                        # Service-role client (bypasses RLS)
├── proxy.ts                                # Auth middleware + role route guards
├── supabase/migrations/
│   └── 001_initial_schema.sql              # Full database schema + RLS
├── .env.local.example                      # Template for environment variables
└── package.json
```

---

## Setup Instructions (For Chandler)

### 1. Create Your Supabase Project
- Go to [supabase.com](https://supabase.com) and create a new project
- Go to the SQL Editor and run the contents of `supabase/migrations/001_initial_schema.sql`
- In Auth > Providers > Email: make sure Email provider is ON. Turn OFF "Confirm email" for easy signups

### 2. Get Your Anthropic API Key
- Go to [console.anthropic.com](https://console.anthropic.com)
- Create an account and generate an API key

### 3. Configure Environment Variables
Create a `.env.local` file in the project root:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Find your Supabase keys at: Supabase Dashboard > Settings > API

### 4. Install & Run Locally
```bash
npm install
npm run dev
```
Open http://localhost:3000

### 5. Sign Up as Admin
- Click "Admin Sign Up" on the login page
- Create your account — you're now the admin
- The Admin Sign Up button disappears for everyone else

### 6. Set Up a Client
- Have your client sign up via "Client Sign In" > "Create account"
- Go to your admin Dashboard > click their client card
- Write Clara's system prompt with their project context
- They can now chat with Clara and submit support tickets

### 7. Deploy to Vercel
```bash
npm i -g vercel
vercel --prod
```
Add all 4 environment variables in Vercel > Project Settings > Environment Variables, then redeploy.

### 8. Optional: GitHub Integration
- Create a GitHub Personal Access Token at github.com/settings/tokens (needs `repo` scope)
- Add `GITHUB_TOKEN=ghp_your-token` to `.env.local` and Vercel env vars
- Use the GitHub tab in admin to review conversations and push approved ones as GitHub issues

---

## Future Enhancements

These are not in the MVP but are natural next steps:

- **Push notifications** — Alert admin when a client starts a conversation or submits a ticket
- **File attachments** — Clients share screenshots/docs in chat and tickets
- **Multi-admin support** — Multiple admins with assigned client pools
- **Usage analytics** — Track token usage per client for billing
- **Voice input** — Speech-to-text for clients who prefer talking
- **Ticket threading** — Back-and-forth comments on tickets instead of single admin notes
- **Email notifications** — Notify clients when ticket status changes
- **Custom domains** — White-label the portal with client's branding

---

## Credits

Built by **Tre** (Sharp Color Engine) for **Chandler** — solving the 9pm text problem, one chat at a time.
