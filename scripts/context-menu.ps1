function Get-LerContextMenuEntries([string]$Repo) {
    $launcher = Join-Path $Repo 'scripts\open-book.ps1'
    $powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $command = '"{0}" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "{1}" "%1"' -f $powershell, $launcher
    foreach ($extension in @('.epub', '.pdf', '.txt')) {
        [pscustomobject]@{ Key = "HKCU:\Software\Classes\SystemFileAssociations\$extension\shell\LER.open"; Command = $command; Owner = $Repo }
    }
}

function Set-LerContextMenu([string]$Repo, [bool]$Uninstall = $false) {
    $changed = $false
    foreach ($entry in @(Get-LerContextMenuEntries $Repo)) {
        if ($Uninstall) {
            if (Test-Path -LiteralPath $entry.Key) {
                $owner = (Get-ItemProperty -LiteralPath $entry.Key -Name InstallDirectory -ErrorAction SilentlyContinue).InstallDirectory
                # An old clone must not remove a newer installation's menu.
                if ($owner -ieq $Repo) { Remove-Item -LiteralPath $entry.Key -Recurse -Force; $changed = $true }
            }
        } else {
            New-Item -Path ($entry.Key + '\command') -Force | Out-Null
            Set-Item -LiteralPath $entry.Key -Value 'Abrir com LER'
            New-ItemProperty -LiteralPath $entry.Key -Name InstallDirectory -Value $entry.Owner -PropertyType String -Force | Out-Null
            New-ItemProperty -LiteralPath $entry.Key -Name MultiSelectModel -Value 'Single' -PropertyType String -Force | Out-Null
            Set-Item -LiteralPath ($entry.Key + '\command') -Value $entry.Command
            $changed = $true
        }
    }
    if ($changed) {
        if (-not ('LerShell.Notify' -as [type])) {
            Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; namespace LerShell { public class Notify { [DllImport("shell32.dll")] public static extern void SHChangeNotify(uint e, uint f, IntPtr a, IntPtr b); } }'
        }
        [LerShell.Notify]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
    }
}
