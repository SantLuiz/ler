[CmdletBinding()]
param([switch]$NoPath, [switch]$NoContextMenu, [switch]$SkipDependencies, [switch]$Development, [switch]$Uninstall)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$bin = Join-Path $repo 'bin'
. (Join-Path $PSScriptRoot 'context-menu.ps1')
function Get-PathParts([string]$value) { @($value -split ';' | Where-Object { $_ -and $_.TrimEnd('\') -ine $bin.TrimEnd('\') }) }
if ($Uninstall) {
    if (-not $NoContextMenu) { Set-LerContextMenu $repo $true }
    if (-not $NoPath) {
        $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
        [Environment]::SetEnvironmentVariable('Path', ((Get-PathParts $userPath) -join ';'), 'User')
        $env:Path = (Get-PathParts $env:Path) -join ';'
    }
    Write-Host 'LER integrations removed. Books, progress and the repository were preserved.'
    exit 0
}
$localBun = Join-Path $repo 'node_modules\bun\bin\bun.exe'
$runtimeBun = Join-Path $repo '.ler\runtime\bun.exe'
function Save-LerRuntime([string]$source) {
    New-Item -ItemType Directory -Path (Split-Path -Parent $runtimeBun) -Force | Out-Null
    try { New-Item -ItemType HardLink -Path $runtimeBun -Target $source -ErrorAction Stop | Out-Null }
    catch { Copy-Item -LiteralPath $source -Destination $runtimeBun -Force }
}
# Scope package-manager caches and temporary downloads to this clone.
$data = Join-Path $repo '.ler'
$temporary = Join-Path $data 'tmp'
New-Item -ItemType Directory -Path $temporary -Force | Out-Null
$env:TEMP = $temporary
$env:TMP = $temporary
$env:TMPDIR = $temporary
$env:RUNNER_TEMP = $temporary
$env:npm_config_cache = Join-Path $data 'cache\npm'
$env:BUN_INSTALL_CACHE_DIR = Join-Path $data 'cache\bun'
$env:BUN_RUNTIME_TRANSPILER_CACHE_PATH = Join-Path $data 'cache\transpiler'
$bun = if (Test-Path -LiteralPath $runtimeBun) { $runtimeBun } elseif (Test-Path -LiteralPath $localBun) { $localBun } else { (Get-Command bun -ErrorAction SilentlyContinue).Source }
if (-not $SkipDependencies) {
    Push-Location -LiteralPath $repo
    try {
        if (-not $bun) {
            if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'Install Bun 1.4.4+ or Node.js with npm and try again.' }
            if ($Development) {
                & npm.cmd ci --no-audit --no-fund
                if ($LASTEXITCODE -ne 0) { throw 'Failed to install dependencies with npm.' }
                & node (Join-Path $repo 'node_modules\bun\install.js')
                if ($LASTEXITCODE -ne 0) { throw 'Failed to prepare Bun.' }
                $bun = $localBun
            } else {
                $bootstrap = [IO.Path]::GetFullPath((Join-Path $temporary ('bun-bootstrap-' + [guid]::NewGuid().ToString('N'))))
                if (-not $bootstrap.StartsWith([IO.Path]::GetFullPath($temporary) + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Bootstrap is outside the temporary folder.' }
                $runtimeVersion = (Get-Content -LiteralPath (Join-Path $repo 'package.json') -Raw | ConvertFrom-Json).devDependencies.bun
                try {
                    & npm.cmd install --prefix $bootstrap --no-save --no-package-lock --no-audit --no-fund --ignore-scripts "bun@$runtimeVersion"
                    if ($LASTEXITCODE -ne 0) { throw 'Failed to download Bun.' }
                    & node (Join-Path $bootstrap 'node_modules\bun\install.js')
                    if ($LASTEXITCODE -ne 0) { throw 'Failed to prepare Bun.' }
                    Save-LerRuntime (Join-Path $bootstrap 'node_modules\bun\bin\bun.exe')
                    $bun = $runtimeBun
                } finally {
                    if (Test-Path -LiteralPath $bootstrap) { Remove-Item -LiteralPath $bootstrap -Recurse -Force }
                }
            }
        }
        # Keep a bootstrapped runtime outside node_modules before pruning development packages.
        if (-not $Development -and $bun -eq $localBun) {
            Save-LerRuntime $localBun
            $bun = $runtimeBun
        }
        # Bun does not prune an existing tree with --production. Keep the old tree
        # until a fresh production install succeeds, then discard only that tree.
        $previousModules = $null
        $modules = [IO.Path]::GetFullPath((Join-Path $repo 'node_modules'))
        if (-not $Development -and ((Test-Path -LiteralPath $localBun) -or (Test-Path -LiteralPath (Join-Path $repo 'node_modules\typescript')))) {
            $previousModules = [IO.Path]::GetFullPath((Join-Path $temporary ('dependencies-' + [guid]::NewGuid().ToString('N'))))
            $boundary = [IO.Path]::GetFullPath($repo) + '\'
            if (-not $modules.StartsWith($boundary, [StringComparison]::OrdinalIgnoreCase) -or -not $previousModules.StartsWith([IO.Path]::GetFullPath($temporary) + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Dependencies are outside the installation folder.' }
            if ((Get-Item -LiteralPath $modules -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'node_modules is a link. The existing installation was preserved.' }
            Move-Item -LiteralPath $modules -Destination $previousModules
        }
        try {
            if ($Development) { & $bun install --frozen-lockfile }
            else { & $bun install --frozen-lockfile --production --omit=peer }
            if ($LASTEXITCODE -ne 0) { throw 'Failed to install dependencies with Bun.' }
        } catch {
            if ($previousModules -and (Test-Path -LiteralPath $previousModules)) {
                if (Test-Path -LiteralPath $modules) { Remove-Item -LiteralPath $modules -Recurse -Force }
                Move-Item -LiteralPath $previousModules -Destination $modules
            }
            throw
        }
        if ($previousModules -and (Test-Path -LiteralPath $previousModules)) {
            try { Remove-Item -LiteralPath $previousModules -Recurse -Force }
            catch { Write-Warning 'Dependencias antigas em uso foram preservadas em .ler/tmp. Feche o LER e execute scripts/clean.ps1 depois.' }
        }
    } finally { Pop-Location }
}
if (-not $bun -or -not (Test-Path -LiteralPath (Join-Path $repo 'node_modules\@opentui\solid\scripts\preload.js'))) { throw 'Dependencies are missing. Run again without -SkipDependencies.' }
$versionText = (& $bun --version | Select-Object -First 1)
if ([version]($versionText -replace '-.*$','') -lt [version]'1.4.4') { throw 'LER requires Bun 1.4.4 or newer.' }
if (-not $NoPath) {
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $parts = @(Get-PathParts $userPath)
    [Environment]::SetEnvironmentVariable('Path', (($parts + $bin) -join ';'), 'User')
    $env:Path = (@(Get-PathParts $env:Path) + @($bin)) -join ';'
}
Write-Host 'LER installed. Run LER to open the home screen.'
if (-not $Development) { Write-Host 'Development tools omitted. For development: scripts\install.cmd -Development' }
if (-not $NoContextMenu) { Set-LerContextMenu $repo; Write-Host 'LER context menu registered for EPUB, PDF and TXT (current user).' }
Write-Host 'Another folder: LER "D:\Books"    Choose a library on home: Ctrl+L'
if (-not $NoPath) { Write-Host 'User PATH updated. Reopen the terminal if the command is not found.' }
