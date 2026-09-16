# =============================================================================
# APLICAR A-12 (contraste / accesibilidad) - Paporla
# Ejecutar desde PowerShell 5.1 en C:\Users\nvarg\Desktop\Paporla
#   powershell -ExecutionPolicy Bypass -File .\aplicar_A12.ps1
#
# Este script SOLO toca clases de Tailwind en ficheros .tsx/.ts de src/,
# nunca dentro de src/__tests__/. Es idempotente: puedes ejecutarlo dos veces
# y la segunda no cambia nada.
#
# v2: corrige dos cosas de la v1
#   - el contador contaba dos veces algunas lineas (decia 33, son 24)
#   - respeta el BOM: dos ficheros del repo lo tienen y ReadAllText lo quita
# =============================================================================
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$src  = Join-Path $root 'src'

Write-Host "Proyecto: $root" -ForegroundColor Cyan

if (-not (Test-Path $src)) {
  Write-Host "ERROR: no encuentro $src . Ejecuta el script desde la carpeta del proyecto." -ForegroundColor Red
  exit 1
}

$archivos = Get-ChildItem -Path $src -Recurse -Include *.tsx,*.ts |
            Where-Object { $_.FullName -notmatch '[\\/]__tests__[\\/]' }

$totalArchivos = 0
$totalCambios  = 0

foreach ($f in $archivos) {
  # El BOM hay que leerlo aparte: ReadAllText lo quita sin avisar y eso
  # mancharia el diff con una linea que no tiene nada que ver.
  $bytes    = [System.IO.File]::ReadAllBytes($f.FullName)
  $tieneBom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
  $encoding = New-Object System.Text.UTF8Encoding($tieneBom)

  $texto    = [System.IO.File]::ReadAllText($f.FullName)
  $original = $texto

  # --- Regla 1: el botón primario declaraba el color a mano para cada tema.
  #     Ahora hay un token que sabe cual tocar segun el tema.
  $texto = $texto -replace 'bg-primary text-white dark:text-black', 'bg-primary text-on-primary'

  # --- Regla 2: en claro, "hover" sobre el primario debe OSCURECER, no aclarar.
  #     bg-primary-light (#059669) se acerca al limite; primary-dark (#065f46) no.
  $texto = $texto -replace 'hover:bg-primary-light', 'hover:bg-primary-dark'

  # --- Regla 3: texto negro o "dark" puesto a mano ENCIMA de un fondo primario.
  #     Se sustituye por el token. Solo en lineas que llevan bg-primary.
  $texto = [regex]::Replace(
    $texto,
    '(?m)^.*bg-primary.*$',
    {
      param($m)
      ($m.Value -replace '(?<![-\w])text-black(?![-\w])', 'text-on-primary' `
                 -replace '(?<![-\w])text-dark(?![-\w])',  'text-on-primary')
    }
  )

  # Contamos LINEAS que cambian, no sustituciones. Una misma linea puede
  # cumplir dos reglas a la vez (contar sustituciones daba 33 en vez de 24).
  # Contar lineas coincide exactamente con lo que luego muestra git diff.
  $n = 0
  if ($texto -ne $original) {
    $a = $original -split "`r?`n"
    $b = $texto    -split "`r?`n"
    for ($i = 0; $i -lt $a.Count; $i++) { if ($a[$i] -ne $b[$i]) { $n++ } }
  }

  if ($texto -ne $original) {
    [System.IO.File]::WriteAllText($f.FullName, $texto, $encoding)
    $rel = $f.FullName.Substring($root.Length + 1)
    Write-Host ("  {0,-62} {1} cambio(s)" -f $rel, $n) -ForegroundColor Yellow
    $totalArchivos++
    $totalCambios += $n
  }
}

Write-Host ""
Write-Host "Listo: $totalCambios cambio(s) en $totalArchivos archivo(s)." -ForegroundColor Green
Write-Host "Debe decir 24 cambio(s) en 20 archivo(s)." -ForegroundColor Green
Write-Host ""
Write-Host "Compruebalo tu mismo (debe decir 0 en los dos):" -ForegroundColor Cyan
Write-Host '  git diff --stat'
Write-Host '  Select-String -Path src\**\*.tsx -Pattern "bg-primary text-white dark:text-black" | Measure-Object'
