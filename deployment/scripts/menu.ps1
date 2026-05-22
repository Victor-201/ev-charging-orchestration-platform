$ErrorActionPreference = "Continue"
$OriginalPath = Get-Location

# Bulletproof determination of ScriptDir and ProjectRoot
$ScriptDir = $PSScriptRoot
if (-not $ScriptDir -and $MyInvocation -and $MyInvocation.MyCommand -and $MyInvocation.MyCommand.Path) {
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if (-not $ScriptDir) {
    $ScriptDir = (Get-Location).Path
}

$ProjectRoot = $null
$checkPath = $ScriptDir
while ($checkPath) {
    if (Test-Path "$checkPath\deployment\scripts\menu.ps1") {
        $ProjectRoot = $checkPath
        break
    }
    $parent = Split-Path -Parent $checkPath
    if ($parent -eq $checkPath -or -not $parent) { break }
    $checkPath = $parent
}

if (-not $ProjectRoot) {
    # Fallback to resolving relative to ScriptDir
    $ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
}

# Resolve canonical absolute path and change directory
if (Test-Path $ProjectRoot) {
    $ProjectRoot = (Resolve-Path $ProjectRoot).Path
}
Set-Location $ProjectRoot

function Safe-Clear {
    try { [Console]::Clear() }
    catch { Clear-Host }
}

function Clear-KeyBuffer {
    try {
        while ([Console]::KeyAvailable) { $null = [Console]::ReadKey($true) }
    } catch {}
}

function Get-Key {
    try {
        $k = [Console]::ReadKey($true)
        if ($null -eq $k) {
            # Fallback to Read-Host
            $input = Read-Host
            if ($null -eq $input) { return "" }
            return $input.Trim().ToLower()
        }
        switch ($k.Key) {
            ([ConsoleKey]::Escape)     { return "0" }
            ([ConsoleKey]::Backspace)  { return "0" }
            ([ConsoleKey]::LeftArrow)  { return "0" }
            ([ConsoleKey]::RightArrow) { return "enter" }
            ([ConsoleKey]::Enter)      { return "enter" }
            ([ConsoleKey]::UpArrow)    { return "up" }
            ([ConsoleKey]::DownArrow)  { return "down" }
        }
        return $k.KeyChar.ToString().ToLower()
    }
    catch {
        # Fall back to Read-Host if console reading is not supported
        try {
            $input = Read-Host
            if ($null -eq $input) { return "" }
            return $input.Trim().ToLower()
        } catch {
            # Absolute fallback to prevent CPU spin in headless automated tasks
            Start-Sleep -Milliseconds 200
            return ""
        }
    }
}

function Get-Key-Timeout {
    param([int]$TimeoutMs = 500)
    $timer = [System.Diagnostics.Stopwatch]::StartNew()
    while ($timer.ElapsedMilliseconds -lt $TimeoutMs) {
        $available = $false
        try {
            $available = [Console]::KeyAvailable
        } catch {}
        if ($available) {
            try {
                $k = [Console]::ReadKey($true)
                if ($null -eq $k) { return "" }
                switch ($k.Key) {
                    ([ConsoleKey]::Escape)    { return "0" }
                    ([ConsoleKey]::Backspace) { return "0" }
                    ([ConsoleKey]::LeftArrow) { return "0" }
                }
                return $k.KeyChar.ToString().ToLower()
            } catch { break }
        }
        # Use short sleep to lower CPU utilization while maintaining low input latency.
        [System.Threading.Thread]::Sleep(5)
    }
    return $null
}

function Confirm-Action {
    param([string]$Message)
    Write-Host ""
    Write-Host " [!] $Message" -ForegroundColor White -BackgroundColor Red
    Write-Host " [?] Confirm action? (Y to confirm / any other key to cancel): " -ForegroundColor Yellow -NoNewline
    $k = Get-Key
    if ($k -eq "y") {
        Write-Host "Y - CONFIRMED" -ForegroundColor Green
        return $true
    }
    Write-Host "Cancelled." -ForegroundColor DarkGray
    Start-Sleep -Milliseconds 400
    return $false
}

function Pause-Key {
    param([string]$Msg = "Press any key to return...")
    Write-Host ""
    Write-Host " $Msg" -ForegroundColor DarkGray
    Get-Key | Out-Null
}

function Get-WslRoot {
    $result = wsl wslpath -u "$ProjectRoot" 2>$null
    if ($null -eq $result -or $result -eq "") {
        # Fallback to manual path conversion if WSL wslpath utility fails.
        $wslPath = $ProjectRoot -replace "\\", "/"
        $drive   = $wslPath[0].ToString().ToLower()
        $wslPath = $wslPath -replace "^[A-Za-z]:", "/mnt/$drive"
        return $wslPath.TrimEnd("/")
    }
    return $result.Trim()
}

function Open-UbuntuTerminal {
    param([string]$BashCommand)

    # Detect if 'Ubuntu' distribution is installed, otherwise fall back to default
    $hasUbuntu = $false
    try {
        $wslList = wsl --list --quiet 2>$null
        if ($null -ne $wslList) {
            foreach ($dist in $wslList) {
                if ($dist.Trim() -match "^Ubuntu") {
                    $hasUbuntu = $true
                    break
                }
            }
        }
    } catch {}

    # Prefer Windows Terminal (wt) for optimal multi-tab and color support.
    $wtCmd = Get-Command "wt" -ErrorAction SilentlyContinue
    if ($null -ne $wtCmd) {
        if ($hasUbuntu) {
            Start-Process "wt" -ArgumentList "new-tab", "--profile", "Ubuntu", "bash", "-c", "$BashCommand"
        } else {
            Start-Process "wt" -ArgumentList "new-tab", "wsl", "bash", "-c", "$BashCommand"
        }
    } else {
        # Fallback to standard CLI app or direct wsl.exe shell.
        $uCmd = Get-Command "ubuntu" -ErrorAction SilentlyContinue
        if ($hasUbuntu -and $null -ne $uCmd) {
            Start-Process "ubuntu" -ArgumentList "run", "bash", "-c", "$BashCommand"
        } else {
            if ($hasUbuntu) {
                Start-Process "wsl.exe" -ArgumentList "-d", "Ubuntu", "--", "bash", "-c", "$BashCommand"
            } else {
                Start-Process "wsl.exe" -ArgumentList "--", "bash", "-c", "$BashCommand"
            }
        }
    }
}

function Run-WSL {
    param(
        [string]$ScriptName,
        [string]$ArgsStr = ""
    )
    $WslRoot  = Get-WslRoot
    $FullArgs = if ($ArgsStr) { " $ArgsStr" } else { "" }
    $PathPrefix = if ($ScriptName -match "/") { "" } else { "backend/" }
    $BashCmd  = "cd '$WslRoot' && bash ./deployment/scripts/$PathPrefix$ScriptName$FullArgs; echo ''; echo ' Press Enter to close window...'; read -r"

    Open-UbuntuTerminal -BashCommand $BashCmd
    Start-Sleep -Milliseconds 100
}

function Run-Frontend {
    param(
        [string]$ScriptName,
        [string]$ArgsStr = ""
    )
    $scriptPath = "$ProjectRoot\deployment\scripts\frontend\$ScriptName"
    $FullArgs   = if ($ArgsStr) { " $ArgsStr" } else { "" }
    $PsCmd      = "Set-Location '$ProjectRoot'; & '$scriptPath'$FullArgs; Write-Host ''; Write-Host ' [DONE] Press any key to close...' -ForegroundColor DarkGray; `$null = [Console]::ReadKey(`$true)"

    Start-Process "powershell" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", $PsCmd
    Start-Sleep -Milliseconds 100
}

$LINE_FULL = "=========================================================================="
$LINE_THIN = "--------------------------------------------------------------------------"

function Show-Header {
    param([string]$SubTitle = "")
    Safe-Clear
    Write-Host " ╔══════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host " ║          EV CHARGING PLATFORM - SYSTEM MANAGER (v9.0)              ║" -ForegroundColor White -BackgroundColor DarkBlue
    Write-Host " ╚══════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    if ($SubTitle) {
        Write-Host "  [>] $SubTitle" -ForegroundColor Yellow
    }
    Write-Host ""
    Clear-KeyBuffer
}

