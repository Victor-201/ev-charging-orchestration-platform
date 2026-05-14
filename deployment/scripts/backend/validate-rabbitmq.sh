#!/bin/bash
# ==============================================================================
# validate-rabbitmq.sh - Kiem tra tin nhan (Native WSL)
# ==============================================================================

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}======================================================"
echo -e "  Kiem tra RabbitMQ Queues & DLQ"
echo -e "======================================================${NC}"

# Dung API cua RabbitMQ Management
STATUS=$(curl -s -u guest:guest http://localhost:15672/api/overview | grep -o '"messages_ready":[0-9]*' | head -1 | cut -d: -f2)

if [ -z "$STATUS" ]; then
    echo -e "${RED}[FAIL] Khong the ket noi den RabbitMQ API.${NC}"
    exit 1
fi

echo -e "  Messages ready: ${CYAN}$STATUS${NC}"

if [ "$STATUS" -eq 0 ]; then
    echo -e "${GREEN}[V] VALIDATION PASSED: Khong co tin nhan ton dong.${NC}"
else
    echo -e "${YELLOW}[!] WARNING: Con $STATUS tin nhan chua xu ly.${NC}"
fi
