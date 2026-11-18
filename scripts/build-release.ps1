[CmdletBinding()]
param([string]$CompilerPath, [switch]$DownloadCompiler, [switch]$ValidationBuild)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content -LiteralPath (Join-Path $repo 'package.json') -Raw | ConvertFrom-Json
$tools = Join-Path $repo '.ler\tools'
if (-not $CompilerPath) { $CompilerPath = Join-Path $tools 'inno\ISCC.exe' }
if (-not (Test-Path -LiteralPath $CompilerPath) -and $DownloadCompiler) {
    New-Item -ItemType Directory -Path $tools -Force | Out-Null
    $download = Join-Path $tools 'innosetup-7.1.1-x64.exe'
    Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/jrsoftware/issrc/releases/download/is-7_1_1/innosetup-7.1.1-x64.exe' -OutFile $download
    $signature = Get-AuthenticodeSignature -LiteralPath $download
    if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'O=Pyrsys B\.V\.') { throw 'Invalid Inno Setup compiler signature.' }
    # Portable build tool: no shortcuts, associations, PATH or installed-app entry.
    $process = Start-Process -FilePath $download -ArgumentList ('/PORTABLE=1 /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /CURRENTUSER /NOICONS /DIR="{0}"' -f (Join-Path $tools 'inno')) -Wait -PassThru -WindowStyle Hidden
    if ($process.ExitCode -ne 0) { throw "Failed to extract compiler: $($process.ExitCode)" }
}
if (-not (Test-Path -LiteralPath $CompilerPath)) { throw 'Use -DownloadCompiler or -CompilerPath to locate ISCC.exe (build machine only).' }
$bun = @((Join-Path $repo '.ler\runtime\bun.exe'), (Join-Path $repo 'node_modules\bun\bin\bun.exe'), (Get-Command bun -ErrorAction SilentlyContinue).Source) |
    Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
