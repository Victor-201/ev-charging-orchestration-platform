#!/usr/bin/env pwsh
# ==============================================================================
# reset.ps1 - Full reset: wipe everything and restart clean
#
# Usage:  .\reset.ps1 [-Rebuild]
# ==============================================================================

param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host "===========================================================" -ForegroundColor Red
Write-Host " [!] NGUY HIỂM: RESET TOÀN BỘ HỆ THỐNG [!]" -ForegroundColor Red
Write-Host " Lệnh này sẽ xóa sạch: Containers, Volumes (Database), Images" -ForegroundColor Yellow
Write-Host " Sau đó hệ thống sẽ được Build và Chạy lại từ đầu." -ForegroundColor Yellow
Write-Host "===========================================================" -ForegroundColor Red

if (-not $Force) {
    $confirm = Read-Host "Bạn có chắc chắn muốn tiếp tục? [y/N]"
    if ($confirm -notmatch "^[Yy]$") {
        Write-Host "Đã hủy thao tác." -ForegroundColor Cyan
        exit 0
    }
}

Write-Host "`n[1/2] Đang xóa toàn bộ dữ liệu cũ..." -ForegroundColor Cyan
& "$ScriptDir\stop.ps1" -Clean

Write-Host "`n[2/2] Đang khởi tạo và chạy lại toàn bộ..." -ForegroundColor Cyan
& "$ScriptDir\start.ps1" -Rebuild