function Write-MenuItem {
    param(
        [string]$Key   = "",
        [string]$Label = "",
        [ConsoleColor]$Color = [ConsoleColor]::White,
        [switch]$IsBack,
        [switch]$IsQuit
    )
    if ($IsBack) {
        Write-Host "  [0] Back" -ForegroundColor DarkCyan
    } elseif ($IsQuit) {
        Write-Host "  [Q] Quit" -ForegroundColor Red
    } else {
        Write-Host "  [$Key] " -NoNewline -ForegroundColor $Color
        Write-Host $Label -ForegroundColor White
    }
}

function Show-Separator {
    param([string]$Label = "")
    if ($Label) {
        Write-Host "  ─── $Label ───" -ForegroundColor DarkGray
    } else {
        Write-Host "  ────────────────────────────────────────────────────────────" -ForegroundColor DarkCyan
    }
}

function Sub-Start {
    while ($true) {
        Show-Header "START SYSTEM"
        Write-MenuItem "1" "Normal Start"     Green
        Write-MenuItem "2" "Rebuild + Start"  Yellow
        Write-MenuItem "3" "Start + Ngrok"    Cyan
        Write-MenuItem "4" "Rebuild + Ngrok"  Magenta
        Write-Host ""
        Show-Separator
        Write-MenuItem -IsBack
        Write-Host ""
        $c = Get-Key
        switch ($c) {
            "1" { Run-WSL "start.sh"; return }
            "2" { if (Confirm-Action "Rebuild all images?") { Run-WSL "start.sh" "--rebuild" }; return }
            "3" { Run-WSL "start.sh" "--ngrok"; return }
            "4" { if (Confirm-Action "Rebuild and start with Ngrok?") { Run-WSL "start.sh" "--rebuild --ngrok" }; return }
            "0" { return }
        }
    }
}

