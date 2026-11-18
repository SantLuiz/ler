#requires -Version 5.1
[CmdletBinding()]
param([switch]$AdicionarAoPath, [switch]$RemoverDoPath, [switch]$CriarAtalho)
$ErrorActionPreference = 'Stop'
if ($AdicionarAoPath -and $RemoverDoPath) { throw 'Escolha AdicionarAoPath ou RemoverDoPath.' }
$root = [IO.Path]::GetFullPath($PSScriptRoot)
$bin = Join-Path $root 'bin'

if (-not $RemoverDoPath) {
    if (-not [Environment]::Is64BitOperatingSystem) { throw 'O LER requer Windows x64.' }
    # Validate every distributed file before executing the private runtime.
    $inventory = Get-Content -LiteralPath (Join-Path $root 'SHA256SUMS.json') -Raw | ConvertFrom-Json
    foreach ($entry in $inventory) {
        $file = [IO.Path]::GetFullPath((Join-Path $root $entry.Path))
        if (-not $file.StartsWith($root + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Caminho invalido no manifesto.' }
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Arquivo ausente: $($entry.Path). Extraia o ZIP completo." }
        if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $entry.SHA256) { throw "Arquivo alterado: $($entry.Path). Extraia novamente o pacote original." }
    }
    $probe = Join-Path $root ('.ler\write-check-' + [guid]::NewGuid().ToString('N'))
    try { [IO.File]::WriteAllText($probe, ''); } finally { if (Test-Path -LiteralPath $probe) { Remove-Item -LiteralPath $probe } }
    & (Join-Path $bin 'ler.cmd') --check
    if ($LASTEXITCODE -ne 0) { throw 'O runtime do LER nao iniciou. Consulte a mensagem acima e a equipe de TI se houver bloqueio.' }
}

if ($AdicionarAoPath -or $RemoverDoPath) {
    # Read the raw user value so existing %VARIABLE% references survive unchanged.
    $key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment', $true)
    if ($null -eq $key) { throw 'Nao foi possivel abrir o ambiente do usuario.' }
    try {
        $before = [string]$key.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
        $parts = @($before.Split(';') | Where-Object {
            $_.Trim().Trim('"').TrimEnd('\') -ine $bin.TrimEnd('\')
        })
        $after = ($parts -join ';')
        if ($AdicionarAoPath) { $after = $bin + $(if ($after) { ';' + $after }) }
        if ($before -cne $after) {
            $kind = if ($key.GetValueNames() -contains 'Path') { $key.GetValueKind('Path') } else { [Microsoft.Win32.RegistryValueKind]::ExpandString }
            $key.SetValue('Path', $after, $kind)
        }
    } finally { $key.Dispose() }
    Write-Host 'PATH do usuario atualizado. Feche e reabra o terminal; se necessario, encerre a sessao do Windows e entre novamente.'
}
if ($CriarAtalho) {
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut((Join-Path $root 'LER.lnk'))
    $shortcut.TargetPath = Join-Path $root '.ler\runtime\bun.exe'
    $shortcut.Arguments = '--preload "{0}\scripts\preload.js" "{0}\src\main.js"' -f $root
    $shortcut.WorkingDirectory = $root
    $shortcut.IconLocation = Join-Path $root 'assets\ler.ico'
    $shortcut.Save()
    Write-Host 'Atalho LER.lnk criado nesta pasta.'
}
Write-Host 'Pronto. Abra LER.cmd na pasta extraida ou use LER em um novo terminal se adicionou ao PATH.'
