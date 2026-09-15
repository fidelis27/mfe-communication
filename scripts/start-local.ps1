$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$packages = Join-Path $root "modules/frontend/packages"

$env:PORT = if ($env:PORT) { $env:PORT } else { "3333" }
$env:DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "127.0.0.1" }
$env:DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "3306" }
$env:DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "test" }
$env:DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "root" }
$env:DB_PASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "" }
$env:DB_TLS = if ($env:DB_TLS) { $env:DB_TLS } else { "false" }

$services = @(
  @{ Name = "backend"; Path = (Join-Path $root "modules/backend"); Port = 3333 },
  @{ Name = "student"; Path = (Join-Path $packages "mfe-student"); Port = 4173 },
  @{ Name = "host"; Path = (Join-Path $packages "host"); Port = 4174 },
  @{ Name = "institution"; Path = (Join-Path $packages "mfe-institution"); Port = 4175 },
  @{ Name = "activity"; Path = (Join-Path $packages "mfe-activity"); Port = 4176 },
  @{ Name = "dashboard"; Path = (Join-Path $packages "mfe-dashboard"); Port = 4178 },
  @{ Name = "admin"; Path = (Join-Path $packages "mfe-admin"); Port = 4179 }
)

foreach ($service in $services) {
  $listener = Get-NetTCPConnection -LocalPort $service.Port -State Listen -ErrorAction SilentlyContinue
  if ($listener) {
    Write-Host "$($service.Name): port $($service.Port) already in use; skipping"
    continue
  }

  if ($service.Name -eq "backend") {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$($service.Path)'; go run ./cmd/server" | Out-Null
  } else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$($service.Path)'; npx vite preview --host 127.0.0.1 --port $($service.Port)" | Out-Null
  }
  Write-Host "Started $($service.Name) on port $($service.Port)"
}

Write-Host "Host: http://localhost:4174/"
Write-Host "Stop services with: .\scripts\stop-local.ps1"
