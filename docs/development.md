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

All runtime data stays in `.ler/` inside the installation. Library state, highlights and preferences are under `.ler/libraries/`; caches and temporary files are separate. The global tab manifest is `.ler/workspace.json`; its file and library paths are relative to the installation for portability. `ReadingWorkspace` resolves absolute file paths in memory and routes reading data to each owning library, retaining its lock until shutdown. Library selection changes catalog/preferences without remounting the reader or closing PDF workers. Independent processes share the manifest with last-save-wins behavior; library-state locks still prevent concurrent edits to the same library. Runtime-state schema version 1 is preserved in LER 1.1.0, so existing reading data remains compatible.

The user runs the managed Windows installation. After user-facing changes, rebuild with `scripts/build-release.ps1` and run `scripts/update-installed.ps1` to update that installation while preserving reading data and integration choices. Close LER first. For installer tests, build with `-ValidationBuild` and run `scripts/test-installer.ps1`: the separate AppId keeps the real installation intact. Windows icons derive from the existing pixel logo through `scripts/generate-icon.ts`. Normal launches, including legacy `--choose` shortcuts, open home without a console directory prompt. Reopening Setup offers update or full removal.

## Install and verify

With Bun 1.4.4 or newer:

```powershell
bun install --frozen-lockfile
bun run check
```

With Node.js/npm instead:

```powershell
.\scripts\install.cmd -Development -NoPath -NoContextMenu
.\node_modules\.bin\bun.cmd run check
```

`check` runs strict TypeScript checks and the full Bun test suite. Tests cover the native renderer, keyboard/mouse interaction, EPUB/TXT/PDF, highlights, timing, persistence/recovery, workers, CLI, literal Windows paths, installer planning and file forwarding. Installer tests do not change PATH or context-menu registrations. Run the interactive app for visual terminal checks; image quality depends on the terminal.

`bun scripts/benchmark-pdf.ts` compares the previous PNG page pipeline with direct pixels and cached pixels using a generated raster PDF. It excludes document opening and terminal output. See [performance analysis and limits](performance.md) (Portuguese).

The regular installer uses production dependencies and retains a bootstrapped Bun in `.ler/runtime/`. Use `-Development` for the compiler and types. `web-tree-sitter` is explicit because OpenTUI needs it at runtime; unrelated peer dependencies can then be omitted in production. `bun scripts/dependency-size.ts [installation]` measures dependency files, counting hard links once. See the [dependency audit](dependencies.md) (Portuguese).

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
