# S.S. Opticals (Narbada eye care)

## Overview

A mobile-friendly web application for S.S. Opticals (Narbada eye care) to manage lens pricing with unlimited nested categories and customer records. The app features dual pricing (retail/wholesale) with password-protected wholesale access, a hierarchical category tree for lens types and power ranges, and customizable customer intake forms with configurable field presets.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, Zustand for client state (wholesale unlock status)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens for colors and typography (Outfit for display, Inter for body text)

### Backend Architecture
- **Runtime**: Node.js with Express
- **API Pattern**: RESTful endpoints defined in `shared/routes.ts` with Zod validation schemas
- **Build System**: Custom build script using esbuild for server bundling and Vite for client

### Data Storage
- **Database**: PostgreSQL via `pg` driver
- **ORM**: Drizzle ORM with schema defined in `shared/schema.ts`
- **Schema Migrations**: Drizzle Kit with migrations output to `./migrations`

### Key Data Models
- **Settings**: Stores hashed wholesale password
- **Categories**: Self-referential tree structure with `parentId` for unlimited nesting, supports FOLDER and ITEM types with pricing
- **Customers**: Customer records with lens power tracking and configurable fields
- **FormPresets/FormPresetFields**: Customizable form field configurations for customer intake

### Security
- Wholesale prices protected by password (scrypt hashing with salt)
- Password verification required to unlock wholesale pricing mode
- Client-side unlock state persisted in localStorage via Zustand

### File Structure
```
client/           # React frontend
  src/
    components/   # UI components including shadcn/ui
    hooks/        # Custom React hooks for API calls
    pages/        # Page components (Dashboard, Customers, Categories, Settings)
    lib/          # Utilities and query client
server/           # Express backend
  routes.ts       # API route handlers
  storage.ts      # Database access layer
  db.ts           # Database connection
shared/           # Shared code between client and server
  schema.ts       # Drizzle table definitions and Zod schemas
  routes.ts       # API route definitions with types
```

## External Dependencies

### Database
- PostgreSQL database (connection via `DATABASE_URL` environment variable)
- Drizzle ORM for type-safe queries
- `connect-pg-simple` for session storage

### File Storage
- Local file uploads used temporarily for backup restoration via Multer middleware.

### Key NPM Packages
- `@tanstack/react-query`: Data fetching and caching
- `drizzle-orm` / `drizzle-zod`: Database ORM with Zod integration
- `zod`: Runtime schema validation
- `zustand`: Client state management
- `date-fns`: Date formatting utilities
- Full shadcn/ui component suite via Radix UI primitives