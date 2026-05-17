#!/bin/bash
# Usage:
#   bash logs.sh                          # All services, realtime
#   bash logs.sh --app                    # Microservices only
#   bash logs.sh --pg                     # PostgreSQL databases only
#   bash logs.sh --infra                  # Redis, RabbitMQ, ClickHouse, Kong
#   bash logs.sh --service <name>         # Single service (compose service key)
#   bash logs.sh --tail 200 --no-follow   # Static (non-streaming) output

set -uo pipefail

export DOCKER_HOST=unix:///var/run/docker.sock

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/../../docker/docker-compose.yml"
ENV_FILE="$SCRIPT_DIR/../../docker/.env"

# Service keys must match docker-compose.yml service names (not container_name).
SERVICES_APP=(
    "iam-service"
    "analytics-service"
    "ev-infrastructure-service"
    "session-service"
    "billing-service"
    "notification-service"
    "telemetry-ingestion-service"
    "ocpp-gateway-service"
)

SERVICES_PG=(
    "postgres-iam"
    "postgres-infra"
    "postgres-session"
    "postgres-billing"
    "postgres-analytics"
    "postgres-notification"
)

SERVICES_INFRA=(
    "redis"
    "rabbitmq"
    "clickhouse"
    "kong"
)

SERVICE_NAMES=()
TAIL=100
FOLLOW=true

while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --service)
            shift
            while [[ "$#" -gt 0 && ! "$1" =~ ^-- ]]; do
                SERVICE_NAMES+=("$1")
                shift
            done
            continue
            ;;
        --pg)    SERVICE_NAMES+=("${SERVICES_PG[@]}") ;;
        --infra) SERVICE_NAMES+=("${SERVICES_INFRA[@]}") ;;
        --app)   SERVICE_NAMES+=("${SERVICES_APP[@]}") ;;
        --tail)
            TAIL="$2"
            shift
            ;;
        --no-follow) FOLLOW=false ;;
        *) echo -e "${RED}[ERROR] Unknown flag: $1${NC}"; exit 1 ;;
    esac
    shift
done

OPTS="--tail $TAIL"
if [[ "$FOLLOW" == "true" ]]; then
    OPTS="$OPTS -f"
fi

if [[ ${#SERVICE_NAMES[@]} -eq 0 ]]; then
    LABEL="All services"
else
    LABEL="${SERVICE_NAMES[*]}"
fi

echo -e "${CYAN}======================================================================"
echo -e "  EV Platform — Logs: $LABEL"
echo -e "  [follow=$FOLLOW | tail=$TAIL]"
echo -e "  Press Ctrl+C to exit."
echo -e "======================================================================${NC}"
echo ""

if [[ ${#SERVICE_NAMES[@]} -eq 0 ]]; then
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs $OPTS
else
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs $OPTS "${SERVICE_NAMES[@]}"
fi
