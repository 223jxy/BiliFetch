param(
  [Parameter(Mandatory = $true)]
  [string]$SiteUrl
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ScriptPath = Join-Path $Root "scriptcat\BiliFetch-ScriptCat.user.js"
$ScriptZipPath = Join-Path $Root "downloads\BiliFetch-ScriptCat.zip"
$SoftwareZipPath = Join-Path $Root "downloads\BiliFetch-Beginner.zip"
$LegacyScriptZipPath = Join-Path $Root "downloads\BiliFetch-脚本猫版.zip"
$LegacySoftwareZipPath = Join-Path $Root "downloads\BiliFetch-小白软件版.zip"

if (!(Test-Path -LiteralPath $ScriptPath)) {
  throw "Cannot find script: $ScriptPath"
}

$site = $SiteUrl.Trim()
if ($site -notmatch '^https?://') {
  throw "Website URL must start with http:// or https://"
}
if (!$site.EndsWith("/")) {
  $site += "/"
}

$downloadUrl = $site + "scriptcat/BiliFetch-ScriptCat.user.js"

function Set-MetaLine {
  param(
    [string]$Text,
    [string]$Name,
    [string]$Value
  )
  $line = ("// @$Name").PadRight(16) + $Value
  if ($Text -match "(?m)^// @$Name\s+.+$") {
    return ($Text -replace "(?m)^// @$Name\s+.+$", $line)
  }
  return ($Text -replace "(?m)^// @supportURL\s+.+$", ("// @supportURL".PadRight(16) + $site + "`r`n" + $line))
}

function Update-ScriptMeta {
  param([string]$Path)
  if (!(Test-Path -LiteralPath $Path)) {
    return
  }
  $text = Get-Content -LiteralPath $Path -Encoding UTF8 -Raw
  $text = Set-MetaLine $text "homepageURL" $site
  $text = Set-MetaLine $text "supportURL" $site
  $text = Set-MetaLine $text "downloadURL" $downloadUrl
  $text = Set-MetaLine $text "updateURL" $downloadUrl
  Set-Content -LiteralPath $Path -Encoding UTF8 -Value $text
}

Update-ScriptMeta $ScriptPath

if (Test-Path -LiteralPath $ScriptZipPath) {
  Compress-Archive -LiteralPath $ScriptPath -DestinationPath $ScriptZipPath -Force
}
if (Test-Path -LiteralPath $LegacyScriptZipPath) {
  Compress-Archive -LiteralPath $ScriptPath -DestinationPath $LegacyScriptZipPath -Force
}

if (Test-Path -LiteralPath $SoftwareZipPath) {
  $temp = Join-Path $Root ("_site-link-temp-" + [Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $temp -Force | Out-Null
  try {
    Expand-Archive -LiteralPath $SoftwareZipPath -DestinationPath $temp -Force
    $innerScript = Join-Path $temp "ScriptCat\BiliFetch-ScriptCat.user.js"
    if (Test-Path -LiteralPath $innerScript) {
      Update-ScriptMeta $innerScript
      Compress-Archive -Path (Join-Path $temp "*") -DestinationPath $SoftwareZipPath -Force
    }
  } finally {
    Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
  }
}
if (Test-Path -LiteralPath $LegacySoftwareZipPath) {
  Copy-Item -LiteralPath $SoftwareZipPath -Destination $LegacySoftwareZipPath -Force
}

Write-Host "Done."
Write-Host "homepageURL: $site"
Write-Host "script URL: $downloadUrl"
Write-Host ""
Write-Host "Updated:"
Write-Host "- scriptcat\BiliFetch-ScriptCat.user.js"
Write-Host "- ScriptCat zip in downloads folder"
Write-Host "- Beginner software zip in downloads folder"
Write-Host ""
Write-Host "Next step: upload scriptcat\BiliFetch-ScriptCat.user.js to ScriptCat again."
