# LER — Leitor Extremamente Reduzido

Um leitor de **EPUB, TXT e PDF no terminal**, feito para usar principalmente com o teclado. A versão **1.1.0** lê seus arquivos localmente: não exige conta, não envia livros e não usa telemetria. A instalação e os testes têm foco no Windows.

[English](../README.md) · [Comandos](commands.pt-BR.md)

## O que ele faz

- Biblioteca por pastas, com busca por nome e, em EPUB, título e autor.
- Vários livros abertos, retomada da leitura e marcadores de posição.
- Seleção pelo teclado ou mouse, destaques salvos e busca de trechos.
- Estatísticas de leitura, média por capítulo e estimativa de tempo restante.
- PDF com zoom e navegação por páginas e faixas de leitura.
- Menu **Abrir com LER** no Explorador de Arquivos e interface em português ou inglês.

## Primeira instalação no Windows

Você precisa de **Git** e de uma destas opções: **Bun 1.4.4 ou superior**, ou **Node.js com npm**. Se não houver Bun, o instalador prepara uma cópia local dele. A instalação precisa de internet; a leitura funciona offline.

Os comandos abaixo são para **PowerShell**. Abra um terminal e execute:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\Documents\Biblioteca"
Set-Location "$env:USERPROFILE\Documents\Biblioteca"
git clone https://github.com/SantLuiz/ler.git LER
Set-Location .\LER
.\scripts\install.cmd
```

O instalador baixa as dependências de uso (as ferramentas de desenvolvimento ficam disponíveis com `-Development`), mantém o Bun local em `.ler/runtime/`, disponibiliza `LER` no PATH do usuário e registra **Abrir com LER** para EPUB, TXT e PDF. Não é preciso executar como administrador; o aplicativo padrão dos arquivos é preservado.

Coloque seus livros na pasta `Biblioteca`, com subpastas se quiser. Mantenha-os **fora da pasta do aplicativo**:

```text
Biblioteca/
├── Meu livro.epub
├── Estudos/
│   └── Manual.pdf
└── LER/                 aplicativo
```

Feche e reabra o terminal para carregar o PATH. Para começar:

```powershell
Set-Location "$env:USERPROFILE\Documents\Biblioteca"
LER
```

Digite um título ou autor na busca e pressione Enter. **Tab** abre as opções da home, incluindo a navegação pelas pastas. O caminho resumido da biblioteca fica dentro da caixa de busca. Clique nele ou pressione **Ctrl+L** para navegar pelas pastas ou digitar outro diretório, sem fechar o LER. Enter explora as pastas; escolha **Usar esta pasta** ou pressione Ctrl+Enter para trocar. Também há `/change-library [caminho]`. As abas dos livros continuam abertas ao trocar de biblioteca. Cada aba mantém o arquivo original e salva progresso, destaques e tempo de leitura na biblioteca de origem; busca, catálogo, estatísticas e aparência acompanham a biblioteca selecionada. Depois de adicionar ou remover livros, use `/refresh` ou Ctrl+R na home.

Também é possível abrir uma pasta ou um arquivo diretamente:

```powershell
LER "D:\Livros"
LER --open "D:\Livros\Meu livro.epub"
```

No Explorador, clique com o botão direito no livro e escolha **Abrir com LER**. No Windows 11, procure em **Mostrar mais opções**. Se a biblioteca já estiver aberta na versão atual, o arquivo será encaminhado à mesma sessão.

As abas são restauradas na próxima abertura. Livros com o mesmo título mostram a pasta de origem na aba; arquivos de conteúdo idêntico reutilizam a aba existente. Um arquivo movido ou apagado pode não reabrir, mas seus dados de leitura são preservados. Muitos livros abertos, especialmente PDFs, usam mais memória; fechar a aba de um PDF libera seu processo de leitura. As bibliotecas visitadas ficam reservadas até fechar o LER, evitando edições conflitantes. A lista de abas salva é compartilhada pela instalação: se houver janelas independentes simultâneas, a última a salvar determina essa lista.

O seletor de biblioteca tem as abas **Pastas**, **Favoritos e recentes** e **Mais usadas**. Alterne com Tab/Shift+Tab, digite para filtrar os caminhos salvos e use Enter ou clique para abrir. **Ctrl+F** ou a estrela fixa/remove um favorito. Bibliotecas já registradas são encontradas automaticamente; a contagem de acessos começa nesta funcionalidade. Favoritos são preservados mesmo quando a pasta está temporariamente indisponível.

## Controles essenciais

| Tecla | Ação |
| --- | --- |
| Tab na home | Abrir opções; setas/Tab escolhem, Enter confirma e Esc fecha |
| Setas, Page Up/Down, Espaço | Navegar na leitura |
| `/`, F2 ou Ctrl+P | Abrir comandos; digite para filtrar, Tab completa e Enter executa |
| `/search trecho` | Buscar texto dentro de EPUB/TXT |
| `v`, depois Shift + setas | Ativar cursor e selecionar texto; Ctrl + setas navega por palavras |
| Ctrl+S | Salvar a seleção como destaque |
| `b` / Shift+B | Alternar marcador / ver marcadores |
| F6 / Shift+F6 | Alternar abas |
| F7 / F8 | Ver destaques / estatísticas |
| `+`, `-`, `0` no PDF | Ampliar, reduzir e ajustar a página inteira |
| Esc | Fechar primeiro o popup ou seleção; depois salvar e fechar o livro |
| Ctrl+C | Salvar e sair |

Todos os nomes de comandos são em inglês, independentemente do idioma da interface. Veja a [referência completa](commands.pt-BR.md). O mouse também permite abrir opções, navegar e selecionar texto.

Em **Aparência** (F3 ou `/settings`), escolha **Paleta de cores** com as setas ←/→. Há azul e branco (padrão), menta e creme, lavanda/rosa/marfim, âmbar e marfim, e coral/turquesa/creme. Uma amostra mostra as duas ou três cores de cada opção. A escolha é salva por biblioteca e também pode ser feita por `/palette mint`, `/palette lavender`, `/palette amber`, `/palette coral` ou `/palette blue`.

## Dados e limitações

Seu progresso, destaques, preferências e catálogo ficam em **`LER/.ler/`**, separados por biblioteca. Faça backup dessa pasta para preservar os dados. O LER identifica livros pelo conteúdo, ajudando a manter o progresso após renomeá-los.

EPUB/TXT são exibidos como texto fluido, com formatação simplificada. PDF é exibido como imagem: não tem seleção de texto, busca textual ou OCR. Livros protegidos por DRM ou senha e EPUB de layout fixo não são suportados. As imagens dependem dos recursos do terminal; use pelo menos **60 colunas e 20 linhas**.

O tempo de leitura é aproximado. Pausa fora da leitura, em painéis e após dois minutos sem interação; Ctrl+T também pausa/retoma. A média considera capítulos percorridos do início ao fim, e saltos de navegação não contam como conclusão. Sem dados suficientes, a estimativa fica vazia.

## Atualizar ou remover a integração

Feche o LER, entre na pasta do aplicativo e execute:

```powershell
git pull --ff-only
.\scripts\install.cmd
```

O instalador aceita `-NoPath`, `-NoContextMenu`, `-SkipDependencies` e `-Development`. Para remover o PATH e o menu de contexto, preservando arquivos e leituras:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Uninstall
```

Para liberar espaço depois de fechar o aplicativo, `scripts/clean.ps1` remove apenas caches e temporários; a próxima instalação pode precisar baixá-los novamente. Ele não apaga bibliotecas nem backups.

## Desenvolvimento e licença

O código está em `src/`, testes em `tests/` e instaladores em `scripts/`. Dependências e dados gerados não fazem parte do Git. Veja [estrutura e verificações](development.md).

```powershell
.\scripts\install.cmd -Development -NoPath -NoContextMenu
.\node_modules\.bin\bun.cmd run check
```

Licença [MIT](../LICENSE).
