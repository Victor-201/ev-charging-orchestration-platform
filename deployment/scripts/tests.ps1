#!/usr/bin/env pwsh
# ==============================================================================
# tests.ps1 - Chay Unit Test toan bo 8 microservices
#
# Usage:
#   .\tests.ps1                        # Chay tat ca unit tests
#   .\tests.ps1 -Coverage              # Chay kem bao cao code coverage
#   .\tests.ps1 -Pattern "booking"     # Chi chay file test khop pattern
# ==============================================================================

param(
    [string]$Pattern  = "",
    [switch]$Coverage = $false
)

$services = @(
    "iam-service",
    "ev-infrastructure-service",
    "session-service",
    "billing-service",
    "notification-service",
    "analytics-service",
    "telemetry-ingestion-service",
    "ocpp-gateway-service"
)

$totalPassed  = 0
$totalFailed  = 0
$totalSkipped = 0
$results      = @()
$startTime    = Get-Date

Write-Host ""
Write-Host "========================================================"
Write-Host "  EV Platform - Kiem thu Unit Test Suite"
Write-Host "  Bat dau luc: $(Get-Date -Format 'HH:mm:ss')"
Write-Host "========================================================"
Write-Host ""

foreach ($svc in $services) {
    $backendDir = Resolve-Path (Join-Path $PSScriptRoot "..\..\backend")
    $dir        = Join-Path $backendDir $svc
    $jestBin    = Join-Path $dir "node_modules\.bin\jest.cmd"

    if (-not (Test-Path $jestBin)) {
        Write-Host "BO QUA (SKIP) $svc (khong tim thay node_modules)" -ForegroundColor Yellow
        $totalSkipped++
        continue
    }

    $unitDir   = Join-Path $dir "test\unit"
    $specCount = (Get-ChildItem $unitDir -Recurse -Filter "*.spec.ts" -ErrorAction SilentlyContinue).Count
    if ($specCount -eq 0) {
        Write-Host "BO QUA (SKIP) $svc (khong co file spec.ts)" -ForegroundColor Yellow
        $totalSkipped++
        continue
    }

    $jestArgs = @("--config", "jest.config.js", "--testPathPattern=test/unit", "--no-coverage", "--passWithNoTests")
    if ($Pattern)  { $jestArgs += "--testPathPattern=$Pattern" }
    if ($Coverage) { $jestArgs = $jestArgs -replace "--no-coverage", ""; $jestArgs += "--coverage" }

    Push-Location $dir
    $svcStart = Get-Date
    $output   = & $jestBin @jestArgs 2>&1
    $exitCode = $LASTEXITCODE
    $elapsed  = [math]::Round(((Get-Date) - $svcStart).TotalSeconds, 1)
    Pop-Location

    $matchTest = $output | Select-String "^Tests:"
    if ($null -ne $matchTest) {
        $testsLine = $matchTest.Line
        if ($testsLine -match "(\d+) passed") {
            $p = [int]$Matches[1]; $totalPassed += $p
        }
        if ($testsLine -match "(\d+) failed") {
            $f = [int]$Matches[1]; $totalFailed += $f
        }
    } else {
        $testsLine = "Khong tim thay ket qua test"
    }

    $icon = if ($exitCode -eq 0) { "[OK]" } else { "[FAIL]" }
    $color = if ($exitCode -eq 0) { "Green" } else { "Red" }
    Write-Host "$icon $svc - $testsLine - ${elapsed}s" -ForegroundColor $color

    if ($exitCode -ne 0) {
        $failLines = $output | Select-String "failed" | Select-Object -First 3
        $failLines | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
    }

    $results += [PSCustomObject]@{
        Service = $svc
        Status  = if ($exitCode -eq 0) { "PASS" } else { "FAIL" }
        Tests   = $testsLine
        Time    = "${elapsed}s"
    }
}

$totalTime = [math]::Round(((Get-Date) - $startTime).TotalSeconds, 1)

Write-Host ""
Write-Host "========================================================"
Write-Host "  TONG CONG: $totalPassed thanh cong, $totalFailed that bai, $totalSkipped bo qua"
Write-Host "  Thoi gian: ${totalTime}s"
Write-Host "========================================================"
Write-Host ""

if ($totalFailed -gt 0) { exit 1 }
