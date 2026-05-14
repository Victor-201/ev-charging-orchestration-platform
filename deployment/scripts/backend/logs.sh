#!/bin/bash

# Auto-WSL Redirection
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    WSL_PATH=$(wsl.exe wslpath -u "$(pwd -W)")
    wsl.exe bash -c "cd '$WSL_PATH' && bash ./$0 $@"
    exit $?
fi
# ==============================================================================
# logs.sh - Xem log container (Native WSL)
# ==============================================================================

# Force Native WSL Socket
export DOCKER_HOST=unix:///var/run/docker.sock

SERVICE_NAMES=()
TAIL=100
FOLLOW=true

# Parsing arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --service)
            shift
            while [[ "$#" -gt 0 && ! "$1" =~ ^- ]]; do
                SERVICE_NAMES+=("$1")
                shift
            done
            continue
            ;;
        --tail) TAIL="$2"; shift ;;
        --no-follow) FOLLOW=false ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/../../docker/docker-compose.yml"

OPTS="--tail $TAIL"
if [ "$FOLLOW" = true ]; then OPTS="$OPTS -f"; fi

if [ ${#SERVICE_NAMES[@]} -eq 0 ]; then
    echo -e "${CYAN}[INFO] Dang hien thi log cua tat ca services...${NC}"
    docker compose -f "$COMPOSE_FILE" logs $OPTS
else
    echo -e "${CYAN}[INFO] Dang hien thi log cho: ${SERVICE_NAMES[*]}${NC}"
    docker compose -f "$COMPOSE_FILE" logs $OPTS "${SERVICE_NAMES[@]}"
fi
