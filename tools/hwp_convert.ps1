# 한글(Hancom) 자동화로 HWP/HWPX 파일을 다른 형식(HWPX, PDF, HWP)으로 변환한다.
# 한 번 열어서 여러 형식으로 저장할 수 있다. 형식은 출력 파일 확장자로 정한다.
# 사용법: powershell -File tools\hwp_convert.ps1 -In "입력.hwp" -Out "출력.hwpx|출력.pdf"
# 시작한 한글 프로세스 번호를 "PID <번호>" 로 먼저 출력한다(멈췄을 때 호출한 쪽이 그 프로세스만 끌 수 있게).
param(
  [Parameter(Mandatory = $true)][string]$In,
  [Parameter(Mandatory = $true)][string[]]$Out,
  [string]$Format = ''
)
$ErrorActionPreference = 'Stop'
# -File 로 실행하면 배열이 한 문자열로 들어오므로 '|' 로 나눈다
$Out = @($Out | ForEach-Object { $_ -split '\|' } | Where-Object { $_ })
$before = @(Get-Process Hwp -ErrorAction SilentlyContinue | ForEach-Object Id)
$hwp = New-Object -ComObject HWPFrame.HwpObject
$mine = @(Get-Process Hwp -ErrorAction SilentlyContinue | Where-Object { $before -notcontains $_.Id } | ForEach-Object Id)
foreach ($id in $mine) { [Console]::Out.WriteLine("PID $id"); [Console]::Out.Flush() }
try {
  # 보안 승인 모듈이 등록되어 있으면 파일 접근 확인 창을 띄우지 않는다.
  try { [void]$hwp.RegisterModule('FilePathCheckDLL', 'FilePathCheckerModule') } catch {}
  $hwp.XHwpWindows.Item(0).Visible = $false
  if (-not $hwp.Open((Resolve-Path -LiteralPath $In).Path, '', 'forceopen:true')) { throw "열기 실패: $In" }
  foreach ($o in $Out) {
    $fmt = if ($Format) { $Format } else { ([System.IO.Path]::GetExtension($o)).TrimStart('.').ToUpper() }
    $full = [System.IO.Path]::GetFullPath($o)
    if (-not $hwp.SaveAs($full, $fmt, '')) { throw "저장 실패: $o" }
    Write-Output "OK $full"
  }
} finally {
  try { $hwp.Clear(1) } catch {}
  try { $hwp.Quit() } catch {}
}
