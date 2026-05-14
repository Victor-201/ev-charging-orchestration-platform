#!/bin/bash

# Auto-WSL Redirection
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    WSL_PATH=$(wsl.exe wslpath -u "$(pwd -W)")
    wsl.exe bash -c "cd '$WSL_PATH' && bash ./$0 $@"
    exit $?
fi
# ==============================================================================
# reset.sh - Full reset (Native WSL)
# ==============================================================================

# Force Native WSL Socket & Performance Flags
export DOCKER_HOST=unix:///var/run/docker.sock
export DOCKER_BUILDKIT=1
export COMPOSE_PARALLEL_LIMIT=24
docker context use default &> /dev/null

FORCE=false
NGROK=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        -Force|--force) FORCE=true ;;
        -Ngrok|--ngrok) NGROK=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Check Docker status
if ! docker info &> /dev/null; then
    sudo service docker start &> /dev/null
    sleep 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo -e "${YELLOW}[INFO] Docker daemon is not running. Trying to start...${NC}"
    sudo service docker start
    sleep 2
    if ! docker info &> /dev/null; then
        echo -e "${RED}[FAIL] Could not start Docker. Please run 'sudo service docker start' manually.${NC}"
        exit 1
    fi
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${RED}==========================================================="
echo -e "  [!] NGUY HIEM: RESET TOAN BO HE THONG [!]"
echo -e "  Lenh nay se xoa sach: Containers, Volumes, Images"
echo -e "===========================================================${NC}"

if [ "$FORCE" = false ]; then
    read -p "Ban co chac chan muon tiep tuc? [y/N] " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "Da huy thao tac."
        exit 0
    fi
fi

echo -e "\n${CYAN}[1/2] Dang xoa toan bo du lieu cu...${NC}"
bash "$SCRIPT_DIR/stop.sh" --clean

echo -e "\n${CYAN}[2/2] Dang khoi tao va chay lai toan bo...${NC}"
START_OPTS="--rebuild"
if [ "$NGROK" = true ]; then
    START_OPTS="$START_OPTS --ngrok"
fi

bash "$SCRIPT_DIR/start.sh" $START_OPTS
