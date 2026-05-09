# SGM API

Stock and Order Management System API. A NestJS service that handles
products, categories, stock movements, orders, departments, role-based
auth, notifications, and PDF report generation.

## Tech stack

- **Runtime:** Node.js 22, pnpm 9
- **Framework:** NestJS 11 (Express)
- **Database:** MySQL 8 via Prisma 6
- **Auth:** JWT + Passport (local + bearer strategies), bcrypt
- **Storage:** AWS S3 / Cloudflare R2 (`@aws-sdk/client-s3`)
- **PDF:** `pdf-lib`
- **Realtime:** Socket.IO via `@nestjs/websockets`
- **Tooling:** Biome (lint + format), Jest, ts-jest

## Quick start

```bash
# 1. Install dependencies (runs prisma generate)
pnpm install

# 2. Configure environment
cp .env.example .env
# then edit .env with your values (see "Environment variables" below)

# 3. Apply migrations
pnpm prisma migrate dev

# 4. Start in watch mode
pnpm run start:dev
```

The API listens on `PORT` (default `3000`).

## Environment variables

| Variable       | Required | Description                                          |
| -------------- | :------: | ---------------------------------------------------- |
| `DATABASE_URL` |    ✅    | MySQL connection string used by Prisma.              |
| `JWT_SECRET`   |    ✅    | Secret used to sign JWTs. App refuses to boot if missing. |
| `R2_ENDPOINT`  |    ✅    | S3-compatible endpoint (Cloudflare R2 in production). |
| `PORT`         |          | HTTP port. Defaults to `3000`.                       |

The S3 client also reads standard AWS credential env vars
(`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`).

## Scripts

| Script               | What it does                                  |
| -------------------- | --------------------------------------------- |
| `pnpm run start:dev` | Nest in watch mode                            |
| `pnpm run start:prod`| Run compiled `dist/main.js`                   |
| `pnpm run build`     | `nest build` → `dist/`                        |
| `pnpm run lint`      | `biome check --write .`                       |
| `pnpm run format`    | `biome format --write .`                      |
| `pnpm run test`      | Jest unit tests                               |
| `pnpm run test:e2e`  | Jest e2e tests                                |
| `pnpm run test:cov`  | Coverage report                               |
| `pnpm run migrate:prod` | `prisma migrate deploy` (production)       |
| `pnpm run prisma:generate` | Regenerate Prisma client               |

## Project layout

```
src/
├── main.ts                  # bootstrap, global pipes/filters, CORS, shutdown hooks
├── app.module.ts            # root module
├── modules/                 # business domains
│   ├── products/            # inventory items
│   ├── category/            # product categories
│   ├── unity/               # units of measurement
│   ├── department/          # organizational departments
│   ├── movement/            # stock in/out movements
│   ├── orders/              # order lifecycle (PENDING → APPROVED → PURCHASED → CANCELED)
│   ├── notification/        # in-app notifications
│   └── reports/             # async PDF report generation
└── shared/
    ├── auth/                # JWT + local strategies, guards, RBAC
    ├── db/                  # PrismaService (with shutdown hooks)
    ├── filters/             # global PrismaExceptionFilter
    ├── helpers/             # cross-cutting utilities
    ├── upload/              # S3/R2 file upload service
    └── decorators/          # @GetUserId() and friends
prisma/
└── schema.prisma            # data model (MySQL)
```

## Domain model

Core entities and relationships:

- **user** — authenticated principal. Has many **roles**, belongs to many **departments**.
- **role** ↔ **permission** — many-to-many RBAC.
- **product** — inventory item, belongs to a **category**, **unity**, and optionally a **department**.
- **movement** — stock in/out event for a product. Drives **stock** balances.
- **stock** — current quantity on hand per product.
- **orders** → **orderItem[]** — order header + line items, with `orderStatus`.
- **orderReports** — generated PDF artifacts attached to an order.
- **notification** — in-app message addressed to a user.
- **report** — async report job (`PRODUCTS | ORDERS | MOVEMENTS | STOCK | USERS`) with `reportStatus` lifecycle.

See `prisma/schema.prisma` for the canonical definition.

## Auth & authorization

- `POST /auth/login` exchanges username + password for a JWT.
- Protected routes use `JwtAuthGuard`; role-restricted routes pair it with `RolesGuard` + the `@Roles(...)` decorator.
- Use `@GetUserId()` in controllers to pull the authenticated user's id from the JWT payload.

## Error handling

A global `PrismaExceptionFilter` maps Prisma errors to clean HTTP responses:

| Prisma code | HTTP | Meaning                                  |
| ----------- | ---- | ---------------------------------------- |
| `P2002`     | 409  | Unique constraint violation              |
| `P2025`     | 404  | Record not found                         |
| `P2003`     | 400  | Foreign key constraint violation         |
| validation  | 400  | Invalid query shape                      |
| other       | 500  | Logged server-side, sanitized response   |

## Running with Docker

```bash
docker compose up --build
```

The compose stack provisions MySQL 8 alongside the API on port `3000`.
The Dockerfile uses Node 22 with pnpm pinned via Corepack and a
`--frozen-lockfile` install.

## Deployment (Heroku)

The `Procfile` declares two phases:

```
release: pnpm run migrate:prod   # runs prisma migrate deploy on every release
web: pnpm run start:prod         # boots the compiled app
```

Before the first deploy:

```bash
heroku config:set JWT_SECRET=$(openssl rand -hex 32)
heroku config:set DATABASE_URL='mysql://...'
heroku config:set R2_ENDPOINT='https://<account>.r2.cloudflarestorage.com'
heroku config:set AWS_ACCESS_KEY_ID=...
heroku config:set AWS_SECRET_ACCESS_KEY=...
heroku config:set AWS_REGION=auto
git push heroku main
```

The app **fails fast at boot** if `JWT_SECRET` is unset — there is no
insecure default.

## Conventions

- Validation: DTOs use `class-validator` + `class-transformer`; a global
  `ValidationPipe` is registered in `main.ts`.
- Style: Biome with 2-space indent, semicolons, trailing commas, 80-col
  line width. Run `pnpm run lint` before committing.
- Imports: Biome organizes imports automatically. Do **not** convert
  injected `*Service` classes or DTOs to `import type` — Nest needs them
  as runtime values for DI metadata.
- IDs: ULIDs (`ulid` package) for new records.

## License

UNLICENSED — internal project.
