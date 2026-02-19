# Policy Hub

Policy and compliance management platform for financial institutions. Manage policy documents, track regulatory framework compliance, run gap analysis, and maintain audit trails — all scoped to your business units.

## Tech Stack

- **Frontend:** React + TypeScript, Tailwind CSS, shadcn/ui, React Query, Wouter
- **Backend:** Supabase (PostgreSQL database, Auth, Storage), Vercel (hosting + serverless functions)
- **ORM:** Drizzle ORM with postgres.js
- **AI:** Anthropic Claude for policy analysis and compliance gap analysis
- **File uploads:** Supabase Storage via TUS resumable upload protocol

## Prerequisites

- Node.js 22.x
- Vercel CLI: `npm i -g vercel`
- A Supabase project (free tier works for development)

## Setup

**1. Clone and install dependencies**

```bash
git clone <repo-url>
cd Policy-Hub
npm install
```

**2. Configure environment variables**

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required environment variables:

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (e.g. `https://xyz.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `DATABASE_URL` | Supabase pooled connection string (Transaction mode) |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI analysis features |

**3. Run database migrations**

```bash
npm run db:push
```

**4. Start the development server**

```bash
npm run dev
```

This runs `vercel dev`, which starts the Vite dev server for the React frontend and the Vercel serverless functions locally. Visit `http://localhost:3000`.

## Project Structure

```
client/          React frontend (SPA)
  src/
    pages/       Page components (one per route)
    components/  Reusable UI components
    lib/         Supabase client, API helpers, storage utilities
api/             Vercel serverless functions (one file per resource)
server/          Shared server-side code (Drizzle storage layer, Supabase admin client)
shared/          Types, schema, and route definitions shared between client and server
scripts/         Build utilities (build-api.mjs compiles serverless functions)
```

## Architecture

**Reads:** The frontend queries Supabase directly using the anon key. Row-Level Security (RLS) policies enforce business-unit-scoped access — users only see data for their assigned business unit.

**Writes and AI operations:** Handled by Vercel serverless functions in `api/`. These use the service role key to bypass RLS when needed (e.g. audit log writes, cross-BU admin operations).

**File storage:** Documents are stored in Supabase Storage with one bucket per business unit (`bu-{id}`). Uploads use the TUS resumable upload protocol via signed upload URLs. Downloads use time-limited signed URLs (1 hour expiry).

**Auth:** Supabase Auth with email/password. A custom Access Token Hook injects the user's business unit IDs into the JWT so RLS policies can enforce BU-scoping without extra database round-trips.

## Deployment

The app is deployed to Vercel. Push to `main` for automatic deployment (once GitHub is connected in the Vercel dashboard).

Manual deployment:

```bash
vercel --prod
```

## Development Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server via `vercel dev` |
| `npm run build` | Build frontend + compile serverless functions |
| `npm run check` | TypeScript type check |
| `npm run db:push` | Push Drizzle schema changes to Supabase |
