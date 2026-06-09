Write-Host "Starting tunnel, please wait..." -ForegroundColor Yellow

$logFile = "$env:TEMP\cloudflared_tunnel.log"
if (Test-Path $logFile) { Remove-Item $logFile }

$proc = Start-Process -FilePath "C:\Users\happyelements\cloudflared.exe" `
    -ArgumentList "tunnel --url http://localhost:5173" `
    -RedirectStandardError $logFile `
    -WindowStyle Hidden -PassThru

$url = ""
$timeout = 30
$elapsed = 0

while ($elapsed -lt $timeout) {
    Start-Sleep -Seconds 1
    $elapsed++
    if (Test-Path $logFile) {
        $content = Get-Content $logFile -Raw -ErrorAction SilentlyContinue
        if ($content -match 'https://[a-z0-9\-]+\.trycloudflare\.com') {
            $url = $matches[0]
            break
        }
    }
}

if ($url) {
    Clear-Host
    Write-Host ""
    Write-Host "  ============================================" -ForegroundColor Cyan
    Write-Host "   Public link ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "   $url" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Share this with anyone - no WiFi needed!" -ForegroundColor Green
    Write-Host "  ============================================" -ForegroundColor Cyan
    Write-Host ""
    Set-Clipboard -Value $url
    Write-Host "  (Link copied to clipboard)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Press Ctrl+C to stop sharing." -ForegroundColor Gray
    Wait-Process -Id $proc.Id
} else {
    Write-Host "Could not get tunnel URL. Check if the library is running." -ForegroundColor Red
    pause
}
