# Regenerates assets/og.png (1200x630) from tools/og-source.html
# Run from the repo root:  powershell -ExecutionPolicy Bypass -File tools\build-og.ps1

$ErrorActionPreference = 'Stop'

$root   = Split-Path -Parent $PSScriptRoot
$src    = Join-Path $root 'tools\og-source.html'
$out    = Join-Path $root 'assets\og.png'

$chrome = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $chrome) { throw 'Chrome or Edge not found. Install one, or render og-source.html by hand.' }
if (-not (Test-Path $src)) { throw "Missing source: $src" }

& $chrome --headless --disable-gpu --hide-scrollbars `
  --force-device-scale-factor=1 --window-size=1200,630 `
  --virtual-time-budget=6000 `
  --screenshot="$out" "file:///$($src -replace '\\','/')"

if (Test-Path $out) {
  Write-Host "og.png written: $out"
} else {
  throw 'Render produced no file.'
}
