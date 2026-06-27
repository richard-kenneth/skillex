#!/bin/sh
set -e

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma

# Start the application
echo "Starting application..."
exec node apps/api/dist/main.js
