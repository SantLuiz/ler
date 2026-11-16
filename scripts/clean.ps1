[CmdletBinding(SupportsShouldProcess = $true)]
param([switch]$BuildArtifacts)
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$removedBytes = 0
# Only disposable files; never touch books, libraries, legacy data or backups.
foreach ($relative in @('.cache', '.ler\cache', '.ler\tmp')) {
    $target = [IO.Path]::GetFullPath((Join-Path $repo $relative))
    if (-not $target.StartsWith($repo + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Path is outside the project.' }
    if (Test-Path -LiteralPath $target) {
        if ((Get-Item -LiteralPath $target -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Unexpected link: $target" }
        if ($PSCmdlet.ShouldProcess($target, 'Remove disposable cache and temporary files')) {
            $removedBytes += (Get-ChildItem -LiteralPath $target -Recurse -File -Force | Measure-Object Length -Sum).Sum
            Remove-Item -LiteralPath $target -Recurse -Force
        }
    }
}
if ($BuildArtifacts) {
    $dist = Join-Path $repo 'dist'
    $version = (Get-Content -LiteralPath (Join-Path $repo 'package.json') -Raw | ConvertFrom-Json).version
    $keep = @("LER-$version-Setup-x64.exe", "LER-$version-Setup-x64.exe.sha256")
    foreach ($item in Get-ChildItem -LiteralPath $dist -Force -ErrorAction SilentlyContinue) {
        $target = [IO.Path]::GetFullPath($item.FullName)
        if (-not $target.StartsWith($dist + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Artifact is outside dist.' }
        if ($keep -contains $item.Name) { continue }
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Unexpected link: $target" }
        if ($PSCmdlet.ShouldProcess($target, 'Remove generated build artifact')) {
            if ($item.PSIsContainer) { $removedBytes += (Get-ChildItem -LiteralPath $target -Recurse -File -Force | Measure-Object Length -Sum).Sum }
            else { $removedBytes += $item.Length }
            Remove-Item -LiteralPath $target -Recurse -Force
        }
    }
}
Write-Host ('Removed {0:N2} MiB of disposable files.' -f ($removedBytes / 1MB))
Write-Host 'Cleanup complete. Books, progress, preferences and backups were preserved.'
