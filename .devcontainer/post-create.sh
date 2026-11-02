#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if ! command -v pnpm >/dev/null 2>&1; then
  echo "Installing pnpm 10.33.2..."
  sudo npm install --global pnpm@10.33.2
fi

echo "Installing workspace dependencies..."
pnpm install --frozen-lockfile

echo "Waiting for the Docker daemon..."
for attempt in $(seq 1 60); do
  if docker info >/dev/null 2>&1; then
    break
  fi

  if [ "$attempt" -eq 60 ]; then
    echo "Docker did not become ready. Start Docker, then run:" >&2
    echo "  bash .devcontainer/post-create.sh" >&2
    exit 1
  fi

  sleep 2
done

# Creates the env files, starts the local services, applies migrations, and
# seeds the demo data. Safe to re-run: existing env values are preserved.
pnpm run setup -- --skip-install