function Sub-Rebuild {
    while ($true) {
        Show-Header "REBUILD SERVICE IMAGES"
        Write-Host "  [!] Rebuilds Docker image and restarts the container." -ForegroundColor Yellow
        Write-Host ""
        Write-MenuItem "1" "IAM Service"                    Cyan
        Write-MenuItem "2" "EV Infrastructure Service"      Cyan
        Write-MenuItem "3" "Session Service"                Cyan
        Write-MenuItem "4" "Billing Service"                Cyan
        Write-MenuItem "5" "Analytics Service"              Cyan
        Write-MenuItem "6" "Notification Service"           Cyan
        Write-MenuItem "7" "Telemetry Ingestion Service"    Cyan
        Write-MenuItem "8" "OCPP Gateway Service"           Cyan
        Write-MenuItem "A" "Rebuild ALL Services"           Red
        Write-Host ""
        Show-Separator
        Write-MenuItem -IsBack
        Write-Host ""
        $c = Get-Key
        switch ($c) {
            "1" { Run-WSL "rebuild.sh" "iam-service"; return }
            "2" { Run-WSL "rebuild.sh" "ev-infrastructure-service"; return }
            "3" { Run-WSL "rebuild.sh" "session-service"; return }
            "4" { Run-WSL "rebuild.sh" "billing-service"; return }
            "5" { Run-WSL "rebuild.sh" "analytics-service"; return }
            "6" { Run-WSL "rebuild.sh" "notification-service"; return }
            "7" { Run-WSL "rebuild.sh" "telemetry-ingestion-service"; return }
            "8" { Run-WSL "rebuild.sh" "ocpp-gateway-service"; return }
            "a" { if (Confirm-Action "Rebuild ALL service images? This may take several minutes.") { Run-WSL "rebuild.sh" "all" }; return }
            "0" { return }
        }
    }
}

function Sub-Stop {
    while ($true) {
        Show-Header "STOP SYSTEM"
        Write-MenuItem "1" "Stop Services"    Yellow
        Write-MenuItem "2" "Clean Stop (Remove data)" Red
        Write-Host ""
        Show-Separator
        Write-MenuItem -IsBack
        Write-Host ""
        $c = Get-Key
        switch ($c) {
            "1" { Run-WSL "stop.sh"; return }
            "2" { if (Confirm-Action "Stop and DELETE all volumes?") { Run-WSL "stop.sh" "--clean" }; return }
            "0" { return }
        }
    }
}

function Sub-Reset {
    while ($true) {
        Show-Header "RESET PROJECT"
        Write-Host "  [!] Reset will delete all Containers, Images, and Volumes!" -ForegroundColor Red
        Write-Host ""
        Write-MenuItem "1" "Reset Now (Force)" Red
        Write-MenuItem "2" "Reset + Ngrok"     Red
        Write-Host ""
        Show-Separator
        Write-MenuItem -IsBack
        Write-Host ""
        $c = Get-Key
        switch ($c) {
            "1" { if (Confirm-Action "Reset project and delete all data?") { Run-WSL "reset.sh" "--force" }; return }
            "2" { if (Confirm-Action "Reset and restart with Ngrok?") { Run-WSL "reset.sh" "--force --ngrok" }; return }
            "0" { return }
        }
    }
}

