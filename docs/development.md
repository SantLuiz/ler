# Development

[README](../README.md) · [Português](README.pt-BR.md)

## Structure

```text
bin/                 Windows command launcher
scripts/             Installation, Explorer integration, bootstrap and cache cleanup
src/
  main.tsx           Startup, terminal lifecycle and direct file opening
  cli.ts             Command-line options and version
  readers/           EPUB, TXT, PDF and format detection
  library/           Catalog indexing and its background worker
  reading/           Text selection, highlighting, pagination and search worker
  state/             Local persistence, preferences, statistics and file-open queue
  ui/                Application, command catalog, home and terminal components
tests/               Automated tests with small, self-authored fixtures
docs/                Portuguese README and command reference
.github/workflows/   Windows CI
```

All runtime data stays in `.ler/` inside the installation. Library state, highlights and preferences are under `.ler/libraries/`; caches and temporary files are separate. Runtime-state schema version 1 is preserved in LER 1.0.0, so existing reading data remains compatible.

## Install and verify

With Bun 1.4.4 or newer:

```powershell
bun install --frozen-lockfile
bun run check
```

With Node.js/npm instead:

```powershell
.\scripts\install.cmd -NoPath -NoContextMenu
.\node_modules\.bin\bun.cmd run check
```

`check` runs strict TypeScript checks and the full Bun test suite. Tests cover the native renderer, keyboard/mouse interaction, EPUB/TXT/PDF, highlights, timing, persistence/recovery, workers, CLI, literal Windows paths, installer planning and file forwarding. Installer tests do not change PATH or context-menu registrations. Run the interactive app for visual terminal checks; image quality depends on the terminal.

Both lockfiles are intentional: `bun.lock` fixes Bun installs; `package-lock.json` supports the npm fallback. Keep them synchronized. The runtime minimum and locally bootstrapped Bun version are pinned in `package.json` and checked by the installer.

## What belongs in Git

Commit source, scripts, documentation, tests, workflow configuration and dependency manifests/lockfiles. Do not commit books, installed dependencies, executables, caches, reading state, personal configuration, backups or generated test output. `.gitignore` excludes those paths.

The installer creates `node_modules/` and `.ler/` as needed. Tests create and clean their own temporary fixtures. The release tag names the source version, not a copy of a developer's installation.

## Free local disk space

Close LER first, then run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\clean.ps1
```

This only removes `.cache/`, `.ler/cache/` and `.ler/tmp/`. It preserves library state, legacy data, backups and installed dependencies. The next dependency install may need network access again.
