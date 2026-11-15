# LER — Leitor Extremamente Reduzido

> A focused EPUB reader for the terminal.

LER is a local, keyboard-first EPUB reader built with TypeScript, SolidJS and OpenTUI. It keeps the reading experience intentionally small: open a library, find a book, read with predictable pagination, and resume exactly where you stopped.

[![CI](https://github.com/SantLuiz/ler/actions/workflows/ci.yml/badge.svg)](https://github.com/SantLuiz/ler/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Status:** early development / pre-v0.1.0. The automated suite is green, but native terminal graphics still need validation in a real Windows Terminal session.

[Português (Brasil)](README.pt-BR.md) · [Project plan](PROJECT_PLAN.md) · [Contributing](CONTRIBUTING.md)

## Why LER?

Most EPUB readers are designed around a browser window. LER is for people who want a quiet, local reading workflow that stays in the terminal:

- no account, server, upload or network service;
- books remain in the folders where you keep them;
- progress, bookmarks and preferences are stored locally beside the installation;
- search works across filenames, titles and authors, then inside the open book;
- keyboard shortcuts make the common path fast, while mouse input remains available.

## Features at a glance

| Area | What LER provides |
| --- | --- |
| Library | Recursive EPUB discovery, metadata indexing and folder navigation |
| Reading | Screen paging, chapter navigation, contents, images and simplified HTML text |
| Search | Accent-insensitive library search and cancellable in-book search with up to 1,000 matches |
| Continuity | Saved position, bookmarks, open tabs and last-session resume |
| Personalization | Background/text colors, reading width, line spacing, image height and language |
| Runtime | Windows installer, user-level PATH integration, Bun-based development workflow |
| Privacy | Local-only state; no telemetry and no book uploads |

## How it fits together

```mermaid
flowchart LR
    A[Library folder] --> B[CLI entrypoint]
    B --> C[OpenTUI + Solid UI]
    C --> D[Home search]
    C --> E[EPUB reader]
    C --> F[Settings / tabs / bookmarks]
    D --> G[Catalog worker]
    E --> H[EPUB parser + paginator]
    E --> I[Search worker]
    F --> J[Local state]
    G --> J
    H --> J
    I --> J
    J --> K["LER/.ler/libraries/<id>"]
```

The application is deliberately split into small modules: EPUB parsing and normalization live in `src/book.ts`, catalog indexing in `src/catalog.ts`, pagination in `src/pagination.ts`, persistence in `src/storage.ts`, and the terminal UI in `src/app.tsx`.

### Session lifecycle

```mermaid
sequenceDiagram
    participant U as Reader
    participant C as CLI
    participant H as Home screen
    participant W as Worker
    participant S as Local state

    U->>C: Run LER [library]
    C->>S: Load or initialize library state
    C->>H: Show home screen
    U->>H: Type a query
    H->>W: Index/search EPUB metadata
    W-->>H: Stream matching books
    U->>H: Open a result
    H->>S: Save tab and reading position
    U->>C: Quit
    C->>S: Flush state and close resources
```

## Installation on Windows

LER currently targets Windows because its installer and native terminal rendering are Windows-first. Install **Bun 1.4.4+** or **Node.js with npm**, then clone the repository:

```bat
cd /d D:\Library
git clone https://github.com/SantLuiz/ler.git LER
cd LER
install.cmd
```

The installer installs dependencies and adds the repository's `bin` directory to the current user's PATH. It does not require administrator access. Reopen terminals that were already running before installation.

PowerShell users can run the installer directly:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

Useful installer switches:

```powershell
.\install.ps1 -NoPath              # install dependencies without changing PATH
.\install.ps1 -SkipDependencies   # only register the command
.\install.ps1 -Uninstall          # remove LER from the user PATH
```

`-Uninstall` removes only the PATH entry. It preserves the repository, books, progress and bookmarks.

## Running LER

Run `LER` from the folder that contains your books:

```bat
cd /d D:\Books
LER
```

You can also select a different library explicitly:

```bat
LER "D:\Other Books"
LER --choose
LER --library "D:\Other Books"
LER --lang en
LER --check
LER --help
LER --version
```

When the command is launched from inside the cloned repository, LER uses the repository's parent folder as the default library. An explicit path always wins; a remembered library location never silently overrides the current working directory.

## First reading session

1. Start LER from your books folder.
2. Press `F5` or choose the LER tab to focus the home search.
3. Type part of a filename, title or author. Search is case- and accent-insensitive; every typed word must match.
4. Use `↑` / `↓` or `j` / `k`, then press `Enter` to open a book.
5. Press `Esc` or `Ctrl+C` to save and quit. The next session can resume the saved position.

The first non-empty library query builds a metadata catalog in a worker. It reads package metadata rather than every chapter, progressively shows results, and reuses the catalog for unchanged files. Press `Ctrl+R` on the home screen after changing files on disk.

## Keyboard reference

| Key | Action |
| --- | --- |
| `Enter` / `Backspace` | Open directory or book / go to the parent directory |
| `↑` `↓` or `j` `k` | Move one line |
| `←` `→`, `Page Up` / `Page Down`, `Space` | Move one screen |
| `Home` / `End` | Chapter start / chapter end |
| `F6` / `Shift+F6` | Cycle book tabs, home and settings |
| `F4` | Close the active book tab |
| `F3` | Open settings |
| `F5` | Return to home/search |
| `/` | Search inside a book; open slash commands on home |
| `n` / `Shift+N` | Next / previous in-book search result |
| `s` | Open table of contents |
| `b` / `Shift+B` | Toggle bookmark / list bookmarks |
| `d` in bookmarks | Delete the selected bookmark |
| `i` on an image | Open an enlarged image view |
| `F2` / `Ctrl+P` | Open the command palette |
| `Esc` / `Ctrl+C` | Dismiss a panel / save and quit |

Mouse input can select books and tabs and scroll reading content. Menus also support arrow keys and `Enter`.

## Commands and settings

On the home screen, type `/` to use commands:

| Command | Result |
| --- | --- |
| `/library` | Open library/folder navigation |
| `/settings` | Open appearance and language settings |
| `/continue` | Reopen the last saved reading position |
| `/help` | Show contextual help |
| `/refresh` | Refresh the library catalog |
| `/quit` | Save and exit |

Open **Settings** with `F3`, the home option or `/settings`. Changes apply immediately and persist with the selected library. The terminal controls font size; in Windows Terminal, use `Ctrl` + `+` / `-` or `Ctrl` + mouse wheel.

## Data, backups and privacy

LER does not move or copy your books. Application-owned data is stored inside the cloned repository:

```text
LER/
├── .ler/
│   ├── libraries/<library-id>/   # progress, tabs, bookmarks, preferences, catalog
│   ├── cache/                    # package-manager and runtime caches
│   ├── tmp/                      # temporary files
│   └── legacy/                   # archived legacy configuration, when migrated
├── bin/LER.cmd                   # PATH launcher
├── src/                          # application source
├── tests/                        # automated tests
└── install.cmd / install.ps1     # Windows installation helpers
```

All runtime directories are gitignored and created lazily. Back up `.ler/` if you want to preserve reading data. Identical EPUB bytes retain their identity when a file is renamed; reopening a moved file can reconnect its saved progress. The first opening of an old library migrates legacy `.leitor/` data into `.ler/` and preserves unknown files.

## Development

Dependencies are pinned in `bun.lock`. With Bun installed:

```sh
bun install --frozen-lockfile
bun run typecheck
bun test
```

If Bun is not installed globally, the repository's installer can bootstrap it through npm. For a direct local run on Windows:

```powershell
.\node_modules\.bin\bun.cmd run start
```

The CI workflow runs type checking and the full test suite on Windows for every push and pull request.

## Project structure

```text
src/
├── app.tsx               # OpenTUI/Solid application shell and interactions
├── book.ts               # EPUB reading, normalization and image resolution
├── catalog.ts            # Recursive library indexing and metadata extraction
├── catalog.worker.ts     # Background catalog worker
├── cli.ts                # Argument parsing and library selection rules
├── home.ts               # Home screen, commands and folder navigation
├── main.tsx              # Process lifecycle and renderer bootstrap
├── pagination.ts         # Visual pagination and chapter boundaries
├── preferences.ts        # Default and validated appearance settings
├── search.worker.ts      # Background in-book search
├── storage.ts            # State, backups, migration and library isolation
└── components/           # Small reusable UI components
```

## Current limitations

- EPUB 2/3 reflowable text and raster images are supported; DRM and fixed-layout books are not.
- General SVG rendering and full publisher CSS fidelity are not supported.
- Complex typography and inline emphasis are intentionally simplified.
- In-book search returns at most 1,000 matches.
- SIXEL graphics and image interaction still require validation in a real compatible terminal.
- Some error messages remain bilingual while localization is being completed.

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the remaining work before a v0.1.0 release.

## License

LER is released under the [MIT License](LICENSE).
