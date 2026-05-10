#!/usr/bin/env pwsh
# ==============================================================================
# test.ps1 - Chay Unit Test va Integration Test cho Flutter App
#
# Usage:
#   .\test.ps1                    # Chay tat ca unit test
#   .\test.ps1 -Coverage          # Tao bao cao coverage HTML
#   .\test.ps1 -Filter "Booking"  # Chi chay test khop ten
#   .\test.ps1 -Widget            # Bao gom widget tests
# ==============================================================================

param(
    [string]$Filter   = '',
    [switch]$Coverage,
    [switch]$Widget
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$AppDir    = Join-Path $ScriptDir "..\..\..\frontend\mobile-app"

Write-Host "======================================================"
Write-Host "  EV Charging - Flutter Test Suite" -ForegroundColor Cyan
Write-Host "======================================================"

if (-not (Get-Command "flutter" -ErrorAction SilentlyContinue)) {
    Write-Host "[FAIL] Khong tim thay Flutter SDK!" -ForegroundColor Red; exit 1
}

Set-Location $AppDir

if (-not (Test-Path "test")) {
    Write-Host "[WARN] Khong tim thay thu muc test/. Tao thu muc..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path "test" | Out-Null
}

# Build args
$TestArgs = @("test")

if ($Filter -ne '') {
    $TestArgs += "--name"
    $TestArgs += $Filter
    Write-Host "[FILTER] Chi chay test khop voi: '$Filter'" -ForegroundColor Yellow
}

if ($Coverage) {
    $TestArgs += "--coverage"
    Write-Host "[INFO] Se tao bao cao coverage." -ForegroundColor Cyan
}

if (-not $Widget) {
    $TestArgs += "--exclude-tags"
    $TestArgs += "widget"
}

# Analyze truoc khi test
Write-Host ""
Write-Host "[ANALYZE] Kiem tra loi code..." -ForegroundColor Cyan
& flutter analyze --no-fatal-infos
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Analyze: khong co loi." -ForegroundColor Green
} else {
    Write-Host "[WARN] Analyze co canh bao - tiep tuc chay test..." -ForegroundColor Yellow
}

# Chay tests
Write-Host ""
Write-Host "[TEST] flutter $($TestArgs -join ' ')" -ForegroundColor Green
Write-Host ""

$StartTime    = Get-Date
& flutter @TestArgs
$TestExitCode = $LASTEXITCODE
$Duration     = [math]::Round(((Get-Date) - $StartTime).TotalSeconds)

# Coverage report
if ($Coverage -and (Test-Path "coverage\lcov.info")) {
    Write-Host ""
    Write-Host "[COVERAGE] Bao cao coverage:" -ForegroundColor Cyan
    $lcov  = Get-Content "coverage\lcov.info" -Raw
    $found = ([regex]::Matches($lcov, "^DA:\d+,1", [System.Text.RegularExpressions.RegexOptions]::Multiline)).Count
    $total = ([regex]::Matches($lcov, "^DA:\d+",   [System.Text.RegularExpressions.RegexOptions]::Multiline)).Count
    if ($total -gt 0) {
        $pct   = [math]::Round(($found / $total) * 100, 1)
        $color = if ($pct -ge 80) { 'Green' } elseif ($pct -ge 60) { 'Yellow' } else { 'Red' }
        Write-Host ("  Dong da phu: {0}/{1} ({2}%)" -f $found, $total, $pct) -ForegroundColor $color
    }
    if (Get-Command "genhtml" -ErrorAction SilentlyContinue) {
        & genhtml coverage/lcov.info -o coverage/html --quiet
        Write-Host "  HTML report: $AppDir\coverage\html\index.html" -ForegroundColor DarkGray
    } else {
        Write-Host "  [HINT] Cai genhtml de xem HTML report: choco install lcov" -ForegroundColor DarkGray
    }
}

Write-Host ""
if ($TestExitCode -eq 0) {
    Write-Host "======================================================" -ForegroundColor Green
    Write-Host "  Tat ca test PASSED trong $Duration giay!" -ForegroundColor Green
    Write-Host "======================================================" -ForegroundColor Green
} else {
    Write-Host "======================================================" -ForegroundColor Red
    Write-Host "  Mot so test FAILED (Exit $TestExitCode)." -ForegroundColor Red
    Write-Host "======================================================" -ForegroundColor Red
    exit $TestExitCode
}

Write-Host ""
Write-Host "  Buoc tiep theo:" -ForegroundColor Cyan
Write-Host "    Build APK : .\deployment\scripts\frontend\build.ps1 -Target apk -Flavor dev"
Write-Host "    Build AAB : .\deployment\scripts\frontend\build.ps1 -Target appbundle -Flavor prod -Release"
Write-Host ""
