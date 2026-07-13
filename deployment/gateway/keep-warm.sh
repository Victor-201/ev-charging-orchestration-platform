#!/bin/sh
# Keep-warm script: keeps Render free-tier services alive by pinging
# all upstream services + the gateway itself every 5 minutes.
# Render spins down after ~15 min idle, so 5 min interval gives headroom.
# Runs in background alongside nginx.

# We must also ping the gateway's own public URL so Render sees
# "incoming traffic" and does NOT spin the gateway container down.
GATEWAY_URL="https://ev-api-gateway.onrender.com/health"

UPSTREAMS="
https://ev-iam-service.onrender.com/health
https://ev-infrastructure-service.onrender.com/health
https://ev-session-service.onrender.com/health
https://ev-billing-service.onrender.com/health
https://ev-notification-service.onrender.com/health
https://ev-analytics-service.onrender.com/health
https://ev-telemetry-ingestion.onrender.com/health
https://ev-ocpp-gateway.onrender.com/health
"

while true; do
    # Ping gateway itself first (self-warm via public URL)
    curl -sf -o /dev/null --max-time 15 "$GATEWAY_URL" 2>/dev/null || true

    # Then ping all upstreams
    for url in $UPSTREAMS; do
        curl -sf -o /dev/null --max-time 15 "$url" 2>/dev/null || true
    done

    sleep 300  # 5 minutes
done
