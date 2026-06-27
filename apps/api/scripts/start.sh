#!/bin/sh
set -e

# Run migrations
echo "Running database migrations..."
cd apps/api
npx prisma migrate deploy
cd ../..

# Start the application
echo "Starting application..."
exec node apps/api/dist/main.js
