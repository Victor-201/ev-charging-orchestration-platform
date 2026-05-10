#!/usr/bin/env pwsh
# ==============================================================================
# setup.ps1 - Thiet lap moi truong phat trien Flutter lan dau
#
# Usage:
#   .\setup.ps1              # Kiem tra va cai dat day du
#   .\setup.ps1 -GenKeystore # Tao keystore cho release build
#   .\setup.ps1 -SkipDoctor  # Bo qua flutter doctor
# ==============================================================================

param(
    [switch]$GenKeystore,
    [switch]$SkipDoctor
)

$ErrorActionPreference = 'Stop'
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Definition
$AppDir     = Join-Path $ScriptDir "..\..\..\frontend\mobile-app"
$AndroidDir = Join-Path $AppDir "android"

Write-Host "======================================================"
Write-Host "  EV Charging - Frontend Setup" -ForegroundColor Cyan
Write-Host "======================================================"

# 1. Kiem tra Flutter SDK
Write-Host ""
Write-Host "[CHECK] Kiem tra Flutter SDK..." -ForegroundColor Cyan

if (-not (Get-Command "flutter" -ErrorAction SilentlyContinue)) {
    Write-Host "[FAIL] Flutter chua duoc cai dat!" -ForegroundColor Red
    Write-Host "  Tai ve tai: https://flutter.dev/docs/get-started/install" -ForegroundColor Yellow
    exit 1
}

$flutterVer = (flutter --version 2>&1 | Select-String "Flutter").ToString().Trim()
Write-Host "[OK] $flutterVer" -ForegroundColor Green

# 2. Flutter Doctor
if (-not $SkipDoctor) {
    Write-Host ""
    Write-Host "[DOCTOR] Chay flutter doctor..." -ForegroundColor Cyan
    & flutter doctor -v
}

# 3. Cai dat dependencies
Write-Host ""
Write-Host "[DEPS] Cai dat Flutter packages..." -ForegroundColor Cyan
Set-Location $AppDir
& flutter pub get

if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] flutter pub get that bai!" -ForegroundColor Red; exit 1
}
Write-Host "[OK] Da cai dat packages." -ForegroundColor Green

# 4. Kiem tra ADB
Write-Host ""
Write-Host "[CHECK] Kiem tra ADB..." -ForegroundColor Cyan

if (Get-Command "adb" -ErrorAction SilentlyContinue) {
    Write-Host "[OK] ADB co san." -ForegroundColor Green
    $devices = adb devices 2>&1 | Where-Object { $_ -match '\t(device|offline)' }
    if ($devices) {
        Write-Host "[INFO] Thiet bi ket noi:" -ForegroundColor Cyan
        $devices | ForEach-Object { Write-Host "  $_" }
    } else {
        Write-Host "[WARN] Khong co thiet bi Android ket noi." -ForegroundColor Yellow
        Write-Host "  Ket noi USB va bat USB Debugging tren thiet bi." -ForegroundColor DarkGray
    }
} else {
    Write-Host "[WARN] ADB chua duoc cai dat hoac chua trong PATH." -ForegroundColor Yellow
}

# 5. Kiem tra google-services.json
Write-Host ""
Write-Host "[CHECK] Kiem tra google-services.json (Firebase)..." -ForegroundColor Cyan

$googleServices = Join-Path $AppDir "android\app\google-services.json"
if (Test-Path $googleServices) {
    Write-Host "[OK] google-services.json da co." -ForegroundColor Green
} else {
    Write-Host "[WARN] Chua co google-services.json!" -ForegroundColor Yellow
    Write-Host "  1. Vao: https://console.firebase.google.com" -ForegroundColor DarkGray
    Write-Host "  2. Tao project -> Add Android app -> package: com.evcharging.ev_charging_app" -ForegroundColor DarkGray
    Write-Host "  3. Tai file -> dat vao android\app\" -ForegroundColor DarkGray
    Write-Host "  [FCM se bi tat cho den khi co file nay]" -ForegroundColor Yellow
}

