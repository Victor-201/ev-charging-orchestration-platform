#!/usr/bin/env pwsh
# ==============================================================================
# start.ps1 - Khoi dong he thong EV Charging Platform
#
# Usage:
#   .\start.ps1            # Khoi dong binh thuong (build anh da thay doi)
#   .\start.ps1 -Rebuild   # Force rebuild toan bo image (khong cache)
# ==============================================================================

param(
    [switch]$Rebuild
)

$ErrorActionPreference = 'Stop'
$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ComposeDir  = Join-Path $ScriptDir "..\docker"
$ComposeFile = Join-Path $ComposeDir "docker-compose.yml"
$EnvFile     = Join-Path $ComposeDir ".env"

Write-Host "======================================================"
Write-Host "  Khoi dong he thong EV Charging Platform" -ForegroundColor Cyan
Write-Host "======================================================"

if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
    Write-Host "[FAIL] Khong tim thay Docker. Vui long cai dat Docker Desktop!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $ComposeFile)) {
    Write-Host "[FAIL] Khong tim thay file cau hinh tai: $ComposeFile" -ForegroundColor Red
    exit 1
}

# Luon down truoc khi start de giai phong port / container cu
$oldErr = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
docker compose -f $ComposeFile --env-file $EnvFile down --remove-orphans 2>&1 | Out-Null
$ErrorActionPreference = $oldErr

if ($Rebuild) {
    Write-Host "[BUILD] Force rebuilding images (khong dung cache)..." -ForegroundColor Yellow
    & docker compose -f $ComposeFile --env-file $EnvFile build --no-cache
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAIL] Build image that bai (Ma loi: $LASTEXITCODE)." -ForegroundColor Red
        exit 1
    }
}

$BuildFlags = @("--build", "--force-recreate")
Write-Host "[START] Dang khoi chay cac container..." -ForegroundColor Green
& docker compose -f $ComposeFile --env-file $EnvFile up -d @BuildFlags

if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Khoi dong that bai (Ma loi: $LASTEXITCODE). Vui long kiem tra Docker." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Dang cho kiem tra Health Check (cho 10 giay)..." -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Start-Sleep -Seconds 10

$Services = @(
    "ev-pg-iam", "ev-pg-infra", "ev-pg-session", "ev-pg-billing",
    "ev-pg-analytics", "ev-pg-notify",
    "ev-redis", "ev-rabbitmq", "ev-clickhouse", "ev-kong",
    "ev-iam", "ev-infrastructure", "ev-session", "ev-billing",
    "ev-analytics", "ev-notify", "ev-telemetry", "ev-ocpp-gw"
)

$Failed = $false

foreach ($svc in $Services) {
    Write-Host -NoNewline "  Dang kiem tra $($svc.PadRight(22))..."
    $elapsed   = 0
    $max       = 120
    $isHealthy = $false

    while ($elapsed -lt $max) {
        $status = (docker inspect --format="{{.State.Health.Status}}" $svc) 2>$null
        if ($status -eq "healthy") {
            Write-Host " [OK]" -ForegroundColor Green
            $isHealthy = $true
            break
        }
        Start-Sleep -Seconds 3
        $elapsed += 3
        Write-Host -NoNewline "."
    }

    if (-not $isHealthy) {
        Write-Host " [HET GIO (TIMEOUT)]" -ForegroundColor Red
        $Failed = $true
    }
}

if ($Failed) {
    Write-Host "[CANH BAO] Mot so dich vu chua san sang - ung dung se tu dong retry." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  He thong da khoi dong. Danh sach cong:" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  [WEB]  Kong Gateway:  http://localhost:8000"
Write-Host "  [ADM]  Kong Admin:    http://localhost:8001"
Write-Host "  [MQ]   RabbitMQ UI:   http://localhost:15672  (guest/guest)"
Write-Host ""
Write-Host "  Dich vu Noi Bo (Health Check):"
Write-Host "    iam-service       -> http://localhost:3001/health"
Write-Host "    analytics-service -> http://localhost:3002/health"
Write-Host "    infrastructure    -> http://localhost:3003/health"
Write-Host "    session-service   -> http://localhost:3004/health"
Write-Host "    billing-service   -> http://localhost:3007/health"
Write-Host "    notification      -> http://localhost:3008/health"
Write-Host "    telemetry         -> http://localhost:3009/health"
Write-Host "    ocpp-gateway      -> http://localhost:3010/health"
Write-Host ""
Write-Host "  Lenh ho tro:" -ForegroundColor Cyan
Write-Host "    Test He Thong:  .\deployment\scripts\smoke-test.ps1"
Write-Host "    Kiem tra API:   .\deployment\scripts\health-check.ps1"
Write-Host "    Chay Unit Test: .\deployment\scripts\tests.ps1"
Write-Host ""
