# LER — Leitor Extremamente Reduzido

A **terminal reader for EPUB, TXT and PDF**, designed primarily for the keyboard. Version **1.1.0** reads local files without accounts, book uploads or telemetry. Installation and testing focus on Windows.

[Português (Brasil)](docs/README.pt-BR.md) · [Commands](docs/commands.md)

## What it does

- Folder-based library with filename search and EPUB title/author search.
- Multiple open books, saved reading positions and bookmarks.
- Keyboard or mouse text selection, saved highlights and passage search.
- Reading statistics, average chapter duration and remaining-time estimates.
- PDF zoom with page and reading-band navigation.
- **Abrir com LER** in File Explorer and a Portuguese or English interface.

## First installation on Windows

Install **Git** and either **Bun 1.4.4 or newer** or **Node.js with npm**. If Bun is missing, the installer prepares a local copy. Installation needs internet access; reading works offline afterward.

These commands are for **PowerShell**. Open a terminal and run:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\Documents\Biblioteca"
Set-Location "$env:USERPROFILE\Documents\Biblioteca"
git clone https://github.com/SantLuiz/ler.git LER
Set-Location .\LER
.\scripts\install.cmd
```

The installer downloads runtime dependencies (development tools are available with `-Development`), keeps a bootstrapped Bun in `.ler/runtime/`, adds `LER` to your user PATH and registers **Abrir com LER** for EPUB, TXT and PDF files. Administrator access is not required, and your default file applications stay unchanged.

Put books in `Biblioteca`, using subfolders if desired. Keep them **outside the application folder**:

```text
Biblioteca/
├── My book.epub
├── Studies/
│   └── Manual.pdf
└── LER/                 application
```

Close and reopen your terminal to load the updated PATH. Then start reading:

```powershell
Set-Location "$env:USERPROFILE\Documents\Biblioteca"
LER
```

Type a title or author and press Enter. **Tab** opens home options, including folder browsing. The abbreviated library path appears inside the search box. Click it or press **Ctrl+L** to browse or type a different library directory, without closing LER. Enter explores folders; choose **Use this folder** or press Ctrl+Enter to switch. `/change-library [path]` is also available. Open book tabs stay available when you switch libraries. Each tab keeps its original file and saves progress, highlights and reading time to its original library; search, catalog, statistics and appearance follow the selected library. After adding or removing books, use `/refresh` or Ctrl+R on home.

You can also open a folder or an individual file directly:

```powershell
LER "D:\Books"
LER --open "D:\Books\My book.epub"
```

In File Explorer, right-click a book and choose **Abrir com LER**. On Windows 11, look under **Show more options**. If the library is already running in the current version, the file is forwarded to that session.

Tabs are restored on the next launch. Books with the same title show their parent folder in the tab; identical file contents reuse the existing tab. A moved or deleted file can fail to reopen, but its saved reading data is preserved. Many open books, especially PDFs, use more memory; closing a PDF tab releases its worker. Libraries visited in the session remain reserved until LER closes to prevent conflicting edits. The saved tab list is shared by this installation: if independent windows run simultaneously, the last window to save determines that list.

The library picker has **Folders**, **Favorites & recent**, and **Most used** tabs. Switch tabs with Tab/Shift+Tab, type to filter saved paths, and press Enter or click a path to open it. Use **Ctrl+F** or the star to pin/unpin a favorite. Previously registered libraries are discovered automatically; usage counts start with this feature. Favorites remain saved even when a folder is temporarily unavailable.

## Essential controls

| Key | Action |
| --- | --- |
| Tab on home | Open options; arrows/Tab choose, Enter confirms and Escape closes |
| Arrows, Page Up/Down, Space | Navigate while reading |
| `/`, F2 or Ctrl+P | Open commands; type to filter, Tab completes and Enter runs |
| `/search passage` | Search text inside EPUB/TXT |
| `v`, then Shift + arrows | Enable the cursor and select text; Ctrl + arrows moves by words |
| Ctrl+S | Save the selection as a highlight |
| `b` / Shift+B | Toggle a bookmark / browse bookmarks |
| F6 / Shift+F6 | Switch tabs |
| F7 / F8 | Highlights / statistics |
| `+`, `-`, `0` in PDF | Zoom in, zoom out and fit the whole page |
| Escape | Close a popup or selection first; then save and close the book |
| Ctrl+C | Save and quit |

Command names are always in English. See the [full reference](docs/commands.md). Mouse support includes menus, navigation and text selection.

In **Appearance** (F3 or `/settings`), select **Color palette** and use Left/Right. Presets include blue & white (default), mint & cream, lavender/rose/ivory, amber & ivory, and coral/teal/cream, with a two- or three-color preview. The choice persists per library. You can also use `/palette blue`, `/palette mint`, `/palette lavender`, `/palette amber`, or `/palette coral`.

## Data and limitations

Reading positions, highlights, preferences and the catalog live in **`LER/.ler/`**, separated by library. Back up that folder to preserve your data. Books are identified by their content, helping preserve progress after renaming a file.

EPUB/TXT use reflowed text with simplified formatting. PDFs are displayed as images: text selection, text search and OCR are unavailable. DRM-protected books, password-protected files and fixed-layout EPUBs are unsupported. Image quality depends on terminal capabilities; use at least **60 columns and 20 rows**.

Reading time is approximate. It pauses outside reading, in panels and after two minutes without interaction; Ctrl+T pauses/resumes manually. Averages use chapters traversed from start to finish; navigation jumps do not count as completion. Estimates stay empty until sufficient data is available.

## Update or remove integration

Close LER, enter the application folder, and run:

```powershell
git pull --ff-only
.\scripts\install.cmd
```

Installer options include `-NoPath`, `-NoContextMenu`, `-SkipDependencies` and `-Development`. To remove PATH and context-menu integration while preserving books and reading data:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Uninstall
```

After closing LER, `scripts/clean.ps1` can remove disposable caches and temporary files to free disk space. A later installation may need to download them again. Libraries and backups are preserved.

## Development and license

Source lives in `src/`, tests in `tests/` and installers in `scripts/`. Installed dependencies and generated data do not belong in Git. See [structure and checks](docs/development.md).

```powershell
.\scripts\install.cmd -Development -NoPath -NoContextMenu
.\node_modules\.bin\bun.cmd run check
```

[MIT license](LICENSE).
