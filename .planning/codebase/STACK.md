# Technology Stack

**Analysis Date:** 2026-02-19

## Languages

**Primary:**
- TypeScript 5.6.3 - All source code, configurations, and server logic
- JavaScript - Build scripts and configuration files

**Secondary:**
- HTML/CSS - Client templates and styling (via React/Tailwind)

## Runtime

**Environment:**
- Node.js 25.6.1 (from local `node --version`)
- npm/yarn via package.json lockfile (present)

**Package Manager:**
- npm (implied from package.json structure)
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Express 5.0.1 - Web framework for HTTP server at `server/index.ts`
- React 18.3.1 - UI component framework
- Next Themes 0.4.6 - Theme management (dark mode)

**Database & ORM:**
- Drizzle ORM 0.39.3 - TypeScript ORM with Zod integration
- Drizzle Kit 0.31.8 - Database migration tool
- PostgreSQL 8.16.3 - Relational database client (`pg` package)
- Connect PG Simple 10.0.0 - Session storage for PostgreSQL

**UI Components:**
- Radix UI 1.2.x series - Headless accessible component library
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- Lucide React 0.453.0 - Icon library
- Recharts 2.15.2 - Chart/visualization library
- Embla Carousel React 8.6.0 - Carousel component
- React Resizable Panels 2.1.7 - Resizable panel layout

**Form & Validation:**
- React Hook Form 7.55.0 - Form state management
- Zod 3.25.76 - Schema validation
- Drizzle Zod 0.7.1 - Zod schema generation from Drizzle tables
- Zod Validation Error 3.5.4 - Enhanced validation error messages

**Authentication:**
- Passport 0.7.0 - Authentication middleware
- Passport Local 1.0.0 - Username/password strategy
- Express Session 1.18.1 - Session management
- MemoryStore 1.6.7 - In-memory session storage

**Testing & Build:**
- Vite 7.3.0 - Frontend build tool and dev server
- TSX 4.20.5 - TypeScript executor for Node
- ESBuild 0.25.0 - JavaScript bundler
- TypeScript 5.6.3 - Static type checking

**Development Tools:**
- Replit Vite Plugins (cartographer, dev-banner, runtime-error-modal) - Replit-specific dev enhancements

**Styling:**
- PostCSS 8.4.47 - CSS post-processor
- Autoprefixer 10.4.20 - CSS vendor prefixing
- Tailwind CSS Animate 1.0.7 - Animation utilities
- TW Animate CSS 1.2.5 - Additional CSS animations
- Tailwind Merge 2.6.0 - Utility class merging
- Tailwind Typography 0.5.19 - Typography styles

**File Handling & Data Processing:**
- Multer 2.0.2 - File upload middleware
- ExcelJS 4.4.0 - Excel file manipulation
- XLSX 0.18.5 - Spreadsheet file reading/writing
- PDF.js 5.4.624 - PDF rendering and processing
- Framer Motion 11.13.1 - Animation library

**Utilities:**
- Date-fns 3.6.0 - Date manipulation and formatting
- Clsx 2.1.1 - Class name conditional utility
- Class Variance Authority 0.7.1 - Component variant patterns
- Wouter 3.3.5 - Lightweight client-side router
- React Markdown 10.1.0 - Markdown rendering
- React Icons 5.4.0 - Icon library
- Input OTP 1.4.2 - OTP input component
- React Day Picker 8.10.1 - Date picker component
- Vaul 1.1.2 - Drawer component library
- p-limit 7.3.0 - Concurrency limiter
- p-retry 7.1.1 - Retry utility with exponential backoff
- WebSocket (ws) 8.18.0 - WebSocket client/server

**Optional Dependencies:**
- bufferutil 4.0.8 - WebSocket performance optimization

## Configuration

**Environment:**
- `DATABASE_URL` - PostgreSQL connection string (required)
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` - Anthropic API key for Claude models
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` - Optional Anthropic base URL override
- `NODE_ENV` - Deployment environment (development/production)
- `PORT` - Server port (defaults to 5000)
- `REPL_ID` - Replit environment detection

**Build:**
- `tsconfig.json` - TypeScript compiler configuration
- `vite.config.ts` - Vite build configuration at root
- `tailwind.config.ts` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `drizzle.config.ts` - Drizzle ORM migration config

## Platform Requirements

**Development:**
- Node.js 25.6.1
- PostgreSQL database
- Anthropic API key (for AI features)

**Production:**
- Node.js 25.6.1 runtime
- PostgreSQL 12+ database
- Port 5000 (Replit-specific: only non-firewalled port)
- Anthropic API credentials for AI-powered analysis features

---

*Stack analysis: 2026-02-19*
