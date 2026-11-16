[CmdletBinding()]
param([string]$InstallerPath, [ValidateSet('brazilianportuguese', 'english')][string]$Language = 'brazilianportuguese')
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$version = (Get-Content -LiteralPath (Join-Path $repo 'package.json') -Raw | ConvertFrom-Json).version
if (-not $InstallerPath) { $InstallerPath = Join-Path $repo "dist\LER-$version-Setup-x64-validation.exe" }
$key = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\{A68F64DB-2BD7-4597-BD02-5A717870C6C2}_is1'
if (Test-Path -LiteralPath $key) { throw 'Ja existe uma instalacao deste assistente. Teste em outra conta ou maquina para preserva-la.' }
$fixture = Join-Path $repo ('dist\installer-test-' + [guid]::NewGuid().ToString('N'))
$target = Join-Path $fixture 'LER livros & leitura'
$externalBook = Join-Path $fixture 'livro-externo.txt'
New-Item -ItemType Directory -Path $fixture -Force | Out-Null
Set-Content -LiteralPath $externalBook -Value 'Livro externo preservado.'
$beforePath = [Environment]::GetEnvironmentVariable('Path', 'User')
$originalPath = $env:Path
$legacyShortcutPath = Join-Path ([Environment]::GetFolderPath('Programs')) 'LER validation.lnk'
if (Test-Path -LiteralPath $legacyShortcutPath) { throw 'Atalho de validacao ja existe. Preserve-o antes de testar.' }
function Invoke-InstallerProcess([string]$Executable, [string]$Arguments, [int[]]$AllowedExitCodes = @(0)) {
    $process = Start-Process -FilePath $Executable -ArgumentList $Arguments -Wait -PassThru -WindowStyle Hidden
    if ($AllowedExitCodes -notcontains $process.ExitCode) { throw "Falha em $Executable (codigo $($process.ExitCode)). Consulte os logs em $fixture." }
}
try {
    # Do not alter existing shortcuts or context menus; exercise user PATH and
    # native installed-app registration, which the uninstaller must undo exactly.
    $env:Path = "$env:SystemRoot\System32;$env:SystemRoot\System32\WindowsPowerShell\v1.0"
    Invoke-InstallerProcess $InstallerPath ('/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /LANG={2} /TASKS="addtopath" /DIR="{0}" /LOG="{1}\install.log"' -f $target, $fixture, $Language)
    $installedBun = Join-Path $target '.ler\runtime\bun.exe'
    $helpLanguage = if ($Language -eq 'english') { 'en' } else { 'pt-BR' }
    $help = & $installedBun --preload (Join-Path $target 'scripts\preload.ts') (Join-Path $target 'src\main.tsx') --lang $helpLanguage --help
    $expectedHelp = if ($Language -eq 'english') { 'Show help' } else { 'Mostrar ajuda' }
    if ($LASTEXITCODE -ne 0 -or ($help -join "`n") -notlike "*$expectedHelp*") { throw 'Installed command-line help did not use the requested language.' }
    if (-not (Test-Path -LiteralPath (Join-Path $target 'README.md')) -or -not (Test-Path -LiteralPath (Join-Path $target 'LEIA-ME.md'))) { throw 'Both installed reading guides must be present.' }
    if (-not (Test-Path -LiteralPath $key)) { throw 'Registro em Aplicativos instalados ausente.' }
    if ((Get-ItemProperty -LiteralPath $key).InstallLocation.TrimEnd('\') -ine $target) { throw 'Pasta registrada incorretamente.' }
    if ((Get-ItemProperty -LiteralPath $key).DisplayIcon -notlike '*\assets\ler.ico*') { throw 'Icone do aplicativo instalado incorreto.' }
    if ((Get-FileHash -LiteralPath (Join-Path $target 'assets\ler.ico')).Hash -ne (Get-FileHash -LiteralPath (Join-Path $repo 'assets\ler.ico')).Hash) { throw 'Icone instalado desatualizado.' }
    $installedPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if (@($installedPath -split ';') -notcontains (Join-Path $target 'bin')) { throw 'Comando LER nao registrado.' }
    if ((Test-Path -LiteralPath (Join-Path $target 'node_modules\typescript')) -or (Test-Path -LiteralPath (Join-Path $target '.git'))) { throw 'Ferramentas de desenvolvimento foram incluidas.' }
    & (Join-Path $target 'bin\ler.cmd') --check
    if ($LASTEXITCODE -ne 0) { throw 'LER nao inicia sem ferramentas globais.' }
    # Validate native UI and the PDF worker/WASM from the installed modules.
    $testFiles = Join-Path $target 'tests'
    New-Item -ItemType Directory -Path $testFiles | Out-Null
    foreach ($name in @('formats.test.ts', 'fixtures.ts', 'render.test.ts')) { Copy-Item -LiteralPath (Join-Path $repo "tests\$name") -Destination $testFiles }
    Push-Location -LiteralPath $target
    try {
        & (Join-Path $target '.ler\runtime\bun.exe') test tests/formats.test.ts tests/render.test.ts
        if ($LASTEXITCODE -ne 0) { throw 'Falha nos testes de PDF e interface do pacote instalado.' }
    } finally { Pop-Location }
    # Only these test-owned files are outside the installer manifest.
    $resolvedTestFiles = [IO.Path]::GetFullPath($testFiles)
    if (-not $resolvedTestFiles.StartsWith([IO.Path]::GetFullPath($fixture) + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Testes fora da pasta de validacao.' }
    Remove-Item -LiteralPath $resolvedTestFiles -Recurse -Force
    Set-Content -LiteralPath (Join-Path $target '.ler\workspace.json') -Value '{"private":"reading data"}'
    New-Item -ItemType Directory -Path (Join-Path $target '.ler\libraries\fixture') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $target '.ler\libraries\fixture\progress.json') -Value '{"progress":42}'
    # Simulate an old managed shortcut left behind by an earlier installer,
    # even though the Start menu task is not selected for this update.
    $shortcutShell = New-Object -ComObject WScript.Shell
    $legacyShortcut = $shortcutShell.CreateShortcut($legacyShortcutPath)
    $legacyShortcut.TargetPath = Join-Path $target '.ler\runtime\bun.exe'
    $legacyShortcut.Arguments = '--choose'
    $legacyShortcut.Save()
    # Updating with the same wizard must retain reading state.
    Invoke-InstallerProcess $InstallerPath ('/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /LANG={2} /TASKS="addtopath" /DIR="{0}" /LOG="{1}\update.log"' -f $target, $fixture, $Language)
    if ((Get-Content -LiteralPath (Join-Path $target '.ler\libraries\fixture\progress.json') -Raw).Trim() -ne '{"progress":42}') { throw 'Atualizacao apagou dados de leitura.' }
    $updatedShortcut = $shortcutShell.CreateShortcut($legacyShortcutPath)
    if ($updatedShortcut.Arguments -like '*--choose*' -or $updatedShortcut.IconLocation -notlike '*\assets\ler.ico*') { throw 'Atalho legado nao atualizado.' }
    # Reopening the same setup can select complete removal. Setup itself exits
    # with cancellation code 1 after the native uninstaller has finished.
    Invoke-InstallerProcess $InstallerPath '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /MODE=uninstall' @(0,1)
    $deadline = [DateTime]::UtcNow.AddSeconds(20)
    while ((Test-Path -LiteralPath $target) -and [DateTime]::UtcNow -lt $deadline) { Start-Sleep -Milliseconds 200 }
    if (Test-Path -LiteralPath $target) { throw 'Desinstalacao deixou arquivos ou dados da aplicacao.' }
    if (Test-Path -LiteralPath $key) { throw 'Registro do desinstalador nao foi removido.' }
    if (Test-Path -LiteralPath $legacyShortcutPath) { throw 'Atalho legado nao foi removido.' }
    if ([Environment]::GetEnvironmentVariable('Path', 'User') -cne $beforePath) { throw 'PATH anterior nao foi restaurado.' }
    if (-not (Test-Path -LiteralPath $externalBook)) { throw 'Livro externo foi apagado.' }
    Write-Host "Instalacao offline, atualizacao, PDF/interface e remocao completa validados. Logs: $fixture"
} finally { $env:Path = $originalPath }
