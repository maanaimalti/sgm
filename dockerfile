FROM node:20-alpine AS base

# Install pnpm directly without relying on npm registry
RUN apk add --no-cache curl && \
    curl -fsSL https://get.pnpm.io/install.sh | sh - && \
    ln -s /root/.local/share/pnpm/pnpm /usr/local/bin/pnpm && \
    pnpm --version

WORKDIR /app

COPY package.json ./
COPY pnpm-lock.yaml ./

RUN pnpm fetch --frozen-lockfile

RUN pnpm install --frozen-lockfile --prod

COPY . .

RUN pnpm migrate:prod

RUN pnpm run prisma:generate

RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "run", "start:prod"]