FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install -g pnpm

RUN pnpm install

COPY . .

RUN pnpm migrate:prod

RUN pnpm run prisma:generate

RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "run", "start:prod"]