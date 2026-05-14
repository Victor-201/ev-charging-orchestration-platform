#!/bin/bash

# Auto-WSL Redirection
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    WSL_PATH=$(wsl.exe wslpath -u "$(pwd -W)")
    wsl.exe bash -c "cd '$WSL_PATH' && bash ./$0 $@"
    exit $?
fi

# Force Native WSL Socket & Performance Flags
export DOCKER_HOST=unix:///var/run/docker.sock
export COMPOSE_PARALLEL_LIMIT=24

CLEAN=false
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -Clean|--clean) CLEAN=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="$SCRIPT_DIR/../../docker"
COMPOSE_FILE="$COMPOSE_DIR/docker-compose.yml"
ENV_FILE="$COMPOSE_DIR/.env"

echo -e "${CYAN}[STOP] Dang dung he thong...${NC}"

if [ "$CLEAN" = true ]; then
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down -v --rmi all --remove-orphans
    echo -e "${GREEN}[STOP] Da don dep sach se toan bo.${NC}"
else
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --remove-orphans
fi

pkill ngrok &> /dev/null
echo -e "${GREEN}[STOP] Da dung tat ca dich vu.${NC}"