function Sub-Logs {
    while ($true) {
        Show-Header "SYSTEM LOGS"
        Write-MenuItem "1" "All Services"     White
        Write-MenuItem "2" "Microservices"    Green
        Write-MenuItem "3" "Databases"        Yellow
        Write-MenuItem "4" "Infrastructure"   Magenta
        Write-MenuItem "5" "Select Service..." Cyan
        Write-MenuItem "6" "Ngrok Traffic Logs" DarkYellow
        Write-Host ""
        Show-Separator
        Write-MenuItem -IsBack
        Write-Host ""
        $c = Get-Key
        switch ($c) {
            "1" { Run-WSL "logs.sh"; return }
            "2" { Run-WSL "logs.sh" "--app"; return }
            "3" { Run-WSL "logs.sh" "--pg"; return }
            "4" { Run-WSL "logs.sh" "--infra"; return }
            "5" { Sub-Log-Service-Selector; return }
            "6" { 
                $logPath = "$ProjectRoot\deployment\ngrok.log"
                if (-not (Test-Path $logPath)) {
                    $null = New-Item -Path $logPath -ItemType File -Force
                }
                Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ProjectRoot'; Write-Host '=== NGROK REALTIME TRAFFIC LOGS ===' -ForegroundColor Yellow; Get-Content -Path '$logPath' -Wait -Tail 50"
                return 
            }
            "0" { return }
        }
    }
}

function Sub-Log-Service-Selector {
    $apps  = @(
        "iam-service", "analytics-service", "ev-infrastructure-service",
        "session-service", "billing-service", "notification-service",
        "telemetry-ingestion-service", "ocpp-gateway-service"
    )
    $dbs   = @(
        "postgres-iam", "postgres-infra", "postgres-session",
        "postgres-billing", "postgres-analytics", "postgres-notification"
    )
    $infra = @("redis", "rabbitmq", "clickhouse", "kong")

    Show-Header "SELECT SERVICE FOR LOGS"
    Show-Separator "MICROSERVICES (1-8)"
    for ($i = 0; $i -lt $apps.Length; $i++) {
        Write-Host ("  [{0,2}] {1}" -f ($i + 1), $apps[$i]) -ForegroundColor Green
    }
    Show-Separator "DATABASES (9-14)"
    for ($i = 0; $i -lt $dbs.Length; $i++) {
        Write-Host ("  [{0,2}] {1}" -f ($i + 9), $dbs[$i]) -ForegroundColor Yellow
    }
    Show-Separator "INFRASTRUCTURE (15-18)"
    for ($i = 0; $i -lt $infra.Length; $i++) {
        Write-Host ("  [{0,2}] {1}" -f ($i + 15), $infra[$i]) -ForegroundColor Magenta
    }
    Write-Host ""
    Show-Separator
    Write-MenuItem -IsBack
    Write-Host ""
    Write-Host "  [?] Select number (1-18): " -ForegroundColor White -NoNewline
    Clear-KeyBuffer

    $k1 = Get-Key
    if ($k1 -eq "0") { return }

    # Parse single or double-digit CLI menu inputs.
    $choiceStr = ""
    if ($k1 -match "^[1-9]$") {
        Write-Host $k1 -NoNewline -ForegroundColor Green
        if ($k1 -eq "1") {
            $k2 = Get-Key-Timeout -TimeoutMs 800
            if ($null -ne $k2 -and $k2 -match "^[0-8]$") {
                $choiceStr = "1$k2"
                Write-Host $k2 -ForegroundColor Green
            } else {
                $choiceStr = "1"
                Write-Host ""
            }
        } else {
            $choiceStr = $k1
            Write-Host ""
        }
    } else {
        Write-Host ""
        return
    }

    $idx    = [int]$choiceStr
    $target = ""
    if     ($idx -ge 1  -and $idx -le 8)  { $target = $apps[$idx - 1]   }
    elseif ($idx -ge 9  -and $idx -le 14) { $target = $dbs[$idx - 9]    }
    elseif ($idx -ge 15 -and $idx -le 18) { $target = $infra[$idx - 15] }

    if (-not $target) {
        Write-Host "  [!] Invalid choice." -ForegroundColor Red
        Start-Sleep -Milliseconds 800
        return
    }

    Show-Header "LOG: $target"
    Write-MenuItem "1" "Realtime (follow -f)"  Green
    Write-MenuItem "2" "Static  (no-follow)"   White
    Write-Host ""
    Show-Separator
    Write-MenuItem -IsBack
    Write-Host ""
    $m = Get-Key
    switch ($m) {
        "1" { Run-WSL "logs.sh" "--service $target" }
        "2" { Run-WSL "logs.sh" "--service $target --no-follow" }
    }
}

