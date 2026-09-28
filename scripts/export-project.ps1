$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$exportRoot = Join-Path $projectRoot 'output'
New-Item -ItemType Directory -Force -Path $exportRoot | Out-Null
$stage = Join-Path ([IO.Path]::GetTempPath()) ('escriban-ia-export-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
$excludedDirs = @('.git','node_modules','.next','.vinext','.wrangler','.sites-runtime','dist','out','output','outputs','tmp','work','coverage','.agents','.codex','.vercel')
$excludedFiles = @('EXPORT-MANIFEST.json','.DS_Store')
function Copy-SourceTree([string]$source, [string]$destination) {
  foreach ($item in Get-ChildItem -LiteralPath $source -Force) {
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Revisar enlace antes de exportar: $($item.FullName)" }
    if ($item.PSIsContainer) {
      if ($item.Name -in $excludedDirs) { continue }
      $target = Join-Path $destination $item.Name
      New-Item -ItemType Directory -Force -Path $target | Out-Null
      Copy-SourceTree $item.FullName $target
    } else {
      if ($item.Name -in $excludedFiles -or $item.Name -like '.env*' -or $item.Name -like '.dev.vars*' -or $item.Name -match '\.(pem|key|pfx|tsbuildinfo|log)$') { continue }
      Copy-Item -LiteralPath $item.FullName -Destination (Join-Path $destination $item.Name)
    }
  }
}
Copy-SourceTree $projectRoot $stage
$entries = @(Get-ChildItem -LiteralPath $stage -File -Recurse -Force | Sort-Object FullName | ForEach-Object {
  [ordered]@{ path=$_.FullName.Substring($stage.Length+1).Replace('\','/'); bytes=$_.Length; sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
})
$manifest = [ordered]@{ project='Escriban-IA'; createdUtc=[DateTime]::UtcNow.ToString('o'); scope='Sources only; no production data or secrets'; files=$entries }
[IO.File]::WriteAllText((Join-Path $stage 'EXPORT-MANIFEST.json'), ($manifest | ConvertTo-Json -Depth 5), [Text.UTF8Encoding]::new($false))
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$zip = Join-Path $exportRoot 'Escriban-IA-claude.zip'
if (Test-Path -LiteralPath $zip) { $zip = Join-Path $exportRoot ('Escriban-IA-claude-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss') + '.zip') }
$archive = [IO.Compression.ZipFile]::Open($zip, [IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in Get-ChildItem -LiteralPath $stage -File -Recurse -Force) {
    $entryName = $file.FullName.Substring($stage.Length+1).Replace('\','/')
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $entryName, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally { $archive.Dispose() }
Write-Output "Exportados $($entries.Count) archivos: $zip"
Write-Output "Copia verificable: $stage"
