# LER commands

[Back to README](../README.md) · [Português](commands.pt-BR.md)

Open the palette with `/`, F2 or Ctrl+P. Type to filter, use arrows to choose, Tab to complete, Enter to run and Escape to return. Mouse selection also works. Names are always English, and available options follow the current context.

`<argument>` is required and `[argument]` is optional: enter just the value without the brackets. Chapter, page and book-tab numbers start at **1**. Invalid values keep the input open without changing your position or settings.

| Command | Purpose |
| --- | --- |
| `/change-library [path]` | Choose another library directory without closing LER; omit to open the folder picker |
| `/library` | Browse library folders |
| `/palette [name]` | Choose `blue`, `mint`, `lavender`, `amber` or `coral`; omit value to cycle |
| `/settings` | Open appearance and preferences |
| `/continue` | Resume the last reading position |
| `/help` | Show keyboard shortcuts |
| `/refresh` | Refresh the catalog after file changes |
| `/quit` | Save and quit |
| `/highlights` | Browse, filter and open highlights |
| `/stats` | Show library statistics |
| `/search [text]` | Search a passage in EPUB/TXT |
| `/contents` | Open contents or PDF page list |
| `/bookmark` | Toggle bookmark at the current position |
| `/bookmarks` | List book bookmarks |
| `/highlight` | Toggle selection cursor in EPUB/TXT |
| `/pause` | Pause/resume reading time |
| `/home` | Go home while keeping books open |
| `/close` | Save and close the current book |
| `/save` | Save progress, highlights and preferences now |
| `/info` | Show current book information and file |
| `/tabs` | Filter and choose an open book |
| `/switch <number>` | Switch to the book number shown in /tabs |
| `/next-tab` | Next open book |
| `/previous-tab` | Previous open book |
| `/chapter <number>` | Go to EPUB/TXT chapter or section |
| `/page <number>` | Go to PDF page |
| `/next` | Next chapter or page |
| `/previous` | Previous chapter or page |
| `/start` | Beginning of book |
| `/end` | End of book |
| `/back` | Position before a jump in this session |
| `/width <40–140>` | Reading width in columns |
| `/spacing <0–2>` | Extra lines of spacing |
| `/zoom <100–400>` | PDF zoom percentage; also accepts 150% |
| `/fit` | Fit and center the entire PDF page |
| `/animation [on\|off]` | Home animations; omit argument to toggle |
| `/language [en\|pt-BR]` | Language; omit argument to toggle |
| `/protocol [auto\|blocks]` | Image protocol; omit argument to toggle |

Examples: `/chapter 12`, `/page 25`, `/search a phrase`, `/width 88`, `/zoom 150`, `/animation off`.

`/back` keeps up to 50 positions per book during the session. Jumps do not count as completed chapters. Preferences persist per library; PDF zoom applies to the current view. `/search` remains unavailable in image-rendered PDFs.

In Highlights, type to filter, use Tab to switch between all books and the last book, Enter to open and Ctrl+D to delete.