function Sub-Testing {
    while ($true) {
        Show-Header "TESTING SUITE (Backend — WSL)"
        Write-MenuItem "1" "tests.sh --all           Run all tests (unit + smoke)"    White
        Write-MenuItem "2" "tests.sh --unit          Run unit tests"                  Green
        Write-MenuItem "3" "tests.sh --smoke         Run integration smoke tests"     Yellow
        Write-MenuItem "4" "validate-rabbitmq.sh     Verify RabbitMQ queues & DLQ"    Magenta
        Write-MenuItem "5" "clickhouse-check.sh      Verify ClickHouse database"      Magenta
        Write-Host ""
        Show-Separator
        Write-MenuItem -IsBack
        Write-Host ""
        $c = Get-Key
        switch ($c) {
            "1" { Run-WSL "tests.sh" "--all";        return }
            "2" { Run-WSL "tests.sh" "--unit";       return }
            "3" { Run-WSL "tests.sh" "--smoke";      return }
            "4" { Run-WSL "validate-rabbitmq.sh";   return }
            "5" { Run-WSL "clickhouse-check.sh";    return }
            "0" { return }
        }
    }
}

function Sub-Seeding {
    while ($true) {
        Show-Header "DATABASE SEEDING ENGINE"
        Write-Host "  [!] Manage mock database records using UP/DOWN operations." -ForegroundColor Yellow
        Write-Host ""
        Write-MenuItem "1" "SEED UP (Insert seed data)" Green
        Write-MenuItem "2" "SEED DOWN (Clear seed data)" Red
        Write-MenuItem "3" "SEED RESET (Destroy & Re-seed with Ngrok)" Magenta
        Write-Host ""
        Show-Separator
        Write-MenuItem -IsBack
        Write-Host ""
        $c = Get-Key
        switch ($c) {
            "1" { Sub-Seeding-Up }
            "2" { Sub-Seeding-Down }
            "3" { 
                if (Confirm-Action "Truncate all tables and re-seed from scratch?") { 
                    Run-WSL "database/seed-reset.sh" 
                } 
            }
            "0" { return }
        }
    }
}

function Sub-Seeding-Up {
    while ($true) {
        Show-Header "DATABASE SEED UP MENU"
        Write-Host "  [+] Seed target database instance with default fixtures." -ForegroundColor Green
        Write-Host ""
        Write-MenuItem "1" "Seed UP All Databases" Green
        Write-MenuItem "2" "Seed UP IAM Service"            Green
        Write-MenuItem "3" "Seed UP EV Infrastructure Service"    Green
        Write-MenuItem "4" "Seed UP Billing Service"        Green
        Write-MenuItem "5" "Seed UP Session Service"   Green
        Write-MenuItem "6" "Seed UP Analytics Service"     Green
        Write-MenuItem "7" "Seed UP Notification Service"   Green
        Write-Host ""
        Show-Separator
        Write-MenuItem -IsBack
        Write-Host ""
        $c = Get-Key
        switch ($c) {
            "1" { Run-WSL "database/seed-up.sh"; return }
            "2" { Run-WSL "database/seed-up.sh" "iam-service"; return }
            "3" { Run-WSL "database/seed-up.sh" "ev-infrastructure-service"; return }
            "4" { Run-WSL "database/seed-up.sh" "billing-service"; return }
            "5" { Run-WSL "database/seed-up.sh" "session-service"; return }
            "6" { Run-WSL "database/seed-up.sh" "analytics-service"; return }
            "7" { Run-WSL "database/seed-up.sh" "notification-service"; return }
            "0" { return }
        }
    }
}

