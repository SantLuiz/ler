[CmdletBinding()]
param([Parameter(Mandatory = $true, Position = 0)][string]$BookPath, [switch]$Check)
$ErrorActionPreference = 'Stop'
try {
    $repo = Split-Path -Parent $PSScriptRoot
    $file = Get-Item -LiteralPath $BookPath
    if ($file.PSIsContainer -or $file.Extension.ToLowerInvariant() -notin @('.epub', '.pdf', '.txt')) { throw 'Selecione um arquivo EPUB, PDF ou TXT.' }
    $runtime = Join-Path $repo 'node_modules\bun\bin\bun.exe'
    if (-not (Test-Path -LiteralPath $runtime)) { $runtime = (Get-Command bun -ErrorAction Stop).Source }
    $temporary = Join-Path $repo '.ler\tmp'
    New-Item -ItemType Directory -Path $temporary -Force | Out-Null
    $env:TEMP = $temporary
    $env:TMP = $temporary
    $env:TMPDIR = $temporary
    $env:BUN_RUNTIME_TRANSPILER_CACHE_PATH = Join-Path $repo '.ler\cache\transpiler'
    $extraArguments = @()
    if ($Check) { $extraArguments += '--check' }
    # Pass the selected path directly to the runtime, without cmd.exe or expression evaluation.
    & $runtime --preload (Join-Path $repo 'scripts\preload.ts') (Join-Path $repo 'src\main.tsx') --open $file.FullName @extraArguments
    $result = $LASTEXITCODE
} catch {
    Write-Host ('LER: ' + $_.Exception.Message)
    $result = 1
}
if ($result -ne 0 -and -not $Check) { Read-Host 'Pressione Enter para fechar' | Out-Null }
exit $result
