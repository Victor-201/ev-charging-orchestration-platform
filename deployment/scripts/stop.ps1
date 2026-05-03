#!/usr/bin/env pwsh
# ==============================================================================
# stop.ps1 - Dung he thong EV Charging Platform
#
# Usage:
#   .\stop.ps1          # Dung containers, giu lai du lieu (volumes con nguyen)
#   .\stop.ps1 -Clean   # Dung + xoa toan bo volumes, images (MAT DU LIEU!)
# ==============================================================================

param(
    [switch]$Clean
)

$ErrorActionPreference = 'Stop'
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ComposeDir = Join-Path $ScriptDir "..\docker"
$ComposeFile = Join-Path $ComposeDir "docker-compose.yml"
$EnvFile    = Join-Path $ComposeDir ".env"

if ($Clean) {
    Write-Host "[STOP] Dung va XOA TOAN BO (Containers, Volumes, Networks, Images)..." -ForegroundColor Yellow
    docker compose -f $ComposeFile --env-file $EnvFile down -v --rmi all --remove-orphans
    Write-Host "[STOP] Da don dep sach se toan bo rac Docker cua du an." -ForegroundColor Green
} else {
    Write-Host "[STOP] Dung he thong (Giu lai du lieu Database & Cache)..." -ForegroundColor Green
    docker compose -f $ComposeFile --env-file $EnvFile down --remove-orphans
    Write-Host "[STOP] Cac dich vu da duoc dung an toan." -ForegroundColor Green
}
