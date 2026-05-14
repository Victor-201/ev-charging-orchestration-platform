#!/bin/bash

# Auto-WSL Redirection
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    if ! command -v wsl.exe &> /dev/null; then
        echo -e "\033[0;31m[ERROR] WSL không tìm thấy. Hãy cài đặt WSL để chạy backend.\033[0m"
        exit 1
    fi
    WSL_PATH=$(wsl.exe wslpath -u "$(pwd -W)")
    wsl.exe bash -c "cd '$WSL_PATH' && bash ./$0 $@"
    exit $?
fi
# ==============================================================================
# start.sh - EV Charging Platform System Startup (Native WSL)
# ==============================================================================

# Force Native WSL Socket & Performance Flags
export DOCKER_HOST=unix:///var/run/docker.sock
export DOCKER_BUILDKIT=1
export COMPOSE_PARALLEL_LIMIT=24
docker context use default &> /dev/null

REBUILD=false
NGROK=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        -Rebuild|--rebuild) REBUILD=true ;;
        -Ngrok|--ngrok) NGROK=true ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="$SCRIPT_DIR/../../docker"
COMPOSE_FILE="$COMPOSE_DIR/docker-compose.yml"
ENV_FILE="$COMPOSE_DIR/.env"
NGROK_DOMAIN="impeditive-incredible-jordy.ngrok-free.dev"

echo -e "${CYAN}======================================================"
echo -e "  Starting EV Charging Platform (Max Performance)"
echo -e "======================================================${NC}"

# Check Docker status
if ! docker info &> /dev/null; then
    sudo service docker start &> /dev/null
    sleep 1
fi

# Fast Cleanup & Start
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --remove-orphans &> /dev/null

if [ "$REBUILD" = true ]; then
    echo -e "${YELLOW}[BUILD] Parallel rebuilding images...${NC}"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --parallel
fi

echo -e "${GREEN}[START] Launching all containers in parallel...${NC}"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

if [ "$NGROK" = true ]; then
    pkill ngrok &> /dev/null
    echo -e "${CYAN}[NGROK] Starting ngrok tunnel...${NC}"
    ngrok http --domain=$NGROK_DOMAIN 8000 &> /dev/null &
fi

echo -e "\n${CYAN}Waiting for services to be ready...${NC}"

SERVICES=("ev-pg-iam" "ev-pg-infra" "ev-pg-session" "ev-pg-billing" "ev-pg-analytics" "ev-pg-notify" "ev-redis" "ev-rabbitmq" "ev-clickhouse" "ev-kong" "ev-iam" "ev-infrastructure" "ev-session" "ev-billing" "ev-analytics" "ev-notify" "ev-telemetry" "ev-ocpp-gw")

# Fast Parallel Health Check
for i in {1..30}; do
    all_healthy=true
    ready_count=0
    for svc in "${SERVICES[@]}"; do
        status=$(docker inspect --format='{{.State.Health.Status}}' "$svc" 2>/dev/null)
        if [ "$status" == "healthy" ]; then
            ((ready_count++))
        else
            all_healthy=false
        fi
    done
    
    printf "\r  Progress: [%-18s] %d/%d Services Ready" "$(printf '#%.0s' $(seq 1 $ready_count))" "$ready_count" "${#SERVICES[@]}"
    
    if [ "$all_healthy" = true ]; then
        echo -e "\n\n${GREEN}ALL SERVICES ARE ONLINE!${NC}"
        exit 0
    fi
    sleep 2
done

echo -e "\n\n${YELLOW}[WARN] Timeout reached. Some services may still be starting.${NC}"
