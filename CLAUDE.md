# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`sgm-web` — "Sistema de Gestão de Maanaim" (management system for Maanaim de Alagoas). Next.js 14 (App Router) frontend in Portuguese (pt-BR) that talks to an external REST API. Package manager: **pnpm**.

## Commands

- `pnpm dev` — start dev server (http://localhost:3000)
- `pnpm build` — production build
- `pnpm start` — run the built app
- `pnpm lint` — Next.js lint (Biome is configured separately via `biome.json`; run with `pnpm biome check .` or `pnpm biome check --write .` to apply fixes)

There is no test suite configured in this repo.

### Required env

- `NEXT_PUBLIC_BASE_URL` — base URL of the backend API (consumed by `src/services/api.ts`).

## Architecture

### App Router routes (`src/app`)

Routes are in Portuguese and follow a consistent CRUD shape:

- `/` — login page (`page.tsx`)
- `/produtos`, `/categorias`, `/unidade-de-medida`, `/pedidos` — list pages, each with `novo/` (create) and `[id]/` (edit) sub-routes
- `/estoque` with `alterar/` — stock management

`layout.tsx` wraps everything in `Providers` (TanStack Query) plus the shadcn `Toaster`, Vercel `Analytics`, and `SpeedInsights`.

### Data layer pattern

The codebase enforces a strict three-layer split. Follow it when adding a feature:

1. **`src/data/schemas/*`** — Zod schemas (form validation + types).
2. **`src/data/fetchers/<resource>/*`** — read-side functions calling `api` (axios), grouped per resource (`get-all.ts`, `get-by-id.ts`, response interfaces).
3. **`src/data/mutations/*.ts`** — write-side functions (one file per action: `new-*`, `update-*`, `delete-*`, etc.).
4. **`src/hooks/pages/use-*.ts`** — page-level hooks that compose `useQuery`/`useMutation` with toasts, routing, and `react-hook-form`. Pages stay thin; logic lives in these hooks (see `src/app/page.tsx` → `useLogin`, `produtos/page.tsx` → `useProductPage`).

### API client (`src/services/api.ts`)

Single axios instance. A request interceptor:
- Skips auth on `/auth/login`.
- Reads `accessToken` from `localStorage`, attaches `Authorization: Bearer …`.
- Decodes the JWT (`src/hooks/use-jwt.ts`) and adds a `departmentId` header from `data.department[0].id`. Most backend calls are scoped by department, so this header is required — keep it intact when modifying the interceptor.

### Query client

`src/app/providers.tsx` returns a per-browser singleton `QueryClient` with `staleTime: 60s`. Reuse this client; don't instantiate new ones in components.

### UI

- shadcn/ui (`new-york` style, slate base, CSS variables) under `src/components/ui` — `components.json` is the source of truth for `shadcn add`.
- Tailwind via `tailwind.config.ts`; global tokens in `src/app/globals.css`.
- Icons: `lucide-react`.
- Forms: `react-hook-form` + `@hookform/resolvers/zod` with the `Form*` primitives from `components/ui/form.tsx`.
- Path alias: `@/*` → `src/*`.

## Conventions

- Domain names in code/UI are Portuguese (`produtos`, `pedidos`, `categorias`, `unidade-de-medida`, `estoque`); supporting code (fetchers/mutations directories, types) uses English (`products`, `orders`, etc.). Match this split when adding new resources.
- After a successful mutation, invalidate the matching `queryKey` (e.g. `["products", currentPage]`) and surface a `useToast` notification — see `use-product.ts` for the canonical pattern.
- Biome is the formatter/linter (`biome.json`, recommended rules + organize imports). Prefer fixing lint issues over disabling rules; the existing `biome-ignore` for the JWT `any` cast in `api.ts` is the only sanctioned escape hatch.