# 6. Kiem tra key.properties
Write-Host ""
Write-Host "[CHECK] Kiem tra Android signing config..." -ForegroundColor Cyan

$keyProps = Join-Path $AndroidDir "key.properties"
if (Test-Path $keyProps) {
    $kpContent = Get-Content $keyProps -Raw
    if ($kpContent -match "YOUR_KEYSTORE_PASSWORD") {
        Write-Host "[WARN] key.properties chua duoc dien thong tin that!" -ForegroundColor Yellow
        Write-Host "  Chay: .\setup.ps1 -GenKeystore de tao keystore moi" -ForegroundColor DarkGray
    } else {
        Write-Host "[OK] key.properties da duoc cau hinh." -ForegroundColor Green
    }
} else {
    Write-Host "[WARN] Chua co key.properties." -ForegroundColor Yellow
}

# 7. Tao Keystore (tuy chon)
if ($GenKeystore) {
    Write-Host ""
    Write-Host "[KEYSTORE] Tao Android Release Keystore..." -ForegroundColor Cyan

    if (-not (Get-Command "keytool" -ErrorAction SilentlyContinue)) {
        Write-Host "[FAIL] keytool chua duoc cai dat (can JDK)!" -ForegroundColor Red
        exit 1
    }

    $KeystorePath = Join-Path $AndroidDir "ev_charging_release.keystore"
    $KeyAlias     = "ev_charging_key"

    Write-Host ""
    Write-Host "Nhap thong tin keystore (nhan Enter de dung gia tri mac dinh):"

    $storePass = Read-Host "  Keystore password (min 6 ky tu)"
    if ($storePass.Length -lt 6) {
        Write-Host "[FAIL] Password qua ngan!" -ForegroundColor Red; exit 1
    }

    $keyPass = Read-Host "  Key password (Enter = giong keystore password)"
    if ($keyPass -eq '') { $keyPass = $storePass }

    $dname = "CN=EV Charging App, OU=Mobile, O=EV Charging VN, L=Ho Chi Minh City, ST=Ho Chi Minh, C=VN"

    Write-Host "[BUILD] Dang tao keystore..." -ForegroundColor Cyan
    & keytool -genkey -v `
        -keystore $KeystorePath `
        -alias $KeyAlias `
        -keyalg RSA -keysize 2048 `
        -validity 10000 `
        -storepass $storePass `
        -keypass $keyPass `
        -dname $dname

    if ($LASTEXITCODE -eq 0) {
        $propsContent = "storePassword=$storePass`nkeyPassword=$keyPass`nkeyAlias=$KeyAlias`nstoreFile=../ev_charging_release.keystore"
        Set-Content -Path $keyProps -Value $propsContent -Encoding UTF8
        Write-Host "[OK] Keystore da tao tai: $KeystorePath" -ForegroundColor Green
        Write-Host "[OK] key.properties da duoc cap nhat." -ForegroundColor Green
        Write-Host "[CANH BAO] KHONG commit key.properties va .keystore len git!" -ForegroundColor Red
    } else {
        Write-Host "[FAIL] Tao keystore that bai!" -ForegroundColor Red; exit 1
    }
}

# 8. Tong ket
Write-Host ""
Write-Host "======================================================"
Write-Host "  Setup hoan tat!" -ForegroundColor Green
Write-Host "======================================================"
Write-Host ""
Write-Host "  Cac lenh tiep theo:" -ForegroundColor Cyan
Write-Host "    Chay dev  : .\deployment\scripts\frontend\run.ps1"
Write-Host "    Chay test : .\deployment\scripts\frontend\test.ps1"
Write-Host "    Build APK : .\deployment\scripts\frontend\build.ps1 -Target apk -Flavor dev"
Write-Host "    Build AAB : .\deployment\scripts\frontend\build.ps1 -Target appbundle -Flavor prod -Release"
Write-Host ""
