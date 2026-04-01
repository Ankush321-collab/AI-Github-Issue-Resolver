$ErrorActionPreference = "Stop"

# Simple local runner without Docker. Requires Redis running on localhost:6379.

if (-not (Get-Command redis-cli -ErrorAction SilentlyContinue)) {
  Write-Error "redis-cli not found. Install Redis and ensure redis-server is running."
  exit 1
}

try {
  redis-cli ping | Out-Null
} catch {
  Write-Error "Redis is not responding on localhost:6379. Start redis-server first."
  exit 1
}

$env:REDIS_HOST = "localhost"
$env:REDIS_PORT = "6379"
$env:ORCHESTRATOR_URL = "http://localhost:8000"
$env:NEXT_PUBLIC_GRAPHQL_URL = "http://localhost:4000/graphql"
$env:NEXT_PUBLIC_GRAPHQL_WS_URL = "ws://localhost:4000/graphql"

$jobs = @()

$jobs += Start-Process -FilePath "powershell" -ArgumentList "-NoProfile","-Command","Set-Location orchestrator; pip install -r requirements.txt; uvicorn main:app --reload --port 8000" -PassThru
$jobs += Start-Process -FilePath "powershell" -ArgumentList "-NoProfile","-Command","Set-Location gateway; npm install; $env:ORCHESTRATOR_URL=$env:ORCHESTRATOR_URL; $env:REDIS_HOST=$env:REDIS_HOST; $env:REDIS_PORT=$env:REDIS_PORT; npm run dev" -PassThru
$jobs += Start-Process -FilePath "powershell" -ArgumentList "-NoProfile","-Command","Set-Location frontend; npm install; $env:NEXT_PUBLIC_GRAPHQL_URL=$env:NEXT_PUBLIC_GRAPHQL_URL; $env:NEXT_PUBLIC_GRAPHQL_WS_URL=$env:NEXT_PUBLIC_GRAPHQL_WS_URL; npm run dev" -PassThru

Write-Host "Started services. Press Enter to stop."
[void][System.Console]::ReadLine()

foreach ($job in $jobs) {
  try { Stop-Process -Id $job.Id -Force } catch { }
}
