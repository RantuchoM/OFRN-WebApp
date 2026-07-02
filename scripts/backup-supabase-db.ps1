# Backup diario de la base OFRN (pg_dump vía Supabase CLI) y subida opcional a Google Drive.
# Uso: Programador de tareas de Windows o ejecución manual.
#
# Variables de entorno requeridas:
#   SUPABASE_DB_PASSWORD  — Settings → Database → password
# Opcionales:
#   SUPABASE_PROJECT_REF  — default muxrbuivopnawnxlcjxq
#   SUPABASE_DB_REGION    — default aws-1-us-east-2
#   SUPABASE_URL          — para subir a Drive vía manage-drive
#   SUPABASE_SERVICE_ROLE_KEY
#   OFRN_BACKUP_DRIVE_FOLDER_ID — carpeta destino en Drive (crear y compartir con cuenta Archivo)
#   OFRN_BACKUP_LOCAL_DIR       — default .\backups\supabase
#
# Límite Drive (Edge Function): ~4 MB por archivo; si el dump es mayor, se guarda solo local + .gz

param(
  [switch]$SkipDrive
)

$ErrorActionPreference = "Stop"

$projectRef = if ($env:SUPABASE_PROJECT_REF) { $env:SUPABASE_PROJECT_REF } else { "muxrbuivopnawnxlcjxq" }
$region = if ($env:SUPABASE_DB_REGION) { $env:SUPABASE_DB_REGION } else { "aws-1-us-east-2" }
$localDir = if ($env:OFRN_BACKUP_LOCAL_DIR) { $env:OFRN_BACKUP_LOCAL_DIR } else { Join-Path $PSScriptRoot "..\backups\supabase" }
$driveFolderId = $env:OFRN_BACKUP_DRIVE_FOLDER_ID

if (-not $env:SUPABASE_DB_PASSWORD) {
  Write-Error "Falta SUPABASE_DB_PASSWORD (contraseña de Postgres del proyecto)."
}

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Write-Error "Instalá Supabase CLI: https://supabase.com/docs/guides/cli"
}

$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$sqlName = "ofrn-db-$stamp.sql"
$gzName = "$sqlName.gz"

New-Item -ItemType Directory -Force -Path $localDir | Out-Null
$sqlPath = Join-Path $localDir $sqlName
$gzPath = Join-Path $localDir $gzName

$encodedPass = [uri]::EscapeDataString($env:SUPABASE_DB_PASSWORD)
$dbUrl = "postgresql://postgres.${projectRef}:${encodedPass}@${region}.pooler.supabase.com:6543/postgres"

Write-Host "Volcando base $projectRef → $sqlPath"
& supabase db dump --db-url $dbUrl -f $sqlPath
if ($LASTEXITCODE -ne 0) { throw "supabase db dump falló (exit $LASTEXITCODE)" }

# Comprimir
$bytes = [IO.File]::ReadAllBytes($sqlPath)
$ms = New-Object IO.MemoryStream
$gzip = New-Object IO.Compression.GZipStream($ms, [IO.Compression.CompressionLevel]::Optimal)
$gzip.Write($bytes, 0, $bytes.Length)
$gzip.Close()
[IO.File]::WriteAllBytes($gzPath, $ms.ToArray())
$gzSizeMb = ([IO.File]::GetLength($gzPath) / 1MB)
Write-Host "Comprimido: $gzPath ($([math]::Round($gzSizeMb, 2)) MB)"

# Retener últimos 14 días localmente
Get-ChildItem $localDir -Filter "ofrn-db-*.sql.gz" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip 14 |
  ForEach-Object { Remove-Item $_.FullName -Force }

if ($SkipDrive -or -not $driveFolderId) {
  if (-not $driveFolderId) { Write-Host "OFRN_BACKUP_DRIVE_FOLDER_ID no definido: backup solo local." }
  exit 0
}

if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_SERVICE_ROLE_KEY) {
  Write-Warning "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY: no se sube a Drive."
  exit 0
}

$maxDriveMb = 4
if ($gzSizeMb -gt $maxDriveMb) {
  Write-Warning "El .gz supera ${maxDriveMb} MB; Drive vía Edge Function no admite este tamaño. Backup guardado en $gzPath"
  exit 0
}

$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($gzPath))
$body = @{
  action     = "upload_file"
  fileName   = $gzName
  fileBase64 = $b64
  mimeType   = "application/gzip"
  parentId   = $driveFolderId
} | ConvertTo-Json -Depth 3

$headers = @{
  Authorization = "Bearer $($env:SUPABASE_SERVICE_ROLE_KEY)"
  apikey        = $env:SUPABASE_SERVICE_ROLE_KEY
  "Content-Type" = "application/json"
}

$uri = "$($env:SUPABASE_URL.TrimEnd('/'))/functions/v1/manage-drive"
Write-Host "Subiendo a Drive..."
$response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $body
if ($response.error) { throw $response.error }
Write-Host "Subido a Drive: $($response.webViewLink)"
