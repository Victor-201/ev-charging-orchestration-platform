#!/usr/bin/env pwsh
# ==============================================================================
# reset.ps1 - Full reset: xoa sach va khoi dong lai tu dau
#
# Usage:
#   .\reset.ps1             # Hoi xac nhan truoc khi reset
#   .\reset.ps1 -Force      # Khong hoi, thuc thi ngay
#   .\reset.ps1 -Ngrok      # Reset + bat ngrok sau khi chay lai
#   .\reset.ps1 -Force -Ngrok  # Reset khong hoi + bat ngrok
# ==============================================================================

param(
    [switch]$Force,
    [switch]$Ngrok
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host "===========================================================" -ForegroundColor Red
Write-Host "  [!] NGUY HIEM: RESET TOAN BO HE THONG [!]" -ForegroundColor Red
Write-Host "  Lenh nay se xoa sach: Containers, Volumes (Database), Images" -ForegroundColor Yellow
Write-Host "  Sau do he thong se duoc Build va Chay lai tu dau." -ForegroundColor Yellow
if ($Ngrok) {
    Write-Host "  Ngrok tunnel se duoc bat sau khi khoi dong." -ForegroundColor Yellow
}
Write-Host "===========================================================" -ForegroundColor Red

if (-not $Force) {
    $confirm = Read-Host "Ban co chac chan muon tiep tuc? [y/N]"
    if ($confirm -notmatch "^[Yy]$") {
        Write-Host "Da huy thao tac." -ForegroundColor Cyan
        exit 0
    }
}

Write-Host ""
Write-Host "[1/2] Dang xoa toan bo du lieu cu..." -ForegroundColor Cyan
& "$ScriptDir\stop.ps1" -Clean

Write-Host ""
Write-Host "[2/2] Dang khoi tao va chay lai toan bo..." -ForegroundColor Cyan
if ($Ngrok) {
    & "$ScriptDir\start.ps1" -Rebuild -Ngrok
}
else {
    & "$ScriptDir\start.ps1" -Rebuild
}
