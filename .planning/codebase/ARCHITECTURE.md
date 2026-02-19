# Architecture

**Analysis Date:** 2026-02-19

## Pattern Overview

**Overall:** Three-tier monolithic architecture with strict separation between client (React), server (Express), and shared schema definitions. The application follows a classical layered pattern with data flowing from PostgreSQL through an abstraction layer to REST API endpoints consumed by React Query on the frontend.

**Key Characteristics:**
- Full-stack TypeScript with ESM modules
- API-first design with explicit route contracts in shared schema
- Database schema as single source of truth for API contracts
- Zod-based validation at API boundaries
- React Query for client-side state management (no Redux/Context)
- Drizzle ORM for type-safe database queries

## Layers

**Database & Persistence:**
- Purpose: PostgreSQL database with version control through Drizzle migrations
- Location: `shared/schema.ts` (schema definition), `server/db.ts` (connection pool), `migrations/` (schema versions)
- Contains: Drizzle table definitions, type exports, relationships between entities
- Depends on: PostgreSQL connection via DATABASE_URL env var
- Used by: `server/storage.ts` (storage abstraction), `server/routes.ts` (direct queries)

**Storage/Data Access Layer:**
- Purpose: Abstract database operations with a clean interface (IStorage)
- Location: `server/storage.ts`
- Contains: Implementation of all CRUD operations for domain entities
- Depends on: `server/db.ts`, `shared/schema.ts`
- Used by: `server/routes.ts`

**API Route Layer:**
- Purpose: Handle HTTP requests, validate inputs, orchestrate storage calls
- Location: `server/routes.ts`
- Contains: Express route handlers organized by entity type (Business Units, Documents, Requirements, etc.)
- Depends on: Express, Zod validation schemas from `shared/routes.ts`, `server/storage.ts`
- Used by: Express app in `server/index.ts`

**Shared Schema Layer:**
- Purpose: Define API contracts, validation schemas, and type definitions
- Location: `shared/schema.ts` (database schema), `shared/routes.ts` (API endpoint definitions), `shared/models/` (domain-specific types)
- Contains: Drizzle table definitions, Zod insert schemas, API route contracts with method/path/input/response signatures
- Depends on: Drizzle, Zod
- Used by: Both server (for database/validation) and client (for type checking)

**Server Bootstrapping:**
- Purpose: Initialize Express app, set up middleware, register routes
- Location: `server/index.ts`
- Contains: Express app setup, middleware chain (JSON parsing, logging), error handling, Vite/static serving setup
- Depends on: Express, `server/routes.ts`, `server/vite.ts`, `server/static.ts`
- Used by: Build script as entry point

**Client Application Framework:**
- Purpose: Initialize React app, set up providers and routing
- Location: `client/src/main.tsx` (entry point), `client/src/App.tsx` (component root)
- Contains: React root render, QueryClientProvider, ThemeProvider, SidebarProvider, Wouter router configuration
- Depends on: React, React Query, React Router (Wouter)
- Used by: Vite-built HTML in `client/public/index.html`

**Client Pages Layer:**
- Purpose: Top-level page components handling routing and page-specific logic
- Location: `client/src/pages/`
- Contains: 27+ page components (Dashboard, Documents, Requirements, Risk Management, etc.)
- Depends on: React Query hooks, Radix UI components, shared schema types
- Used by: Wouter router in `App.tsx`

**Client Components Layer:**
- Purpose: Reusable UI components and layout elements
- Location: `client/src/components/`
- Contains: Radix UI primitive wrappers, theme provider, sidebar, application-specific components
- Depends on: Radix UI, React, Tailwind CSS
- Used by: Pages and other components

**Client Utilities:**
- Purpose: Shared client-side utilities and configurations
- Location: `client/src/lib/` (React Query setup, API request helpers), `client/src/hooks/` (custom React hooks)
- Contains: QueryClient configuration, `apiRequest()` function for fetch calls, custom hooks
- Depends on: React Query, fetch API
- Used by: All pages for data fetching

## Data Flow

**Write Flow (Create/Update Document):**

1. User fills form in page component (e.g., `DocumentDetail.tsx`)
2. Form submission calls `useMutation` with `apiRequest()` POST/PUT to `/api/documents/:id`
3. Express route handler in `routes.ts` validates payload against Zod schema from `shared/routes.ts`
4. Validation passes → calls `storage.updateDocument()` in `server/storage.ts`
5. Storage layer executes Drizzle query to update PostgreSQL
6. Response returned to client with updated entity
7. React Query cache invalidated, component re-renders with new data

**Read Flow (List Documents):**

1. Page component (e.g., `Documents.tsx`) uses `useQuery({ queryKey: ["/api/documents"] })`
2. React Query's `queryFn` calls `apiRequest("GET", "/api/documents")`
3. Express route handler calls `storage.getDocuments()`
4. Storage executes Drizzle select query from PostgreSQL
5. Results returned as JSON array
6. React Query caches response (staleTime: Infinity)
7. Page renders using cached data

**State Management:**
- Server-side session state: Express session middleware via `connect-pg-simple` (stores in `session` table)
- Client-side query cache: React Query QueryClient with custom `queryFn` from `client/src/lib/queryClient.ts`
- UI state: Component local state (useState), not centralized
- No Redux or Context API; all data flows through React Query and URL state

## Key Abstractions

**IStorage Interface:**
- Purpose: Define contract for all database operations
- Examples: `getDocuments()`, `createDocument()`, `updateDocument()`, `deleteDocument()`, etc.
- Pattern: Repository pattern - single object with methods for each entity type's CRUD operations
- Located in: `server/storage.ts` interface definition, implementation in same file

