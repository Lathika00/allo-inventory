# Allo Inventory

Inventory reservation demo built with Next.js, Prisma, and Upstash Redis.

## Run Locally

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root and set:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
UPSTASH_REDIS_REST_URL="<your-upstash-rest-url>"
UPSTASH_REDIS_REST_TOKEN="<your-upstash-rest-token>"
```

If you are using SQLite a local database URL can also work, but this project is configured for a standard Prisma datasource.

### 3. Run Prisma migrations

```bash
npx prisma migrate dev --name init
```

This will create the database schema from `prisma/schema.prisma` and populate the `prisma/migrations` folder.

### 4. Seed the database

```bash
npx prisma db seed
```

The seed script at `prisma/seed.ts` creates example warehouses, products, and inventory records.

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Required variables:

- `DATABASE_URL` — Prisma datasource connection string
- `UPSTASH_REDIS_REST_URL` — Upstash Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis REST token

## How Expiry Works in Production

Reservations are created with a 10-minute expiry window in `src/app/api/reservations/route.ts`.

- When a reservation is created, `expiresAt` is set to `Date.now() + 10 * 60 * 1000`.
- Pending reservations are considered expired once `expiresAt` is in the past.
- The cleanup endpoint at `src/app/api/cron/route.ts` finds expired pending reservations, releases reserved inventory, and marks them as `released`.

### Current production behavior

This repo currently relies on an explicit `GET /api/cron` cleanup path.

- The client triggers this cleanup before loading reservations in the dashboard.
- In a production-ready deployment, this should be backed by a scheduled job or cron trigger.

### Recommended production setup

For reliable expiry handling, use a scheduler instead of depending on client activity:

- Vercel Cron Jobs / scheduled functions
- GitHub Actions or an external cron service
- A lightweight serverless job that calls `/api/cron` every few minutes

That ensures stale pending reservations are cleaned even when nobody is actively browsing the app.

## Trade-offs and Future Improvements

### Trade-offs made

- Simple validation is implemented with shared Zod schemas, but the client still uses a minimal homegrown form flow rather than a formal form library.
- Expiry cleanup is accessible through an API route instead of a guaranteed server-side scheduler.
- Caching is focused on the reservation list only, using Upstash Redis with a 10-minute TTL.
- No authentication or authorization is implemented, which keeps the app simple but not production-secure.

### What I'd do differently with more time

- Add a proper scheduled cron job for `api/cron` cleanup in production.
- Use a dedicated form validation library like React Hook Form or Formik with Zod integration.
- Add typed API response models and stronger error handling across client/server boundaries.
- Introduce authentication so reservation actions are owner-aware and protected.
- Expand caching and data invalidation to reduce load on the database for more endpoints.
- Add end-to-end tests for reservation creation, expiry, and release flows.

## Upstash Redis (Caching)

The project already includes `src/lib/upstash.ts` and uses Redis caching for the reservations list at `src/app/api/reservations/all/route.ts`.

- The reservations cache is retained for 10 minutes.
- Cache invalidation occurs when reservations are created, confirmed, released, or cleared.

## Deploy on Vercel

The easiest way to deploy is with [Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

For production, also configure the environment variables listed above and add a scheduled job to call `/api/cron` regularly.
