# Installed LER workflow

- The user runs the version installed by the graphical installer, not this checkout. For user-facing changes, rebuild the setup executable and update that managed installation as part of completing the work.
- Discover the active installation from `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\{5CE15075-9F57-4567-BABA-1B175E233CF1}_is1` (`InstallLocation`). Preserve `.ler` reading data during updates. Check whether LER is running before replacing files.
- Use `scripts/build-release.ps1` to build; install the resulting executable over the existing installation. Keep its current folder and selected integrations. Do not uninstall the user's installation to test removal.
- Use the separate validation AppId (`build-release.ps1 -ValidationBuild` and `test-installer.ps1`) for installation/removal tests while the user's LER is installed.
- Normal shortcuts and terminal launches start at the home screen without a directory prompt. Library selection belongs inside the app.
- Windows icons must derive from the existing pixel logo in `src/ui/logo.ts`; regenerate with `bun scripts/generate-icon.ts`.
