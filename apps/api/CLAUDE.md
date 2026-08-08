# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- **Install dependencies**: `pnpm install`
- **Development server**: `pnpm run start:dev` (with watch mode)
- **Build**: `pnpm run build`
- **Production server**: `pnpm run start:prod`

### Testing
- **Unit tests**: `pnpm run test`
- **E2E tests**: `pnpm run test:e2e`
- **Test coverage**: `pnpm run test:cov`
- **Test with watch**: `pnpm run test:watch`

### Code Quality
- **Lint + format**: `pnpm run lint` (Biome, with auto-fix)
- **Format only**: `pnpm run format` (Biome)

### Database
- **Generate Prisma client**: `pnpm run prisma:generate`
- **Deploy migrations**: `pnpm run migrate:prod`
- **Reset database**: `prisma migrate reset` (dev only)
- **View database**: `prisma studio`

### Docker
- **Start with Docker**: `docker compose -f apps/api/docker-compose.yaml up` (run from repo root)
- **Build Docker image**: `docker build -f apps/api/Dockerfile -t sgm-api .` (run from repo root — build context must be the monorepo root so `packages/shared/` is reachable)

## Architecture Overview

This is a NestJS-based API for a Stock and Order Management System (SGM) with the following key architectural patterns:

### Core Structure
- **Framework**: NestJS (TypeScript) with Express
- **Database**: Postgres (Supabase) with Prisma ORM. `DATABASE_URL` and `DIRECT_URL` both point at the Supavisor **session** pooler (5432), never the transaction pooler (6543) — two transactions in this codebase are interactive.
- **Authentication**: JWT with Passport.js (local strategy)
- **File Upload**: S3-compatible client (Cloudflare R2 today, Supabase Storage next)
- **PDF Generation**: pdf-lib for order reports

### Module Organization
```
src/
├── modules/           # Business logic modules
│   ├── products/      # Product management
│   ├── category/      # Product categories
│   ├── orders/        # Order processing
│   ├── movement/      # Stock movements (in/out)
│   ├── unity/         # Unit of measurement
│   ├── department/    # User departments
│   └── notification/  # System notifications
└── shared/           # Shared services and utilities
    ├── auth/         # JWT authentication & authorization
    ├── db/           # Prisma database service
    ├── helpers/      # Utility services
    ├── decorators/   # Custom decorators
    └── upload/       # File upload handling
```

### Database Schema Key Entities
- **Users**: Authentication with roles and departments
- **Products**: Inventory items with categories, units, cost/sale values
- **Orders**: Order lifecycle (PENDING → APPROVED → PURCHASED → CANCELED)
- **Movements**: Stock in/out tracking
- **Stock**: Current inventory levels
- **Notifications**: User notifications system

### Authentication & Authorization
- **Supabase Auth owns identity.** The API mints no tokens and stores no passwords. `JwtStrategy` verifies the access token against the project's JWKS (`ES256`, `aud: authenticated`, issuer derived from `SUPABASE_URL`) — there is no `POST /auth/login` and no `JWT_SECRET`.
- **`sub` is a Supabase UUID; everything else speaks ULID.** `users.supabase_user_id` bridges the two, so `@GetUserId()`, `@Roles`, `@GetDepartmentId` and every service are unchanged. Adding a user means creating the account in Supabase Auth *and* the row here — use `POST /users` or `prisma/scripts/provision-supabase-auth.ts`, never raw SQL.
- **Claims are never trusted for authorization.** `validate()` reads roles and departments from the database on every request, so a role change takes effect immediately. `GET /auth/me` is a projection of that same lookup, which is why it costs no extra query — it is what the browser uses instead of decoding the token.
- Role-based access control (RBAC); department-based user organization.
- `users.password` is retained but no longer read (see the Stage B runbook); `bcrypt` survives only for `prisma/seed.ts`.
- **Row level security is on for every table with zero policies.** The anon key ships in the web bundle, so without it PostgREST would be a public read API over the whole schema. Prisma is unaffected because it connects as the tables' owner — never `FORCE ROW LEVEL SECURITY`, and never point `DATABASE_URL` at a non-owner role. `pnpm db:verify-rls` checks both, and runs in CI.

### Key Patterns
- **DTOs**: Validation with class-validator and class-transformer
- **Guards**: JWT authentication and role-based authorization
- **Decorators**: Custom `@GetUserId()` decorator for extracting user ID
- **Services**: Business logic separation from controllers
- **Prisma Relations**: Comprehensive entity relationships

## Important Technical Details

### Environment Configuration
- Uses `@nestjs/config` with `.env` files
- Database connection via `DATABASE_URL` environment variable
- CORS enabled for cross-origin requests

### Code Style (Biome Configuration)
- 2-space indentation
- Semicolons required
- Trailing commas everywhere
- Line width: 80 characters
- Import organization enabled
- Parameter decorators enabled for NestJS

### Testing Setup
- Jest for unit testing
- Supertest for E2E testing
- Test files: `*.spec.ts` pattern
- Coverage directory: `../coverage`
- Module name mapping: `src/(.*)` → `<rootDir>/$1`

### Docker Setup
- Single-stage build on Node 22
- Uses pnpm package manager
- Runs database migrations and Prisma generation in build
- Exposes port 3000
- Postgres 16 on host port **5433** in docker-compose (5432 is often taken by another project). A `db` service still runs MySQL 8.0 as the read-only source for the Stage A migration; delete it once the cutover is done.