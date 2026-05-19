#!/bin/bash
# Usage:
#   bash seed-reset.sh             # Seed down then Seed up all services
#   bash seed-reset.sh <service>   # Seed down then Seed up a single service

set -e

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$BASE_DIR/../../.." && pwd)"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SERVICE_NAME=$1

echo -e "======================================================================"
echo -e "  ${YELLOW}EV Charging Platform — DATABASE SEED RESET${NC}"
echo -e "======================================================================"

if [ -n "$SERVICE_NAME" ]; then
    bash "$BASE_DIR/seed-down.sh" "$SERVICE_NAME"
    bash "$BASE_DIR/seed-up.sh" "$SERVICE_NAME"
else
    bash "$BASE_DIR/seed-down.sh"
    bash "$BASE_DIR/seed-up.sh"
fi

echo -e "======================================================================"
echo -e "  ${GREEN}SEED RESET COMPLETE${NC}"
echo -e "======================================================================"
