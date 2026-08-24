# Switches the site from a1exxx.github.io/regimen-vkusest/ to a custom domain.
#
#   powershell -ExecutionPolicy Bypass -File tools\switch-domain.ps1 -Domain regimen.cc
#
# RUN THIS ONLY AFTER the DNS records are live. Adding the CNAME file first makes
# GitHub Pages redirect the old github.io address to a domain that does not resolve
# yet, which takes the site down until DNS catches up. The script refuses to run
# until it can see the records itself.

param(
  [Parameter(Mandatory = $true)][string]$Domain,
  [switch]$Force                  # skip the DNS check (you are on your own)
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$expected = @('185.199.108.153', '185.199.109.153', '185.199.110.153', '185.199.111.153')

Write-Host "Target domain: $Domain" -ForegroundColor Cyan

# ── 1. verify DNS before changing anything ───────────────────────────────
if (-not $Force) {
  Write-Host "`nChecking A records via Cloudflare DNS-over-HTTPS..."
  try {
    $resp = Invoke-RestMethod -Uri "https://cloudflare-dns.com/dns-query?name=$Domain&type=A" `
                              -Headers @{ accept = 'application/dns-json' } -TimeoutSec 25
  } catch {
    throw "Could not reach the DNS resolver. Re-run with -Force only if you are certain DNS is set."
  }

  $got = @($resp.Answer | Where-Object { $_.type -eq 1 } | ForEach-Object { $_.data })
  if (-not $got) {
    throw "$Domain has no A records yet. Add them at the registrar, wait, then re-run.`n" +
          "Required: $($expected -join ', ')"
  }

  $missing = $expected | Where-Object { $_ -notin $got }
  Write-Host "  found: $($got -join ', ')"
  if ($missing) {
    throw "Missing A records: $($missing -join ', '). All four are required for apex Pages hosting."
  }
  Write-Host "  all four GitHub Pages A records present" -ForegroundColor Green
}

# ── 2. CNAME file: this is what tells Pages the domain is yours ──────────
$cnamePath = Join-Path $root 'CNAME'
Set-Content -Path $cnamePath -Value $Domain -NoNewline -Encoding ascii
Write-Host "`nWrote CNAME -> $Domain"

# ── 3. the three tags that hard-code the public origin ───────────────────
# Telegram, WhatsApp and Facebook ignore a relative og:image, so these cannot
# be made relative; they have to be rewritten whenever the origin changes.
$indexPath = Join-Path $root 'index.html'
$html = Get-Content $indexPath -Raw -Encoding utf8

$old = 'https://a1exxx.github.io/regimen-vkusest/'
$new = "https://$Domain/"
if ($html -notlike "*$old*") {
  Write-Host "  origin tags already point somewhere else, leaving them alone" -ForegroundColor Yellow
} else {
  $html = $html.Replace($old, $new)
  Set-Content -Path $indexPath -Value $html -NoNewline -Encoding utf8
  Write-Host "Rewrote canonical, og:url and og:image to $new"
}

# ── 4. ship it ───────────────────────────────────────────────────────────
Push-Location $root
try {
  git add -A
  git commit -m "Point the site at $Domain"
  git push origin main
  Write-Host "`nPushed." -ForegroundColor Green
} finally {
  Pop-Location
}

Write-Host @"

Two things left, both in the browser:

  1. github.com/A1exxx/regimen-vkusest/settings/pages
     Custom domain should already read $Domain from the CNAME file.
     Wait for the DNS check to go green (usually minutes, up to a few hours).

  2. On the same page, tick "Enforce HTTPS" once the certificate is issued.
     GitHub gets a free Let's Encrypt certificate and renews it itself.

Then check: https://$Domain/
"@ -ForegroundColor Cyan
