SHELL := /bin/bash

API_PORT ?= 3333
WEB_PORT ?= 3000
API_URL  ?= http://localhost:$(API_PORT)

COMPOSE := docker compose -f apps/api/docker-compose.yaml

.DEFAULT_GOAL := help

.PHONY: help install dev api web db-up db-down db-logs legacy-db-up migrate-data migrate build lint typecheck clean

help:
	@echo "sgm — local dev commands"
	@echo ""
	@echo "  make install     pnpm install (builds @sgm/shared, runs prisma generate)"
	@echo "  make dev         start Postgres + API (:$(API_PORT)) + Web (:$(WEB_PORT)) together"
	@echo "  make api         run only the API on :$(API_PORT)"
	@echo "  make web         run only the Web on :$(WEB_PORT) (NEXT_PUBLIC_BASE_URL=$(API_URL))"
	@echo "  make db-up       start Postgres on :5433 (docker compose)"
	@echo "  make db-down     stop the databases"
	@echo "  make db-logs     tail Postgres logs"
	@echo "  make migrate     prisma migrate dev"
	@echo "  make build       build shared, api, web"
	@echo "  make lint        lint api + web (Biome)"
	@echo "  make typecheck   typecheck all workspaces"
	@echo "  make clean       remove build outputs (dist/, .next/)"
	@echo ""
	@echo "Stage A migration (MySQL → Postgres):"
	@echo "  make legacy-db-up   start the legacy MySQL on :3306 (migration source)"
	@echo "  make migrate-data   copy MySQL → Postgres and run the go/no-go gates"
	@echo ""
	@echo "Expected apps/api/.env  → DATABASE_URL + DIRECT_URL (postgresql://...)"

install:
	pnpm install

db-up:
	$(COMPOSE) up -d --wait postgres

legacy-db-up:
	$(COMPOSE) up -d --wait db

migrate-data:
	pnpm --filter @sgm/api exec ts-node --transpile-only prisma/migrate-mysql-to-postgres.ts

db-down:
	$(COMPOSE) down

db-logs:
	$(COMPOSE) logs -f postgres

migrate:
	pnpm --filter @sgm/api exec prisma migrate dev

api:
	PORT=$(API_PORT) pnpm dev:api

web:
	PORT=$(WEB_PORT) NEXT_PUBLIC_BASE_URL=$(API_URL) pnpm dev:web

dev: db-up
	@echo "Starting API (:$(API_PORT)) and Web (:$(WEB_PORT))..."
	@trap 'kill 0' EXIT INT TERM; \
	  ( PORT=$(API_PORT) pnpm dev:api ) & \
	  ( PORT=$(WEB_PORT) NEXT_PUBLIC_BASE_URL=$(API_URL) pnpm dev:web ) & \
	  wait

build:
	pnpm build:shared && pnpm build:api && pnpm build:web

lint:
	pnpm lint:api && pnpm lint:web

typecheck:
	pnpm typecheck

clean:
	rm -rf apps/api/dist apps/web/.next packages/shared/dist
