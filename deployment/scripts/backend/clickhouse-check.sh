#!/bin/bash
# ==============================================================================
# clickhouse-check.sh - Kiem tra ClickHouse (Native WSL)
# ==============================================================================

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

CONTAINER="ev-clickhouse"

echo -e "${CYAN}======================================================"
echo -e "  Kiem tra ClickHouse Stack"
echo -e "======================================================${NC}"

if ! docker ps --format '{{.Names}}' | grep -q "$CONTAINER"; then
    echo -e "${RED}[FAIL] Container $CONTAINER khong chay.${NC}"
    exit 1
fi

echo -e "${GREEN}[OK] Container dang chay.${NC}"

# Ping
echo -n "  Ping ClickHouse..."
if docker exec $CONTAINER clickhouse-client --query "SELECT 1" &> /dev/null; then
    echo -e " [${GREEN}OK${NC}]"
else
    echo -e " [${RED}FAIL${NC}]"
    exit 1
fi

# Version
VERSION=$(docker exec $CONTAINER clickhouse-client --query "SELECT version()")
echo -e "  Version: ${CYAN}$VERSION${NC}"

# Row count
COUNT=$(docker exec $CONTAINER clickhouse-client --query "SELECT count() FROM ev_telemetry.telemetry_logs" 2>/dev/null)
echo -e "  Telemetry rows: ${CYAN}${COUNT:-0}${NC}"
