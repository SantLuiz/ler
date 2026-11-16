# Install LER on Windows x64

Open `LER-<version>-Setup-x64.exe` and follow the graphical wizard. Choose English or Brazilian Portuguese, select the installation folder and integrations, and click Install.

Everything LER needs is included. Installation and reading work offline. You do not need Git, Node.js, npm, a global Bun installation or administrator access. The runtime and dependencies are private components inside the LER folder.

The default folder is `%LOCALAPPDATA%\Programs\LER`. You may choose another empty folder where your user account can write.

Open LER from the Start menu or a desktop shortcut. If enabled during installation, you can also run `LER` in a new terminal or choose **Open with LER** for EPUB, TXT and PDF files in File Explorer (under **Show more options** on Windows 11). The Explorer menu follows the installer language.

Normal shortcuts and the `LER` command open the home screen directly. Select your library inside the app by clicking the path in the search field or pressing **Ctrl+L**. Choose **Use this folder** to confirm.

Use **F3** or `/settings` to change appearance and language. You can also run `LER --lang en`, `LER --lang pt-BR`, or use `/language en` and `/language pt-BR` inside LER.

Keep books outside the application folder. Reading progress, highlights, preferences and caches are stored in the installation's `.ler` folder. Back up this folder to preserve your reading data.

## Update

Close LER and run the new installer in the same folder. Reading data in `.ler` is preserved during updates. Existing folders that were not installed by this wizard are rejected to avoid mixing files.

## Remove

Close LER and use **Settings > Apps > Installed apps > LER > Uninstall**, or open `unins000.exe` in the installation folder. You can also reopen the installer and select **Uninstall LER and delete all its data and settings** on the maintenance page.

Removal deletes the application, its private runtime, dependencies, progress, highlights, preferences and caches after confirmation. External books are preserved. Back up `.ler` before uninstalling if you want to keep your reading data.

The installer does not contain development tools, Git history or personal reading data from the build machine.
