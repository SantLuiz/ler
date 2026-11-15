# LER — Leitor Extremamente Reduzido

Leitor EPUB local para terminal, feito com TypeScript, Solid e OpenTUI. Tela inicial com busca e comandos, abas compactas de livros, marcadores e retomada de leitura. **Versão inicial em desenvolvimento; o MVP ainda precisa de validação visual.**

[English](../README.md)

## Executar

No Windows, crie uma pasta com seus livros e clone o repositório numa subpasta dela. Instale **Bun 1.4.4+ ou Node.js com npm** antes de executar o instalador. Ele prepara as dependências e adiciona o comando ao PATH do usuário, sem exigir administrador. Windows Terminal 1.22+ permite imagens SIXEL.

Exemplo no CMD:

```bat
cd /d D:\Biblioteca
git clone https://github.com/SantLuiz/ler.git LER
cd LER
scripts\install.cmd
cd ..
LER
```

Depois, abra um terminal em qualquer pasta de livros e execute `LER`. A pasta atual será usada como biblioteca. Se o terminal já estava aberto antes da instalação, reabra-o quando o comando não for encontrado.

```bat
LER "D:\Outra Biblioteca"
LER --choose
LER --library "D:\Livros" --lang pt-BR
LER --help
```

`--choose` pergunta qual pasta usar. Quando iniciado dentro do próprio repositório, o LER usa a pasta pai, onde estão os livros. Uma escolha antiga não substitui a pasta atual. Os livros continuam onde estão; os dados do aplicativo ficam exclusivamente dentro da pasta clonada do LER.

O rodapé da tela inicial mostra o caminho absoluto completo da biblioteca pesquisada, com quebra de linha quando necessário.

Execute os comandos de instalação a partir da raiz do clone, onde fica `package.json`. No PowerShell, o instalador também pode ser executado com `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1`. Para remover apenas o comando do PATH, execute o mesmo script com `-Uninstall`; livros e progresso são preservados. Se mover o repositório, reinstale o comando a partir da nova localização.

Para executar sem registrar no PATH: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1 -NoPath`, depois `bin\LER.cmd`. Desenvolvedores com Bun podem continuar usando `bun install --frozen-lockfile` e `bun run start`.

O LER inicia na home e restaura seus livros nas abas. A busca central aceita nomes de livros/autores ou comandos: `/biblioteca`, `/config`, `/continuar`, `/ajuda`, `/atualizar` e `/sair`. Os equivalentes em inglês também funcionam. Uma busca vazia não lista livros. Use Tab para acessar Biblioteca, Aparência e Ajuda; Continuar aparece quando existe uma leitura salva e reabre o livro na posição guardada, mesmo se a aba foi fechada ou o programa reiniciado. As legendas destacam a tecla e mostram apenas as ações relevantes para a tela atual.

Use as setas ou j/k durante a leitura para rolar uma linha; Page Up/Down, ←/→ e Espaço avançam telas. F6 alterna abas, F4 fecha o livro, F5 retorna à home, `/` busca no livro, `s` abre o sumário, `b` alterna um marcador e Shift+B abre a lista. F2 ou Ctrl+P abre comandos. Esc fecha painéis ou limpa a busca da home; Ctrl+C salva e sai.

O botão **Biblioteca** abaixo da busca abre um popup com a estrutura de pastas e filtro por nome. Use ↑↓ e Enter para abrir pastas e livros; Backspace com filtro vazio volta à pasta anterior.

Se o console de diagnóstico aparecer, pressione **Esc** para fechá-lo sem sair do LER. **F12** abre ou fecha o console; enquanto ele estiver aberto, as teclas não alteram a leitura nem a busca. **Ctrl+C** continua salvando e encerrando o aplicativo.

## Onde ficam os dados

O único ajuste persistente do LER fora do repositório é o PATH, feito pelo instalador. Progresso, marcadores, abas, preferências, catálogo, backups, caches e temporários usados pelo aplicativo ficam em `LER/.ler/`. As dependências ficam em `LER/node_modules/`.

```text
Biblioteca/
├── livros e pastas…
└── LER/
    ├── src/
    ├── tests/                testes automatizados
    ├── scripts/              install.cmd, install.ps1 e preload do runtime
    ├── bin/                  comando LER.cmd registrado no PATH
    ├── docs/                 README em português
    ├── node_modules/          criado na instalação
    └── .ler/                 criado durante instalação/uso
        ├── libraries/<id>/   estado separado por biblioteca
        ├── cache/            caches locais
        ├── tmp/              arquivos temporários
        └── legacy/           configuração antiga, quando houver
