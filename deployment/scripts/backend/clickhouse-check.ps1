#!/usr/bin/env pwsh
# ==============================================================================
# clickhouse-check.ps1 - Kiem tra nhanh ClickHouse + ev_telemetry database
#
# Dung:
#   .\deployment\scripts\backend\clickhouse-check.ps1
#   .\deployment\scripts\backend\clickhouse-check.ps1 -Detail
# ==============================================================================

param(
    [switch]$Detail   # Hien thi them schema cot cua bang telemetry_logs
)

$ErrorActionPreference = 'SilentlyContinue'
$CONTAINER = "ev-clickhouse"

$PASS = 0
$FAIL = 0
$WARN = 0

function Write-Ok($msg) {
    Write-Host "  [OK]  $msg" -ForegroundColor Green
    $script:PASS++
}
function Write-Fail($msg) {
    Write-Host "  [LOI] $msg" -ForegroundColor Red
    $script:FAIL++
}
function Write-Warn($msg) {
    Write-Host "  [!]   $msg" -ForegroundColor Yellow
    $script:WARN++
}

# Chay query qua docker exec clickhouse-client, tra ve raw string output
function Invoke-CH {
    param([string]$Query)
    $out = docker exec $CONTAINER clickhouse-client --query $Query 2>$null
    if ($LASTEXITCODE -ne 0) { return $null }
    return $out
}

# Chay query tra ve JSON object (1 dong JSONEachRow)
function Invoke-CHJson {
    param([string]$Query)
    $out = Invoke-CH "$Query FORMAT JSONEachRow"
    if ($null -eq $out -or $out -eq '') { return $null }
    try {
        # JSONEachRow: moi dong la 1 JSON object
        $lines = $out -split "`n" | Where-Object { $_.Trim() -ne '' }
        if ($lines.Count -eq 1) {
            return $lines[0] | ConvertFrom-Json
        }
        # Nhieu dong: tra ve mang
        return $lines | ForEach-Object { $_ | ConvertFrom-Json }
    } catch {
        return $null
    }
}

# ── Header ──────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "========================================================"
Write-Host "  EV Platform - ClickHouse Quick Check"
Write-Host "  Container: $CONTAINER"
Write-Host "========================================================"
Write-Host ""

# ── 1. Container running? ─────────────────────────────────────────────────

Write-Host "  [1] Container ev-clickhouse:"
$running = (docker ps --format "{{.Names}}" 2>$null) -split "`r?`n" | Where-Object { $_.Trim() -ne '' }
if ($running -notcontains $CONTAINER) {
    Write-Fail "Container ev-clickhouse khong chay (kiem tra Docker Desktop)"
    Write-Host ""
    Write-Host "  Goi y: docker compose -f deployment/docker/docker-compose.yml up -d clickhouse" -ForegroundColor DarkGray
    Write-Host ""
    exit 1
}

$health = docker inspect --format="{{.State.Health.Status}}" $CONTAINER 2>$null
if ($health -eq "healthy") {
    Write-Ok "ev-clickhouse dang chay  health=$health"
} elseif ($health -eq "starting") {
    Write-Warn "ev-clickhouse dang khoi dong  health=$health"
} else {
    Write-Fail "ev-clickhouse khong healthy  health=$health"
}

# ── 2. Ping qua clickhouse-client ────────────────────────────────────────

Write-Host ""
Write-Host "  [2] Ket noi ClickHouse (clickhouse-client ping):"
$pingOut = docker exec $CONTAINER clickhouse-client --query "SELECT 1" 2>$null
if ($LASTEXITCODE -eq 0 -and $pingOut -match "1") {
    Write-Ok "clickhouse-client -> SELECT 1 = $pingOut"
} else {
    Write-Fail "clickhouse-client khong phan hoi dung"
}

# ── 3. Version ────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "  [3] Phien ban ClickHouse:"
$ver = Invoke-CH "SELECT version()"
if ($ver) {
    Write-Ok "version = $($ver.Trim())"
} else {
    Write-Warn "Khong lay duoc version"
}

