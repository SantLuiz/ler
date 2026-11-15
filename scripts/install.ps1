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
    Write-Host 'Integracoes do LER removidas. Livros, progresso e repositorio foram preservados.'
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
            if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'Instale Bun 1.4.4+ ou Node.js com npm e execute novamente.' }
            if ($Development) {
                & npm.cmd ci --no-audit --no-fund
                if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar dependencias com npm.' }
                & node (Join-Path $repo 'node_modules\bun\install.js')
                if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar Bun.' }
                $bun = $localBun
            } else {
                $bootstrap = [IO.Path]::GetFullPath((Join-Path $temporary ('bun-bootstrap-' + [guid]::NewGuid().ToString('N'))))
                if (-not $bootstrap.StartsWith([IO.Path]::GetFullPath($temporary) + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Bootstrap fora da pasta temporaria.' }
                $runtimeVersion = (Get-Content -LiteralPath (Join-Path $repo 'package.json') -Raw | ConvertFrom-Json).devDependencies.bun
                try {
                    & npm.cmd install --prefix $bootstrap --no-save --no-package-lock --no-audit --no-fund --ignore-scripts "bun@$runtimeVersion"
                    if ($LASTEXITCODE -ne 0) { throw 'Falha ao baixar Bun.' }
                    & node (Join-Path $bootstrap 'node_modules\bun\install.js')
                    if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar Bun.' }
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
            if (-not $modules.StartsWith($boundary, [StringComparison]::OrdinalIgnoreCase) -or -not $previousModules.StartsWith([IO.Path]::GetFullPath($temporary) + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Dependencias fora da instalacao.' }
            if ((Get-Item -LiteralPath $modules -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'node_modules e um link. Instalacao anterior preservada.' }
            Move-Item -LiteralPath $modules -Destination $previousModules
        }
        try {
            if ($Development) { & $bun install --frozen-lockfile }
            else { & $bun install --frozen-lockfile --production --omit=peer }
            if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar dependencias com Bun.' }
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
if (-not $bun -or -not (Test-Path -LiteralPath (Join-Path $repo 'node_modules\@opentui\solid\scripts\preload.js'))) { throw 'Dependencias ausentes. Execute novamente sem -SkipDependencies.' }
$versionText = (& $bun --version | Select-Object -First 1)
if ([version]($versionText -replace '-.*$','') -lt [version]'1.4.4') { throw 'LER requer Bun 1.4.4 ou superior.' }
if (-not $NoPath) {
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $parts = @(Get-PathParts $userPath)
    [Environment]::SetEnvironmentVariable('Path', (($parts + $bin) -join ';'), 'User')
    $env:Path = (@(Get-PathParts $env:Path) + @($bin)) -join ';'
}
Write-Host 'LER instalado. Na pasta da biblioteca, execute: LER'
if (-not $Development) { Write-Host 'Instalacao de uso: ferramentas de desenvolvimento omitidas. Para desenvolver: scripts\install.cmd -Development' }
if (-not $NoContextMenu) { Set-LerContextMenu $repo; Write-Host 'Menu Abrir com LER registrado para EPUB, PDF e TXT (usuario atual).' }
Write-Host 'Outra pasta: LER "D:\Livros"    Escolher pasta: LER --choose'
if (-not $NoPath) { Write-Host 'O PATH do usuario foi atualizado. Reabra o terminal se o comando nao for encontrado.' }