```

Essas pastas geradas são ignoradas pelo Git: não vêm preenchidas no clone nem devem ser publicadas. Elas são criadas conforme necessárias. Para fazer backup dos dados de leitura, copie `.ler/` de dentro do LER. Bibliotecas diferentes têm registros separados; mover o LER junto das bibliotecas preserva suas referências relativas.

O README principal, a licença, os manifestos e lockfiles de dependências e as configurações de Bun e TypeScript permanecem na raiz. A integração contínua fica em `.github/workflows/`.

Na primeira abertura de uma biblioteca usada pela versão antiga, o LER migra o progresso de `.leitor/` para o novo local. A pasta antiga é removida depois da cópia, se contiver apenas arquivos do aplicativo. Arquivos desconhecidos são preservados. Feche a versão antiga antes de migrar. A configuração antiga em `%APPDATA%/leitor/config.json`, quando existente, também é arquivada dentro do clone.

Para verificar o código: `bun run typecheck` e `bun test`.

Mantenha os dois lockfiles: `bun.lock` fixa a instalação com Bun e `package-lock.json` permite ao instalador preparar Bun via `npm ci` quando necessário. Use fixtures pequenas e próprias nos testes; não inclua livros pessoais, dados de leitura ou capturas de trechos protegidos nos commits. Ao alterar a interface, confira rolagem, redimensionamento, abas e saída em um terminal real e atualize os textos em português e inglês.

Use `i` sobre uma imagem para ampliá-la. Busca textual roda em worker cancelável; resultados podem ser selecionados com as setas e Enter. A faixa de abas acompanha o livro ativo, acessível com F6.

## Aparência e sumário

A aba **Configurações** (F3, opção na home ou `/config`) permite alterar fundo e texto usando cores `#RRGGBB`, largura da coluna, espaçamento, altura das imagens, idioma e protocolo gráfico. Use ↑↓ para selecionar, ←→ para ajustar números e Enter para editar cores. As preferências são aplicadas imediatamente e salvas em `.ler/libraries/<id>/state.json`, dentro do LER.

Imagens ocupam até 80% da altura disponível por padrão; ajuste de 30% a 100%. Clique numa imagem ou use `i` quando ela estiver visível para ampliá-la. A proporção original é preservada, portanto uma imagem muito larga pode ficar limitada pela largura da coluna.

O tamanho real da fonte pertence ao terminal. No Windows Terminal, use Ctrl + Mais/Menos ou Ctrl + roda do mouse; essa orientação também aparece nas configurações. [Documentação do Windows Terminal](https://learn.microsoft.com/en-us/windows/terminal/tips-and-tricks).

O sumário (`s`) aceita setas, j/k, Home/End, Enter e clique. Links para seções do mesmo capítulo também são resolvidos.

## Buscar livros e autores

Na busca central da **home** (F5 ou aba LER), digite parte do nome do arquivo, título ou autor; todas as subpastas são pesquisadas. A pesquisa ignora maiúsculas e acentos e combina as palavras digitadas. Use ↑↓ e Enter ou clique em um resultado para abrir o livro. O caminho aparece abaixo do título para diferenciar cópias; a lista mostra apenas alguns resultados por vez e acompanha a seleção.

Ao digitar a primeira busca, o catálogo é construído em segundo plano lendo apenas os metadados dos EPUBs. Os resultados aparecem conforme os arquivos são encontrados. O índice é salvo junto do progresso; arquivos inalterados não precisam ter os metadados lidos novamente. Use **Ctrl+R** na home ou `/atualizar` após adicionar, mover ou remover livros. Se o EPUB não tiver autor ou estiver inválido, ainda será encontrado pelo nome do arquivo. A busca dentro do livro continua em `/` durante a leitura.

Limitações atuais: sem DRM, layout fixo ou SVG geral; CSS e ênfase simplificados; busca dentro do livro limitada a mil resultados. Alguns erros ainda são bilíngues. A compatibilidade gráfica no Windows Terminal precisa de conferência manual. Consulte o [README em inglês](../README.md) para detalhes.

Uma indicação de criptografia em recursos não utilizados, como fontes embutidas, não impede a leitura. O LER usa a fonte do terminal e não descriptografa recursos; capítulos criptografados continuam sem suporte.
