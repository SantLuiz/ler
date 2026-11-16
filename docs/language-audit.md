# Language audit

Reviewed on 2026-11-15 for LER 1.1.2.

## Findings and changes

| Area | Finding | Result |
| --- | --- | --- |
| Website | Only Portuguese content, including the example terminal, metadata, accessibility labels, clipboard feedback and download size formatting | Full static English page at `/en/`; reciprocal PT/EN links; language-aware JavaScript messages and numbers |
| CLI | Help mixed both languages; startup errors and the final help hint included fixed Portuguese | Help follows `--lang` or the system locale; startup messages use the selected language; neutral console title |
| Library switching | Two messages always displayed both languages together | Messages follow the current reader language |
| Explorer, graphical installation | Three registry labels always said “Abrir com LER”, even in an English installation | Labels use the installer's selected language via `CustomMessages` |
| Installer | Folder validation and PATH failure messages were Portuguese literals | Both messages use English and Portuguese `CustomMessages` |
| Source installation | Explorer label and maintenance output assumed Portuguese | Menu follows the Windows UI language; source install, build, update and cleanup diagnostics use English |
| Reader and storage internals | Technical errors mixed Portuguese and English | English diagnostic messages, consistent with the rest of these modules |
| Distribution | Only a Portuguese bundled reading guide and release notes | Both languages are included; release notes show English and Portuguese |
| Tests | File-forwarding assertion relied on an English fragment in a bilingual message | Test explicitly requests English instead of depending on the host locale |

## Intentionally retained Portuguese

- **LER — Leitor Extremamente Reduzido** is the project's name. The English website adds a descriptive English subtitle without renaming the project.
- Portuguese UI strings are real translations, paired with English strings in the reader's labels, palettes and command descriptions.
- Portuguese documentation and dated performance/dependency reports are authored content, not mock application output.
- Tests use Portuguese text, accented filenames, spaces and shell metacharacters to exercise encoding and path handling. Those fixtures should not be translated away.
- **Dom Casmurro** and **Machado de Assis** are a book title and author in the explicitly labeled website illustration.
- Saved directory names, book metadata, command names, fragment IDs and reading data are not translated or migrated.

The site retains Portuguese at `/` so existing links keep working. English lives at `/en/`; visitors choose the language with ordinary links, without storage, automatic redirects or a JavaScript requirement. English documentation links point to the existing English command reference.

## Validation

The regression suite checks both static pages, reciprocal language links, matching sections, download metadata, clipboard success/failure messages and CLI language selection. Installer validation accepts `-Language english` or `-Language brazilianportuguese`; distribution workflows exercise both with the separate validation AppId.
