#!/bin/bash

set -uo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

CONTAINER="ev-clickhouse"
PASSED=0
FAILED=0

echo -e "${CYAN}======================================================================"
echo -e "  EV Platform — ClickHouse Check"
echo -e "======================================================================${NC}"

echo -e "\n${YELLOW}[1/3] Container status...${NC}"
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${CONTAINER}$"; then
    echo -e "  [${GREEN}OK${NC}]   Container running"
    ((PASSED++)) || true
else
    echo -e "  [${RED}FAIL${NC}] Container not running. Run start.sh first."
    exit 1
fi

# Use docker exec with clickhouse-client rather than HTTP port to avoid
# dependency on the HTTP interface being enabled.
echo -e "\n${YELLOW}[2/3] Connectivity (clickhouse-client)...${NC}"
PING=$(docker exec "$CONTAINER" clickhouse-client --query="SELECT 1" 2>/dev/null || echo "ERROR")
if [[ "$PING" == "1" ]]; then
    echo -e "  [${GREEN}OK${NC}]   ClickHouse responding"
    ((PASSED++)) || true
else
    echo -e "  [${RED}FAIL${NC}] ClickHouse not responding"
    ((FAILED++)) || true
fi

echo -e "\n${YELLOW}[3/3] Database stats...${NC}"
INFO=$(docker exec "$CONTAINER" clickhouse-client --multiquery --query="
SELECT version();
SELECT count() FROM ev_telemetry.telemetry_logs;
SELECT formatReadableSize(sum(bytes)) FROM system.parts WHERE active;
" 2>/dev/null || echo "")

if [[ -n "$INFO" ]]; then
    VERSION=$(echo "$INFO" | sed -n '1p')
    ROWS=$(echo "$INFO" | sed -n '2p')
    SIZE=$(echo "$INFO" | sed -n '3p')
    echo -e "  Version       : ${CYAN}${VERSION:-n/a}${NC}"
    echo -e "  Telemetry rows: ${CYAN}${ROWS:-0}${NC}"
    echo -e "  Data size     : ${CYAN}${SIZE:-0 B}${NC}"
    ((PASSED++)) || true
else
    echo -e "  [${YELLOW}WARN${NC}] Could not retrieve database stats"
fi

echo -e "\n${CYAN}======================================================================"
if [[ $FAILED -eq 0 ]]; then
    echo -e "  ${GREEN}CLICKHOUSE OK  ✓${NC}"
    echo -e "${CYAN}======================================================================"
    exit 0
else
    echo -e "  ${RED}CLICKHOUSE FAILURES: $FAILED${NC}"
    echo -e "${CYAN}======================================================================"
    exit 1
fi
