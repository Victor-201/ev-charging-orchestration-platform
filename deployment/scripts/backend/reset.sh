#!/bin/bash
# Usage: bash reset.sh [--force] [--ngrok]
#   --force  Skip confirmation prompt.
#   --ngrok  Start ngrok tunnel after restart.

set -euo pipefail

export DOCKER_HOST=unix:///var/run/docker.sock
export DOCKER_BUILDKIT=1
export COMPOSE_PARALLEL_LIMIT=24
docker context use default &>/dev/null || true

RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! docker info &>/dev/null; then
    echo -e "${YELLOW}[INFO] Docker not running. Starting service...${NC}"
    sudo service docker start &>/dev/null || true
    sleep 2
    if ! docker info &>/dev/null; then
        echo -e "${RED}[ERROR] Docker unavailable after start attempt. Check Docker Engine installation.${NC}"
        exit 1
    fi
fi

FORCE=false
NGROK=false

while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --force|-Force) FORCE=true ;;
        --ngrok|-Ngrok) NGROK=true ;;
        *) echo -e "${RED}[ERROR] Unknown flag: $1${NC}"; exit 1 ;;
    esac
    shift
done

echo -e "${RED}========================================================================="
echo -e "  [WARNING] FULL SYSTEM RESET — All containers, volumes, and data will"
echo -e "  be permanently destroyed."
echo -e "==========================================================================${NC}"

if [[ "$FORCE" != "true" ]]; then
    read -rp "Continue? [y/N] " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Reset cancelled.${NC}"
        exit 0
    fi
fi

echo -e "\n${CYAN}[1/2] Cleaning existing system...${NC}"
bash "$SCRIPT_DIR/stop.sh" --clean

echo -e "\n${CYAN}[2/2] Rebuilding and restarting...${NC}"
START_OPTS="--rebuild"
if [[ "$NGROK" == "true" ]]; then
    START_OPTS="$START_OPTS --ngrok"
fi

bash "$SCRIPT_DIR/start.sh" $START_OPTS

echo -e "\n${GREEN}[RESET] Complete. System reset and restarted.${NC}"
