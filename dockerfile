FROM node:20-alpine AS base

WORKDIR /app

COPY package.json ./

# Use npm instead of pnpm - no external downloads needed
RUN npm ci --only=production

COPY . .

# Run your Prisma commands with npx instead of pnpm
RUN npx prisma migrate deploy

RUN npx prisma generate

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]