# Overview

This is a **TradeLocker Bot Dashboard** - an advanced algorithmic trading control panel for connecting to TradeLocker (and potentially MT4/5) brokers. The application provides a comprehensive interface for managing trading strategies, monitoring live trades, configuring risk parameters, and viewing system logs. Built with a futuristic cyberpunk aesthetic, it features real-time data visualization, strategy code editing, and broker API integration.

The stack consists of:
- **Frontend**: React with TypeScript, Vite, Tailwind CSS, and shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Real-time Data**: Trading quotes and market data from TradeLocker API
- **Deployment**: Optimized for Replit hosting

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework & Build System**
- React 18+ with TypeScript for type-safe component development
- Vite as the build tool and development server
- Routing handled by Wouter (lightweight client-side router)
- Module federation pattern with client code in `/client` directory

**UI Component System**
- shadcn/ui components built on Radix UI primitives for accessibility
- Tailwind CSS v4 (inline themes) with custom cyberpunk/fintech design tokens
- Custom theme uses dark mode as default with neon accent colors (green for profit, blue for actions, red for losses)
- Responsive design with mobile-first breakpoints

**State Management**
- TanStack Query (React Query) for server state management
- Custom query client with automatic refetching disabled (staleTime: Infinity)
- Local component state for UI interactions
- No global state management library (keeps architecture simple)

**Key Design Patterns**
- Separation of concerns: trading components in `/components/trading`, UI primitives in `/components/ui`
- Custom hooks for API interactions (`/lib/api.ts`)
- Path aliases for clean imports (`@/` for client, `@shared/` for shared code)

## Backend Architecture

**Server Framework**
- Express.js with TypeScript for type safety
- ESM modules (type: "module" in package.json)
- HTTP server creation via Node's native `http` module
- Custom logging middleware for request/response tracking

**Code Organization**
- `/server/index.ts` - Main server entry point
- `/server/routes.ts` - API route registration
- `/server/storage.ts` - Data access layer abstraction
- `/server/db.ts` - Database connection setup
- `/server/tradelocker.ts` - TradeLocker API service integration
- `/server/static.ts` - Static file serving for production builds

**API Design**
- RESTful endpoints under `/api/*` prefix
- Mock user authentication (hardcoded user ID for MVP)
- JSON request/response format
- Zod schema validation for incoming data

**Database Layer**
- Drizzle ORM for type-safe database queries
- PostgreSQL as the primary database
- Schema-first approach with `shared/schema.ts` containing all table definitions
- Connection pooling via `pg` library
- Migrations stored in `/migrations` directory

**Build Strategy**
- Development: tsx for hot reloading during development
- Production: esbuild bundles server code with selective dependencies
- Allowlist pattern bundles specific dependencies to reduce cold start times
- Client built separately via Vite and served as static files

## Data Models

**Core Entities**
1. **Users** - Basic user authentication (username/password)
2. **Strategies** - Trading algorithm code with parameters and active status
3. **Risk Configs** - Per-user risk management rules (daily loss limits, position sizing, trading hours)
4. **Trades** - Individual trade records with entry/exit prices, P/L tracking
5. **System Logs** - Timestamped event logs with severity levels
6. **Backtest Results** - Historical strategy performance data
7. **Broker Credentials** - Encrypted storage for broker API credentials

**Data Flow**
- Frontend → API endpoints → Storage layer → Database
- Type safety maintained throughout via shared schema definitions
- Drizzle Zod integration generates runtime validators from database schema

## External Dependencies

**Third-Party Services**
- **TradeLocker API** - Live broker connectivity for trade execution, account data, and market quotes
  - Authentication via email/password credentials
  - REST API for account management and order placement
  - Real-time quote streaming (implementation in progress)
  - Multiple account support with account selection workflow

**Database**
- **PostgreSQL** - Primary data store (requires DATABASE_URL environment variable)
- **connect-pg-simple** - PostgreSQL session store for Express sessions

**UI Libraries**
- **Radix UI** - Headless accessible component primitives
- **Lucide React** - Icon library
- **lightweight-charts** - TradingView-style charting library
- **date-fns** - Date manipulation and formatting

**Developer Tools**
- **Replit Plugins** - Development banner, cartographer, and runtime error modal (dev mode only)
- Custom Vite plugin for OpenGraph image meta tag updates based on deployment URL

**Build & Deployment**
- Environment detection via `NODE_ENV` and `REPL_ID`
- Custom build script bundles both client and server
- Static file serving in production from `/dist/public`