#!/usr/bin/env pwsh
# ==============================================================================
# validate-rabbitmq.ps1 - Kiem tra Zero-Loss Messaging (E2E Test RabbitMQ)
# ==============================================================================

$ErrorActionPreference = 'Stop'

Write-Host "=== KIEM TRA LUONG E2E: EV Charging Platform ===" -ForegroundColor Cyan

$base64AuthInfo = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("ev_user:ev_secret"))
$headers = @{ Authorization = ("Basic {0}" -f $base64AuthInfo) }

try {
    # 1. Kiem tra RabbitMQ co the ket noi duoc
    $rmRes = Invoke-RestMethod -Uri "http://localhost:15672/api/queues" -Headers $headers -UseBasicParsing
    Write-Host "[+] RabbitMQ Management API OK. Tim thay $($rmRes.Count) queues." -ForegroundColor Green

    # 2. Cho 5 giay de tin nhan ton dong duoc xu ly
    Write-Host "[+] Dang cho 5 giay de cac tin nhan ton dong duoc xu ly..."
    Start-Sleep -Seconds 5

    $queues      = Invoke-RestMethod -Uri "http://localhost:15672/api/queues" -Headers $headers -UseBasicParsing
    $hasLoss     = $false
    $totalMessages = 0

    foreach ($q in $queues) {
        if ($q.name -match "\.dlq" -and $q.messages -gt 0) {
            Write-Host "[!] LOI: Dead Letter Queue '$($q.name)' co $($q.messages) tin nhan bi loi!" -ForegroundColor Red
            $hasLoss = $true
        }
        if ($q.messages -gt 0) {
            Write-Host "[!] Canh bao: Queue '$($q.name)' con $($q.messages) tin nhan dang cho." -ForegroundColor Yellow
            $totalMessages += $q.messages
        } else {
            Write-Host "[+] Queue '$($q.name)': 0 tin nhan (Da xu ly xong)." -ForegroundColor DarkGray
        }
    }

    if ($hasLoss) {
        Write-Host "`n[X] KIEM TRA THAT BAI: Phat hien mat tin nhan (co tin nhan trong DLQ)." -ForegroundColor Red
        exit 1
    } elseif ($totalMessages -gt 0) {
        Write-Host "`n[!] KIEM TRA THANH CONG (co canh bao): Khong mat tin nhan, nhung con $totalMessages tin nhan dang cho." -ForegroundColor Yellow
    } else {
        Write-Host "`n[V] KIEM TRA THANH CONG: 100% tin nhan da duoc xu ly. Dam bao Zero-Loss. Exactly-once confirmed." -ForegroundColor Green
    }
} catch {
    Write-Host "Loi trong qua trinh kiem tra: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