**API Route Contracts:**
- Purpose: Define request/response shapes, HTTP methods, paths at compile time
- Examples: `api.documents.list`, `api.documents.create`, `api.documents.update` in `shared/routes.ts`
- Pattern: Typed objects with `method`, `path`, `input` (Zod schema), `responses` keyed by status code
- Located in: `shared/routes.ts`

**Domain Models:**
- Purpose: Type-safe representation of business entities
- Examples: `Document`, `DocumentVersion`, `Requirement`, `Finding`, `Risk`, etc.
- Pattern: Inferred directly from Drizzle table definitions using `$inferSelect` and created via insert schemas
- Located in: `shared/schema.ts` (definitions), `shared/models/chat.ts` (specialized models)

**Feature Domains:**
- Purpose: Logical grouping of related entities and operations
- Examples: Documents & Versions, Requirements & Mappings, Findings & Evidence, Risks & Actions, Users & Roles
- Pattern: Routes and storage methods named by domain prefix (e.g., `app.post("/api/documents/...")`)
- Located in: Routes organized by entity in `server/routes.ts`, UI pages by feature in `client/src/pages/`

## Entry Points

**Backend Entry Point:**
- Location: `server/index.ts`
- Triggers: `npm run dev` (via tsx), `npm start` (via node on built artifact)
- Responsibilities:
  1. Create Express app and HTTP server
  2. Register JSON/URL-encoded middleware with rawBody capture
  3. Set up logging middleware (captures method, path, status, duration, response)
  4. Register all API routes via `registerRoutes()`
  5. Register error handling middleware (catches errors, returns 500 with message)
  6. Initialize Vite dev server (dev) or serve static client (prod)
  7. Listen on PORT env var (default 5000)

**Frontend Entry Point:**
- Location: `client/src/main.tsx`
- Triggers: Vite dev server or bundled in production
- Responsibilities:
  1. Create React root element
  2. Mount App component to DOM
  3. Initialize React 18 concurrent rendering

**App Component:**
- Location: `client/src/App.tsx`
- Responsibilities:
  1. Wrap application with QueryClientProvider (React Query)
  2. Wrap with ThemeProvider (theme state)
  3. Wrap with TooltipProvider (Radix UI)
  4. Wrap with SidebarProvider (layout state)
  5. Render layout: sidebar + header + router
  6. Mount Router component for client-side routing

**Router Entry Point:**
- Location: Inner `Router()` component in `App.tsx`
- Responsibilities:
  1. Define all page routes using Wouter's `<Route>` components
  2. Map URL paths to page components
  3. Pass URL params (e.g., `:id`, `:docId`) to page components

## Error Handling

**Strategy:** Errors propagate from database → storage → routes → Express error middleware → JSON response to client. Client-side errors caught at React Query level with optional retry.

**Patterns:**

**Database Errors:**
- Thrown by Drizzle queries (connection failures, constraint violations, etc.)
- Caught by storage methods and re-thrown to route handlers
- Handled by Express error middleware: `(err, req, res, next) => res.status(500).json({ message })`

**Validation Errors:**
- Caught at API boundary in `routes.ts` when Zod validation fails: `if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message })`
- Example in `routes.ts` line 56-57: Business Units POST handler

**Client-Side Errors:**
- React Query's `getQueryFn` throws on non-2xx status: `await throwIfResNotOk(res)`
- Component catches in `useQuery` error state: `const { data, error, isLoading } = useQuery(...)`
- Errors displayed via Toaster component or error boundaries

**401 Unauthorized:**
- Caught in `getQueryFn` with configurable behavior: `on401: "returnNull" | "throw"`
- Currently set to "throw" globally in `queryClient.ts`

## Cross-Cutting Concerns

**Logging:**
- Backend: Custom `log()` function in `server/index.ts` timestamps and sources all console.log calls
- API logging: Middleware captures request method, path, status code, duration, response JSON for all `/api/*` calls
- Client: No centralized logging; ad-hoc console.error for debugging

**Validation:**
- Backend: Zod schemas defined in `shared/routes.ts` for each API endpoint
- Validation happens at route handler entry point: `api.businessUnits.create.input.parse(req.body)`
- Type-safe: TypeScript enforces input types match Zod schemas
- Client: React Hook Form used in form components (e.g., `DocumentDetail.tsx` line 200+)

**Authentication:**
- Strategy: Not yet implemented; system assumes `actor` field manually provided in audit logs
- Passport configured in dependencies (`passport`, `passport-local`, `@types/passport`) but no routes register auth
- Express session middleware setup ready: `express-session` + `connect-pg-simple` for session persistence
- UI has Users/Roles management pages but no login flow

**Authorization:**
- Not enforced; no middleware checks permissions
- All API routes publicly accessible
- Application relies on SQL schema constraints (NOT NULL, FOREIGN KEY, UNIQUE)

**CORS:**
- Not configured; single-origin deployment (client and API on same port)
- Credentials included in fetch: `credentials: "include"` in `queryClient.ts` line 19

**File Handling:**
- Backend: `multer` configured for PDF uploads only (50MB limit) in `routes.ts` line 13-23
- S3 Integration: `server/s3.ts` handles upload/download/delete via AWS SDK
- PDFs stored in S3, references in `documentVersions.pdfS3Key`
- Client: File upload in DocumentDetail via form with PDF validation

---

*Architecture analysis: 2026-02-19*
