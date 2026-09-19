#!/bin/sh
set -e

echo "=========================================================="
echo "🏥 Avecinna Secure EMR Backend starting up..."
echo "=========================================================="

# Push schema to Primary and Audit DB
echo "⏳ Applying database schemas (Drizzle Push)..."
npm run db:push:primary || echo "⚠️ Warning: Primary DB push had notices"
npm run db:push:audit || echo "⚠️ Warning: Audit DB push had notices"

# Optionally seed if SEED_DATABASE=true
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 SEED_DATABASE is true. Seeding initial hospital data..."
  npm run db:seed || echo "⚠️ Warning: DB Seed already seeded or skipped"
fi

echo "🚀 Starting server..."
exec "$@"
