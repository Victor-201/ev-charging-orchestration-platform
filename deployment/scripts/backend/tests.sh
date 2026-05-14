#!/bin/bash
# ==============================================================================
# tests.sh - He thong kiem thu toan dien (Unit + Smoke Tests)
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

RUN_UNIT=false
RUN_SMOKE=false
TARGET_SERVICE=""
GATEWAY="http://localhost:8000"

# Neu khong co tham so, mac dinh chay Unit Test
if [ $# -eq 0 ]; then
    RUN_UNIT=true
fi

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --unit)    RUN_UNIT=true ;;
        --smoke)   RUN_SMOKE=true ;;
        --all)     RUN_UNIT=true; RUN_SMOKE=true ;;
        --service) TARGET_SERVICE="$2"; shift ;;
        --gateway) GATEWAY="$2"; shift ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# ------------------------------------------------------------------------------
# 1. UNIT TESTS
# ------------------------------------------------------------------------------
run_unit_tests() {
    SERVICES=("iam-service" "ev-infrastructure-service" "session-service" "billing-service" "notification-service" "analytics-service" "telemetry-ingestion-service" "ocpp-gateway-service")
    
    if [ ! -z "$TARGET_SERVICE" ]; then
        SERVICES=("$TARGET_SERVICE")
    fi

    echo -e "${CYAN}======================================================"
    echo -e "  [UNIT TEST] Kiem thu logic Microservices"
    echo -e "======================================================${NC}"

    for svc in "${SERVICES[@]}"; do
        if [ ! -d "$BACKEND_DIR/$svc" ]; then
            echo -e "${RED}[ERROR] Service '$svc' khong ton tai.${NC}"
            continue
        fi
        
        echo -e "\n${CYAN}>>> Testing: $svc${NC}"
        cd "$BACKEND_DIR/$svc"
        if [ -d "node_modules" ]; then
            if npm run | grep -q "test:unit"; then
                npm run test:unit
            else
                npm test
            fi
        else
            echo -e "${YELLOW}[SKIP] node_modules khong ton tai. Vui long install truoc.${NC}"
        fi
    done
}

# ------------------------------------------------------------------------------
# 2. SMOKE TESTS (API Gateway)
# ------------------------------------------------------------------------------
run_smoke_tests() {
    echo -e "\n${CYAN}======================================================"
    echo -e "  [SMOKE TEST] Kiem thu luong API (Integration)"
    echo -e "======================================================${NC}"
    echo -e "Gateway: $GATEWAY\n"

    # 1. IAM Service
    echo -e "--- [IAM Service] ---"
    # POST /api/v1/auth/register (missing body) -> 400
    curl -s -o /dev/null -w "IAM Register (Invalid): %{http_code}\n" -X POST "$GATEWAY/api/v1/auth/register"
    # GET /api/v1/users/me (no token) -> 401
    curl -s -o /dev/null -w "IAM Me (Unauthorized): %{http_code}\n" -X GET "$GATEWAY/api/v1/users/me"

    # 2. Infrastructure Service
    echo -e "\n--- [Infrastructure Service] ---"
    # GET /api/v1/stations (public) -> 200
    curl -s -o /dev/null -w "Station List: %{http_code}\n" -X GET "$GATEWAY/api/v1/stations"

    # 3. Session Service
    echo -e "\n--- [Session Service] ---"
    # POST /api/v1/bookings (no token) -> 401
    curl -s -o /dev/null -w "Booking Create (Unauthorized): %{http_code}\n" -X POST "$GATEWAY/api/v1/bookings"

    # 4. Billing Service
    echo -e "\n--- [Billing Service] ---"
    # GET /api/v1/wallets/balance (no token) -> 401
    curl -s -o /dev/null -w "Wallet Balance (Unauthorized): %{http_code}\n" -X GET "$GATEWAY/api/v1/wallets/balance"

    # 5. Notification Service
    echo -e "\n--- [Notification Service] ---"
    # GET /api/v1/notifications (no token) -> 401
    curl -s -o /dev/null -w "Notification List (Unauthorized): %{http_code}\n" -X GET "$GATEWAY/api/v1/notifications"

    # 6. Analytics Service
    echo -e "\n--- [Analytics Service] ---"
    # GET /api/v1/analytics/dashboard (no token) -> 401
    curl -s -o /dev/null -w "Analytics Dashboard (Unauthorized): %{http_code}\n" -X GET "$GATEWAY/api/v1/analytics/dashboard"
}

# ------------------------------------------------------------------------------
# EXECUTION
# ------------------------------------------------------------------------------

if [ "$RUN_UNIT" = true ]; then
    run_unit_tests
fi

if [ "$RUN_SMOKE" = true ]; then
    run_smoke_tests
fi

echo -e "\n${GREEN}>>> Hoan tat kiem thu!${NC}"
