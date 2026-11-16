[CmdletBinding(SupportsShouldProcess = $true)]
param()
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
# Only disposable files; never touch books, libraries, legacy data or backups.
foreach ($relative in @('.cache', '.ler\cache', '.ler\tmp')) {
    $target = [IO.Path]::GetFullPath((Join-Path $repo $relative))
    if (-not $target.StartsWith($repo + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Path is outside the project.' }
    if (Test-Path -LiteralPath $target) {
        if ((Get-Item -LiteralPath $target -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Unexpected link: $target" }
        if ($PSCmdlet.ShouldProcess($target, 'Remove disposable cache and temporary files')) {
            Remove-Item -LiteralPath $target -Recurse -Force
        }
    }
}
Write-Host 'Cleanup complete. Books, progress, preferences and backups were preserved.'
