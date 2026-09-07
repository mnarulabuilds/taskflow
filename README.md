# TaskFlow

A full-stack task management app with workspaces, projects, and kanban boards.

## Stack

- **API:** NestJS, Prisma, PostgreSQL, JWT auth
- **Web:** Next.js, React, Tailwind CSS
- **Database:** PostgreSQL 17 (Docker)

## Prerequisites

- Node.js 20+
- pnpm 11+ (or npm for individual apps)
- Docker (for PostgreSQL)

## Quick start

### 1. Clone and install

```bash
pnpm install
```

### 2. Configure environment

```bash
cp api/.env.example api/.env
cp web/.env.example web/.env.local
```

Edit `api/.env` if needed. Defaults work with the included Docker setup.

### 3. Start the database

```bash
pnpm db:up
```

### 4. Run migrations

```bash
pnpm --filter api db:generate
pnpm --filter api db:migrate
```

Or use the one-shot setup script:

```bash
pnpm setup
```

### 5. Start development servers

```bash
pnpm dev
```

This runs both apps in parallel:

| App | URL |
|-----|-----|
| Web | http://localhost:3000 |
| API | http://localhost:3001 |

You can also run them individually:

```bash
pnpm dev:api   # NestJS on :3001
pnpm dev:web   # Next.js on :3000
```

## Environment variables

### API (`api/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `15m`) |
| `PORT` | API port (default `3001`) |
| `WEB_URL` | Allowed CORS origin (default `http://localhost:3000`) |

### Web (`web/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | API base URL (e.g. `http://localhost:3001`) |

## Database access

Start Postgres:

```bash
pnpm db:up
```

Connect via Docker:

```bash
docker exec -it taskflow-db psql -U postgres -d taskflow
```

Browse data with Prisma Studio:

```bash
pnpm --filter api db:studio
```

## API overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users` | Register |
| POST | `/auth/login` | Login |
| GET | `/auth/me` | Current user |
| GET/POST | `/workspaces` | List / create workspaces |
| GET/POST | `/workspaces/:id/members` | List / invite members |
| GET/POST | `/workspaces/:id/projects` | List / create projects |
| GET | `/projects/:id` | Project details |
| CRUD | `/projects/:id/tasks` | Task management |
| GET | `/health` | Health check |

## Production notes

### API

1. Set strong `JWT_SECRET` and a production `DATABASE_URL`.
2. Build and run:

```bash
cd api
pnpm build
pnpm db:migrate
pnpm start:prod
```

### Web

1. Set `NEXT_PUBLIC_API_URL` to your deployed API URL.
2. Build and run:

```bash
cd web
pnpm build
pnpm start
```

### Database

Use a managed PostgreSQL service (RDS, Supabase, Neon, etc.) in production instead of the local Docker container. Run migrations against the production database before deploying a new API version.

### CORS

Set `WEB_URL` on the API to your production frontend origin.

## Tests

```bash
pnpm --filter api test
```

## Project structure

```
taskflow/
├── api/          # NestJS backend
├── web/          # Next.js frontend
├── docker-compose.yml
└── pnpm-workspace.yaml
```
