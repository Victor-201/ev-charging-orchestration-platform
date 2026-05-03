#!/usr/bin/env pwsh
# ==============================================================================
# smoke-test.ps1 - Kiem thu tich hop API qua Kong Gateway
#
# Usage:  .\smoke-test.ps1 [GatewayUrl]
# Default gateway: http://localhost:8000
# ==============================================================================

param(
    [string]$Gateway = "http://localhost:8000"
)

$ErrorActionPreference = 'Stop'
$script:PASS = 0
$script:FAIL = 0

function Test-Endpoint {
    param(
        [string]$Desc,
        [string]$Expected,
        [string]$Url,
        [string]$Method = "GET",
        [string]$Body = $null
    )

    try {
        if ($Body) {
            $res = Invoke-WebRequest -Uri $Url -Method $Method -Body $Body -ContentType "application/json" -UseBasicParsing -TimeoutSec 8 -ErrorAction SilentlyContinue
        } else {
            $res = Invoke-WebRequest -Uri $Url -Method $Method -UseBasicParsing -TimeoutSec 8 -ErrorAction SilentlyContinue
        }
        $actual = [int]$res.StatusCode
    } catch {
        if ($_.Exception -is [System.Net.WebException] -and $null -ne $_.Exception.Response) {
            $actual = [int]$_.Exception.Response.StatusCode
        } else {
            $actual = "000"
        }
    }

    if ([string]$actual -eq $Expected) {
        Write-Host "  [OK]  $($Desc.PadRight(55)) HTTP $actual" -ForegroundColor Green
        $script:PASS++
    } else {
        Write-Host "  [LOI] $($Desc.PadRight(55)) Ky vong=$Expected Thuc te=$actual" -ForegroundColor Red
        $script:FAIL++
    }
}

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  EV Platform - Kiem thu Smoke Tests ($Gateway)" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "IAM Service:"
Test-Endpoint -Desc "POST /api/v1/auth/register (missing body -> 400)" -Expected "400" -Url "$Gateway/api/v1/auth/register" -Method "POST" -Body '{}'
Test-Endpoint -Desc "POST /api/v1/auth/login (missing creds -> 400/401)" -Expected "400" -Url "$Gateway/api/v1/auth/login" -Method "POST" -Body '{}'

Write-Host "`nIAM Service (Users):"
Test-Endpoint -Desc "GET /api/v1/users/me (no token -> 401)" -Expected "401" -Url "$Gateway/api/v1/users/me"

Write-Host "`nInfrastructure Service:"
Test-Endpoint -Desc "GET /api/v1/stations (public list -> 200)" -Expected "200" -Url "$Gateway/api/v1/stations"

Write-Host "`nSession Service (Booking & Charging):"
Test-Endpoint -Desc "POST /api/v1/bookings (no token -> 401)" -Expected "401" -Url "$Gateway/api/v1/bookings" -Method "POST"
Test-Endpoint -Desc "POST /api/v1/charging/start (no token -> 401)" -Expected "401" -Url "$Gateway/api/v1/charging/start" -Method "POST"

Write-Host "`nBilling Service:"
Test-Endpoint -Desc "GET /api/v1/wallets/balance (no token -> 401)" -Expected "401" -Url "$Gateway/api/v1/wallets/balance"
Test-Endpoint -Desc "POST /api/v1/payments/pay (no Idempotency-Key -> 401)" -Expected "401" -Url "$Gateway/api/v1/payments/pay" -Method "POST" -Body '{}'

Write-Host "`nNotification Service:"
Test-Endpoint -Desc "GET /api/v1/notifications (no token -> 401)" -Expected "401" -Url "$Gateway/api/v1/notifications"

Write-Host "`nAnalytics Service:"
Test-Endpoint -Desc "GET /api/v1/analytics/dashboard (admin only -> 401)" -Expected "401" -Url "$Gateway/api/v1/analytics/dashboard"

Write-Host "`nTelemetry Service:"
Test-Endpoint -Desc "POST /api/v1/telemetry/ingest (missing body -> 400)" -Expected "400" -Url "$Gateway/api/v1/telemetry/ingest" -Method "POST" -Body '{}'

Write-Host "`nOCPP Gateway Service:"
Test-Endpoint -Desc "GET /api/v1/ocpp/health (-> 200)" -Expected "200" -Url "$Gateway/api/v1/ocpp/health"

Write-Host "`nHa tang (Infrastructure):"
Test-Endpoint -Desc "Kong Admin API alive" -Expected "200" -Url "http://localhost:8001"
Test-Endpoint -Desc "RabbitMQ Management UI alive" -Expected "200" -Url "http://localhost:15672"

Write-Host "`n========================================================="
Write-Host "  Ket qua Smoke Test: $PASS THANH CONG  $FAIL THAT BAI"
Write-Host "========================================================="
Write-Host ""

if ($FAIL -eq 0) { exit 0 } else { exit 1 }