function Sub-Seeding-Down {
    while ($true) {
        Show-Header "DATABASE SEED DOWN MENU"
        Write-Host "  [!] WARNING: Truncates seeded database content." -ForegroundColor Red
        Write-Host ""
        Write-MenuItem "1" "Seed DOWN All Databases" Red
        Write-MenuItem "2" "Seed DOWN IAM Service"                          Red
        Write-MenuItem "3" "Seed DOWN EV Infrastructure Service"              Red
        Write-MenuItem "4" "Seed DOWN Billing Service"                      Red
        Write-MenuItem "5" "Seed DOWN Session Service"                      Red
        Write-MenuItem "6" "Seed DOWN Analytics Service"                      Red
        Write-MenuItem "7" "Seed DOWN Notification Service"                  Red
        Write-Host ""
        Show-Separator
        Write-MenuItem -IsBack
        Write-Host ""
        $c = Get-Key
        switch ($c) {
            "1" { if (Confirm-Action "Truncate all seeded data?") { Run-WSL "database/seed-down.sh" }; return }
            "2" { if (Confirm-Action "Truncate IAM seed data?") { Run-WSL "database/seed-down.sh" "iam-service" }; return }
            "3" { if (Confirm-Action "Truncate EV Infrastructure seed data?") { Run-WSL "database/seed-down.sh" "ev-infrastructure-service" }; return }
            "4" { if (Confirm-Action "Truncate Billing seed data?") { Run-WSL "database/seed-down.sh" "billing-service" }; return }
            "5" { if (Confirm-Action "Truncate Session seed data?") { Run-WSL "database/seed-down.sh" "session-service" }; return }
            "6" { if (Confirm-Action "Truncate Analytics seed data?") { Run-WSL "database/seed-down.sh" "analytics-service" }; return }
            "7" { if (Confirm-Action "Truncate Notification seed data?") { Run-WSL "database/seed-down.sh" "notification-service" }; return }
            "0" { return }
        }
    }
}

function Sub-Frontend-Mobile {
    while ($true) {
        Show-Header "MOBILE APP (Flutter)"
        Write-MenuItem "1" "Setup Environment" Green
        Write-MenuItem "2" "Run Dev Server"    Green
        Write-MenuItem "3" "Build Production"  Yellow
        Write-MenuItem "4" "Run Tests"         Yellow
        Write-Host ""
        Show-Separator
        Write-MenuItem -IsBack
        Write-Host ""
        $c = Get-Key
        switch ($c) {
            "1" { Run-Frontend "mobile-app\setup.ps1"; return }
            "2" { Run-Frontend "mobile-app\run.ps1"; return }
            "3" { Run-Frontend "mobile-app\build.ps1"; return }
            "4" { Run-Frontend "mobile-app\test.ps1"; return }
            "0" { return }
        }
    }
}

function Sub-Frontend-WebAdmin {
    while ($true) {
        Show-Header "WEB ADMIN (Next.js)"
        Write-MenuItem "1" "Setup (npm install)" Green
        Write-MenuItem "2" "Run Dev Server"      Green
        Write-MenuItem "3" "Build Production"    Yellow
        Write-Host ""
        Show-Separator
        Write-MenuItem -IsBack
        Write-Host ""
        $c = Get-Key
        switch ($c) {
            "1" { Run-Frontend "web-admin\setup.ps1"; return }
            "2" { Run-Frontend "web-admin\run.ps1"; return }
            "3" { Run-Frontend "web-admin\build.ps1"; return }
            "0" { return }
        }
    }
}

function Sub-Frontend-Kiosk {
    while ($true) {
        Show-Header "KIOSK APP (React/Vite)"
        Write-MenuItem "1" "Setup (npm install)" Green
        Write-MenuItem "2" "Run Dev Server"      Green
        Write-MenuItem "3" "Build Production"    Yellow
        Write-Host ""
        Show-Separator
        Write-MenuItem -IsBack
        Write-Host ""
        $c = Get-Key
        switch ($c) {
            "1" { Run-Frontend "kiosk\setup.ps1"; return }
            "2" { Run-Frontend "kiosk\run.ps1"; return }
            "3" { Run-Frontend "kiosk\build.ps1"; return }
            "0" { return }
        }
    }
}


