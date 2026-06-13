# Build context = monorepo root, not apps/api.
# Build with: docker build -f apps/api/Dockerfile -t sgm-api .
FROM node:22-alpine

WORKDIR /repo

RUN apk add --no-cache openssl \
  && corepack enable \
  && corepack prepare pnpm@9.15.0 --activate

# packages/shared has a `prepare` script (tsc) that fires during install,
# so its tsconfig.json + src must be present before `pnpm install` runs.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma/
COPY packages/shared ./packages/shared

RUN pnpm install --frozen-lockfile

COPY apps/api ./apps/api

RUN pnpm --filter @sgm/api exec prisma generate \
  && pnpm --filter @sgm/api build

WORKDIR /repo/apps/api

EXPOSE 3000

CMD ["pnpm", "run", "start:prod:migrate"]
