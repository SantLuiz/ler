# Changelog

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