# ── 4. Database ev_telemetry ──────────────────────────────────────────────

Write-Host ""
Write-Host "  [4] Database ev_telemetry:"
$db = Invoke-CHJson "SELECT name FROM system.databases WHERE name='ev_telemetry'"
if ($db -and $db.name -eq "ev_telemetry") {
    Write-Ok "database ev_telemetry ton tai"
} else {
    Write-Warn "database ev_telemetry CHUA TON TAI (telemetry-service chua khoi dong hoac chua ghi du lieu)"
}

# ── 5. Table telemetry_logs ───────────────────────────────────────────────

Write-Host ""
Write-Host "  [5] Table telemetry_logs:"
$tbl = Invoke-CHJson "SELECT name FROM system.tables WHERE database='ev_telemetry' AND name='telemetry_logs'"
if ($tbl -and $tbl.name -eq "telemetry_logs") {
    Write-Ok "table ev_telemetry.telemetry_logs ton tai"

    # Row count
    $cntRaw = Invoke-CH "SELECT count() FROM ev_telemetry.telemetry_logs"
    if ($null -ne $cntRaw) {
        Write-Ok "row count = $($cntRaw.Trim())"
    }

    # Active partitions
    $partsRaw = Invoke-CH "SELECT count() FROM system.parts WHERE database='ev_telemetry' AND table='telemetry_logs' AND active=1"
    if ($null -ne $partsRaw) {
        Write-Ok "active partitions = $($partsRaw.Trim())"
    }

    # TTL
    $ttlRaw = Invoke-CH "SELECT engine_full FROM system.tables WHERE database='ev_telemetry' AND name='telemetry_logs'"
    if ($ttlRaw -match "TTL") {
        Write-Ok "TTL duoc cau hinh (tu dong xoa du lieu cu)"
    }

    # Detail: show schema
    if ($Detail) {
        Write-Host ""
        Write-Host "  Schema - telemetry_logs:" -ForegroundColor Cyan
        $cols = Invoke-CH "SELECT name, type FROM system.columns WHERE database='ev_telemetry' AND table='telemetry_logs' ORDER BY position FORMAT PrettyCompact"
        if ($cols) {
            $cols -split "`n" | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkCyan }
        }
    }

} else {
    Write-Warn "table telemetry_logs CHUA TON TAI (telemetry-service chua init hoac chua co session nao)"
}

# ── 6. Telemetry service /health ──────────────────────────────────────────

Write-Host ""
Write-Host "  [6] Telemetry service /health:"
try {
    $h = Invoke-RestMethod -Uri "http://localhost:3009/health" -TimeoutSec 5 -ErrorAction Stop
    $svcStatus = $h.status
    $chDep = $h.dependencies.clickhouse

    if ($svcStatus -in @("healthy", "ok")) {
        if ($chDep) {
            if ($chDep.status -eq "connected") {
                Write-Ok "telemetry-service -> status=$svcStatus | clickhouse=$($chDep.status) buffered=$($chDep.buffered)"
            } else {
                Write-Warn "telemetry-service -> status=$svcStatus | clickhouse=$($chDep.status) (chua ket noi)"
            }
        } else {
            Write-Ok "telemetry-service -> status=$svcStatus"
        }
    } else {
        Write-Fail "telemetry-service /health -> status=$svcStatus"
    }
} catch {
    Write-Warn "Khong reach duoc http://localhost:3009/health (service co the chua chay)"
}

# ── Ket qua ──────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "========================================================"
Write-Host ("  Ket qua: {0} TOT  {1} CANH BAO  {2} LOI" -f $PASS, $WARN, $FAIL)
Write-Host "========================================================"
Write-Host ""

if ($FAIL -gt 0) {
    Write-Host "  Goi y debug:" -ForegroundColor DarkGray
    Write-Host "    docker logs $CONTAINER --tail 50" -ForegroundColor DarkGray
    Write-Host "    docker logs ev-telemetry  --tail 50" -ForegroundColor DarkGray
    Write-Host ""
    exit 1
}

exit 0
