# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- **Install dependencies**: `pnpm install`
- **Development server**: `pnpm run start:dev` (with watch mode)
- **Build**: `pnpm run build`
- **Production server**: `pnpm run start:prod`

### Testing
- **Unit tests**: `pnpm run test`
- **E2E tests**: `pnpm run test:e2e`
- **Test coverage**: `pnpm run test:cov`
- **Test with watch**: `pnpm run test:watch`

### Code Quality
- **Linting**: `pnpm run lint` (ESLint with auto-fix)
- **Formatting**: `pnpm run format` (Prettier)
- **Biome check**: `biome check` (linting and formatting with Biome)

### Database
- **Generate Prisma client**: `pnpm run prisma:generate`
- **Deploy migrations**: `pnpm run migrate:prod`
- **Reset database**: `prisma migrate reset` (dev only)
- **View database**: `prisma studio`

### Docker
- **Start with Docker**: `docker-compose up`
- **Build Docker image**: `docker build -t sgm-api .`

## Architecture Overview

This is a NestJS-based API for a Stock and Order Management System (SGM) with the following key architectural patterns:

### Core Structure
- **Framework**: NestJS (TypeScript) with Express
- **Database**: MySQL with Prisma ORM
- **Authentication**: JWT with Passport.js (local strategy)
- **File Upload**: AWS S3 integration
- **PDF Generation**: pdf-lib for order reports

### Module Organization
```
src/
├── modules/           # Business logic modules
│   ├── products/      # Product management
│   ├── category/      # Product categories
│   ├── orders/        # Order processing
│   ├── movement/      # Stock movements (in/out)
│   ├── unity/         # Unit of measurement
│   ├── department/    # User departments
│   └── notification/  # System notifications
└── shared/           # Shared services and utilities
    ├── auth/         # JWT authentication & authorization
    ├── db/           # Prisma database service
    ├── helpers/      # Utility services
    ├── decorators/   # Custom decorators
    └── upload/       # File upload handling
```

### Database Schema Key Entities
- **Users**: Authentication with roles and departments
- **Products**: Inventory items with categories, units, cost/sale values
- **Orders**: Order lifecycle (PENDING → APPROVED → PURCHASED → CANCELED)
- **Movements**: Stock in/out tracking
- **Stock**: Current inventory levels
- **Notifications**: User notifications system

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Department-based user organization
- Password hashing with bcrypt

### Key Patterns
- **DTOs**: Validation with class-validator and class-transformer
- **Guards**: JWT authentication and role-based authorization
- **Decorators**: Custom `@GetUserId()` decorator for extracting user ID
- **Services**: Business logic separation from controllers
- **Prisma Relations**: Comprehensive entity relationships

## Important Technical Details

### Environment Configuration
- Uses `@nestjs/config` with `.env` files
- Database connection via `DATABASE_URL` environment variable
- CORS enabled for cross-origin requests

### Code Style (Biome Configuration)
- 2-space indentation
- Semicolons required
- Trailing commas everywhere
- Line width: 80 characters
- Import organization enabled
- Parameter decorators enabled for NestJS

### Testing Setup
- Jest for unit testing
- Supertest for E2E testing
- Test files: `*.spec.ts` pattern
- Coverage directory: `../coverage`
- Module name mapping: `src/(.*)` → `<rootDir>/$1`

### Docker Setup
- Multi-stage build with Node 20
- Uses pnpm package manager
- Runs database migrations and Prisma generation in build
- Exposes port 3000
- MySQL 8.0 database service in docker-compose