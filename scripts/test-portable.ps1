[CmdletBinding()]
param([string]$ZipPath, [switch]$TestUserPath)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$version = (Get-Content -LiteralPath (Join-Path $repo 'package.json') -Raw | ConvertFrom-Json).version
if (-not $ZipPath) { $ZipPath = Join-Path $repo "dist\LER-$version-Portable-x64.zip" }
$fixture = Join-Path $repo ('dist\portable-test-' + [guid]::NewGuid().ToString('N'))
$target = Join-Path $fixture ('LER livros & fic' + [char]0xE7 + [char]0xE3 + 'o')
$builder = @((Join-Path $repo '.ler\runtime\bun.exe'), (Join-Path $repo 'node_modules\bun\bin\bun.exe'), (Get-Command bun -ErrorAction SilentlyContinue).Source) |
    Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::ExtractToDirectory($ZipPath, $target)
$configure = Join-Path $target 'Configurar-LER.ps1'
$originalPath = $env:Path
$userPathKey = $null
try {
    $env:Path = "$env:SystemRoot\System32;$env:SystemRoot\System32\WindowsPowerShell\v1.0"
    & $configure -CriarAtalho
    & $configure
    $shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $target 'LER.lnk'))
    if ($shortcut.TargetPath -ne (Join-Path $target '.ler\runtime\bun.exe') -or $shortcut.Arguments -like '*--choose*') { throw 'Atalho incorreto.' }
    & (Join-Path $target 'LER.cmd') --help
    if ($LASTEXITCODE -ne 0) { throw 'Launcher portatil falhou.' }
    if (Test-Path -LiteralPath (Join-Path $target '.ler\workspace.json')) { throw 'Dados pessoais incluidos no ZIP.' }
    if (-not (Test-Path -LiteralPath (Join-Path $target 'licenses\bun-1.4.4\Bun-LICENSE.md'))) { throw 'Avisos de licenca do Bun ausentes.' }
    $license = Join-Path $target 'LICENSE'
    $originalLicense = [IO.File]::ReadAllBytes($license)
    try {
        [IO.File]::AppendAllText($license, 'tampered')
        $rejected = $false
        try { & $configure } catch { if ($_.Exception.Message -notlike '*Arquivo alterado: LICENSE*') { throw }; $rejected = $true }
        if (-not $rejected) { throw 'Arquivo alterado nao foi detectado.' }
    } finally { [IO.File]::WriteAllBytes($license, $originalLicense) }
    if ($TestUserPath) {
        $userPathKey = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment', $true)
        $hadPath = $userPathKey.GetValueNames() -contains 'Path'
        $before = $userPathKey.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
        $kind = if ($hadPath) { $userPathKey.GetValueKind('Path') } else { [Microsoft.Win32.RegistryValueKind]::ExpandString }
        & $configure -AdicionarAoPath
        & $configure -AdicionarAoPath
        $configured = [Environment]::GetEnvironmentVariable('Path', 'User')
        if (@($configured.Split(';') | Where-Object { $_ -ieq (Join-Path $target 'bin') }).Count -ne 1) { throw 'PATH ausente ou duplicado.' }
        # Resolve the command with no global runtimes available.
        $env:Path = (Join-Path $target 'bin') + ';' + $env:Path
        & ler.cmd --check
        if ($LASTEXITCODE -ne 0) { throw 'Comando no PATH falhou.' }
        & $configure -RemoverDoPath
        if ($userPathKey.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames) -cne $before) { throw 'PATH anterior nao restaurado.' }
    }
    # Reuse the application's reader, worker and native UI tests on the extracted runtime.
    & $builder (Join-Path $PSScriptRoot 'prepare-runtime.ts') $target --tests-only
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar testes compilados.' }
    Push-Location -LiteralPath $target
    try {
        & (Join-Path $target '.ler\runtime\bun.exe') test
        if ($LASTEXITCODE -ne 0) { throw 'Testes do pacote extraido falharam.' }
    } finally { Pop-Location }
    Write-Host "ZIP, integridade, launcher, configuracao e dependencias validados: $target"
} finally {
    $env:Path = $originalPath
    if ($null -ne $userPathKey) {
        try {
            if ($hadPath) { $userPathKey.SetValue('Path', $before, $kind) } else { $userPathKey.DeleteValue('Path', $false) }
        } finally { $userPathKey.Dispose() }
    }
}
