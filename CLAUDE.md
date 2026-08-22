# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

`sgm` — Sistema de Gestão de Maanaim. pnpm workspaces monorepo for a stock & order management system.

```
apps/api/        @sgm/api    — NestJS 11 + Prisma + Postgres (Supabase) backend (deploys to EasyPanel/Heroku)
apps/web/        @sgm/web    — Next.js 15 (App Router) frontend in pt-BR (deploys to Vercel)
packages/shared/ @sgm/shared — TypeScript types shared between api and web
```

Per-app guidance lives in `apps/api/CLAUDE.md` and `apps/web/CLAUDE.md` — read those when working inside an app. This file covers monorepo-level concerns only.

## Top-level commands

Run from the repo root:

- `pnpm install` — installs all workspaces. Triggers `@sgm/shared`'s `prepare` script which builds `packages/shared/dist`, plus `@sgm/api`'s `postinstall` (`prisma generate`).
- `pnpm dev:api` — `@sgm/api` in NestJS watch mode.
- `pnpm dev:web` — `@sgm/web` in Next.js dev mode.
- `pnpm build:api` / `pnpm build:web` / `pnpm build:shared`
- `pnpm lint:api` / `pnpm lint:web` (both use Biome)
- `pnpm typecheck` — runs `typecheck` recursively in every workspace (`pnpm -r typecheck`).

Both apps default to `PORT=3000`. Run only one of `dev:api` / `dev:web` at a time, or set `PORT` on one.

To run a script in a single workspace ad-hoc: `pnpm --filter @sgm/api <script>` (or `@sgm/web`, `@sgm/shared`).

## Shared package contract

`@sgm/shared` is consumed by both apps via `"@sgm/shared": "workspace:*"`. It is **published as compiled JS+d.ts** (`main: dist/index.js`, `types: dist/index.d.ts`) — consumers do not import its TS source.

Implications when changing `packages/shared/src/*.ts`:

- The `dist/` output must be rebuilt for consumers to see changes. `pnpm install` rebuilds it via the `prepare` script; otherwise run `pnpm build:shared` (or `pnpm --filter @sgm/shared build`).
- **It compiles to CommonJS, and must stay that way.** `@sgm/api` is a NestJS app built to CJS, so its `dist` does `require("@sgm/shared")`. An ESM-only build (`"type": "module"` with only an `import` condition in `exports`) type-checks, lints, tests and builds cleanly, then crashes the container at startup with `ERR_PACKAGE_PATH_NOT_EXPORTED`. CI guards this with a `require("@sgm/shared")` step. Keep exports flowing through `src/index.ts`.
- Types here are the canonical domain shapes (category, department, notification, order, product, stock, unity). When adding/changing API response shapes, update `@sgm/shared` first, then both apps.

## Tooling notes

- **Package manager:** pnpm 9.15.0 (pinned via `packageManager`). Do not use npm/yarn — workspace protocol resolution depends on pnpm.
- **Node:** the API targets Node 22 (see `apps/api/Dockerfile`).
- **Linting:** each app has its own `biome.json`. Versions differ (api on Biome 2.x, web on Biome 1.9.x); don't unify them without intent.
- **TypeScript:** every workspace has its own `tsconfig.json`. There is no root tsconfig.
