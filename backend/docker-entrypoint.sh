#!/bin/sh
set -e

# DATABASE_URL is injected by the platform (Railway Postgres plugin in production).
npx prisma db push --skip-generate --accept-data-loss
npx tsx prisma/seed-if-empty.ts

exec node dist/index.js
