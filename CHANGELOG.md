# Changelog

## 1.1.3 — 2026-11-15

- Precompile the installed interface during release builds, removing Babel and its compiler dependencies from the runtime installation.
- Load terminal and interface modules only when opening the interface; help, version, checks and file forwarding avoid that work.
- Preserve module locations, worker assets, Unicode paths and existing reading data during migration from source-based installers.
- Validate the precompiled distribution with the CLI and reader test suites, plus isolated installation, update and removal checks.
- Add a reproducible startup/import memory benchmark and optional cleanup of generated builds while retaining the current installer.

## 1.1.2 — 2026-11-15

- Add a complete English website at `/en/` and a Portuguese/English language switch that works without JavaScript.
- Localize download metadata, clipboard messages, command-line help and startup messages.
- Translate Explorer menu labels and installer errors using the selected installation language; include both English and Portuguese reading guides and release notes.
- Standardize internal reader/storage diagnostics and maintenance scripts in English; preserve Portuguese translations and Unicode test fixtures.
- Validate the installer in both languages and add regression coverage for bilingual site behavior and CLI language overrides.


## 1.1.1 — 2026-11-15

- Add a GitHub Pages project website matching LER's pixel logo and terminal palette, with Windows downloads, source cloning and Portuguese installation and usage instructions.
- Publish tested Windows installers and SHA-256 checksums through GitHub Releases.
- Open the home screen directly from normal shortcuts and terminal launches; choose libraries inside the app.
- Preserve empty entries and trailing separators in the user's PATH when installing, updating and removing the Windows integration.


## 1.1.0 — 2026-11-15

- Switch libraries in the running app using the abbreviated path, Ctrl+L or `/change-library`, with favorites, recent and most-used folders.
- Keep book tabs open across library changes and restore them on restart, saving progress, highlights and reading time to each original library.
- Add coordinated color palettes while preserving blue and white as the default.
- Render PDF pages through direct pixels with bounded shared caching and next-page preparation, preserving resolution, zoom and page navigation.
- Reduce temporary PDF pixel allocations and load PNG encoding only when needed.
- Batch catalog updates, debounce passage search, preserve Unicode search positions and avoid repeated page and highlight processing.
- Skip unchanged disk writes while preserving recovery backups and release resources when closing books.
- Install runtime dependencies by default, preserve a local offline Bun runtime and offer `-Development` for the compiler and types.
- Add regression coverage and reproducible performance/size measurements; 79 tests and strict TypeScript validation pass.

Reading-state schema remains version 1. Runtime data, books, dependencies, caches and backups stay outside Git.

## 1.0.0 — 2026-11-15

- Local terminal reading for EPUB, TXT and PDF, with multiple books and saved positions.
- Keyboard/mouse text selection, persistent highlights, bookmarks and passage search.
- Reading statistics, chapter averages and remaining-time estimates.
- Searchable command input, contextual commands and a Tab options popup on home.
- PDF zoom, page navigation and reading bands.
- Portuguese/English interface and per-library appearance settings.
- Windows installer, user PATH integration, Explorer “Abrir com LER” and file forwarding to a running library.
- Source organized by responsibility, concise bilingual installation guides and local cache cleanup.

Reading-state schema remains compatible with the prototype. Generated files, dependencies, books and user data are excluded from version control.
