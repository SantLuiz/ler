# LER — validação do candidato a MVP

Data: 15/11/2026. Ambiente: Windows x64, Bun 1.4.4, OpenTUI 0.9.0.

## Verificações executadas

- TypeScript: `bun run typecheck`.
- Suíte automatizada: `bun test` — 30 testes cobrindo parsing, catálogo, CLI, instalação, layout, paginação, interface, configurações, persistência local ao clone, migração, retomada da última leitura, backup e workers.
- CLI: biblioteca pela pasta atual, pasta pai quando iniciado no repositório, caminho explícito, `--choose`, idioma, ajuda, versão e opções inválidas. `--check` não cria estado nem abre a interface.
- CMD: comando `LER` resolvido pelo PATH do processo de teste, mantendo a pasta atual. Caminhos com espaços, acentos e `&` também foram verificados.
- Instalação limpa: cópia do projeto dentro de uma biblioteca de teste, inicialmente sem `node_modules`; `install.ps1 -NoPath` instalou 116 pacotes com lockfile. O aplicativo dessa cópia iniciou no terminal e encerrou com Ctrl+C, restaurando o terminal.
- Instalador: execução repetida com `-NoPath -SkipDependencies` preservou o PATH persistente do usuário.
- Leitura: avanço de telas percorreu os 35 parágrafos de um EPUB sintético sem omissões; retorno entre capítulos, resize, marcadores e reabertura do estado também foram verificados.
- Paginação com imagens: o retorno de tela considera altura visual das imagens e espaçamento, sem saltar sobre os trechos seguintes.
- Interface: home e comandos em 60×20, popup de pastas filtrável, busca vazia, pesquisa por autor, seleção de sumário pelo teclado/mouse e configurações persistentes.
- Recuperação: duas corrupções sucessivas do arquivo principal preservaram e recuperaram o backup válido.

## Ajustes resultantes

1. O launcher carrega explicitamente a transformação Solid e preserva o diretório de execução; a aplicação não depende do diretório atual conter `bunfig.toml`.
2. A pasta ignorada pelo catálogo e navegador é a do aplicativo, independentemente da biblioteca de onde o comando foi iniciado.
3. Estado corrompido é movido para diagnóstico antes de restaurar o backup, evitando substituir a cópia válida pelos bytes corrompidos no próximo salvamento.
4. Page Up e fim de capítulo usam altura visual, incluindo imagens e espaçamento.
5. Legendas usam teclas destacadas e descrições curtas/contextuais. A home não oferece Continuar quando não há uma leitura disponível.
6. `/continuar` e `/continue` usam o registro persistente da última leitura, reabrindo o EPUB na posição salva quando sua aba já foi fechada. Testes cobrem reabertura, reinicialização, aba existente sem duplicação e mensagem para uma biblioteca sem histórico.
7. Todo o estado fica dentro do clone, com isolamento entre bibliotecas e criação sob demanda. Testes verificam migração de `.leitor/`, bloqueio durante uso pela versão antiga, preservação de arquivos desconhecidos, recuperação de backup legado e remoção da configuração antiga do perfil após arquivamento local.
8. Os caminhos de caches, configuração de dependências e temporários são definidos apenas no processo e apontam para `LER/.ler/`. O instalador também usa caches npm/Bun locais. Nenhuma nova variável de ambiente é persistida fora do PATH.

## Limites desta validação

A gravação do PATH do usuário está implementada no instalador, mas os testes usaram `-NoPath` e PATH de processo para não alterar configurações pessoais. Para ativar globalmente nesta máquina, execute `install.cmd` normalmente.

A inicialização em terminal foi verificada; testes de renderização usam imagens em blocos e frames nativos. A conferência de todas as combinações de imagens SIXEL e terminais permanece diferente dos testes automatizados. O usuário relatou que o fluxo e as validações visuais realizados por ele estão funcionando.

Nenhum livro pessoal foi alterado ou incluído nas fixtures. A cópia de instalação foi criada separadamente em `.cache/` e removida após as verificações.
