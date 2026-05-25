#!/bin/bash
# Usage:
#   bash seed-reset.sh             # Seed down then Seed up all services
#   bash seed-reset.sh <service>   # Seed down then Seed up a single service

set -e

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$BASE_DIR/../../.." && pwd)"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SERVICE_NAME=$1

echo -e "======================================================================"
echo -e "  ${YELLOW}EV Charging Platform — DATABASE SEED RESET${NC}"
echo -e "======================================================================"

if [ -n "$SERVICE_NAME" ]; then
    bash "$BASE_DIR/seed-down.sh" "$SERVICE_NAME"
    bash "$BASE_DIR/seed-up.sh" "$SERVICE_NAME"
else
    # Load Redis password from .env
    ENV_FILE="$PROJECT_ROOT/deployment/docker/.env"
    REDIS_PASS="ev_redis_secret"
    if [ -f "$ENV_FILE" ]; then
        ENV_REDIS_PASS=$(grep -E "^REDIS_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"'$'\r' || true)
        [ -n "$ENV_REDIS_PASS" ] && REDIS_PASS="$ENV_REDIS_PASS"
    fi

    # Flush Redis cache if container is running
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^ev-redis$"; then
        echo -e "▶ ${CYAN}Clearing Redis cache...${NC}"
        docker exec ev-redis redis-cli -a "$REDIS_PASS" FLUSHALL >/dev/null 2>&1 || true
    fi

    # Drop ClickHouse database if container is running
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^ev-clickhouse$"; then
        echo -e "▶ ${CYAN}Resetting ClickHouse telemetry database (ev_telemetry)...${NC}"
        docker exec ev-clickhouse clickhouse-client --query="DROP DATABASE IF EXISTS ev_telemetry" >/dev/null 2>&1 || true
    fi

    # Purge RabbitMQ queues if container is running
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^ev-rabbitmq$"; then
        echo -e "▶ ${CYAN}Purging all RabbitMQ queues...${NC}"
        docker exec ev-rabbitmq rabbitmqctl list_queues -q name | grep -v '^name$' | xargs -r -n1 docker exec ev-rabbitmq rabbitmqctl purge_queue >/dev/null 2>&1 || true
    fi

    bash "$BASE_DIR/seed-down.sh"
    bash "$BASE_DIR/seed-up.sh"
fi

echo -e "======================================================================"
echo -e "  ${GREEN}SEED RESET COMPLETE${NC}"
echo -e "======================================================================"
