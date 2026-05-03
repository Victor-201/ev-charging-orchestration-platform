#!/usr/bin/env pwsh
# ==============================================================================
# health-check.ps1 - Print health status of all platform services
# ==============================================================================

$ErrorActionPreference = 'Stop'

$SERVICES = [ordered]@{
  "iam-service"               = "http://localhost:3001/health"
  "analytics-service"         = "http://localhost:3002/health"
  "ev-infrastructure-service" = "http://localhost:3003/health"
  "session-service"           = "http://localhost:3004/health"
  "billing-service"           = "http://localhost:3007/health"
  "notification-service"      = "http://localhost:3008/health"
  "telemetry-service"         = "http://localhost:3009/health"
  "ocpp-gateway-service"      = "http://localhost:3010/health"
  "kong-proxy"                = "http://localhost:8000/api/v1/stations"
  "kong-admin"                = "http://localhost:8001"
  "rabbitmq-ui"               = "http://localhost:15672"
}

Write-Host ""
Write-Host "==============================================="
Write-Host "  EV Charging Platform - Trạng thái hệ thống"
Write-Host "==============================================="
Write-Host ""

$PASS = 0
$FAIL = 0

function Check-Http {
    param([string]$Name, [string]$Url)
    try {
        $res = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($res.StatusCode -match "^(200|204|301|302|401)$") {
            Write-Host "  [OK]  $($Name.PadRight(30)) $Url" -ForegroundColor Green
            $script:PASS++
        } else {
            Write-Host "  [LỖI] $($Name.PadRight(30)) $Url  (HTTP $($res.StatusCode))" -ForegroundColor Red
            $script:FAIL++
        }
    } catch {
        $actual = "Error"
        if ($_.Exception -is [System.Net.WebException] -and $null -ne $_.Exception.Response) {
            $actual = [int]$_.Exception.Response.StatusCode
        }
        
        if ($actual -match "^(401|403|404)$") {
             Write-Host "  [OK]  $($Name.PadRight(30)) $Url" -ForegroundColor Green
             $script:PASS++
        } else {
             Write-Host "  [LỖI] $($Name.PadRight(30)) $Url  (HTTP $actual)" -ForegroundColor Red
             $script:FAIL++
        }
    }
}

Write-Host "  Trạng thái Container:"
$CONTAINERS = @(
  "ev-iam", "ev-analytics", "ev-infrastructure", "ev-session",
  "ev-billing", "ev-notify", "ev-telemetry", "ev-ocpp-gw",
  "ev-kong", "ev-redis", "ev-rabbitmq", "ev-clickhouse",
  "ev-pg-iam", "ev-pg-infra", "ev-pg-session", "ev-pg-billing",
  "ev-pg-notify", "ev-pg-analytics"
)

$runningContainers = docker ps --format '{{.Names}}'
foreach ($c in $CONTAINERS) {
    if ($runningContainers -match "(?m)^$c$") {
        $status = (docker inspect --format="{{.State.Status}}" $c) 2>$null
        $health = (docker inspect --format="{{if .State.Health}}{{.State.Health.Status}}{{else}}N/A{{end}}" $c) 2>$null
        
        if ($status -eq "running") {
            Write-Host "  [>]   $($c.PadRight(30)) status=$($status.PadRight(10)) health=$health" -ForegroundColor Green
        } else {
            Write-Host "  [!]   $($c.PadRight(30)) status=$($status.PadRight(10)) health=$health" -ForegroundColor Red
        }
    } else {
        Write-Host "  [?]   $($c.PadRight(30)) (không chạy)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "  Các điểm kết nối HTTP (Endpoints):"
foreach ($key in $SERVICES.Keys) {
    Check-Http -Name $key -Url $SERVICES[$key]
}

Write-Host ""
Write-Host "==============================================="
Write-Host "  Kết quả: $PASS TỐT  $FAIL LỖI"
Write-Host "==============================================="
Write-Host ""

if ($FAIL -gt 0) { exit 1 } else { exit 0 }

