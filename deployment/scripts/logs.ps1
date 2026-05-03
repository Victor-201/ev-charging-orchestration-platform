#!/usr/bin/env pwsh
# ==============================================================================
# logs.ps1 - Xem log cua he thong EV Charging Platform
#
# Usage:
#   .\logs.ps1 -Service <name>          (1 service, xem o terminal hien tai)
#   .\logs.ps1 -Service <n1>,<n2>       (Nhieu services, mo nhieu terminal)
#   .\logs.ps1 -All                     (Tat ca log gop chung 1 man hinh)
#   .\logs.ps1 -AllApps                 (Mo 8 terminal cho 8 app services)
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
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ComposeDir = Join-Path $ScriptDir "..\docker"
$ComposeFile = Join-Path $ComposeDir "docker-compose.yml"
$EnvFile = Join-Path $ComposeDir ".env"

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
    Write-Host "[LOG] Hiển thị TẤT CẢ log hệ thống chung 1 màn hình..." -ForegroundColor Cyan
    if ($NoFollow) {
        docker compose -f $ComposeFile --env-file $EnvFile logs --tail $Tail
    } else {
        docker compose -f $ComposeFile --env-file $EnvFile logs -f --tail $Tail
    }
    exit 0
}

if ($AllApps) {
    $Service = $AppServices
}
if ($AllInfra) {
    $Service = $InfraServices
}
if ($AllDb) {
    $Service = $DbServices
}
if ($AllSystemSplit) {
    $Service = $AllServicesList
}

if ($null -eq $Service -or $Service.Length -eq 0) {
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "  HƯỚNG DẪN XEM LOG (Realtime)" -ForegroundColor Cyan
    Write-Host "========================================="
    Write-Host "1. Xem 1 service (tại terminal hiện tại):"
    Write-Host "   .\logs.ps1 -Service ev-iam"
    Write-Host ""
    Write-Host "2. Xem NHIỀU service (mở các cửa sổ riêng biệt):"
    Write-Host "   .\logs.ps1 -Service ev-iam,ev-session,ev-kong"
    Write-Host ""
    Write-Host "3. Xem log theo nhóm (mở nhiều cửa sổ riêng biệt):"
    Write-Host "   .\logs.ps1 -AllApps         (8 app services)"
    Write-Host "   .\logs.ps1 -AllInfra        (4 infra services: kong, redis, rmq, clickhouse)"
    Write-Host "   .\logs.ps1 -AllDb           (6 database services)"
    Write-Host "   .\logs.ps1 -AllSystemSplit  (TẤT CẢ 18 services -> mở 18 cửa sổ!)"
    Write-Host ""
    Write-Host "4. Xem TẤT CẢ log gộp chung 1 màn hình (Docker compose logs):"
    Write-Host "   .\logs.ps1 -All"
    Write-Host "========================================="
    Write-Host "Danh sách Container (hỗ trợ truyền vào -Service):"
    Write-Host "  App:   $($AppServices -join ', ')"
    Write-Host "  Infra: $($InfraServices -join ', ')"
    Write-Host "  DB:    $($DbServices -join ', ')"
    exit 0
}

if ($Service.Count -eq 1) {
    # 1 service: show in current terminal
    $svc = $Service[0]
    Write-Host "[LOG] Đang hiển thị log cho: $svc" -ForegroundColor Cyan
    if ($NoFollow) {
        docker logs $svc --tail $Tail
    } else {
        docker logs $svc -f --tail $Tail
    }
} else {
    # Multiple services: open separate terminals
    Write-Host "[LOG] Đang mở $($Service.Count) cửa sổ terminal riêng biệt..." -ForegroundColor Cyan
    foreach ($svc in $Service) {
        Write-Host "  -> Mở log cho: $svc"
        $title = "Logs: $svc"
        if ($NoFollow) {
            $cmd = "`$host.ui.RawUI.WindowTitle = '$title'; docker logs $svc --tail $Tail; Write-Host '`n--- KẾT THÚC ---' -ForegroundColor Yellow; Read-Host 'Nhấn Enter để đóng...'"
        } else {
            $cmd = "`$host.ui.RawUI.WindowTitle = '$title'; docker logs $svc -f --tail $Tail; Write-Host '`n--- KẾT THÚC ---' -ForegroundColor Yellow; Read-Host 'Nhấn Enter để đóng...'"
        }
        Start-Process powershell -ArgumentList "-NoProfile -Command `"$cmd`""
    }
}
