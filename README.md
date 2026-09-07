# TaskFlow

A full-stack task management app with workspaces, projects, and kanban boards.

## Stack

- **API:** NestJS, Prisma, PostgreSQL, JWT auth (httpOnly cookies)
- **Web:** Next.js, React, Tailwind CSS
- **Database:** PostgreSQL 17 (Docker)
- **CI:** GitHub Actions

## Prerequisites

- Node.js 20+
- pnpm 11+
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

Edit `api/.env` — ensure `JWT_SECRET` is at least 16 characters.

### 3. One-shot setup

```bash
pnpm setup
```

This starts Postgres, installs dependencies, generates the Prisma client, and runs migrations.

### 4. Start development servers

```bash
pnpm dev
```

| App | URL |
|-----|-----|
| Web | http://localhost:3000 |
| API | http://localhost:3001 |
| API docs | http://localhost:3001/docs |

The web app proxies API requests through `/api/*` to the backend, enabling httpOnly cookie auth on the same origin.

Run individually:

```bash
pnpm dev:api   # NestJS on :3001
pnpm dev:web   # Next.js on :3000
```

## Environment variables

### API (`api/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT tokens (min 16 chars) |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `15m`) |
| `PORT` | API port (default `3001`) |
| `WEB_URL` | Allowed CORS origin (default `http://localhost:3000`) |

### Web (`web/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | API base URL (default `/api` via Next.js rewrite) |
| `API_URL` | Backend URL for rewrites (default `http://localhost:3001`) |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start API + web in parallel |
| `pnpm build` | Build both apps |
| `pnpm lint` | Lint both apps |
| `pnpm test` | Run API unit tests |
| `pnpm db:up` | Start Postgres container |
| `pnpm db:down` | Stop Postgres container |
| `pnpm setup` | Full local setup |

## Production deployment

### Docker Compose

```bash
export POSTGRES_PASSWORD=your-secure-password
export JWT_SECRET=your-long-random-secret-min-16-chars
export WEB_URL=https://your-domain.com

docker compose -f docker-compose.prod.yml up -d --build
```

### Manual

**API:**

```bash
pnpm --filter api build
pnpm --filter api db:migrate
pnpm --filter api start:prod
```

**Web:**

```bash
pnpm --filter web build
pnpm --filter web start
```

Use a managed PostgreSQL service (RDS, Supabase, Neon) in production.

## API overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users` | Register (rate limited) |
| POST | `/auth/login` | Login (sets httpOnly cookie) |
| POST | `/auth/logout` | Logout (clears cookie) |
| GET | `/auth/me` | Current user |
| GET/POST | `/workspaces` | List / create workspaces |
| GET/PATCH/DELETE | `/workspaces/:id` | Workspace details / update / delete |
| GET/POST | `/workspaces/:id/members` | List / invite members |
| GET | `/workspaces/:id/activity` | Workspace activity feed |
| GET/PATCH/DELETE | `/projects/:id` | Project details / update / delete |
| GET | `/projects/:id/activity` | Project activity feed |
| CRUD | `/projects/:id/tasks` | Task management (supports `?search&status&priority&assigneeId`) |
| GET/POST | `/projects/:id/tasks/:taskId/comments` | Task comments |
| GET/PATCH | `/notifications` | List / mark read |
| GET | `/invites/pending` | Pending workspace invites |
| POST | `/invites/:token/accept` | Accept invite |
| GET | `/health` | Health check |
| GET | `/docs` | Swagger API documentation |

## Project structure

```
taskflow/
├── api/                    # NestJS backend
├── web/                    # Next.js frontend
├── docker/                 # Dockerfiles
├── .github/workflows/      # CI pipeline
├── docker-compose.yml      # Dev database
├── docker-compose.prod.yml # Production stack
└── pnpm-workspace.yaml
```
