FROM node:20

WORKDIR /app

COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY prisma ./prisma/

RUN npm install -g pnpm

RUN pnpm install

COPY . .

RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "run", "start:prod"]
