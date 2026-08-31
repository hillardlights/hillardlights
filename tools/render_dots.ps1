param(
    [Parameter(Mandatory=$true)][string]$Image,
    [Parameter(Mandatory=$true)][string]$DotsPath,
    [Parameter(Mandatory=$true)][string]$Out
)
Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Image]::FromFile($Image)
$bmp = New-Object System.Drawing.Bitmap $img
$g   = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = "AntiAlias"
$w = $bmp.Width
$h = $bmp.Height

$categoryColors = @{
    "Moving Head"       = [System.Drawing.Color]::FromArgb(255,  92, 224, 165)
    "DMX Flood"         = [System.Drawing.Color]::FromArgb(255, 255, 143,  58)
    "Flood"             = [System.Drawing.Color]::FromArgb(255, 242, 140,  58)
    "Roof Flood"        = [System.Drawing.Color]::FromArgb(255, 255, 179,  71)
    "Roofline Pixels"   = [System.Drawing.Color]::FromArgb(255, 200, 168, 255)
    "Ghost"             = [System.Drawing.Color]::FromArgb(255, 232, 236, 255)
    "Flying Bat"        = [System.Drawing.Color]::FromArgb(255, 143,  92, 255)
    "Bat (Tree)"        = [System.Drawing.Color]::FromArgb(255, 106,  59, 214)
    "Spider"            = [System.Drawing.Color]::FromArgb(255, 255,  77,  90)
    "Spider Web"        = [System.Drawing.Color]::FromArgb(255, 192, 200, 224)
    "Tombstone"         = [System.Drawing.Color]::FromArgb(255, 154, 160, 184)
    "Singing Pumpkin"   = [System.Drawing.Color]::FromArgb(255, 255, 107,  26)
    "Pumpkin Arch"      = [System.Drawing.Color]::FromArgb(255, 255, 143,  58)
    "Gate Matrix"       = [System.Drawing.Color]::FromArgb(255,  92, 212, 255)
    "Gothic Arch"       = [System.Drawing.Color]::FromArgb(255, 200, 168, 255)
    "Gothic Bush"       = [System.Drawing.Color]::FromArgb(255, 124, 212, 143)
    "Fence"             = [System.Drawing.Color]::FromArgb(255, 232, 200,  96)
    "Fence Extension"   = [System.Drawing.Color]::FromArgb(255, 232, 200,  96)
    "Garage"            = [System.Drawing.Color]::FromArgb(255, 168, 176, 200)
    "Garage Matrix"     = [System.Drawing.Color]::FromArgb(255,  92, 212, 255)
    "Window Matrix"     = [System.Drawing.Color]::FromArgb(255, 255, 217, 122)
    "Matrix Column"     = [System.Drawing.Color]::FromArgb(255, 255,  92, 241)
    "Headless Horseman" = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)
    "Lamppost"          = [System.Drawing.Color]::FromArgb(255, 255, 217, 122)
    "Cactus"            = [System.Drawing.Color]::FromArgb(255, 124, 212, 143)
    "Spooky Tree"       = [System.Drawing.Color]::FromArgb(255, 200, 168, 255)
    "Steampunk Spinner" = [System.Drawing.Color]::FromArgb(255, 255, 192,  42)
    "Philips Hue"       = [System.Drawing.Color]::FromArgb(255, 160, 107, 255)
    "Other"             = [System.Drawing.Color]::FromArgb(255, 255, 107,  26)
}

$dotItems = New-Object System.Collections.ArrayList
$parsed = [System.IO.File]::ReadAllText($DotsPath) | ConvertFrom-Json
foreach ($p in $parsed) { $null = $dotItems.Add($p) }
$font = New-Object System.Drawing.Font "Arial", 9, ([System.Drawing.FontStyle]::Bold)
$labelBg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(210, 0, 0, 0))
$labelFg = [System.Drawing.Brushes]::White

Write-Host "loaded $($dotItems.Count) dots; image $w x $h"
$drawn = 0
for ($i = 0; $i -lt $dotItems.Count; $i++) {
    $d = $dotItems[$i]
    try {
    $cat = if ($d.cat) { [string]$d.cat } else { "Other" }
    if ($categoryColors.ContainsKey($cat)) {
        $col = $categoryColors[$cat]
    } else {
        $col = $categoryColors["Other"]
    }
    $x = [double]$d.pctX / 100.0 * $w
    $y = [double]$d.pctY / 100.0 * $h

    # Outer glow for visibility on dark image
    $glow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(90, $col.R, $col.G, $col.B))
    $g.FillEllipse($glow, ($x - 24), ($y - 24), 48, 48)
    $glow.Dispose()

    $r = if ($d.aggregated) { 12 } else { 8 }
    $fill = New-Object System.Drawing.SolidBrush $col
    $g.FillEllipse($fill, ($x - $r), ($y - $r), (2 * $r), (2 * $r))
    $fill.Dispose()
    $stroke = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 2
    $g.DrawEllipse($stroke, ($x - $r), ($y - $r), (2 * $r), (2 * $r))
    $stroke.Dispose()

    $label = "$($d.label)"
    if ($d.count -gt 1) { $label += " ($($d.count))" }
    $sz = $g.MeasureString($label, $font)
    $tx = $x + $r + 6
    $ty = $y - 8
    $g.FillRectangle($labelBg, ($tx - 3), ($ty - 1), ($sz.Width + 6), 14)
    $g.DrawString($label, $font, $labelFg, $tx, $ty)
    $drawn++
    } catch {
        Write-Host "ERR at dot $i ($($d.key)): $_"
    }
}
Write-Host "drew $drawn dots"

$g.Dispose()
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
$img.Dispose()

Write-Host "Wrote $Out"
