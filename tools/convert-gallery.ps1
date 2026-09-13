# Convert every .jpg in images/gallery to .webp (idempotent — skips existing).
# Requires ffmpeg on PATH (already installed on this machine).
# Run this after dropping new photos into images/gallery.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dir  = Join-Path $root "images\gallery"

$jpgs = Get-ChildItem -Path $dir -Filter *.jpg -File
Write-Host "Found $($jpgs.Count) .jpg files in $dir"

$converted = 0
$skipped = 0
foreach ($jpg in $jpgs) {
    $webp = [IO.Path]::ChangeExtension($jpg.FullName, ".webp")
    if (Test-Path $webp) { $skipped++; continue }
    # -q:v 82 keeps quality high while typically cutting size by 30-50%.
    & ffmpeg -hide_banner -loglevel error -i $jpg.FullName -c:v libwebp -q:v 82 -pix_fmt yuv420p $webp
    if ($LASTEXITCODE -eq 0) {
        $converted++
        Write-Host "  ✓ $($jpg.Name)"
    } else {
        Write-Warning "  ✗ $($jpg.Name) — ffmpeg exit $LASTEXITCODE"
    }
}

Write-Host ""
Write-Host "Converted: $converted   Skipped (already existed): $skipped"
