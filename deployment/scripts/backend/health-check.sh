#!/bin/bash

# Auto-WSL Redirection
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    WSL_PATH=$(wsl.exe wslpath -u "$(pwd -W)")
    wsl.exe bash -c "cd '$WSL_PATH' && bash ./$0 $@"
    exit $?
fi

# Force Native WSL Socket
export DOCKER_HOST=unix:///var/run/docker.sock

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}======================================================"
echo -e "  EV Platform Health Check (Fast Parallel Mode)"
echo -e "======================================================${NC}"

# 1. Check HTTP Endpoints in Parallel
ENDPOINTS=(
    "IAM:http://localhost:3001/health"
    "Analytics:http://localhost:3002/health"
    "Infrastructure:http://localhost:3003/health"
    "Session:http://localhost:3004/health"
    "Billing:http://localhost:3007/health"
    "Notification:http://localhost:3008/health"
    "Telemetry:http://localhost:3009/health"
    "OCPP:http://localhost:3010/health"
    "Kong-API:http://localhost:8000"
    "Kong-Admin:http://localhost:8001"
    "RabbitMQ:http://localhost:15672"
)

echo -e "${YELLOW}[1/3] Checking HTTP Endpoints...${NC}"

TOTAL_CHECKS=0
PASSED_CHECKS=0

check_url() {
    local name="${1%%:*}"
    local url="${1#*:}"
    if curl -s --connect-timeout 2 "$url" > /dev/null; then
        echo -e "  [${GREEN}OK${NC}] $name"
        return 0
    else
        echo -e "  [${RED}FAIL${NC}] $name ($url)"
        return 1
    fi
}

for ep in "${ENDPOINTS[@]}"; do
    ((TOTAL_CHECKS++))
    if check_url "$ep"; then
        ((PASSED_CHECKS++))
    fi
done

# 2. Check Ngrok Tunnel if running
echo -e "\n${YELLOW}[2/3] Checking Ngrok Tunnel...${NC}"
if curl -s --connect-timeout 2 "http://localhost:4040/api/tunnels" | grep -q "public_url"; then
    echo -e "  [${GREEN}OK${NC}] Ngrok Tunnel is active"
    ((TOTAL_CHECKS++))
    ((PASSED_CHECKS++))
else
    echo -e "  [${YELLOW}SKIP${NC}] Ngrok Tunnel is not active (localhost:4040)"
    # Không tăng TOTAL_CHECKS để không bị tính là lỗi trong phần tổng kết
fi

# 3. Check Docker Container Health
echo -e "\n${YELLOW}[3/3] Checking Docker Containers...${NC}"
CONTAINERS=("ev-pg-iam" "ev-pg-infra" "ev-pg-session" "ev-pg-billing" "ev-pg-analytics" "ev-pg-notify" "ev-redis" "ev-rabbitmq" "ev-clickhouse" "ev-kong" "ev-iam" "ev-infrastructure" "ev-session" "ev-billing" "ev-analytics" "ev-notify" "ev-telemetry" "ev-ocpp-gw")

check_container() {
    local svc=$1
    local status=$(docker inspect --format='{{.State.Health.Status}}' "$svc" 2>/dev/null)
    if [ "$status" == "healthy" ]; then
        echo -e "  [${GREEN}OK${NC}] $svc"
        return 0
    else
        local state=$(docker inspect --format='{{.State.Status}}' "$svc" 2>/dev/null)
        echo -e "  [${RED}FAIL${NC}] $svc (State: $state, Health: $status)"
        return 1
    fi
}

for container in "${CONTAINERS[@]}"; do
    ((TOTAL_CHECKS++))
    if check_container "$container"; then
        ((PASSED_CHECKS++))
    fi
done

FAILED_CHECKS=$((TOTAL_CHECKS - PASSED_CHECKS))

if [ $FAILED_CHECKS -gt 0 ]; then
    echo -e "\n${RED}KET QUA: $PASSED_CHECKS TOT, $FAILED_CHECKS LOI${NC}"
    echo -e "${RED}He thong co loi! Kiem tra lai cac muc FAIL o tren.${NC}"
    exit 1
else
    echo -e "\n${GREEN}KET QUA: $PASSED_CHECKS TOT, 0 LOI${NC}"
    echo -e "${GREEN}Tat ca dich vu deu on dinh!${NC}"
    exit 0
fi
