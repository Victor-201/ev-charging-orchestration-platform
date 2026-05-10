#!/usr/bin/env pwsh
# ==============================================================================
# logs.ps1 - Xem log cua he thong EV Charging Platform
#
# Usage:
#   .\logs.ps1 -Service <name>          (1 service, xem o terminal hien tai)
#   .\logs.ps1 -Service <n1>,<n2>       (Nhieu services, mo nhieu terminal)
#   .\logs.ps1 -All                     (Tat ca log gop chung 1 man hinh)
#   .\logs.ps1 -AllApps                 (Mo 8 terminal cho 8 app services)
#   .\logs.ps1 -AllInfra                (Mo 4 terminal cho infra: kong,redis,rmq,ch)
#   .\logs.ps1 -AllDb                   (Mo 6 terminal cho database PostgreSQL)
#   .\logs.ps1 -AllSystemSplit          (Mo 18 terminal toan bo he thong)
#   .\logs.ps1 -Service ev-iam -Tail 500 -NoFollow
# ==============================================================================

param(
    [string[]]$Service,
    [switch]$All,
    [switch]$AllApps,
    [switch]$AllInfra,
    [switch]$AllDb,
    [switch]$AllSystemSplit,
    [switch]$NoFollow,
    [int]$Tail = 100
)

$ErrorActionPreference = 'Stop'
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ComposeDir = Join-Path $ScriptDir "..\..\docker"
$ComposeFile = Join-Path $ComposeDir "docker-compose.yml"
$EnvFile    = Join-Path $ComposeDir ".env"

$AppServices = @(
  "ev-iam", "ev-analytics", "ev-infrastructure", "ev-session",
  "ev-billing", "ev-notify", "ev-telemetry", "ev-ocpp-gw"
)
$InfraServices = @(
  "ev-kong", "ev-redis", "ev-rabbitmq", "ev-clickhouse"
)
$DbServices = @(
  "ev-pg-iam", "ev-pg-infra", "ev-pg-session", "ev-pg-billing",
  "ev-pg-notify", "ev-pg-analytics"
)
$AllServicesList = $AppServices + $InfraServices + $DbServices

if ($All) {
    Write-Host "[LOG] Hien thi TAT CA log he thong chung 1 man hinh..." -ForegroundColor Cyan
    if ($NoFollow) {
        docker compose -f $ComposeFile --env-file $EnvFile logs --tail $Tail
    } else {
        docker compose -f $ComposeFile --env-file $EnvFile logs -f --tail $Tail
    }
    exit 0
}

if ($AllApps)       { $Service = $AppServices }
if ($AllInfra)      { $Service = $InfraServices }
if ($AllDb)         { $Service = $DbServices }
if ($AllSystemSplit){ $Service = $AllServicesList }

if ($null -eq $Service -or $Service.Length -eq 0) {
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "  HUONG DAN XEM LOG (Realtime)" -ForegroundColor Cyan
    Write-Host "========================================="
    Write-Host "1. Xem 1 service (tai terminal hien tai):"
    Write-Host "   .\logs.ps1 -Service ev-iam"
    Write-Host ""
    Write-Host "2. Xem NHIEU service (mo cac cua so rieng biet):"
    Write-Host "   .\logs.ps1 -Service ev-iam,ev-session,ev-kong"
    Write-Host ""
    Write-Host "3. Xem log theo nhom (mo nhieu cua so rieng biet):"
    Write-Host "   .\logs.ps1 -AllApps         (8 app services)"
    Write-Host "   .\logs.ps1 -AllInfra        (4 infra: kong, redis, rmq, clickhouse)"
    Write-Host "   .\logs.ps1 -AllDb           (6 database services)"
    Write-Host "   .\logs.ps1 -AllSystemSplit  (TAT CA 18 services -> mo 18 cua so!)"
    Write-Host ""
    Write-Host "4. Xem TAT CA log gop chung 1 man hinh:"
    Write-Host "   .\logs.ps1 -All"
    Write-Host "========================================="
    Write-Host "Danh sach Container (ho tro truyen vao -Service):"
    Write-Host "  App:   $($AppServices -join ', ')"
    Write-Host "  Infra: $($InfraServices -join ', ')"
    Write-Host "  DB:    $($DbServices -join ', ')"
    exit 0
}

if ($Service.Count -eq 1) {
    $svc = $Service[0]
    Write-Host "[LOG] Dang hien thi log cho: $svc" -ForegroundColor Cyan
    if ($NoFollow) {
        docker logs $svc --tail $Tail
    } else {
        docker logs $svc -f --tail $Tail
    }
} else {
    Write-Host "[LOG] Dang mo $($Service.Count) cua so terminal rieng biet..." -ForegroundColor Cyan
    foreach ($svc in $Service) {
        Write-Host "  -> Mo log cho: $svc"
        $title = "Logs: $svc"
        if ($NoFollow) {
            $cmd = "`$host.ui.RawUI.WindowTitle = '$title'; docker logs $svc --tail $Tail; Write-Host '--- KET THUC ---' -ForegroundColor Yellow; Read-Host 'Nhan Enter de dong...'"
        } else {
            $cmd = "`$host.ui.RawUI.WindowTitle = '$title'; docker logs $svc -f --tail $Tail; Write-Host '--- KET THUC ---' -ForegroundColor Yellow; Read-Host 'Nhan Enter de dong...'"
        }
        Start-Process powershell -ArgumentList "-NoProfile -Command `"$cmd`""
    }
}
