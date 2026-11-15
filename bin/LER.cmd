@echo off
setlocal DisableDelayedExpansion
set "LER_ROOT=%~dp0.."
set "TEMP=%LER_ROOT%\.ler\tmp"
set "TMP=%TEMP%"
set "TMPDIR=%TEMP%"
set "BUN_RUNTIME_TRANSPILER_CACHE_PATH=%LER_ROOT%\.ler\cache\transpiler"
if not exist "%TEMP%" mkdir "%TEMP%"
if exist "%LER_ROOT%\node_modules\bun\bin\bun.exe" goto local
where bun >nul 2>nul
if errorlevel 1 goto missing
bun --preload "%LER_ROOT%\scripts\preload.ts" "%LER_ROOT%\src\main.tsx" %*
exit /b %errorlevel%
:local
"%LER_ROOT%\node_modules\bun\bin\bun.exe" --preload "%LER_ROOT%\scripts\preload.ts" "%LER_ROOT%\src\main.tsx" %*
exit /b %errorlevel%
:missing
echo LER: execute scripts\install.cmd na pasta do repositorio para instalar as dependencias. 1>&2
exit /b 1
