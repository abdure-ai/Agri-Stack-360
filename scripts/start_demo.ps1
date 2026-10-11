# start_demo.ps1 - Start every service for the Agri-Stack 360 pitch demo, each in its own window.
#
#   powershell -ExecutionPolicy Bypass -File scripts\start_demo.ps1            # online (live Gemini, live weather)
#   powershell -ExecutionPolicy Bypass -File scripts\start_demo.ps1 -Offline   # no internet: recorded answers,
#                                                                              # cached weather/forecasts
#   ... -Reseed     reset the demo farmer (clears its diagnoses, alerts, chats) and re-seed the simulated outbreak and the DA inbox first
#
# Services: platform API :8000, forecast API :8001, data sync :8002, disease model :8003,
# local voice (TTS) :8004 when .venv-tts exists, web app :5173.
# Close the windows (or press Ctrl+C in each) to stop.

param(
    [switch]$Offline,
    [switch]$Reseed
)

$Root = Split-Path -Parent $PSScriptRoot
$Py = Join-Path $Root ".venv\Scripts\python.exe"
$PyDisease = Join-Path $Root ".venv-disease\Scripts\python.exe"

foreach ($exe in @($Py, $PyDisease)) {
    if (-not (Test-Path $exe)) { Write-Error "Missing $exe - set up the virtual environments first."; exit 1 }
}

# Stop anything already listening on the demo ports so the new windows can bind.
foreach ($port in 8000, 8001, 8002, 8003, 8004, 5173) {
    $owners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $owners) {
        Write-Host "Port $port is in use by process $procId - stopping it."
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
}

if ($Reseed) {
    & $Py (Join-Path $Root "scripts\seed_advisory_demo.py") --reset --outbreak --da-inbox --input-trust
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    # 40 demo farmers in 12 real woredas and activity in every portal (all labelled DEMO)
    & $Py (Join-Path $Root "scripts\seed_full_demo.py")
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$mode = if ($Offline) { "1" } else { "0" }
$env:ADVISORY_OFFLINE = $mode

function Start-DemoWindow($title, $command) {
    $full = "`$host.UI.RawUI.WindowTitle = '$title'; `$env:ADVISORY_OFFLINE = '$mode'; Set-Location '$Root'; $command"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $full | Out-Null
    Write-Host "Started $title"
}

Start-DemoWindow "NMIS disease model :8003" "& '$PyDisease' -m uvicorn serving.disease_api:app --host 127.0.0.1 --port 8003"
$PyTts = Join-Path $Root ".venv-tts\Scripts\python.exe"
if (Test-Path $PyTts) {
    Start-DemoWindow "NMIS local voice :8004" "& '$PyTts' -m uvicorn serving.tts_api:app --host 127.0.0.1 --port 8004"
} else {
    Write-Host "No .venv-tts: Afaan Oromoo audio (and offline audio) is not available. See requirements-tts.txt."
}
Start-DemoWindow "NMIS forecast API :8001" "& '$Py' -m uvicorn serving.predict_api:app --host 0.0.0.0 --port 8001"
Start-DemoWindow "NMIS data sync :8002" "& '$Py' -m uvicorn scraper.api:app --host 0.0.0.0 --port 8002"
Start-DemoWindow "NMIS platform API :8000" "& '$Py' -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"
Start-DemoWindow "NMIS web app :5173" "Set-Location frontend; npm run dev -- --host 0.0.0.0 --port 5173"
# Telegram bot: only when a token from @BotFather is set in .env (TELEGRAM_BOT_TOKEN=...).
$EnvFile = Join-Path $Root ".env"
if ((Test-Path $EnvFile) -and (Select-String -Path $EnvFile -Pattern '^\s*TELEGRAM_BOT_TOKEN\s*=\s*\S' -Quiet)) {
    Start-DemoWindow "NMIS Telegram bot" "& '$Py' -m backend.telegram_bot"
} else {
    Write-Host "No TELEGRAM_BOT_TOKEN in .env: the Telegram bot is not started."
}

Write-Host ""
if ($Offline) {
    Write-Host "OFFLINE MODE: the advisor replays recorded answers; ask the demo questions exactly as recorded."
} else {
    Write-Host "Online mode: live Gemini answers (recorded for later offline replay)."
}
$lan = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.PrefixOrigin -eq "Dhcp" -or $_.PrefixOrigin -eq "Manual" } | Where-Object { $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress
if ($lan) { Write-Host "On a phone (same Wi-Fi): http://$($lan):5173  (needs the 'Agri-Stack 360 (local network)' firewall rule)" }
Write-Host "Open http://localhost:5173 - farmer 0944000001 / demo1234, DA 0944000002 / demo1234, admin 0900000001 / admin123"
