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
| `npm run test:catalog` | Test local catalog search, atomic product creation, decimal strings, and duplicate prevention |
| `npm run test:settings` | Test safe settings updates and strict validation, then restore the original settings |
| `npm run test:settings-operations` | Test previews, confirmations, transactional local bulk changes, audit history, and decimal-safe formulas |
| `npm run test:dashboard` | Test filter-state preservation, local refresh isolation, compact table widths, and column preferences |
| `npm run test:excel` | Test local Excel export/import validation and the exact 20% comparison rule |
| `npm run test:milestone` | Run all focused API, dashboard, and Excel milestone tests |
| `npm run typecheck` | Type-check every npm workspace |
| `npm run check` | Alias for the workspace type checks |
| `npm run build` | Create production builds for the API and dashboard |

## Local API

- `GET /api/health`
- `GET /api/stores`
- `GET /api/products`
- `GET /api/products/categories`
- `GET /api/products/:id`
- `GET /api/settings`
- `GET /api/bot-runs`
- `GET /api/price-changes`
- `GET /api/catalog-products?search=...`
- `POST /api/products/from-catalog`
- `PATCH /api/settings`
- `POST /api/settings/operations/preview`
- `POST /api/settings/operations/apply`
- `GET /api/settings/history?page=1&pageSize=20&search=...`
- `GET /api/settings/management-summary`

Catalog search reads only deterministic fictional records from local PostgreSQL. Adding a catalog
product creates a local draft product for the active store; it does not start the bot or contact a
marketplace. Multiple selected products are added in one transaction, and duplicates return a
conflict response without partially adding the batch.

`PATCH /api/settings` accepts only the existing safe configuration fields: `botEnabled`,
`botPriceSource`, `checkIntervalMinutes`, `undercutAmount`,
`allowProductsWithoutMinimumPrice`, and `friendStoreExternalId`. Monetary input is a decimal
string and is returned with two fractional digits.

Settings bulk operations are local-only. Preview requests never mutate data. Apply requests require
the matching preview token and affected-product count, run atomically, and create local audit
records. Automatic lower limits, lower-limit price adjustment, upper-limit equalization, percentage
price increases, and validated Excel limit imports use Prisma Decimal arithmetic. None of these
routes contacts or updates a marketplace.

`GET /api/products` accepts these optional query parameters:

- `page` (default `1`)
- `pageSize` (default `20`, maximum `100`)
- `search` (case-insensitive product name, SKU, or external ID search)
- `status` (one normalized product status)
- `category` (case-insensitive exact category filter)
- `botEnabled` (`true` or `false`)
- `stockBucket` (`OUT`, `LOW`, or `IN_STOCK`)
- `hasMinimumPrice` (`true` for limited products or `false` for products without a lower limit)

For example:

```bash
curl "http://localhost:3001/api/products?page=1&pageSize=5&status=ACTIVE&botEnabled=true"
```

All monetary values in API responses are decimal strings with two fractional digits, such as `"19.98"`. Application code must keep monetary calculations in decimal arithmetic rather than JavaScript floating-point numbers.

The dashboard's **Məhsulları yenilə** action only re-fetches these local read endpoints. It does not
update marketplace timestamps or perform synchronization. The settings drawer can save the safe
fields above, show local fictional history, preview and confirm transactional local price/limit
operations, validate/import limit spreadsheets, and export local products as `.xlsx`. Order-number
search remains disabled because this project has no order source. No marketplace connection,
authentication, browser automation, or real credentials are included.
