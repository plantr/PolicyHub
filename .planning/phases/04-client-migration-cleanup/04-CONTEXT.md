# Phase 4: Client Migration + Cleanup - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace Express API calls with direct Supabase client reads in the React frontend, build login/signup/password-reset UI using Supabase Auth, and remove all Replit, Passport.js, express-session, S3, and multer legacy code. Restructure Express routes into Vercel /api/ serverless functions. The app is feature-complete — this phase migrates the client layer and cleans up the codebase.

</domain>

<decisions>
## Implementation Decisions

### Auth screens
- Use @supabase/auth-ui-react pre-built components (not custom forms)
- Auth form displayed as a card on a branded page — logo and branding visible around the form
- After successful login, always redirect to dashboard/home (no return URL pattern)
- Auth UI themed to match the existing Policy Hub design system — same colors, fonts, spacing

### Session & auth behavior
- On session expiry: show a toast notification ("Session expired, please log in again") then redirect to login
- Persistent sessions — users stay logged in across browser restarts until explicit logout or refresh token expiry
- Logout option lives inside a user/avatar dropdown menu in the header (standard SaaS pattern)
- Public landing/welcome page visible to unauthenticated users; all other routes require login

### Loading & error states
- Empty list states show a helpful message with a CTA button (e.g., "No documents yet" + create button)
- Data refreshes on navigation only — no background polling or window-focus refetching
- Loading indicators and error handling: Claude's discretion per page context

### Local dev workflow
- Local development via `vercel dev` (matches production, handles serverless functions)
- Replit config files (.replit, replit.nix) removed from tracking but kept in .gitignore
- Full restructure: break Express server/index.ts into individual /api/*.ts serverless functions (Vercel-native)
- README updated to reflect new Supabase + Vercel architecture — setup instructions, env vars, dev commands

### Claude's Discretion
- Loading indicator style per page (skeletons vs spinners)
- Error state presentation (inline vs toast) based on context
- Exact /api/ route file structure and naming
- Serverless function bundling and shared utilities approach

</decisions>

<specifics>
## Specific Ideas

- Auth card on branded page — product login feel, not a bare form
- Toast notification on session expiry — user knows what happened before being redirected
- Empty states should guide users forward, not just say "nothing here"
- Clean break from Replit but keep config files locally for reference (.gitignore)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-client-migration-cleanup*
*Context gathered: 2026-02-19*
