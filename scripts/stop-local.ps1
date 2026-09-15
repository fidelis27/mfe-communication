$ports = @(3333, 4173, 4174, 4175, 4176, 4178, 4179)

foreach ($port in $ports) {
  $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($listener in $listeners) {
    Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped port $port (PID $($listener.OwningProcess))"
  }
}
