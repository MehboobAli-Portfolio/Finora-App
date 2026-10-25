# start.ps1 — Start the Finora development environment
# Double-click this file or run:  powershell -ExecutionPolicy Bypass -File start.ps1
#
# What this script does:
#   1. Starts the Django backend server  (required)
#   2. Starts the Expo frontend          (required)
#   3. Starts Celery worker + beat       (optional — only if Redis is reachable)

$BackendDir  = "$PSScriptRoot\finora-backend"
$FrontendDir = "$PSScriptRoot\Finora"

# ── Helper: check if Redis is reachable ──────────────────────────────────────
function Test-Redis {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect('127.0.0.1', 6379)
        $tcp.Close()
        return $true
    } catch {
        return $false
    }
}

# ── 1. Django backend ────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Starting Django backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList `
    "-NoExit", "-Command", `
    "cd '$BackendDir'; Write-Host 'Django Server' -ForegroundColor Green; python manage.py runserver 0.0.0.0:8000"

Start-Sleep -Seconds 2

# ── 2. Expo frontend ─────────────────────────────────────────────────────────
Write-Host "Starting Expo frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList `
    "-NoExit", "-Command", `
    "cd '$FrontendDir'; Write-Host 'Expo Dev Server' -ForegroundColor Green; npx expo start"

# ── 3. Celery (only if Redis is available) ───────────────────────────────────
if (Test-Redis) {
    Write-Host "Redis detected — starting Celery worker..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList `
        "-NoExit", "-Command", `
        "cd '$BackendDir'; Write-Host 'Celery Worker' -ForegroundColor Yellow; celery -A config.celery worker --loglevel=info"

    Start-Sleep -Seconds 1

    Write-Host "Starting Celery Beat scheduler..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList `
        "-NoExit", "-Command", `
        "cd '$BackendDir'; Write-Host 'Celery Beat' -ForegroundColor Yellow; celery -A config.celery beat --loglevel=info"
} else {
    Write-Host ""
    Write-Host "Redis not found — Celery skipped (app works fine without it)." -ForegroundColor DarkGray
    Write-Host "Market data will be cached in memory after the first request."  -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "All services started." -ForegroundColor Green
Write-Host ""
Write-Host "  Backend:  http://192.168.1.158:8000/api/"    -ForegroundColor White
Write-Host "  Admin:    http://127.0.0.1:8000/admin/"       -ForegroundColor White
Write-Host "  Frontend: scan the QR code in the Expo window" -ForegroundColor White
Write-Host ""
