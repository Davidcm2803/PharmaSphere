$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\.."

# init.sql y seed.sql corren solos al crearse el volumen
docker compose down -v
docker compose up -d --wait

# Punto de partida fijo + migraciones posteriores
docker compose exec -T backend alembic stamp 6033595434e9
docker compose exec -T backend alembic upgrade head

Write-Host "Base reiniciada, migrada y con seed."