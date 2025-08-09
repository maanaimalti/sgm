FROM node:20-alpine AS base

WORKDIR /app

COPY package.json ./

# Generate package-lock.json and install
RUN npm install --package-lock-only && \
    npm ci --omit=dev

COPY . .

RUN npx prisma migrate deploy

RUN npx prisma generate

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]