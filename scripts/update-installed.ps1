[CmdletBinding()]
param([string]$InstallerPath)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$key = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\{5CE15075-9F57-4567-BABA-1B175E233CF1}_is1'
if (-not (Test-Path -LiteralPath $key)) { throw 'Instalacao gerenciada do LER nao encontrada nesta conta.' }
$target = [IO.Path]::GetFullPath((Get-ItemProperty -LiteralPath $key).InstallLocation).TrimEnd('\')
if (-not (Test-Path -LiteralPath (Join-Path $target 'ler-install.ini'))) { throw 'Pasta instalada sem identificacao do LER.' }
$running = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.StartsWith($target + '\', [StringComparison]::OrdinalIgnoreCase) }
if ($running) { throw 'Feche o LER antes de atualizar. Seus dados nao foram alterados.' }
if (-not $InstallerPath) {
    $version = (Get-Content -LiteralPath (Join-Path $repo 'package.json') -Raw | ConvertFrom-Json).version
    $InstallerPath = Join-Path $repo "dist\LER-$version-Setup-x64.exe"
}
if (-not (Test-Path -LiteralPath $InstallerPath)) { throw 'Gere o instalador com scripts\build-release.ps1 primeiro.' }
$readingHashes = @{}
foreach ($name in @('libraries', 'legacy', 'workspace.json')) {
    $location = Join-Path $target ".ler\$name"
    if (Test-Path -LiteralPath $location) {
        foreach ($file in @(Get-Item -LiteralPath $location) + @(Get-ChildItem -LiteralPath $location -Recurse -File -ErrorAction SilentlyContinue)) {
            if (-not $file.PSIsContainer) { $readingHashes[$file.FullName] = (Get-FileHash -LiteralPath $file.FullName).Hash }
        }
    }
}
# Inno Setup restores this installation's previous task choices. No /TASKS
# override: preserve the user's shortcut, PATH and Explorer menu preferences.
$process = Start-Process -FilePath $InstallerPath -ArgumentList ('/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /DIR="{0}"' -f $target) -Wait -PassThru -WindowStyle Hidden
if ($process.ExitCode -ne 0) { throw "Falha ao atualizar LER: $($process.ExitCode)." }
foreach ($file in $readingHashes.Keys) {
    if (-not (Test-Path -LiteralPath $file) -or (Get-FileHash -LiteralPath $file).Hash -ne $readingHashes[$file]) { throw 'Um arquivo de leitura mudou durante a atualizacao. Verifique a instalacao.' }
}
$files = @('package.json', 'bun.lock', 'bunfig.toml', 'tsconfig.json', 'scripts\preload.ts')
foreach ($directory in @('src', 'bin', 'assets')) {
    $files += Get-ChildItem -LiteralPath (Join-Path $repo $directory) -Recurse -File | ForEach-Object { $_.FullName.Substring($repo.Length + 1) }
}
foreach ($relative in $files) {
    $installedFile = Join-Path $target $relative
    if (-not (Test-Path -LiteralPath $installedFile) -or (Get-FileHash -LiteralPath (Join-Path $repo $relative)).Hash -ne (Get-FileHash -LiteralPath $installedFile).Hash) {
        throw "O instalador esta desatualizado ($relative). Recompile antes de atualizar."
    }
}
Write-Host "LER instalado atualizado em $target. Dados de leitura preservados."
