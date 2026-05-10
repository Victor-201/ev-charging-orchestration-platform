#!/usr/bin/env pwsh
# ==============================================================================
# clickhouse-check.ps1 - Kiem tra nhanh ClickHouse + ev_telemetry database
#
# Dung:
#   .\deployment\scripts\backend\clickhouse-check.ps1
#   .\deployment\scripts\backend\clickhouse-check.ps1 -Url http://localhost:8123
#   .\deployment\scripts\backend\clickhouse-check.ps1 -Detail
# ==============================================================================

param(
    [string] $Url    = "http://localhost:8123",
    [switch] $Detail   # Hien thi them row count + schema cot
)

$ErrorActionPreference = 'SilentlyContinue'

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

function Invoke-CH {
    param([string]$Query)
    try {
        $encoded = [System.Uri]::EscapeDataString($Query)
        $uri     = "$Url/?query=$encoded&output_format_json_quote_64bit_integers=0"
        $res     = Invoke-RestMethod -Uri $uri -Method GET -TimeoutSec 8 -ErrorAction Stop
        return $res
    } catch {
        return $null
    }
}

# ── Header ──────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "========================================================"
Write-Host "  EV Platform - ClickHouse Quick Check"
Write-Host "  URL: $Url"
Write-Host "========================================================"
Write-Host ""

# ── 1. Ping / Connectivity ─────────────────────────────────────────────────

Write-Host "  [1] Ket noi ClickHouse:"
try {
    $ping = Invoke-RestMethod -Uri "$Url/ping" -Method GET -TimeoutSec 5 -ErrorAction Stop
    if ($ping -match "Ok") {
        Write-Ok "ping $Url/ping -> Ok"
    } else {
        Write-Fail "ping phan hoi khong mong doi: $ping"
    }
} catch {
    Write-Fail "Khong ket noi duoc den $Url  ($_)"
    Write-Host ""
    Write-Host "  Goi y: docker compose -f deployment/docker/docker-compose.yml up -d clickhouse" -ForegroundColor DarkGray
    Write-Host ""
    exit 1
}

# ── 2. Version ────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "  [2] Phien ban ClickHouse:"
$ver = Invoke-CH "SELECT version() AS ver FORMAT JSONEachRow"
if ($ver) {
    Write-Ok "version = $($ver.ver)"
} else {
    Write-Warn "Khong lay duoc version"
}

# ── 3. Database ev_telemetry ──────────────────────────────────────────────

Write-Host ""
Write-Host "  [3] Database ev_telemetry:"
$db = Invoke-CH "SELECT name FROM system.databases WHERE name='ev_telemetry' FORMAT JSONEachRow"
if ($db -and $db.name -eq "ev_telemetry") {
    Write-Ok "database ev_telemetry ton tai"
} else {
    Write-Warn "database ev_telemetry CHUA TON TAI  (service chua khoi dong hoac chua ghi du lieu)"
}

# ── 4. Table telemetry_logs ───────────────────────────────────────────────

Write-Host ""
Write-Host "  [4] Table telemetry_logs:"
$tbl = Invoke-CH "SELECT name FROM system.tables WHERE database='ev_telemetry' AND name='telemetry_logs' FORMAT JSONEachRow"
if ($tbl -and $tbl.name -eq "telemetry_logs") {
    Write-Ok "table ev_telemetry.telemetry_logs ton tai"

    # Row count
    $cnt = Invoke-CH "SELECT count() AS cnt FROM ev_telemetry.telemetry_logs FORMAT JSONEachRow"
    if ($null -ne $cnt) {
        Write-Ok "row count = $($cnt.cnt)"
    }

    # Partitions
    $parts = Invoke-CH "SELECT count() AS cnt FROM system.parts WHERE database='ev_telemetry' AND table='telemetry_logs' AND active=1 FORMAT JSONEachRow"
    if ($null -ne $parts) {
        Write-Ok "active partitions = $($parts.cnt)"
    }

    # TTL info
    $ttl = Invoke-CH "SELECT engine_full FROM system.tables WHERE database='ev_telemetry' AND name='telemetry_logs' FORMAT JSONEachRow"
    if ($ttl -and $ttl.engine_full -match "TTL") {
        Write-Ok "TTL duoc cau hinh (tu dong xoa sau 90 ngay)"
    }

    # Detail mode: show columns
    if ($Detail) {
        Write-Host ""
        Write-Host "  Schema - telemetry_logs:" -ForegroundColor Cyan
        $cols = Invoke-CH "SELECT name, type FROM system.columns WHERE database='ev_telemetry' AND table='telemetry_logs' ORDER BY position FORMAT JSONEachRow"
        if ($cols) {
            foreach ($c in @($cols)) {
                Write-Host "    $($c.name.PadRight(25)) $($c.type)" -ForegroundColor DarkCyan
            }
        }
    }

} else {
    Write-Warn "table telemetry_logs CHUA TON TAI  (telemetry-service chua init)"
}

# ── 5. Ket noi tu Container ev-telemetry ─────────────────────────────────

Write-Host ""
Write-Host "  [5] Container ev-clickhouse:"
$running = docker ps --format "{{.Names}}" 2>$null
if ($running -match "ev-clickhouse") {
    $health = docker inspect --format="{{.State.Health.Status}}" ev-clickhouse 2>$null
    if ($health -eq "healthy") {
        Write-Ok "ev-clickhouse dang chay  health=$health"
    } elseif ($health -eq "starting") {
        Write-Warn "ev-clickhouse dang khoi dong  health=$health"
    } else {
        Write-Fail "ev-clickhouse khong healthy  health=$health"
    }
} else {
    Write-Warn "Container ev-clickhouse khong chay (kiem tra Docker Desktop)"
}

# ── 6. Telemetry service health ───────────────────────────────────────────

Write-Host ""
Write-Host "  [6] Telemetry service /health:"
try {
    $h = Invoke-RestMethod -Uri "http://localhost:3009/health" -TimeoutSec 5 -ErrorAction Stop
    if ($h.status -eq "healthy") {
        $chStatus = $h.dependencies.clickhouse
        if ($chStatus) {
            if ($chStatus.status -eq "connected") {
                Write-Ok "telemetry-service /health -> clickhouse=$($chStatus.status) buffered=$($chStatus.buffered)"
            } else {
                Write-Warn "telemetry-service /health -> clickhouse=$($chStatus.status) (service dang chay nhung ClickHouse chua ket noi)"
            }
        } else {
            Write-Ok "telemetry-service /health -> healthy (khong co thong tin ClickHouse)"
        }
    } else {
        Write-Fail "telemetry-service /health -> status=$($h.status)"
    }
} catch {
    Write-Warn "Khong reach duoc http://localhost:3009/health (service co the chua chay)"
}

# ── Ket qua tong hop ─────────────────────────────────────────────────────

Write-Host ""
Write-Host "========================================================"
Write-Host ("  Ket qua: {0} TOT  {1} CANH BAO  {2} LOI" -f $PASS, $WARN, $FAIL)
Write-Host "========================================================"
Write-Host ""

if ($FAIL -gt 0) {
    Write-Host "  Goi y debug:" -ForegroundColor DarkGray
    Write-Host "    docker logs ev-clickhouse --tail 50" -ForegroundColor DarkGray
    Write-Host "    docker logs ev-telemetry  --tail 50" -ForegroundColor DarkGray
    Write-Host ""
    exit 1
}

exit 0
