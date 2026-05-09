# SGM — Sistema de Gestão de Maanaim

Monorepo for the SGM stock & order management system.

```
apps/
├── api/   — NestJS backend (deploys to EasyPanel)
└── web/   — Next.js frontend (deploys to Vercel)
packages/
└── shared/  — types shared between api and web
```

## Quick start

```bash
pnpm install              # installs all workspaces, builds shared types
pnpm dev:api              # NestJS in watch mode → http://localhost:3000
pnpm dev:web              # Next.js dev server → http://localhost:3000
```

Run only one of `dev:api` / `dev:web` at a time, or set `PORT` on one of them.

See `apps/api/README.md` and `apps/web/README.md` for per-app details.
