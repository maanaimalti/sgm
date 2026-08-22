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
- **Authorization comes off the token.** `auth.users.app_metadata` holds
  `{ app_user_id, roles, department_ids }` and is writable only by the service
  role, so the browser cannot forge it and Supabase puts it in every access
  token. `validate()` reads it and never touches the database — which is what
  lets RLS policies and Realtime (Stage D) authorize identically, since they run
  inside Postgres and can never reach `request.user`.
- **The price is staleness.** A role change lands on the next token, so
  `UsersService.update` writes `app_metadata` and then deletes the user's rows
  from `auth.sessions` (raw SQL — `auth.admin.signOut` needs the *user's* own
  JWT, which the server never has). That kills the refresh path but cannot
  invalidate an access token already issued, so keep the JWT expiry short in the
  dashboard.
- **`jwt.strategy.ts` reads no database at all.** A token with no
  `app_user_id` is rejected outright — either it predates the migration or the
  account was never linked to `public.users`, and letting it through would mean
  a signed-in user with no permissions and no explanation.
- **`GET /auth/me` is the one place that reads the row.** Roles come from the
  token; the name, username, e-mail, `mustSetPassword` and the department
  *names* do not exist as claims, so it fetches them.
- **"Which users have role X?" is no longer a join.** Notification fan-out, the
  approver list and the last-admin guard go through
  `SupabaseAdminService.findUserIdsByRole`, which pages `listUsers` and filters
  on `app_metadata` (memoized ~30s). Authorization never reads that cache.
- Role-based access control (RBAC); department-based user organization.
- `users.password` is retained but no longer read (see the Stage B runbook); `bcrypt` survives only for `prisma/seed.ts`.
- **`prisma/seed.ts` cannot grant a role any more.** It writes the row; the
  papel comes from `pnpm users:set-roles admin admin --setores=dept-cozinha`,
  which needs the service role key. Seeding then provisioning then setting
  roles is the full local-dev path.
- **Roles live in `app_metadata` and nowhere else.** The `roles`, `permissions`
  and their join tables are gone, along with the `custom_access_token_hook` and
  its `set_user_roles()` helper. Change roles with `POST/PATCH /users`, or
  `pnpm users:set-roles <username> <papel...>` when the UI is unreachable — that
  script carries the same last-admin guard as `users.service.ts`. There is no FK
  behind a role name any more, so `@IsIn(ROLES)` on the DTOs and the check in
  that script are the only things standing between a typo and a token that
  silently matches no `@Roles`.
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