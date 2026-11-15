[CmdletBinding()]
param([switch]$NoPath, [switch]$SkipDependencies, [switch]$Uninstall)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$bin = Join-Path $repo 'bin'
function Get-PathParts([string]$value) { @($value -split ';' | Where-Object { $_ -and $_.TrimEnd('\') -ine $bin.TrimEnd('\') }) }
if ($Uninstall) {
    if (-not $NoPath) {
        $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
        [Environment]::SetEnvironmentVariable('Path', ((Get-PathParts $userPath) -join ';'), 'User')
        $env:Path = (Get-PathParts $env:Path) -join ';'
    }
    Write-Host 'LER removido do PATH. Livros, progresso e repositorio foram preservados.'
    exit 0
}
$localBun = Join-Path $repo 'node_modules\bun\bin\bun.exe'
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
$bun = if (Test-Path -LiteralPath $localBun) { $localBun } else { (Get-Command bun -ErrorAction SilentlyContinue).Source }
if (-not $SkipDependencies) {
    Push-Location -LiteralPath $repo
    try {
        if (-not $bun) {
            if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'Instale Bun 1.4.4+ ou Node.js com npm e execute novamente.' }
            & npm.cmd ci --no-audit --no-fund
            if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar dependencias com npm.' }
            & node (Join-Path $repo 'node_modules\bun\install.js')
            if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar Bun.' }
            $bun = $localBun
        }
        & $bun install --frozen-lockfile
        if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar dependencias com Bun.' }
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
Write-Host 'Outra pasta: LER "D:\Livros"    Escolher pasta: LER --choose'
if (-not $NoPath) { Write-Host 'O PATH do usuario foi atualizado. Reabra o terminal se o comando nao for encontrado.' }
