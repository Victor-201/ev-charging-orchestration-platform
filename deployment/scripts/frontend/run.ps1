#!/usr/bin/env pwsh
# ==============================================================================
# run.ps1 - Chay ung dung Flutter tren thiet bi/emulator
#
# TU DONG DOC .env tu frontend/mobile-app/.env
# Bien trong .env se duoc pass vao --dart-define khi chay app.
#
# Usage:
#   .\run.ps1                               # Doc .env, chay dev
#   .\run.ps1 -Flavor staging               # Ghi de flavor
#   .\run.ps1 -Device emulator-5554         # Chi dinh device ID
#   .\run.ps1 -ApiUrl http://10.0.2.2:8000  # Ghi de API URL
#   .\run.ps1 -Release                      # Chay release mode
# ==============================================================================

param(
    [ValidateSet('dev','staging','prod')]
    [string]$Flavor  = '',
    [string]$Device  = '',
    [string]$ApiUrl  = '',
    [switch]$Release
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$AppDir    = Join-Path $ScriptDir "..\..\..\frontend\mobile-app"
$EnvFile   = Join-Path $AppDir ".env"

Write-Host "======================================================"
Write-Host "  EV Charging - Flutter Run" -ForegroundColor Cyan
Write-Host "======================================================"

if (-not (Get-Command "flutter" -ErrorAction SilentlyContinue)) {
    Write-Host "[FAIL] Khong tim thay Flutter SDK!" -ForegroundColor Red; exit 1
}
if (-not (Test-Path $AppDir)) {
    Write-Host "[FAIL] Khong tim thay: $AppDir" -ForegroundColor Red; exit 1
}

# Doc bien tu .env
$EnvVars = @{}
if (Test-Path $EnvFile) {
    Write-Host "[ENV] Doc bien tu: $EnvFile" -ForegroundColor Cyan
    Get-Content $EnvFile | Where-Object { $_ -match '^\s*[A-Z_]+=.+' -and $_ -notmatch '^\s*#' } | ForEach-Object {
        $parts = $_ -split '=', 2
        $EnvVars[$parts[0].Trim()] = $parts[1].Trim()
    }
    Write-Host "[ENV] Da doc $($EnvVars.Count) bien." -ForegroundColor Green
} else {
    Write-Host "[WARN] Khong tim thay .env. Copy .env.example thanh .env va dien gia tri thuc." -ForegroundColor Yellow
}

# Uu tien: tham so CLI > .env > gia tri mac dinh
if ($Flavor -eq '') {
    $Flavor = if ($EnvVars.ContainsKey('FLAVOR')) { $EnvVars['FLAVOR'] } else { 'dev' }
}
if ($ApiUrl -eq '') {
    $ApiUrl = if ($EnvVars.ContainsKey('API_BASE_URL')) { $EnvVars['API_BASE_URL'] } else { '' }
}

# Fallback API URL theo flavor
if ($ApiUrl -eq '') {
    switch ($Flavor) {
        'prod'    { $ApiUrl = 'https://api.ev-charging.vn' }
        'staging' { $ApiUrl = 'https://api-staging.ev-charging.vn' }
        default   {
            $ApiUrl = 'http://localhost:8000'
            Write-Host "[HINT] Khong co API_BASE_URL trong .env." -ForegroundColor Yellow
            Write-Host "       Thiet bi that: dien API_BASE_URL=http://<LAN-IP>:8000 vao .env" -ForegroundColor DarkGray
            Write-Host "       Emulator     : API_BASE_URL=http://10.0.2.2:8000" -ForegroundColor DarkGray
        }
    }
}

Set-Location $AppDir

Write-Host ""
Write-Host "[INFO] Danh sach thiet bi:" -ForegroundColor Cyan
flutter devices

# Tu dong chon thiet bi Android vat ly dau tien neu khong chi dinh
if ($Device -eq '') {
    $deviceLine = flutter devices 2>&1 | Select-String "android-arm|android-x64" | Select-Object -First 1
    if ($deviceLine) {
        $Device = (($deviceLine -split '[^a-zA-Z0-9_\-]') | Where-Object { $_ -ne '' } | Select-Object -Skip 1 -First 1).Trim()
        if ($Device) {
            Write-Host "[INFO] Tu dong chon thiet bi: $Device" -ForegroundColor Yellow
        }
    }
}

# Build dart-define args: FLAVOR + API_BASE_URL + cac bien khac tu .env
$DartDefines = [System.Collections.Generic.List[string]]::new()
$DartDefines.Add("FLAVOR=$Flavor")
$DartDefines.Add("API_BASE_URL=$ApiUrl")

foreach ($key in $EnvVars.Keys) {
    if ($key -ne 'FLAVOR' -and $key -ne 'API_BASE_URL') {
        $DartDefines.Add("${key}=$($EnvVars[$key])")
    }
}

$DartDefineArgs = $DartDefines | ForEach-Object { "--dart-define=$_" }
$ModeFlag       = if ($Release) { "--release" } else { "--debug" }

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "  Flavor   : $Flavor" -ForegroundColor Green
Write-Host "  Mode     : $ModeFlag" -ForegroundColor Green
Write-Host "  API URL  : $ApiUrl" -ForegroundColor Green
if ($Device -ne '') { Write-Host "  Device   : $Device" -ForegroundColor Green }
Write-Host "  Dart-defines: $($DartDefines.Count) bien" -ForegroundColor DarkGray
Write-Host "======================================================"
Write-Host ""

$FlutterArgs = @("run")
if ($Device -ne '') { $FlutterArgs += @("-d", $Device) }
$FlutterArgs += $ModeFlag
$FlutterArgs += "--flavor"
$FlutterArgs += $Flavor
$FlutterArgs += $DartDefineArgs

& flutter @FlutterArgs
