#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$AppDir    = Join-Path $ScriptDir "..\..\..\frontend\kiosk"

Write-Host "======================================================"
Write-Host "  EV Charging — Kiosk Setup (npm install)" -ForegroundColor Cyan
Write-Host "======================================================"

Set-Location $AppDir
& npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] npm install failed." -ForegroundColor Red; exit 1
}
Write-Host "[OK] Dependencies installed." -ForegroundColor Green
