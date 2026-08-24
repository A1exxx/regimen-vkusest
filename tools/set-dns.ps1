# Points regimen.cc (and www / panel / wa) at the Contabo box via the Porkbun API.
#
#   powershell -ExecutionPolicy Bypass -File tools\set-dns.ps1 `
#       -ApiKey  pk1_xxxxxxxx `
#       -SecretKey sk1_xxxxxxxx
#
# Why the API and not the web panel: the panel's DNS table renders rows
# client-side and, in this account, silently discarded every write -- records
# appeared in the table, vanished on reload, and never reached the
# nameservers. The API returns an explicit status per call, so a success here
# means the zone actually changed.
#
# Get the two keys at  https://porkbun.com/account/api
# and switch "API ACCESS" ON for regimen.cc in the domain list first,
# otherwise every call returns "Domain is not opted in to api access".

param(
  [Parameter(Mandatory=$true)][string]$ApiKey,
  [Parameter(Mandatory=$true)][string]$SecretKey,
  [string]$Domain = 'regimen.cc',
  [string]$Target = '84.247.148.135'
)

$ErrorActionPreference = 'Stop'
$base = 'https://api.porkbun.com/api/json/v3'
$auth = @{ apikey = $ApiKey; secretapikey = $SecretKey }

function Invoke-Porkbun($path, $extra = @{}) {
  $body = $auth.Clone()
  $extra.GetEnumerator() | ForEach-Object { $body[$_.Key] = $_.Value }
  Invoke-RestMethod -Uri "$base/$path" -Method Post -ContentType 'application/json' `
                    -Body ($body | ConvertTo-Json) -TimeoutSec 45
}

Write-Host "Checking credentials..." -ForegroundColor Cyan
$ping = Invoke-Porkbun 'ping'
if ($ping.status -ne 'SUCCESS') { throw "Auth failed: $($ping.message)" }
Write-Host "  ok, your IP is $($ping.yourIp)" -ForegroundColor Green

Write-Host "`nExisting records for $Domain :"
$existing = Invoke-Porkbun "dns/retrieve/$Domain"
if ($existing.status -ne 'SUCCESS') { throw "Retrieve failed: $($existing.message)" }
if ($existing.records.Count -eq 0) { Write-Host "  (none)" }
$existing.records | ForEach-Object { Write-Host ("  {0,-6} {1,-28} {2}" -f $_.type, $_.name, $_.content) }

# Only touch the four names we own here. Anything else in the zone is left alone.
$wanted = @(
  @{ name = '';      label = $Domain },
  @{ name = 'www';   label = "www.$Domain" },
  @{ name = 'panel'; label = "panel.$Domain" },
  @{ name = 'wa';    label = "wa.$Domain" }
)

Write-Host "`nApplying A records -> $Target"
foreach ($w in $wanted) {
  # delete only an A record with exactly this name, so re-running is safe
  $stale = $existing.records | Where-Object { $_.type -eq 'A' -and $_.name -eq $w.label }
  foreach ($s in $stale) {
    Invoke-Porkbun "dns/delete/$Domain/$($s.id)" | Out-Null
    Write-Host ("  removed old A {0} -> {1}" -f $s.name, $s.content) -ForegroundColor DarkGray
  }
  $r = Invoke-Porkbun "dns/create/$Domain" @{ name = $w.name; type = 'A'; content = $Target; ttl = '600' }
  if ($r.status -eq 'SUCCESS') { Write-Host ("  {0,-28} created" -f $w.label) -ForegroundColor Green }
  else { Write-Host ("  {0,-28} FAILED: {1}" -f $w.label, $r.message) -ForegroundColor Red }
}

Write-Host "`nRe-reading the zone to confirm:"
$after = Invoke-Porkbun "dns/retrieve/$Domain"
$after.records | Where-Object { $_.type -eq 'A' } |
  ForEach-Object { Write-Host ("  {0,-28} {1}" -f $_.name, $_.content) }

Write-Host "`nNow waiting for the nameservers to serve them..." -ForegroundColor Cyan
$names = $wanted | ForEach-Object { $_.label }
for ($i = 1; $i -le 20; $i++) {
  $good = 0
  foreach ($n in $names) {
    try {
      $ans = (Invoke-RestMethod "https://cloudflare-dns.com/dns-query?name=$n&type=A" `
              -Headers @{ accept = 'application/dns-json' } -TimeoutSec 20).Answer
      if ($ans -and ($ans | Where-Object { $_.data -eq $Target })) { $good++ }
    } catch {}
  }
  Write-Host "  $good/4 resolving to $Target"
  if ($good -eq 4) { break }
  Start-Sleep -Seconds 15
}

Write-Host @"

If all four resolve, the last step is the certificates. On the server:

  ssh root@84.247.148.135
  certbot --nginx -d regimen.cc -d www.regimen.cc -d panel.regimen.cc -d wa.regimen.cc \
          --agree-tos -m alexandr.egorov1199@gmail.com --redirect

nginx is already configured and the site is already deployed, so that is all
that remains.
"@ -ForegroundColor Cyan
