#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not ready yet; local services were not started." >&2
  echo "Run 'pnpm db:up' once Docker is available." >&2
  exit 0
fi

# Recreate any services that were stopped when the container shut down. Data
# lives in named volumes, so this does not reseed or reset the database.
docker compose up -d --wait postgres redis mailpit minio
docker compose run --rm minio-init
