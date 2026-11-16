[CmdletBinding()]
param([string]$InstallerPath)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$key = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\{5CE15075-9F57-4567-BABA-1B175E233CF1}_is1'
if (-not (Test-Path -LiteralPath $key)) { throw 'Managed LER installation not found for this account.' }
$target = [IO.Path]::GetFullPath((Get-ItemProperty -LiteralPath $key).InstallLocation).TrimEnd('\')
if (-not (Test-Path -LiteralPath (Join-Path $target 'ler-install.ini'))) { throw 'Installation folder has no LER identifier.' }
$running = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.StartsWith($target + '\', [StringComparison]::OrdinalIgnoreCase) }
if ($running) { throw 'Close LER before updating. Your data has not been changed.' }
if (-not $InstallerPath) {
    $version = (Get-Content -LiteralPath (Join-Path $repo 'package.json') -Raw | ConvertFrom-Json).version
    $InstallerPath = Join-Path $repo "dist\LER-$version-Setup-x64.exe"
}
if (-not (Test-Path -LiteralPath $InstallerPath)) { throw 'Build the installer with scripts\build-release.ps1 first.' }
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
if ($process.ExitCode -ne 0) { throw "Failed to update LER: $($process.ExitCode)." }
foreach ($file in $readingHashes.Keys) {
    if (-not (Test-Path -LiteralPath $file) -or (Get-FileHash -LiteralPath $file).Hash -ne $readingHashes[$file]) { throw 'A reading data file changed during the update. Check the installation.' }
}
$files = @('package.json', 'bun.lock', 'bunfig.toml', 'tsconfig.json', 'scripts\preload.ts')
foreach ($directory in @('src', 'bin', 'assets')) {
    $files += Get-ChildItem -LiteralPath (Join-Path $repo $directory) -Recurse -File | ForEach-Object { $_.FullName.Substring($repo.Length + 1) }
}
foreach ($relative in $files) {
    $installedFile = Join-Path $target $relative
    if (-not (Test-Path -LiteralPath $installedFile) -or (Get-FileHash -LiteralPath (Join-Path $repo $relative)).Hash -ne (Get-FileHash -LiteralPath $installedFile).Hash) {
        throw "The installer is outdated ($relative). Rebuild before updating."
    }
}
Write-Host "LER installation updated at $target. Reading data preserved."
