# 수원가게사진/가게사진/번호_이름/*.jpg + 사진목록.csv → public/shops/번호/n.jpg(긴 변 720) + s{n}.jpg(긴 변 320) + src/data/shopPhotos.json
param([string]$Src, [string]$OutDir, [string]$Json)
Add-Type -AssemblyName System.Drawing
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
function Save-Jpeg($bmp, $path, [long]$q) {
  $ep = New-Object System.Drawing.Imaging.EncoderParameters 1
  $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), $q
  $bmp.Save($path, $codec, $ep)
  $ep.Dispose()
}
function Resize-To($img, [int]$max) {
  $w = $img.Width; $h = $img.Height
  $k = [Math]::Min(1.0, $max / [double][Math]::Max($w, $h))
  $nw = [int][Math]::Round($w * $k); $nh = [int][Math]::Round($h * $k)
  $bmp = New-Object System.Drawing.Bitmap $nw, $nh
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::White)
  $g.DrawImage($img, 0, 0, $nw, $nh)
  $g.Dispose()
  return $bmp
}
# 손님 얼굴이 그대로 나온 사진(사진 케이크·사진 토퍼)은 올리지 않는다 (가게번호-사진번호)
$skip = @('9-9', '14-9', '49-8', '52-10')
$data = [ordered]@{}
$bad = @()
$dirs = Get-ChildItem $Src -Directory | Sort-Object { [int]($_.Name -replace '_.*$', '') }
foreach ($d in $dirs) {
  $no = [int]($d.Name -replace '_.*$', '')
  $name = $d.Name -replace '^\d+_', ''
  $csv = Get-ChildItem $d.FullName -Filter *.csv | Select-Object -First 1
  if (-not $csv) { $bad += "$($d.Name): csv 없음"; continue }
  $rows = Import-Csv $csv.FullName -Encoding UTF8
  $od = Join-Path $OutDir $no
  New-Item -ItemType Directory -Force $od | Out-Null
  $list = @()
  foreach ($r in $rows) {
    $n = [int]$r.'번호'
    if ($skip -contains "$no-$n") { continue }
    if (-not $r.'파일명') { continue } # '못 찾음' (사진 없음)
    $file = Join-Path $d.FullName $r.'파일명'
    if (-not (Test-Path -LiteralPath $file)) { $bad += "$($d.Name): 파일 없음 $($r.'파일명')"; continue }
    try {
      $img = [System.Drawing.Image]::FromFile($file)
      # 휴대폰 사진 방향(EXIF) 바로잡기
      if ($img.PropertyIdList -contains 0x0112) {
        $o = $img.GetPropertyItem(0x0112).Value[0]
        if ($o -eq 3) { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
        elseif ($o -eq 6) { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
        elseif ($o -eq 8) { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
      }
      $big = Resize-To $img 720
      Save-Jpeg $big (Join-Path $od "$n.jpg") 72
      $small = Resize-To $img 320
      Save-Jpeg $small (Join-Path $od "s$n.jpg") 70
      $list += [ordered]@{ n = $n; k = $r.'사진 종류'; src = $r.'출처 URL'; w = $big.Width; h = $big.Height }
      $big.Dispose(); $small.Dispose(); $img.Dispose()
    } catch { $bad += "$($d.Name): 읽기 실패 $($r.'파일명') $($_.Exception.Message)" }
  }
  $data["$no"] = [ordered]@{ name = $name; photos = $list }
  Write-Host ("{0} {1}: {2}장" -f $no, $name, $list.Count)
}
$jsonText = $data | ConvertTo-Json -Depth 6 -Compress
[System.IO.File]::WriteAllText($Json, $jsonText, (New-Object System.Text.UTF8Encoding $false))
Write-Host "문제: $($bad.Count)"
$bad | ForEach-Object { Write-Host $_ }
