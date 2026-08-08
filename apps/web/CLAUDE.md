# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`@sgm/web` — "Sistema de Gestão de Maanaim" (management system for Maanaim de Alagoas). Next.js 15 (App Router) + React 19 frontend in Portuguese (pt-BR) that talks to an external REST API. Package manager: **pnpm**. Lives in the `apps/web` workspace of the `sgm` monorepo.

## Commands

- `pnpm dev` — start dev server (http://localhost:3000)
- `pnpm build` — production build
- `pnpm start` — run the built app
- `pnpm lint` — Next.js lint (Biome is configured separately via `biome.json`; run with `pnpm biome check .` or `pnpm biome check --write .` to apply fixes)

There is no test suite configured in this repo.

### Required env

- `NEXT_PUBLIC_BASE_URL` — base URL of the backend API (consumed by `src/services/api.ts`).
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — must point at the same project the API does. Both ship in the bundle; the anon key is a public identifier, which is why every table in the database has RLS enabled with no policies.

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
2. **`src/data/fetchers/<resource>/*`** — read-side functions calling `api` (axios), grouped per resource (`get-all.ts`, `get-by-id.ts`). API response shapes are imported from `@sgm/shared` (workspace package), not declared locally.
3. **`src/data/mutations/*.ts`** — write-side functions (one file per action: `new-*`, `update-*`, `delete-*`, etc.).
4. **`src/hooks/pages/use-*.ts`** — page-level hooks that compose `useQuery`/`useMutation` with toasts, routing, and `react-hook-form`. Pages stay thin; logic lives in these hooks (see `src/app/page.tsx` → `useLogin`, `produtos/page.tsx` → `useProductPage`).

### Auth (Supabase)

- **Supabase Auth owns the session.** `src/lib/supabase/client.ts` is a lazy singleton `createBrowserClient` (from `@supabase/ssr`, so the session lives in cookies and the middleware can see it). Never construct a second client: two refresh timers race to rotate the same token and the loser gets signed out.
- **Identity comes from `GET /auth/me`**, cached under `["auth","me"]` and exposed by `useAuth()` / `useRoles()` (`src/hooks/use-auth.ts`). Do not decode the token in the browser — a role change would then only take effect on the next refresh.
- `src/components/shell/auth-gate.tsx` holds the `(app)` shell back until identity resolves. Without it the nav renders once with no roles and corrects itself.
- **One logout: `src/lib/auth/sign-out.ts`.** The order matters — `unsubscribeFromPush()` calls the API and needs a live token, so it runs before the session goes away. `scope: "local"`, or signing out on one device signs the user out everywhere.
- `src/middleware.ts` delegates to `updateSession`. Whatever response the Supabase client wrote cookies into is the response that must be returned, redirects included — returning a fresh `NextResponse` silently discards refreshed tokens and reads as random logouts.

### API client (`src/services/api.ts`)

Single axios instance. The request interceptor is **async**: it calls `supabase.auth.getSession()`, which transparently renews an expired access token. That is what ended the hard logout every 12 hours — do not make it synchronous again.

There is no `departmentId` header. `GetDepartmentId` on the API falls back to the caller's first department, which is the same value the header used to carry, and no department switcher exists in the UI.

On a 401 the response interceptor asks for one refresh and replays the request. The `_retried` guard is required: the API 401s when a token's subject matches no local user, which would otherwise loop forever on a valid token.

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
- Biome is the formatter/linter (`biome.json`, recommended rules + organize imports). Prefer fixing lint issues over disabling rules.
