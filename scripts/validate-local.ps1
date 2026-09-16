$ErrorActionPreference = "Stop"

$apiBase = if ($env:API_BASE_URL) { $env:API_BASE_URL } else { "http://localhost:3333" }
$demoUser = if ($env:DEMO_USER) { $env:DEMO_USER } else { "demo-active" }
$origin = if ($env:CHECK_ORIGIN) { $env:CHECK_ORIGIN } else { "http://localhost:4174" }

function Assert-Equal([int] $actual, [int] $expected, [string] $check) {
  if ($actual -ne $expected) {
    throw "${check}: expected HTTP $expected, got HTTP $actual"
  }
  Write-Host "PASS $check ($actual)"
}

function Get-Status([string] $uri, [hashtable] $headers = @{}, [string] $method = "GET") {
  try {
    return (Invoke-WebRequest -Uri $uri -Headers $headers -Method $method -UseBasicParsing -ErrorAction Stop).StatusCode
  } catch {
    if ($_.Exception.Response) {
      return [int]$_.Exception.Response.StatusCode
    }
    throw "Could not reach ${uri}: $($_.Exception.Message)"
  }
}

Assert-Equal (Get-Status "$apiBase/health") 200 "backend health"
Assert-Equal (Get-Status "$apiBase/institutions") 401 "protected API without identity"
Assert-Equal (Get-Status "$apiBase/metrics" @{ "x-demo-user" = $demoUser }) 200 "authenticated metrics"

$corsHeaders = @{
  Origin = $origin
  "Access-Control-Request-Method" = "GET"
}
Assert-Equal (Get-Status "$apiBase/students" $corsHeaders "OPTIONS") 204 "CORS preflight"

$remoteEntries = @{
  student = 4173
  host = 4174
  institution = 4175
  activity = 4176
  dashboard = 4178
  admin = 4179
}
foreach ($remote in $remoteEntries.GetEnumerator()) {
  Assert-Equal (Get-Status "http://localhost:$($remote.Value)/assets/remoteEntry.js") 200 "$($remote.Key) remoteEntry"
}

$socket = [System.Net.WebSockets.ClientWebSocket]::new()
$socketUri = [Uri](($apiBase -replace '^http', 'ws') + "/events?demoUser=$demoUser")
try {
  $socket.ConnectAsync($socketUri, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
  if ($socket.State -ne [System.Net.WebSockets.WebSocketState]::Open) {
    throw "WebSocket did not reach Open state"
  }
  Write-Host "PASS backend WebSocket (Open)"
} finally {
  if ($socket.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
    try {
      $socket.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "validation", [Threading.CancellationToken]::None).GetAwaiter().GetResult()
    } catch {
      Write-Host "WebSocket close cleanup skipped: $($_.Exception.Message)"
    }
  }
  $socket.Dispose()
}

Write-Host "Local validation completed successfully."
