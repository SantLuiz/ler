@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*
if errorlevel 1 exit /b 1
set "PATH=%~dp0..\bin;%PATH%"
echo LER pronto. Entre na pasta dos livros e execute LER.
