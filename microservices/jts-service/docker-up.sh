#!/usr/bin/env bash
# Seedha Docker up — bina GitHub
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -f .env ]]; then
  echo "Pehle: cp .env.docker.example .env && edit JWT_SECRET"
  exit 1
fi
exec docker compose -f docker-compose.standalone.yml up -d --build