if (-not $bun) { throw 'The build machine requires Bun. End users do not need to install tools.' }
if ((& $bun --print process.platform) -ne 'win32' -or (& $bun --print process.arch) -ne 'x64') { throw 'Build the installer with Windows x64 Bun.' }
$bunVersion = & $bun --version
if ($bunVersion -ne $manifest.devDependencies.bun) { throw "Use the pinned Bun version $($manifest.devDependencies.bun) for the release." }
$notices = Join-Path $repo "licenses\bun-$bunVersion"
if (-not (Test-Path -LiteralPath (Join-Path $notices 'Bun-LICENSE.md'))) { throw "Missing notices for Bun $bunVersion." }
& $bun (Join-Path $PSScriptRoot 'generate-icon.ts')
if ($LASTEXITCODE -ne 0) { throw 'Failed to generate the LER icon.' }
$dist = Join-Path $repo 'dist'
$work = Join-Path $dist ([guid]::NewGuid().ToString('N'))
$app = Join-Path $work 'payload'
New-Item -ItemType Directory -Path $app -Force | Out-Null
try {
    foreach ($name in @('bin', 'assets', 'package.json', 'bun.lock', 'LICENSE')) {
        Copy-Item -LiteralPath (Join-Path $repo $name) -Destination $app -Recurse
    }
    $licenseFolder = New-Item -ItemType Directory -Path (Join-Path $app 'licenses')
    Copy-Item -LiteralPath $notices -Destination $licenseFolder.FullName -Recurse
    $scripts = Join-Path $app 'scripts'
    New-Item -ItemType Directory -Path $scripts | Out-Null
    $preload = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'preload.ts') -Raw
    $preload.Substring(0, $preload.IndexOf('const {ensureSolidTransformPlugin}')) | Set-Content -LiteralPath (Join-Path $scripts 'preload.js') -Encoding utf8
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'release-readme.md') -Destination (Join-Path $app 'LEIA-ME.md')
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'release-readme.en.md') -Destination (Join-Path $app 'README.md')
    $runtime = Join-Path $app '.ler\runtime'
    New-Item -ItemType Directory -Path $runtime -Force | Out-Null
    Copy-Item -LiteralPath $bun -Destination (Join-Path $runtime 'bun.exe')
    # Isolate package-manager downloads from the developer's profile.
    $originalCache = $env:BUN_INSTALL_CACHE_DIR
    try {
        $env:BUN_INSTALL_CACHE_DIR = Join-Path $repo '.ler\cache\release'
        Push-Location -LiteralPath $app
        try {
            & $bun install --frozen-lockfile --production --omit=peer
            if ($LASTEXITCODE -ne 0) { throw 'Failed to prepare production dependencies.' }
        } finally { Pop-Location }
    } finally { $env:BUN_INSTALL_CACHE_DIR = $originalCache }
    & $bun (Join-Path $PSScriptRoot 'prepare-runtime.ts') $app
    if ($LASTEXITCODE -ne 0) { throw 'Failed to precompile the runtime.' }
    # The frozen source lock is build input, not a runtime package-manager entry.
    Remove-Item -LiteralPath (Join-Path $app 'bun.lock')
    $sourceFiles = @('package.json', 'bun.lock', 'scripts\prepare-runtime.ts', 'scripts\preload.ts', 'scripts\build-release.ps1', 'scripts\installer.iss', 'scripts\configure-portable.ps1', 'scripts\portable-readme.md')
    foreach ($directory in @('src', 'bin', 'assets', 'licenses')) {
        $sourceFiles += Get-ChildItem -LiteralPath (Join-Path $repo $directory) -Recurse -File | ForEach-Object { $_.FullName.Substring($repo.Length + 1) }
    }
    $sourceHashes = @{}
    foreach ($file in $sourceFiles) { $sourceHashes[$file] = (Get-FileHash -LiteralPath (Join-Path $repo $file)).Hash }
    $sourceHashes | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $app 'build-sources.json') -Encoding utf8
    # Validate with only Windows commands on PATH.
    $originalPath = $env:Path
    try {
        $env:Path = "$env:SystemRoot\System32;$env:SystemRoot\System32\WindowsPowerShell\v1.0"
        & (Join-Path $app 'bin\ler.cmd') --check
        if ($LASTEXITCODE -ne 0) { throw 'The package does not start without external tools.' }
    } finally { $env:Path = $originalPath }
    # Ship only the runtime in .ler, never caches or private reading data.
    foreach ($name in @('tmp', 'cache', 'config')) {
        $disposable = [IO.Path]::GetFullPath((Join-Path $app ".ler\$name"))
        if (-not $disposable.StartsWith([IO.Path]::GetFullPath($work) + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Cache is outside the build folder.' }
        if (Test-Path -LiteralPath $disposable) { Remove-Item -LiteralPath $disposable -Recurse -Force }
    }
    $validationArguments = @()
    if ($ValidationBuild) { $validationArguments = @('/DValidationBuild=1') }
    & $CompilerPath /Q "/DPayloadDir=$app" "/DAppVersion=$($manifest.version)" "/DOutputDir=$dist" @validationArguments (Join-Path $PSScriptRoot 'installer.iss')
    if ($LASTEXITCODE -ne 0) { throw 'Failed to compile graphical installer.' }
    $suffix = if ($ValidationBuild) { '-validation' } else { '' }
    $installer = Join-Path $dist ("LER-{0}-Setup-x64{1}.exe" -f $manifest.version, $suffix)
    $hash = (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant()
    "$hash  $([IO.Path]::GetFileName($installer))" | Set-Content -LiteralPath "$installer.sha256" -Encoding ascii
    Write-Host "Installer ready: $installer"
    if (-not $ValidationBuild) {
        Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'configure-portable.ps1') -Destination (Join-Path $app 'Configurar-LER.ps1')
        Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'portable-readme.md') -Destination (Join-Path $app 'LEIA-ME.md')
        '@echo off', 'call "%~dp0bin\ler.cmd" %*', 'exit /b %errorlevel%' | Set-Content -LiteralPath (Join-Path $app 'LER.cmd') -Encoding ascii
        $inventory = @(Get-ChildItem -LiteralPath $app -Recurse -File -Force | ForEach-Object {
            [ordered]@{ Path = $_.FullName.Substring($app.Length + 1).Replace('\', '/'); SHA256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
        })
        ConvertTo-Json -InputObject $inventory -Depth 3 | Set-Content -LiteralPath (Join-Path $app 'SHA256SUMS.json') -Encoding utf8
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $zip = Join-Path $dist ("LER-{0}-Portable-x64.zip" -f $manifest.version)
        if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip }
        # ZipFile includes the hidden .ler runtime directory, unlike wildcard archiving.
        [IO.Compression.ZipFile]::CreateFromDirectory($app, $zip, [IO.Compression.CompressionLevel]::Optimal, $false)
        $zipHash = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
        "$zipHash  $([IO.Path]::GetFileName($zip))" | Set-Content -LiteralPath "$zip.sha256" -Encoding ascii
        Write-Host "Portable package ready: $zip"
    }
} finally {
    $resolvedWork = [IO.Path]::GetFullPath($work)
    if (-not $resolvedWork.StartsWith([IO.Path]::GetFullPath($dist) + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Build folder is outside dist.' }
    if (Test-Path -LiteralPath $resolvedWork) { Remove-Item -LiteralPath $resolvedWork -Recurse -Force }
}
