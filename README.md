# Birmarket Price Management

Private local-development foundation for the Birmarket price-management application. The workspace contains a React/Vite dashboard, a Fastify API, Prisma, and a Dockerized PostgreSQL database. It does not connect to marketplaces or other external services.

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- Docker Desktop (or Docker Engine with Compose)

## First-time local setup

Run these commands from the repository root:

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run db:start
npm run db:migrate
npm run db:seed
npm run dev
```

The example environment file contains local-only placeholder values. Keep any real environment files private; `.env` and `.env.*` are ignored while `.env.example` is tracked.

Once development servers are running:

- Dashboard: `http://localhost:5173`
- API: `http://localhost:3001`
- Health check: `http://localhost:3001/api/health`

Stop both development servers with `Ctrl+C`. Stop PostgreSQL separately with:

```bash
npm run db:stop
```

The named Docker volume preserves local PostgreSQL data when the container is stopped.

## Root commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the Fastify and Vite development servers together |
| `npm run db:start` | Start the local PostgreSQL container |
| `npm run db:stop` | Stop PostgreSQL without deleting its named volume |
| `npm run db:migrate` | Apply pending Prisma development migrations |
| `npm run db:seed` | Upsert the deterministic fictional development data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run test:api` | Smoke-test the running API and its read-only endpoints |
| `npm run typecheck` | Type-check every npm workspace |
| `npm run check` | Alias for the workspace type checks |
| `npm run build` | Create production builds for the API and dashboard |

## Read-only API

- `GET /api/health`
- `GET /api/stores`
- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/settings`
- `GET /api/bot-runs`
- `GET /api/price-changes`

`GET /api/products` accepts these optional query parameters:

- `page` (default `1`)
- `pageSize` (default `20`, maximum `100`)
- `search` (case-insensitive product name, SKU, or external ID search)
- `status` (one normalized product status)
- `category` (case-insensitive exact category filter)
- `botEnabled` (`true` or `false`)

For example:

```bash
curl "http://localhost:3001/api/products?page=1&pageSize=5&status=ACTIVE&botEnabled=true"
```

All monetary values in API responses are decimal strings with two fractional digits, such as `"19.98"`. Application code must keep monetary calculations in decimal arithmetic rather than JavaScript floating-point numbers.
