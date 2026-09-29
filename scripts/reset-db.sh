#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose down -v
docker compose up -d --wait

docker compose exec -T backend alembic stamp 6033595434e9
docker compose exec -T backend alembic upgrade head

echo "Base reiniciada, migrada y con seed."