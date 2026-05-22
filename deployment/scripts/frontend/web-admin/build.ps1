#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'
$ScriptDir = $PSScriptRoot
if (-not $ScriptDir -and $MyInvocation -and $MyInvocation.MyCommand -and $MyInvocation.MyCommand.Path) {
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if (-not $ScriptDir) {
    $ScriptDir = (Get-Location).Path
}

$ProjectRoot = (Resolve-Path (Join-Path $ScriptDir "..\..\..\..")).Path
$AppDir      = Join-Path $ProjectRoot "frontend\web-admin"

Write-Host "======================================================"
Write-Host "  EV Charging — Web Admin Build (npm run build)" -ForegroundColor Cyan
Write-Host "======================================================"

Set-Location $AppDir
& npm.cmd run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Build failed." -ForegroundColor Red; exit 1
}
Write-Host "[OK] Build completed." -ForegroundColor Green