function Write-TwoColumn-Row {
    param(
        [string]$Key1 = "", [string]$Label1 = "", [ConsoleColor]$Color1 = [ConsoleColor]::White,
        [string]$Key2 = "", [string]$Label2 = "", [ConsoleColor]$Color2 = [ConsoleColor]::White
    )
    Write-Host "  │  " -NoNewline -ForegroundColor Cyan
    if ($Key1) {
        Write-Host "[$Key1] " -NoNewline -ForegroundColor $Color1
        $len = 3 + $Key1.Length + $Label1.Length
        $pad = 26 - $len
        if ($pad -gt 0) {
            Write-Host $Label1 -NoNewline -ForegroundColor White
            Write-Host (" " * $pad) -NoNewline
        } else {
            Write-Host ($Label1.Substring(0, 26 - (3 + $Key1.Length))) -NoNewline -ForegroundColor White
        }
    } else {
        Write-Host (" " * 26) -NoNewline
    }
    
    Write-Host " │  " -NoNewline -ForegroundColor Cyan
    if ($Key2) {
        Write-Host "[$Key2] " -NoNewline -ForegroundColor $Color2
        $len = 3 + $Key2.Length + $Label2.Length
        $pad = 26 - $len
        if ($pad -gt 0) {
            Write-Host $Label2 -NoNewline -ForegroundColor White
            Write-Host (" " * $pad) -NoNewline
        } else {
            Write-Host ($Label2.Substring(0, 26 - (3 + $Key2.Length))) -NoNewline -ForegroundColor White
        }
    } else {
        Write-Host (" " * 26) -NoNewline
    }
    Write-Host " │" -ForegroundColor Cyan
}

function Show-MainMenu {
    Show-Header
    
    Write-Host "  ┌─────────────────────────────┬─────────────────────────────┐" -ForegroundColor Cyan
    Write-Host "  │        BACKEND (WSL)        │        FRONTENDS (UI)       │" -ForegroundColor Cyan
    Write-Host "  ├─────────────────────────────┼─────────────────────────────┤" -ForegroundColor Cyan
    
    Write-TwoColumn-Row -Key1 "1" -Label1 "Start System" -Color1 Green -Key2 "M" -Label2 "Mobile App (Flutter)" -Color2 Green
    Write-TwoColumn-Row -Key1 "2" -Label1 "Stop System" -Color1 Yellow -Key2 "W" -Label2 "Web Admin (Next.js)" -Color2 Green
    Write-TwoColumn-Row -Key1 "3" -Label1 "Reset Project" -Color1 Red -Key2 "K" -Label2 "Kiosk App (React)" -Color2 Green
    Write-TwoColumn-Row -Key1 "4" -Label1 "Health Check" -Color1 Magenta
    Write-TwoColumn-Row -Key1 "5" -Label1 "System Logs" -Color1 Cyan
    Write-TwoColumn-Row -Key1 "6" -Label1 "Testing Suite" -Color1 White
    Write-TwoColumn-Row -Key1 "7" -Label1 "Seed Databases" -Color1 Magenta
    Write-TwoColumn-Row -Key1 "8" -Label1 "Rebuild Service" -Color1 DarkYellow
    
    Write-Host "  └─────────────────────────────┴─────────────────────────────┘" -ForegroundColor Cyan
    
    Write-Host ""
    Show-Separator
    Write-MenuItem -IsQuit
    Write-Host ""
    Write-Host "  [?] Choice: " -NoNewline
}

try {
    while ($true) {
        Show-MainMenu
        $Choice = Get-Key

        if ($Choice -eq "0" -or $Choice -eq "q") { break }

        switch ($Choice) {
            "1" { Sub-Start }
            "2" { Sub-Stop }
            "3" { Sub-Reset }
            "4" { Run-WSL "health-check.sh" }
            "5" { Sub-Logs }
            "6" { Sub-Testing }
            "7" { Sub-Seeding }
            "8" { Sub-Rebuild }
            "m" { Sub-Frontend-Mobile }
            "w" { Sub-Frontend-WebAdmin }
            "ư" { Sub-Frontend-WebAdmin }
            "k" { Sub-Frontend-Kiosk }
        }
    }
}
finally {
    Set-Location $OriginalPath
    try { [Console]::Clear() } catch {}
    Write-Host "==========================================================================" -ForegroundColor Cyan
    Write-Host "  Manager session closed.                                               " -ForegroundColor Cyan -BackgroundColor DarkBlue
    Write-Host "==========================================================================" -ForegroundColor Cyan
    Write-Host ""
}
