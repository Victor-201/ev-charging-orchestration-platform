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
$AppDir = Join-Path $ProjectRoot "frontend\web-admin"

Write-Host "======================================================"
Write-Host "  EV Charging — Web Admin Dev Server (npm run dev)" -ForegroundColor Cyan
Write-Host "======================================================"

Set-Location $AppDir
& npm.cmd run dev -- -p 8888
