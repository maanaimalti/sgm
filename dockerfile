FROM node:20-alpine AS base

# Enable corepack and use it to install pnpm (avoids npm registry issues)
RUN corepack enable
RUN corepack prepare pnpm@latest --activate

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