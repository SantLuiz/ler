#ifndef PayloadDir
  #error PayloadDir is required. Use scripts/build-release.ps1.
#endif

#ifdef ValidationBuild
  #define InstallerId "A68F64DB-2BD7-4597-BD02-5A717870C6C2"
  #define OutputSuffix "-validation"
  #define ShortcutName "LER validation"
#else
  #define InstallerId "5CE15075-9F57-4567-BABA-1B175E233CF1"
  #define OutputSuffix ""
  #define ShortcutName "LER"
#endif
#ifndef AppVersion
  #define AppVersion "1.1.0"
#endif

[Setup]
AppId={{{#InstallerId}}
AppName=LER
AppVersion={#AppVersion}
AppPublisher=LER
AppPublisherURL=https://github.com/SantLuiz/ler
DefaultDirName={localappdata}\Programs\LER
DisableDirPage=no
DisableWelcomePage=no
DefaultGroupName=LER
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.17763
OutputDir={#OutputDir}
OutputBaseFilename=LER-{#AppVersion}-Setup-x64{#OutputSuffix}
SetupIconFile={#PayloadDir}\assets\ler.ico
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ChangesEnvironment=yes
ChangesAssociations=yes
CloseApplications=yes
RestartApplications=no
UninstallDisplayName=LER
UninstallDisplayIcon={app}\assets\ler.ico
Uninstallable=yes

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
brazilianportuguese.StartMenu=Adicionar LER ao menu Iniciar
brazilianportuguese.Desktop=Adicionar atalho na área de trabalho
brazilianportuguese.Path=Disponibilizar o comando LER no terminal
brazilianportuguese.Context=Adicionar "Abrir com LER" para EPUB, PDF e TXT
english.StartMenu=Add LER to the Start menu
english.Desktop=Add a desktop shortcut
english.Path=Make the LER command available in terminals
english.Context=Add "Open with LER" for EPUB, PDF and TXT
brazilianportuguese.Maintenance=Manutenção do LER
brazilianportuguese.MaintenanceDescription=O LER já está instalado neste computador.
brazilianportuguese.MaintenancePrompt=Escolha o que deseja fazer:
brazilianportuguese.Update=Instalar ou atualizar o LER, preservando os dados de leitura
brazilianportuguese.Remove=Desinstalar o LER e apagar todos os seus dados e configurações
brazilianportuguese.RemoveError=Não foi possível concluir a desinstalação. Feche o LER e tente novamente.
english.Maintenance=LER maintenance
english.MaintenanceDescription=LER is already installed on this computer.
english.MaintenancePrompt=Choose what you want to do:
english.Update=Install or update LER, preserving reading data
english.Remove=Uninstall LER and delete all its data and settings
english.RemoveError=Uninstallation could not finish. Close LER and try again.

[Messages]
brazilianportuguese.WelcomeLabel2=Este assistente instalará o LER no seu computador.%n%nTudo o que o leitor precisa está incluído. Não é necessário instalar ferramentas adicionais ou conectar à internet.%n%nSeus livros podem permanecer nas pastas atuais.
english.WelcomeLabel2=This wizard will install LER on your computer.%n%nEverything the reader needs is included. No additional tools or internet connection are required.%n%nYour books can stay in their current folders.
brazilianportuguese.ConfirmUninstall=Deseja remover completamente %1 e todos os seus dados de leitura (progresso, destaques, preferências e caches)?%n%nLivros fora da pasta do aplicativo serão preservados.
english.ConfirmUninstall=Remove %1 and all reading data (progress, highlights, preferences and caches)?%n%nBooks outside the application folder will be preserved.

[Tasks]
Name: startmenu; Description: "{cm:StartMenu}"; Flags: checkedonce
Name: desktopicon; Description: "{cm:Desktop}"; Flags: unchecked
Name: addtopath; Description: "{cm:Path}"; Flags: checkedonce
Name: contextmenu; Description: "{cm:Context}"; Flags: checkedonce

[Files]
Source: "{#PayloadDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[INI]
Filename: "{app}\ler-install.ini"; Section: "LER"; Key: "Installer"; String: "InnoSetup"

[Icons]
Name: "{userprograms}\{#ShortcutName}"; Filename: "{app}\.ler\runtime\bun.exe"; Parameters: "--preload ""{app}\scripts\preload.ts"" ""{app}\src\main.tsx"""; WorkingDir: "{userdocs}"; IconFilename: "{app}\assets\ler.ico"; Check: ShouldCreateStartMenuIcon
Name: "{userdesktop}\{#ShortcutName}"; Filename: "{app}\.ler\runtime\bun.exe"; Parameters: "--preload ""{app}\scripts\preload.ts"" ""{app}\src\main.tsx"""; WorkingDir: "{userdocs}"; IconFilename: "{app}\assets\ler.ico"; Check: ShouldCreateDesktopIcon

[Registry]
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.epub\shell\LER.open"; ValueType: string; ValueData: "Abrir com LER"; Flags: uninsdeletekey; Tasks: contextmenu
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.epub\shell\LER.open\command"; ValueType: string; ValueData: """{app}\.ler\runtime\bun.exe"" --preload ""{app}\scripts\preload.ts"" ""{app}\src\main.tsx"" --open ""%1"""; Tasks: contextmenu
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.pdf\shell\LER.open"; ValueType: string; ValueData: "Abrir com LER"; Flags: uninsdeletekey; Tasks: contextmenu
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.pdf\shell\LER.open\command"; ValueType: string; ValueData: """{app}\.ler\runtime\bun.exe"" --preload ""{app}\scripts\preload.ts"" ""{app}\src\main.tsx"" --open ""%1"""; Tasks: contextmenu
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.txt\shell\LER.open"; ValueType: string; ValueData: "Abrir com LER"; Flags: uninsdeletekey; Tasks: contextmenu
Root: HKCU; Subkey: "Software\Classes\SystemFileAssociations\.txt\shell\LER.open\command"; ValueType: string; ValueData: """{app}\.ler\runtime\bun.exe"" --preload ""{app}\scripts\preload.ts"" ""{app}\src\main.tsx"" --open ""%1"""; Tasks: contextmenu

[UninstallDelete]
Type: filesandordirs; Name: "{app}\.ler"
Type: files; Name: "{app}\ler-install.ini"
Type: dirifempty; Name: "{app}"

[Code]
var
  MaintenancePage: TInputOptionWizardPage;
  InstalledDirectory: String;
  MaintenanceFinished: Boolean;

function OwnsShortcut(FileName: String): Boolean;
var Shell, Link: Variant;
begin
  Result := False;
  if not FileExists(FileName) then Exit;
  try
    Shell := CreateOleObject('WScript.Shell');
    Link := Shell.CreateShortcut(FileName);
    Result := CompareText(Link.TargetPath, ExpandConstant('{app}\.ler\runtime\bun.exe')) = 0;
  except
    Log('Could not inspect existing LER shortcut.');
  end;
end;

function ShouldCreateStartMenuIcon: Boolean;
begin
  Result := WizardIsTaskSelected('startmenu') or OwnsShortcut(ExpandConstant('{userprograms}\{#ShortcutName}.lnk'));
end;

function ShouldCreateDesktopIcon: Boolean;
begin
  Result := WizardIsTaskSelected('desktopicon') or OwnsShortcut(ExpandConstant('{userdesktop}\{#ShortcutName}.lnk'));
end;

procedure InitializeWizard;
begin
  if RegQueryStringValue(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{{#InstallerId}}_is1', 'InstallLocation', InstalledDirectory) then
    if FileExists(AddBackslash(InstalledDirectory) + 'unins000.exe') then begin
      MaintenancePage := CreateInputOptionPage(wpWelcome, CustomMessage('Maintenance'), CustomMessage('MaintenanceDescription'), CustomMessage('MaintenancePrompt'), True, False);
      MaintenancePage.Add(CustomMessage('Update'));
      MaintenancePage.Add(CustomMessage('Remove'));
      MaintenancePage.SelectedValueIndex := 0;
      if ExpandConstant('{param:MODE|install}') = 'uninstall' then MaintenancePage.SelectedValueIndex := 1;
    end;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var ExitCode: Integer; Arguments: String;
begin
  Result := True;
  if MaintenancePage = nil then Exit;
  if (CurPageID = MaintenancePage.ID) and (MaintenancePage.SelectedValueIndex = 1) then begin
    Arguments := '/NORESTART';
    if WizardSilent then Arguments := Arguments + ' /VERYSILENT /SUPPRESSMSGBOXES';
    if Exec(AddBackslash(InstalledDirectory) + 'unins000.exe', Arguments, ExpandConstant('{tmp}'), SW_SHOW, ewWaitUntilTerminated, ExitCode) and (ExitCode = 0) then begin
      MaintenanceFinished := True;
      WizardForm.Close;
    end else MsgBox(CustomMessage('RemoveError'), mbError, MB_OK);
    Result := False;
  end;
end;

procedure CancelButtonClick(CurPageID: Integer; var Cancel, Confirm: Boolean);
begin
  if MaintenanceFinished then Confirm := False;
end;

function PathWithout(Value, Entry: String): String;
var Part: String; P: Integer;
begin
  Result := '';
  while Value <> '' do begin
    P := Pos(';', Value);
    if P = 0 then P := Length(Value) + 1;
    Part := Copy(Value, 1, P - 1);
    Delete(Value, 1, P);
    if (CompareText(RemoveBackslashUnlessRoot(Part), RemoveBackslashUnlessRoot(Entry)) <> 0) and (Part <> '') then begin
      if Result <> '' then Result := Result + ';';
      Result := Result + Part;
    end;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var Value, Entry: String;
begin
  if (CurStep = ssPostInstall) and WizardIsTaskSelected('addtopath') then begin
    Entry := ExpandConstant('{app}\bin');
    RegQueryStringValue(HKCU, 'Environment', 'Path', Value);
    Value := PathWithout(Value, Entry);
    if Value <> '' then Value := ';' + Value;
    if not RegWriteExpandStringValue(HKCU, 'Environment', 'Path', Entry + Value) then
      RaiseException('Nao foi possivel configurar o comando LER.');
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var Value, Cleaned: String;
begin
  if CurUninstallStep = usUninstall then begin
    if RegQueryStringValue(HKCU, 'Environment', 'Path', Value) then begin
      Cleaned := PathWithout(Value, ExpandConstant('{app}\bin'));
      if Value <> Cleaned then RegWriteExpandStringValue(HKCU, 'Environment', 'Path', Cleaned);
    end;
  end;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var FindRec: TFindRec;
begin
  Result := '';
  if DirExists(ExpandConstant('{app}')) and not FileExists(ExpandConstant('{app}\ler-install.ini')) then begin
    if FindFirst(ExpandConstant('{app}\*'), FindRec) then begin
      try
        repeat
          if (FindRec.Name <> '.') and (FindRec.Name <> '..') then begin
            Result := 'Escolha uma pasta vazia e exclusiva para o LER.';
            Break;
          end;
        until not FindNext(FindRec);
      finally
        FindClose(FindRec);
      end;
    end;
  end;
end;

