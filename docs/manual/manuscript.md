# LER por dentro

## Um manual para reconstruir o raciocínio do projeto

LER significa Leitor Extremamente Reduzido. Este livro explica como o programa transforma arquivos locais em uma experiência de leitura no terminal, como preserva o estado dessa leitura e como é construído, testado e distribuído. O objetivo é que você consiga abrir qualquer módulo do projeto, reconhecer sua responsabilidade e acompanhar o que acontece quando uma tecla é pressionada.

A base funcional desta edição é a versão 1.1.4, com a correção da homescreen durante a busca. O texto também registra as regras de desenvolvimento e o roadmap que foram documentados depois dessa publicação. Ideias do roadmap não são recursos implementados. O identificador exato do código examinado, as quantidades de arquivos e o inventário de símbolos aparecem na ficha técnica e nos apêndices gerados diretamente do repositório.

O manual tem três níveis: explicação conceitual, descrição técnica por subsistema e referência do código. Leia os capítulos em sequência para aprender; use o sumário, o catálogo de símbolos e o código numerado para consultar um detalhe. Os números de linha referem-se à fotografia de código desta edição, não a futuras versões.

As telas são capturas do renderizador real de testes OpenTUI, com cores e células preservadas e convertidas em imagens para este livro. Não são desenhos hipotéticos da interface nem capturas da biblioteca pessoal do usuário. Os arquivos usados nas telas foram escritos para a demonstração. A aparência de imagens e fontes em um terminal de uso pode variar.

## O que está incluído e o que significa “completo”

Estão cobertos todos os módulos de aplicação em src, os scripts de instalação e build, os três workers, as classes próprias, as funções nomeadas identificadas pela árvore sintática, os tipos de dados, os comandos, os testes, o site e os workflows. O apêndice de código contém a implementação própria examinada, incluindo testes e configuração, para que você não dependa apenas de um resumo.

O código interno de cada biblioteca externa não é reproduzido integralmente: ele pertence a outros projetos e é muito maior que o LER. Em vez disso, são explicados sua função, a versão declarada e a versão instalada no ambiente analisado, o ponto de integração e as limitações relevantes. Os contratos oficiais das bibliotecas devem ser consultados ao atualizá-las. Este livro documenta a implementação existente, não promete que todos os arquivos possíveis funcionarão.

# 1. Produto, escopo e experiência de uso

## A ideia central

O LER é um leitor local de EPUB, TXT e PDF. A biblioteca é uma pasta de arquivos, não uma conta em um serviço. O programa não precisa enviar livros para um servidor para ler ou indexar os arquivos. A aplicação de leitura não implementa telemetria nem uma API de nuvem. O site público consulta o GitHub para encontrar o instalador mais recente; essa consulta pertence ao site, não ao mecanismo de leitura local.

O terminal é a superfície de apresentação. Isso não significa que o LER só imprime linhas de texto uma vez: ele mantém um renderizador interativo, redesenha regiões da tela, recebe eventos de teclado e mouse e pode mostrar imagens. OpenTUI fornece a ponte entre componentes declarativos e a implementação nativa de desenho.

O primeiro lançamento abre a home. Escolher uma biblioteca acontece dentro da interface, pelo caminho da busca, Ctrl+L ou /change-library. Um diretório explícito no comando continua disponível. A opção legada --choose é aceita, mas não reintroduz uma pergunta de pasta antes da home.

## Capacidades atuais

- Busca por arquivo e, em EPUB, por título e autores extraídos dos metadados.
- Abas de livros, restauração de sessão, marcadores, progresso e destaques em texto.
- Preferências por biblioteca, paletas de cores e interface em português ou inglês.
- Leitura de PDF como imagem, com zoom, deslocamento, faixas e marcadores.
- Estatísticas de leitura, tempo acumulado e estimativa de tempo restante do capítulo em texto.
- Integração com Windows: comando LER, atalhos e “Abrir com LER” no Explorador.

## Limites que ajudam a entender as escolhas

Um EPUB é convertido para blocos de conteúdo, com formatação simplificada. O programa não pretende funcionar como um navegador completo que reproduz todas as regras de CSS de uma edição. PDFs são rasterizados; na versão documentada não existe extração textual para selecionar ou buscar palavras em PDF. OCR e seleção textual de PDF estão no roadmap.

EPUB com layout fixo é rejeitado. Recursos criptografados não são lidos; fontes ofuscadas não usadas não impedem necessariamente a leitura dos capítulos. PDF inválido ou protegido por senha falha na abertura. TXT é tratado como texto, sem interpretar tags HTML. O desempenho depende do livro, do terminal, da quantidade de abas e dos recursos nativos disponíveis.

## Um passeio guiado

Na home, Tab mostra opções. Ctrl+L abre o seletor de bibliotecas. F3 abre aparência; F6 percorre home, livros e aparência. F7 leva aos destaques, F8 às estatísticas. F2 ou Ctrl+P abre a paleta de comandos. A tecla / também abre comandos em contextos apropriados.

Em EPUB/TXT, use setas ou j/k para linhas e PgUp/PgDn ou Espaço para telas. v ativa o cursor; Shift com setas estende a seleção; Ctrl+S salva um destaque. b alterna um marcador e Shift+B abre a lista. Esc fecha primeiro um painel ou seleção; quando não há nada sobreposto, pode fechar a aba atual. Ctrl+C salva e encerra a aplicação.

O mesmo nome de tecla pode ter efeitos distintos conforme o contexto. Uma seta no seletor de biblioteca escolhe uma pasta; em uma página PDF ampliada, desloca a imagem; no modo cursor, move a posição de seleção. Entender o contexto é essencial para ler o tratador de teclado em App.

@figure 01-home | Home capturada no renderizador real, com uma aba demonstrativa restaurada e biblioteca sintética.
@figure 02-opcoes | O menu da home aparece sob demanda, mantendo a tela principal limpa.

# 2. Fundamentos para ler o código sem decorar termos

## JavaScript, TypeScript e TSX

JavaScript é a linguagem executada pelo runtime. TypeScript adiciona descrições de tipos que ajudam o compilador a detectar contratos incompatíveis. Uma declaração como Anchor = {chapter:number; block:number; offset:number} diz quais campos o objeto deve ter; não cria uma classe nem um arquivo de banco de dados.

TSX permite escrever uma árvore visual junto com TypeScript. Um trecho como <text>Olá</text> descreve um componente. No LER, esse componente é do renderizador de terminal, não um elemento HTML de uma página web. A compilação Solid transforma essa sintaxe em chamadas de criação e atualização de nós.

Os tipos são apagados na transformação para JavaScript. Por isso, validar entradas externas continua necessário: um JSON vindo do disco pode ter qualquer conteúdo, mesmo que uma função espere State. As verificações de versão, existência de books e Array.isArray(tabs) em storage são validações de execução.

## Runtime, biblioteca e aplicação

O runtime Bun executa o programa e oferece APIs como Bun.spawn, Bun.file, Bun.stringWidth e Worker. Uma biblioteca é um conjunto reutilizável de funcionalidades, como yauzl para ZIP. A aplicação é o código que combina tudo para atender o leitor. O instalador leva um Bun privado; o usuário final não precisa instalar um Bun global.

Uma DLL é uma biblioteca nativa carregada pelo sistema. WebAssembly, ou WASM, é um formato de código compilado executado por um ambiente apropriado. OpenTUI usa implementação nativa; PDFium vem com uma camada JavaScript e um módulo WASM. Uma dependência desse tipo não pode ser removida só porque não aparece como uma chamada de função no arquivo principal.

## Módulos, import e export

Cada arquivo pode importar símbolos de outro arquivo e exportar sua API. Importações relativas ligam módulos do próprio projeto. Importações como @opentui/core são resolvidas em node_modules. Import type serve à tipagem e não exige o mesmo carregamento em execução.

Importações estáticas são resolvidas quando o módulo é carregado. Uma importação dinâmica, await import('./ui/start'), só é executada quando o fluxo chega a ela. A versão 1.1.3 usa isso para não preparar a interface inteira ao responder --help, --version ou --check, ou ao encaminhar um arquivo para uma sessão já aberta.

## Funções, objetos, classes e closures

Uma função recebe dados e executa uma operação. Um objeto agrupa campos e funções. Uma classe agrupa estado e métodos de instâncias. O LER não é uma aplicação em que toda entidade vira uma classe: Book é um contrato de objeto; App é uma função componente; PdfBitmapCache, ReadingClock e ReadingWorkspace são classes próprias com estado de longa duração.

Uma closure é uma função que mantém acesso às variáveis do escopo em que nasceu. store cria save e close com acesso a state, filename, queue e lock. openPdf cria request e close com acesso ao worker e ao mapa de pedidos. Esses nomes se repetem em módulos diferentes porque cada closure tem seu próprio ambiente.

## Promises, async/await e filas

Uma Promise representa um resultado que pode chegar depois ou falhar. await espera essa resolução sem exigir uma espera ocupada em JavaScript. Ler um arquivo e receber resposta de um worker são exemplos. Isso não garante, por si só, que uma operação pesada não bloqueie a interface: cálculo síncrono continua ocupando o processo em que roda.

Uma fila baseada em Promise encadeia operações. storage mantém gravações em sequência para que duas chamadas de save não disputem o mesmo arquivo temporário. O worker PDF também serializa pedidos sobre o mesmo documento. A expressão queue.catch(()=>{}).then(...) permite prosseguir com a fila após uma falha anterior; ela não significa que a operação original foi bem-sucedida.

## Map, Set, hash e identidade

Map associa uma chave a um valor; Set guarda valores sem repetição. O cache usa Map tanto para guardar páginas quanto para representar a ordem de uso. SHA-256 produz uma identidade baseada nos bytes do livro. Dois arquivos idênticos em nomes diferentes podem compartilhar o mesmo id; uma alteração de conteúdo produz outro id. O hash não é criptografia de proteção do arquivo e não impede a leitura dos bytes.

O hash da biblioteca tem outro propósito: ele deriva do caminho relativo à instalação e separa estados de bibliotecas diferentes. Não confunda identidade do conteúdo de um livro com identidade do diretório de biblioteca.

## Unicode e geometria do terminal

Um caractere percebido pode ser formado por vários pontos de código, como letra e acento combinante. Um emoji também pode envolver uma sequência. Intl.Segmenter com granularidade grapheme permite caminhar por unidades visuais sem separar essas sequências. Bun.stringWidth mede colunas de terminal, não quantidade de bytes.

Offsets de texto do LER são índices de strings JavaScript; largura de terminal é medida em células. anchorAtCell converte a coluna clicada em um offset, e layout converte blocos em linhas respeitando a largura. Esses são dois espaços diferentes: conteúdo lógico e apresentação visual.

# 3. Mapa da arquitetura

## Camadas e direção das responsabilidades

O lançamento passa pelo bin/LER.cmd ou pelo Bun privado apontado por um atalho. O preload configura diretórios de execução e, no desenvolvimento, a transformação de TSX. main interpreta argumentos, escolhe a biblioteca e abre a persistência. startInterface monta o renderizador; LibrarySession administra o workspace; App coordena a interação visual.

Os leitores convertem arquivos em Book. Os módulos de reading trabalham sobre âncoras, linhas e intervalos. Os módulos de state guardam dados e tempo de leitura. O catálogo e os workers fazem tarefas específicas fora da rotina de interação. Scripts e workflows constroem, instalam e publicam o produto.

Essa divisão é uma arquitetura por responsabilidades, com funções e componentes colaborando. Não existe um servidor HTTP interno, um banco SQL ou um barramento de mensagens de rede oculto. As mensagens entre workers e o processo de interface usam postMessage; a abertura encaminhada entre processos usa pequenos arquivos JSON.

@diagram architecture | As principais camadas e seus limites. As setas mostram o fluxo principal de chamadas e dados.

## Árvore de diretórios comentada

- src/main.tsx e src/cli.ts: entrada e interpretação da linha de comando.
- src/ui: componentes, tema, comandos e coordenação da interação.
- src/readers: contrato de livro, EPUB, TXT, PDF e cache de pixels.
- src/reading: paginação, seleção, destaques e busca em texto.
- src/state: persistência, sessão de várias bibliotecas, preferências, estatísticas e pedidos de abertura.
- src/library: metadados e indexação de diretórios.
- scripts: preparação do runtime, instaladores, benchmarks, ícones, site e limpeza.
- tests: casos automatizados com arquivos de autoria do próprio projeto.
- site: duas páginas estáticas, CSS e JavaScript de download/cópia.
- .github/workflows: verificações, pacote Windows, GitHub Pages e release.
- .ler: dados de execução; não é código a ser versionado.
- dist e output: produtos gerados; não são a fonte editável da aplicação.

## Onde a complexidade está concentrada

App.tsx reúne grande parte da orquestração de interface: sinais, painéis, teclado, comandos e componentes internos. Isso facilita acompanhar uma interação em um lugar, mas aumenta o cuidado necessário ao alterar estado compartilhado. ReadingWorkspace separa a origem dos dados das abas da biblioteca atualmente selecionada. PdfPage concentra a passagem do bitmap para a imagem nativa e a geometria do recorte.

Uma refatoração futura poderia separar partes de App, mas este manual não apresenta essa refatoração como se já tivesse sido feita. As funções internas e os sinais descritos são os da implementação examinada.

# 4. Dependências: por que cada peça existe

## Dependências diretas da aplicação

@dependencies

@opentui/core é o mecanismo de terminal. O projeto usa criação de renderizador, imagens nativas, estilos e utilidades de largura. A versão nativa correspondente ao Windows x64 inclui os binários necessários para desenhar. O pacote também tem infraestrutura de componentes mais ampla que a superfície usada pelo LER.

@opentui/solid adapta componentes Solid ao OpenTUI e fornece render, testRender, useKeyboard, useRenderer, useTerminalDimensions e onAnimationTick. Seu compilador de TSX depende de Babel. Na distribuição pré-compilada, o adaptador é agrupado em runtime-solid.js e o compilador não é levado ao usuário final.

solid-js fornece createSignal, createMemo, createEffect, createResource, onCleanup, onMount, For, Show, contexto e batch. A aplicação e o adaptador precisam compartilhar a implementação cliente do Solid. Misturar a variante de servidor ou instâncias incompatíveis pode quebrar a atualização reativa mesmo que a sintaxe compile.

yauzl abre os contêineres ZIP de EPUB de forma preguiçosa. O LER enumera entradas e solicita o conteúdo necessário. htmlparser2 interpreta o HTML dos capítulos e os XML de metadados e navegação. Nenhum deles transforma EPUB em uma interface pronta: essa tradução é feita pelo código de readers/book.ts.

@hyzyla/pdfium carrega documentos PDF e renderiza páginas. fast-png codifica PNGs quando o consumidor pede o caminho de compatibilidade e também é usado na geração dos ícones. A visualização PDF normal recebe pixels RGBA diretamente; nesse caminho, o codificador PNG não precisa ser carregado no worker.

web-tree-sitter está declarado porque integra o grafo de dependências em execução do OpenTUI. Isso não significa que o LER use uma árvore sintática para ler romances. O AST usado para produzir o catálogo deste manual pertence ao gerador de documentação e ao TypeScript de desenvolvimento.

## Ferramentas de desenvolvimento e dependências transitivas

typescript fornece tsc e a análise estática; @types/bun e @types/yauzl descrevem APIs para o compilador. O pacote bun fixa um runtime disponível no ambiente de desenvolvimento. O arquivo package.json declara faixas para algumas bibliotecas; os lockfiles registram o que foi resolvido. Por isso, “versão declarada” e “versão instalada” não são sempre a mesma string.

Babel e seus presets chegam pela cadeia do adaptador Solid. O build usa @babel/core, @babel/preset-typescript e babel-preset-solid para produzir JavaScript. Eles não aparecem como bibliotecas de produto novas adicionadas só para gerar este livro. Para atualizar essa cadeia, é necessário instalar com os lockfiles consistentes e validar o runtime pré-compilado.

Uma dependência transitiva é exigida por outra dependência. Não é seguro apagar pastas isoladamente só porque o LER não importa seu nome diretamente. prepare-runtime segue os manifestos dos pacotes para manter o fechamento de dependências de execução. Os arquivos internos e as licenças dos pacotes preservados continuam no payload.

## APIs do sistema usadas sem pacote externo

node:fs lê, grava, renomeia e enumera arquivos. node:path resolve caminhos locais e caminhos POSIX internos de EPUB. node:crypto calcula hashes e cria UUIDs. node:os encontra diretórios do usuário e temporários. node:zlib aparece no benchmark que monta um PDF sintético. Intl trata segmentação, idioma e formatação. Esses módulos fazem parte do ambiente, não de downloads independentes a cada abertura.

# 5. Do comando LER à primeira tela

## O lançador Windows

bin/LER.cmd usa setlocal e desativa delayed expansion, reduzindo problemas com caracteres especiais em caminhos. Resolve LER_ROOT a partir da própria localização, configura diretórios de temporários e cache dentro de .ler e escolhe o caminho de execução. No pacote instalado, detecta src/main.js e chama o Bun privado com scripts/preload.js. No checkout, encontra o runtime local ou Bun disponível e abre src/main.tsx com preload.ts.

Não depende do diretório atual para descobrir o código. O diretório atual continua relevante para escolher a biblioteca quando o usuário não passa outra pasta. Esse cuidado permite executar LER de uma pasta com espaços, acentos e & sem transformar a pasta de trabalho em pasta do aplicativo.

## Configuração de ambiente pelo preload

O preload cria .ler/tmp e define TEMP, TMP, TMPDIR, BUN_RUNTIME_TRANSPILER_CACHE_PATH, XDG_CACHE_HOME, XDG_CONFIG_HOME e XDG_DATA_HOME apenas para o processo. Não grava essas variáveis globalmente no Windows. No desenvolvimento, importa ensureSolidTransformPlugin e registra o transformador uma vez. No build instalado, o trecho anterior ao registro é transformado em preload.js, sem necessidade de Babel em execução.

## parseArgs e escolha de diretório

parseArgs percorre a lista uma única vez, reconhece ajuda, versão, --choose, --check, --library, --lang e --open e rejeita opções desconhecidas, valores faltantes ou duplicidades relevantes. --lang só aceita en ou pt-BR. Um argumento posicional é outra forma de informar a biblioteca.

libraryRoot resolve uma pasta explícita relativamente ao cwd. Para --open, considera a pasta do arquivo e a relação com a pasta pai da aplicação. Em lançamentos sem pasta, usa cwd, exceto quando cwd está dentro da aplicação, situação em que escolhe a pasta pai. knownLibraryRoot pode encontrar uma biblioteca anteriormente registrada que contenha o arquivo solicitado, preferindo a raiz mais específica.

interfaceLanguage usa a opção explícita quando válida e, fora disso, o locale. helpText escolhe o texto de ajuda correspondente. VERSION vem de package.json. A interface traduz os textos visíveis, mas os nomes dos comandos permanecem em inglês.

## A sequência em main

1. Interpretar argumentos e idioma; responder ajuda ou versão imediatamente.
2. Validar o arquivo de abertura, se houver; escolher e validar a pasta da biblioteca.
3. Responder --check sem abrir a interface.
4. Abrir store e adquirir a exclusão da biblioteca.
5. Se a biblioteca já estiver aberta e houver --open, enfileirar o pedido e encerrar o novo processo.
6. Tentar migrar a configuração legada e acumular avisos se necessário.
7. Escolher o estado salvo ou um estado em memória e aplicar idioma explícito.
8. Registrar encerramento, importar startInterface e montar LibrarySession.

@diagram startup | Fluxo de entrada, respostas rápidas e abertura da interface.

## Encerramento e erros

exit é idempotente: a flag exiting evita executar duas saídas concorrentes. Primeiro tenta salvar; em finally fecha os livros; depois fecha a persistência e destrói o renderizador. SIGINT e SIGTERM chamam esse fluxo. O tratamento externo apresenta LER: seguido da mensagem e uma dica localizada para --help, além de ajustar o exitCode.

Se store falha por um motivo que não é “biblioteca já aberta”, main pode continuar com estado em memória e um aviso. Isso permite leitura, mas não equivale a garantia de salvamento. Uma segunda abertura sem arquivo em uma biblioteca bloqueada falha; a implementação não é um serviço universal de janela única para todas as pastas.

# 6. Dados: Book, State, Anchor e outros contratos

## O contrato Book

Book contém id, title, format opcional no tipo, chapters, toc, resource e close. pdfPage é opcional e fornece bitmap quando o leitor dispõe desse caminho. O código cria livros concretos com formato definido, mas mantém compatibilidade com objetos usados em outros pontos e testes.

Chapter contém href, title e blocks; targets pode mapear fragmentos de navegação para índices de bloco. Block contém text e, opcionalmente, image ou heading. Para PDF, cada página vira um capítulo sintético com recurso page/n. Essa adaptação permite reutilizar parte da navegação sem fingir que o PDF foi convertido em parágrafos selecionáveis.

resource(href) é uma função assíncrona que entrega bytes. Em EPUB, lê uma entrada ZIP. Em PDF, atende page/n pelo caminho PNG. Em TXT, lança erro porque o livro não tem imagens. close libera recursos do leitor: fecha ZIP ou worker; em TXT é uma operação vazia.

## Anchor: posição sem depender da tela

Anchor tem chapter, block e offset. O capítulo e o bloco localizam o conteúdo; offset indica uma posição na string daquele bloco. A âncora não guarda “linha 12 da janela de 80 colunas”. Se a janela muda, layout cria outras linhas e a aplicação procura a linha que contém a âncora original.

Uma seleção é um par de âncoras. orderedRange coloca início e fim em ordem; o fim é tratado como limite exclusivo nos trechos selecionados. Um destaque conserva início, fim, texto, id e data. Um marcador é mais simples: posição, trecho de referência e data.

## Estado por biblioteca e estado em memória

State tem version:1, books, tabs e lang, com active, lastRead, preferences e catalog opcionais. books é um dicionário indexado pelo id de conteúdo. Cada Saved conserva caminho, âncora, marcadores e, quando presentes, título, destaques e estatísticas.

ReadingWorkspace mantém uma visão de sessão que pode conter abas de várias bibliotecas. Em memória, usa caminhos absolutos para evitar ambiguidade entre arquivos homônimos. Ao salvar para a biblioteca proprietária, converte novamente para caminhos relativos àquela raiz. O manifesto global usa caminhos relativos à pasta da aplicação.

@diagram data | Relações conceituais dos principais objetos. Um livro tem capítulos e blocos; o estado salvo referencia seu id.

## Exemplo didático de estado

```json
{
  "version": 1,
  "books": {
    "<sha256-do-conteudo>": {
      "file": "Estudos/Livro.txt",
      "anchor": {"chapter": 0, "block": 3, "offset": 12},
      "bookmarks": [],
      "highlights": []
    }
  },
  "tabs": ["<sha256-do-conteudo>"],
  "lang": "pt-BR"
}
```

Esse JSON é ilustrativo, não uma cópia de leitura pessoal. Campo opcional ausente não é necessariamente erro. Os validadores e defaults do programa decidem como recuperar campos e preferências antigos.

# 7. Persistência, locks e recuperação

## Onde os dados ficam

storageDirectory calcula o caminho relativo entre appDirectory e root, normaliza para minúsculas no Windows, calcula SHA-256 dessa identidade e retorna .ler/libraries/<hash>. O livro e a biblioteca têm identidades separadas. library.json permite reconstruir a raiz relativa à aplicação. state.json guarda a leitura; .bak é cópia de recuperação; .tmp é preparação de gravação.

Outros arquivos dessa área incluem favorite.json e usage.json para bibliotecas salvas. .ler/workspace.json guarda a lista global de abas com suas bibliotecas de origem. .ler/legacy conserva configuração antiga arquivada. Caches e temporários têm diretórios próprios e são descartáveis; dados de leitura não são tratados como cache.

## Como o lock funciona

store tenta abrir lock com modo wx: criar apenas se ainda não existir. Grava o PID do processo e fecha o handle. Se o lock já existe, lê seu PID e testa se o processo está ativo. Um PID inexistente permite remover um lock obsoleto e tentar novamente; um processo ativo faz a abertura falhar como “Library already open”.

Isso é exclusão por biblioteca usando arquivo e PID, não um mutex distribuído. Não sincroniza duas máquinas via nuvem nem resolve todas as situações de armazenamento remoto. Ler um lock corrompido, reutilização de PID, permissões e interrupções abruptas são limites a considerar ao diagnosticar erros. Não apague um lock automaticamente sem verificar a sessão em uso.

## Gravação serializada

save serializa state em JSON e coloca a operação em queue. Se o conteúdo serializado é igual ao último salvo por aquela instância, evita a gravação. Caso contrário, escreve state.json.tmp, preserva o estado anterior em .bak e renomeia .tmp para state.json. Quando o principal ainda não existe, a primeira gravação cria um backup válido do novo estado.

A renomeação reduz a janela em que alguém poderia ver um arquivo principal parcialmente escrito. Ela não é uma promessa de transação de banco de dados nem de persistência física após qualquer falha de energia; não há fsync explícito nesta implementação. A fila protege contra concorrência das próprias chamadas de save no processo.

@diagram persistence | Gravação em fila, arquivo temporário, backup e substituição do estado principal.

## Recuperação e migração

Na abertura, tenta state.json e depois state.json.bak. Um arquivo inválido é renomeado com sufixo corrupt e timestamp; a versão e os campos estruturais básicos são conferidos. A cópia inválida não é silenciosamente promovida a backup saudável. Os testes de recovery exercitam essas situações.

migrateLegacy migra dados de .leitor da biblioteca. Usa uma marca migration-pending.json, copia arquivos reconhecidos antes de apagar os originais, verifica conflitos e respeita um lock legado ativo. Arquivos desconhecidos não são removidos. migrateLegacyConfig copia uma configuração antiga do perfil para .ler/legacy, confere igualdade dos bytes e só então remove a origem.

close aguarda a fila e remove o lock. O encerramento de ReadingWorkspace fecha os stores de todas as bibliotecas anexadas, inclusive as que deixaram de ser a biblioteca selecionada.

# 8. Sessão global e várias bibliotecas

## Por que existe ReadingWorkspace

Trocar a biblioteca usada na busca não deveria fechar um livro que estava sendo lido em outra pasta. Porém, salvar as alterações desse livro na nova pasta seria um erro. ReadingWorkspace resolve essa separação: a biblioteca ativa fornece preferências e catálogo, enquanto cada livro permanece ligado ao seu proprietário.

libraries associa identidades de diretório a LibraryContext. owners associa ids de livro a contextos. active indica a biblioteca de trabalho. opened guarda recursos abertos. state é a visão reunida que a UI manipula. persistence expõe uma fachada com getters e métodos que encaminham operações ao workspace.

## Métodos e invariantes

constructor cria a visão de sessão, anexa o contexto inicial e monta a fachada de persistência. attach registra uma biblioteca e importa seus livros com caminhos absolutos. bindBook determina a origem do arquivo e cria ou reconcilia seu registro. sync espalha dados alterados para os contextos corretos e aplica preferências à biblioteca ativa.

select abre ou reutiliza a biblioteca pretendida, salva o estado atual antes da troca, verifica se o workspace foi fechado no intervalo e, se tudo dá certo, muda active e as preferências compartilhadas. Se falha ao salvar depois de criar um store novo, fecha esse store para não deixar um lock sem dono.

restore lê workspace.json, valida sua estrutura, considera no máximo 200 linhas de abas e tenta abrir os contextos necessários. Arquivos sem formato reconhecido ou bibliotecas indisponíveis não viram recursos abertos automaticamente. A combinação final preserva a ordem restaurada e inclui abas iniciais ainda ausentes.

save chama sync, salva os contextos e escreve o manifesto global por um temporário com UUID seguido de rename. lastManifest evita repetir o mesmo conteúdo. close guarda uma Promise de encerramento para que chamadas repetidas compartilhem a mesma operação.

## LibrarySession como ponte para a interface

LibrarySession cria ReadingWorkspace e só monta App quando a restauração inicial está pronta. publish informa ao main a persistência e os recursos atuais para que o encerramento continue correto. onMount restaura a sessão e registra uma visita; onCleanup impede que uma resposta tardia atualize um componente já descartado.

changeLibrary resolve o caminho real, compara com a raiz atual, valida que é diretório e impede duas trocas simultâneas. A UI não é desmontada inteira na troca. Isso preserva abas, recursos e workers de PDF já abertos.

@diagram workspace | A biblioteca ativa e a propriedade dos dados das abas são conceitos diferentes.

## Casos importantes

Dois livros com o mesmo título podem ter arquivos e ids distintos; a aba usa a pasta para diferenciá-los. Dois arquivos com bytes idênticos reutilizam a identidade de conteúdo e podem voltar para uma aba já aberta. Se um arquivo mudou, o id muda; um destaque antigo não é reaplicado silenciosamente a outro conteúdo.

O manifesto de abas é compartilhado pela instalação. Duas janelas independentes podem salvar manifestos diferentes; a última gravação prevalece. Os locks por biblioteca ainda existem, mas não transformam o manifesto em um mecanismo de sincronização multiusuário.

# 9. EPUB: de ZIP a blocos de leitura

## A anatomia mínima do arquivo

Um EPUB é um contêiner ZIP com documentos e metadados. META-INF/container.xml aponta para o pacote OPF. O manifest descreve recursos; o spine fornece a ordem de leitura. Um documento de navegação ou um NCX pode representar o sumário. Entender essas peças evita confundir a ordem de nomes no ZIP com a ordem correta dos capítulos.

openBook identifica o formato, calcula o hash do arquivo em fluxo e, no caso EPUB, abre yauzl com lazyEntries e autoClose:false. Enumera até 20.000 entradas em um Map. A função resource verifica a entrada, criptografia e limites e abre um stream só quando o conteúdo é solicitado.

## Resolução de recursos

resolveHref rejeita esquemas remotos como https:, remove o fragmento para resolver o arquivo, decodifica o caminho e usa path.posix. Isso é importante porque caminhos dentro do EPUB usam barras do formato do arquivo, não necessariamente as barras do Windows. Caminhos que escapem para ../ ou para uma raiz são rejeitados.

resolveLink reaplica o fragmento ao caminho resolvido, para que um item de sumário aponte para um id de conteúdo. tocAnchor encontra o capítulo correspondente e consulta targets para determinar o bloco. Fragmento ausente ou não encontrado volta ao bloco zero desse capítulo.

## Conversão de HTML

blocksFromHtml usa um acumulador pending. Nós de texto acrescentam conteúdo; flush normaliza espaços, remove controles e cria um Block. Elementos de fronteira como p, div, títulos, li, blockquote, pre, tr e br quebram blocos. script, style e head são ignorados.

img e image criam blocos com recurso de imagem e texto alternativo, quando possível. Elementos com id, xml:id ou âncora nomeada entram no mapa targets. Títulos marcam heading:true e podem fornecer o título do capítulo. Essa lógica simplifica o conteúdo; não tenta aplicar todas as regras de estilo de HTML.

## Ordem de leitura e sumário

O spine é percorrido na ordem de itemref; itens linear=no são ignorados. Cada item é resolvido no manifest e convertido para blocos. O texto total de capítulos lidos é limitado a 64 MiB, e cada recurso a 32 MiB. São limites de proteção do leitor, não promessas de que um livro abaixo deles sempre será leve.

Se houver nav com propriedade nav, o leitor procura a navegação toc. Caso contrário, tenta NCX. A leitura exige ao menos um capítulo. Em qualquer falha durante a preparação, o ZIP é fechado; no sucesso, close fica disponível no Book para o encerramento posterior.

@diagram epub | O conteúdo físico do EPUB vira uma estrutura lógica comum à interface.

# 10. TXT, codificações e paginação de texto

## Ler bytes não é o mesmo que ler caracteres

decodeText reconhece BOM de UTF-16 little-endian e big-endian. Fora disso, tenta UTF-8 estrito e, se falhar, usa Windows-1252. Depois normaliza finais de linha, remove caracteres de controle e expande tabs em quatro espaços. Um NUL no texto decodificado provoca rejeição como conteúdo binário.

openText limita o arquivo a 64 MiB, rejeita texto vazio e cria um capítulo único, com um bloco por linha. O título vem do nome do arquivo sem extensão. TXT não interpreta HTML e não oferece recursos de imagens.

## Como layout cria linhas

layout recebe Book, largura e índice de capítulo. Para cada bloco textual, percorre grafemas e soma sua largura em células. Quando ultrapassaria a largura disponível, tenta quebrar no último espaço; caso contrário, quebra no limite acumulado. Cada linha recebe a âncora correspondente ao início daquele trecho.

Depois do bloco textual, insere uma linha vazia com offset no final do texto. Imagens viram uma linha especial contendo image e âncora no início do bloco. O Intl.Segmenter de grafemas é reutilizado em vez de ser recriado a cada chamada.

## Uma tela é medida em linhas visuais

visibleLines coleta somente o que cabe na altura. Uma linha textual custa textRows; uma linha de imagem custa imageRows. Isso permite que uma imagem grande ocupe várias linhas do terminal e que o espaçamento altere a quantidade de texto visível.

previousPage caminha para trás somando custos e mantém a primeira linha atual como contexto quando possível. Há uma saída de avanço mínimo para evitar ficar preso na mesma posição. A navegação não deve simplesmente subtrair “altura da janela” do índice, porque imagens e espaçamento têm custos diferentes.

## O exemplo que conecta tudo

Imagine um parágrafo com acentos e emojis em uma janela larga. O usuário marca um trecho. Ao reduzir a janela, o mesmo parágrafo passa a ocupar mais linhas. O destaque permanece definido pelas âncoras no conteúdo; layout recalcula as linhas, e lineParts decide quais grafemas de cada linha devem receber estilo de destaque. A divisão visual mudou; o trecho lógico não.

# 11. PDF: worker, pixels, cache e zoom

## Uma interface responsiva precisa separar o trabalho pesado

openPdf cria um Worker exclusivo para o documento, um mapa pending de pedidos e um contador sequence. Cada request recebe um id e um timer de 30 segundos. Uma resposta resolve ou rejeita exatamente a Promise correspondente. Erro do worker ou timeout fecha o documento do lado da interface, termina o worker e rejeita os pedidos pendentes.

O documento é limitado a 256 MiB. O worker inicializa PDFium, carrega os bytes e informa o número de páginas; rejeita documentos sem páginas ou acima de 20.000. No processo da interface, cada página é representada como capítulo sintético.

## Dois caminhos de imagem

O caminho de compatibilidade resource('page/n') solicita PNG. O worker renderiza RGBA, carrega fast-png sob demanda e codifica os pixels. Mantém um pequeno cache de até duas páginas PNG no próprio worker.

O caminho usado pela interface é pdfPage(n): solicita raw:true e recebe pixels, largura e altura. O buffer é transferido com postMessage em vez de copiado quando é um ArrayBuffer integral independente. Quando o resultado é uma visão parcial, o código cria uma cópia segura. A operação de transferência entrega a propriedade do buffer ao destinatário; o remetente não deve tratá-lo como uma cópia que ainda controla.

## Resolução e memória

O fator de renderização é o menor entre 3, 3000 dividido pelo maior lado e a raiz quadrada de 4.000.000 dividido pela área original. Assim, o leitor limita simultaneamente escala, dimensão máxima e quantidade aproximada de pixels. As páginas preservam as proporções e são renderizadas em RGBA, fundo não transparente e campos de formulário habilitados.

Quatro milhões de pixels RGBA representam até 16.000.000 bytes de pixels, cerca de 15,26 MiB, antes de contar documento, runtime, imagens nativas e caches. Por isso, “PDF de 1 MiB” não significa “1 MiB de memória”. O arquivo comprimido e a página rasterizada têm representações diferentes.

@diagram pdf | Caminho atual de pixels, cache compartilhado e preparação da imagem nativa.

## PdfBitmapCache e LRU

PdfBitmapCache limita o conjunto a 48 MiB e seis entradas. get remove e reinsere uma entrada para torná-la a mais recentemente usada. set desconta uma versão anterior da mesma chave, rejeita um bitmap maior que o orçamento e remove as entradas mais antigas até respeitar ambos os limites. clear(prefix) remove apenas os itens associados ao documento fechado.

O prefixo contém um número de sequência de abertura, não apenas o hash do livro. Isso separa instâncias e permite liberar o cache de uma aba sem apagar páginas de outra. rendering reúne pedidos simultâneos da mesma página para que eles compartilhem uma Promise.

## PdfPage e descarte de recursos nativos

PdfPage usa createResource para carregar a página. Quando recebe bitmap, cria NativeImage.fromRgba; se só dispõe de bytes, usa NativeImage.decode. onCleanup chama dispose na imagem nativa. Fechar a aba também termina o worker por meio do Book.close.

Depois de 250 ms de estabilidade, prepara apenas a página seguinte, se existir. Trocar a página ou desmontar o componente cancela o timer ainda não executado. Um trabalho já enviado ao worker não é interrompido por esse cancelamento. A preparação antecipada compete pelo mesmo orçamento de cache.

@figure 08-pdf | Página PDF de teste do próprio projeto, capturada com o protocolo de blocos no renderizador de testes.

## Geometria de zoom e faixas

pageViewport calcula a escala para caber em colunas e linhas, considerando a proporção física de uma célula. Zoom amplia essa área. Se a página ultrapassa a janela, calcula um retângulo crop e posições normalizadas x e y entre zero e um.

As faixas verticais têm sobreposição de 10% para manter contexto entre telas. adjacentBand encontra a faixa anterior ou seguinte com tolerância numérica. Em zoom acima de 1, PgUp/PgDn navega por faixas antes de trocar de página; setas deslocam a imagem. Zoom e recorte reutilizam a imagem carregada e não precisam rasterizar o mesmo PDF novamente.

# 12. Catálogo, busca de livros e workers de texto

## Catalogar não é abrir cada livro para ler tudo

epubMetadata lê container.xml e o pacote OPF, limitando recursos de metadados a 2 MiB. Extrai title e creator, normaliza espaços e controles e sempre fecha o ZIP. Não precisa ler todos os capítulos apenas para listar um título.

indexLibrary percorre diretórios, ignorando .git, .leitor, .ler, node_modules e .cache e a pasta de código indicada como ignored. Usa entradas de diretório para distinguir arquivos e pastas; só tenta formatos reconhecidos. Para cada livro, compara size e mtimeMs com o cache anterior e reutiliza metadados quando esses valores são iguais.

Essa estratégia é econômica, mas não é uma garantia criptográfica de mudança: um arquivo alterado sem variar tamanho e data pode escapar desse critério. O hash de conteúdo do livro é calculado na abertura, em outro fluxo.

## Protocolo do catálogo

O worker recebe root, ignored e cached. Agrupa resultados em pending e envia entries quando atinge 100 itens ou após um timer de 50 ms. Ao terminar, faz flush e envia done com o número de erros; em falha geral, envia error. A UI recebe lotes para não disparar uma atualização por arquivo em bibliotecas grandes.

scanLibrary limpa o catálogo visível, marca indexing, cria o worker, recebe os lotes e reconstrói state.catalog ao concluir. stopCatalog termina a instância. Resultados de um worker anterior são ignorados quando a biblioteca ou a sessão mudou.

## Busca por título e busca em conteúdo são diferentes

searchCatalog normaliza texto com NFD, remove marcas de acento e transforma em minúsculas. Divide a consulta em palavras e exige que todas apareçam na combinação de caminho, título e autores. Consulta vazia ou iniciada por / não lista livros. O resultado é ordenado por título e arquivo.

O worker de busca de passagens procura a consulta como sequência textual em todos os blocos. Ele transforma para minúsculas, mas não aplica a mesma remoção de acentos da busca de catálogo. Esse detalhe explica por que duas caixas de busca não têm necessariamente as mesmas regras.

## Debounce, cancelamento e respostas antigas

search aguarda 150 ms antes de iniciar o worker, evitando refazer a busca para cada tecla de digitação rápida. cancelSearch aumenta uma geração, encerra o worker, cancela o timer e resolve a espera pendente com resultado vazio. finish confere geração, livro ativo e painel antes de publicar o resultado.

chooseSearchResult pode antecipar o início quando Enter é pressionado antes do timer. Depois aguarda a busca e só navega se o contexto ainda é válido. O worker limita resultados a 1.000 e corrige offsets quando a conversão para minúsculas expande uma letra, como no caso de İ.

@diagram workers | Mensagens têm contratos diferentes: catálogo em lotes, busca por conjunto de capítulos e PDF por id de pedido.

# 13. Seleção, destaques, marcadores e navegação

## Comparar e percorrer âncoras

compareAnchors compara primeiro capítulo, depois bloco e por fim offset. orderedRange troca os extremos quando a seleção foi feita de trás para frente. rangeText percorre os capítulos e blocos no intervalo, ignora imagens e concatena os trechos selecionados com quebras de linha.

stepCursor anda por limites de grafemas e pode passar ao próximo bloco textual ou capítulo. stepWordCursor usa Intl.Segmenter de palavras e cai para a navegação entre blocos quando não há outra palavra local. anchorAtCell transforma uma coluna do terminal em posição textual. lineParts agrupa trechos consecutivos que compartilham estilo de seleção e cursor.

## Como a UI salva um destaque

toggleCursor inicia no primeiro texto visível. moveCursor trata direção, extensão por Shift, salto de palavra por Ctrl e deslocamento da janela para manter o cursor visível. A seleção fica em selectionStart e cursor. saveHighlight valida que existe um intervalo não vazio, obtém o texto e evita duplicar exatamente o mesmo par de âncoras.

Um destaque usa crypto.randomUUID, cópias das âncoras e data ISO. A função marca a revisão, salva e limpa o cursor/seleção. Os destaques persistentes e a seleção temporária são combinados por ranges para desenhar o conteúdo.

@figure 04-leitura | Leitura de TXT com conteúdo demonstrativo; a mesma organização de linhas é usada após a conversão de EPUB.
@figure 05-selecao | Seleção por teclado no renderizador real, antes do salvamento do destaque.
@figure 06-destaques | Tela de destaques, construída a partir dos registros salvos em State.

## Marcadores não são destaques

toggleBookmark identifica a posição por capítulo e bloco. Se já existe marcador nesse bloco, remove; caso contrário, guarda a âncora, um trecho da linha e a data. Marcadores podem ser usados em PDF porque representam uma posição de página; não exigem texto selecionável.

O menu de sumário usa toc quando presente, ou uma lista de capítulos/páginas como alternativa. O menu de marcadores utiliza os registros do livro. A variável selected é compartilhada por painéis, mas cada abertura importante a redefine para evitar herdar uma seleção inválida.

## Históricos e navegação descontinua

jump normaliza o capítulo e procura a linha correspondente ao bloco e offset. Quando o salto é descontinuo, pode guardar a posição anterior em navigationHistory, limitado a 50 itens por livro. /back retira a última posição e navega sem criar um novo item recursivo.

invalidateChapter marca que um capítulo não foi necessariamente lido desde o começo. Isso impede que atalhos como ir ao fim sejam confundidos com conclusão natural de leitura. O histórico é temporário da sessão; progresso, marcadores e destaques são persistentes.

# 14. Tempo de leitura e estatísticas

## ReadingClock separa tempo de relógio de tempo de leitura

ReadingClock guarda previous e activity. touch registra interação. sample limita o intervalo ao teto de dois minutos após a última atividade e ignora amostras separadas por mais de cinco segundos. Se a leitura está desabilitada, não há stats ou o intervalo não é positivo, não acrescenta tempo.

Isso reduz contagem indevida durante inatividade e suspensão do computador. Não identifica biologicamente se a pessoa está lendo; usa eventos e estado de interface como aproximação. Painéis, console visível e pausa manual desligam a contagem. A amostragem em App ocorre em timer de um segundo e em transições relevantes.

## Estrutura ReadingStats

seconds acumula o total. days associa datas locais a segundos. chapters associa índice do capítulo a tempo e marcas de conclusão, completedSeconds e fromStart. completed no nível do livro indica que os capítulos satisfizeram as condições de conclusão tratadas pela aplicação.

completeChapter só conclui um capítulo que começou do início, ainda não estava concluído e acumulou pelo menos um segundo. completedSeconds preserva o tempo de referência da conclusão, para que uma releitura não distorça a média do primeiro percurso.

## A estimativa de restante

remainingChapterSeconds reúne palavras e segundos dos capítulos concluídos. Se não houver base suficiente, não inventa uma estimativa. Conta palavras restantes do bloco/offset atual até o fim do capítulo e multiplica pelo tempo médio por palavra observado. PDF fica fora desse cálculo textual.

A fórmula didática é: tempo restante = palavras restantes × segundos observados / palavras concluídas. O texto é contado por sequências não vazias separadas por espaço, não por um analisador linguístico de todas as línguas. O resultado é uma estimativa do capítulo atual.

## Estatísticas da biblioteca

libraryStatistics usa o catálogo para saber quais arquivos ainda estão presentes e filtra registros de leitura por esse conjunto. Calcula totais por formato, iniciados, concluídos, não iniciados, segundos, tempo do dia, destaques e capítulos concluídos. A média existe apenas quando há capítulos concluídos.

No workspace global, a tela consulta o estado da biblioteca ativa, evitando contar todos os livros de outras raízes apenas porque suas abas continuam abertas. Destaques e estatísticas têm cálculos reativos protegidos pela tela ativa, reduzindo trabalho quando seus painéis não estão visíveis.

# 15. Solid e a máquina de estados visual

## Sinais e valores derivados

createSignal cria um par: uma função que lê o valor e outra que o modifica. active() não é um campo simples; é uma leitura reativa. createMemo calcula um valor derivado e conserva dependências. createEffect executa efeitos quando essas dependências mudam. batch agrupa mudanças para reduzir estados intermediários visíveis.

createResource liga uma fonte reativa a um carregamento assíncrono, usado em imagens e PDF. onCleanup libera recursos quando um escopo é desmontado ou refeito. For renderiza coleções e Show condiciona subárvores. ThemeContext entrega um accessor de tema aos componentes sem passar as mesmas propriedades por cada nível.

## Estados principais em App

active é o índice da aba de livro ou um valor especial: -1 é home, -2 aparência, -4 destaques e -5 estatísticas. switchTab normaliza -3 para home por compatibilidade de ações antigas. panel identifica a camada sobreposta, como commands, tabs, search, folders, info, toc, marks, help, color, image, choose-library e options.

tabs é a lista reativa de livros abertos; opened é a lista de recursos usada no encerramento. chapter e line são coordenadas de apresentação. query, commandQuery, libraryQuery, tabFilter e highlightFilter são consultas com finalidades diferentes. Misturá-las causaria comandos entrando na busca de títulos ou termos de livros filtrando abas incorretamente.

pdfZoom, pdfX, pdfY e pdfViewport guardam a visualização PDF. cursor e selectionStart guardam a seleção textual. prefs e colors representam preferências validadas e o tema derivado. busy e indexing avisam trabalho em andamento; flags como disposed, restoring e requestsReady protegem respostas tardias e o início da sessão.

@diagram ui | active escolhe a área principal; panel escolhe uma sobreposição. Essas dimensões de estado colaboram, mas não são a mesma variável.

## Por que a ordem do teclado importa

useKeyboard começa amostrando o relógio e registrando atividade. Ctrl+C e console são tratados antes da navegação. Esc resolve o nível mais próximo. Depois vêm atalhos globais, painéis, seleção de biblioteca, home, comandos, busca e finalmente a leitura.

preventDefault evita o comportamento padrão do campo quando a aplicação assumiu a tecla. stopPropagation evita que o evento continue em outros tratadores em casos específicos. Um retorno no meio do callback é parte do contrato: a mesma tecla não deve ser interpretada de novo em um contexto inferior.

## Componentes reutilizáveis

CommandBox mostra opções filtradas, seleção, entrada e erro. Calcula uma janela de resultados para manter o item selecionado visível. KeyHints padroniza atalhos e rótulos. LibraryPicker reúne navegação em diretórios, favoritos/recentes e mais usadas. PdfPage encapsula o carregamento e recorte da imagem PDF.

HomeLogo desenha o logo a partir da grade pixelizada de logo.ts. HomeStars distribui pontos determinísticos em espaço livre e anima cores com um relógio de baixa frequência. O efeito pode ser desativado por preferência; não é um gerador de imagens que cria uma nova marca a cada execução. Na 1.1.4, a busca mantém logo e animações; resultados, caminho e atalhos reservam espaço em janelas compactas.

As telas internas de App, como HomeScreen e StatisticsScreen, compartilham seu estado por closures.

# 16. Aparência, identidade visual e bibliotecas salvas

## Preferências válidas e defaults

preferences trata valores antigos, ausentes ou inválidos. Cores devem ser #RRGGBB. readingWidth fica entre 40 e 140 colunas; imagePercent entre 30 e 100; lineGap entre 0 e 2; animationPixelSize entre 1 e 3; animationDensity entre 25 e 200. protocol fica em auto ou blocks. Valores numéricos são finitos, arredondados e limitados.

Os defaults incluem largura 88, imagem 80%, sem linha adicional, animação ligada, pixel médio e densidade 100. As cores de fundo e texto efetivas passam pela paleta escolhida. updatePrefs valida o objeto inteiro após uma alteração e solicita salvamento.

## Paletas e tema

As cinco paletas são blue, mint, lavender, amber e coral. paletteById usa blue quando não reconhece o identificador. blend mistura canais RGB. themeFor deriva panel, muted, selected, selectedText, subtle e cores do logo a partir das preferências e da paleta.

Este PDF usa o logo existente e a paleta azul do LER em capa, aberturas, tabelas e diagramas. Páginas de texto são claras para melhorar a leitura de um documento longo; as capturas mantêm a superfície escura original. A marca não foi redesenhada.

@figure 03-aparencia | Aparência com as opções reais do LER, incluindo idioma, efeitos e paleta.

## Logo, estrelas e ícones

logoPixels transforma matrizes de letras em LogoPixel, classificando letra, espaço, spark, inset e baseline. A densidade modifica pixels de detalhe, e animationPixel escolhe o glifo. twinkleColor e pixelColor alteram cor conforme fase e posição; homeStars usa um gerador determinístico com limite de pontos e posições sem repetição.

generate-icon.ts reutiliza esses dados para criar PNG e ICO em vários tamanhos. Não há um logo independente que precise ser atualizado manualmente em outro programa. O instalador, os atalhos, Aplicativos instalados e o site devem derivar dessa mesma identidade.

## Histórico e favoritos de bibliotecas

recordLibraryVisit grava visitas e lastUsed. setLibraryFavorite cria a identificação de biblioteca se faltar e grava o favorito de forma temporária seguida de rename. listLibraryLocations lê as bibliotecas registradas, descarta diretórios internos da instalação e deduplica caminhos com normalização de caixa no Windows.

Favoritos indisponíveis podem continuar listados, enquanto entradas indisponíveis não favoritas são omitidas. A ordenação favorece favoritos e uso recente. LibraryPicker tem sua própria ordenação para a aba de mais usadas e um contador request para que uma enumeração de pasta antiga não substitua a resposta de uma navegação nova.

shortLibraryPath abrevia a apresentação por colunas e grafemas, sem modificar o caminho real.

# 17. Comandos, limites e encaminhamento de arquivos

## Paleta de comandos

paletteCommands constrói uma lista conforme reading, pdf e hasTabs. Um comando pode ser geral, de leitura, textual, PDF ou de abas. integerArgument só aceita dígitos, inteiro seguro e intervalo válido. A interface traduz descrições e uso, mas o comando permanece igual em ambos os idiomas.

submitCommand separa nome e argumentos, rejeita argumentos inesperados ou ausentes e calcula limites dependentes do contexto. Números informados pelo usuário começam em 1; índices internos começam em 0. A validação ocorre antes de alterar o estado. Um erro mantém a caixa aberta com orientação.

@commands

@figure 07-comandos | Paleta de comandos filtrada por “palette”, capturada sem montar uma tela fictícia.

## A fila de “Abrir com LER”

requestBookOpen cria open-requests na área da biblioteca, escreve um pedido com caminho absoluto e created em um temporário de nome UUID e o renomeia para .json. Essa sequência impede que o consumidor leia um pedido pela metade.

consumeBookRequests considera nomes com formato permitido, no máximo 20 por chamada, arquivos regulares que não sejam links simbólicos, tamanho de até 16 KiB, caminho absoluto, extensão reconhecida e data a menos de 120 segundos de distância do relógio atual. O pedido é removido em finally após ser tratado. JSON inválido ou pedido antigo não abre um arquivo.

App consulta as áreas de pedidos a cada 500 ms quando a restauração terminou e não existe outra leitura de pedidos em andamento. A comunicação é local por arquivos. Não é um servidor acessível pela internet e não transforma um comando de shell em texto a ser executado.

## Inventário dos limites relevantes

@limits

Esses limites têm funções distintas. Debounce reduz repetição de trabalho; timeout impede espera indefinida de pedido; cache limita retenção de páginas; limite de recursos ZIP reduz expansão exagerada; orçamento de pixels limita imagem descomprimida. Nenhum deles mede sozinho o uso total do programa.

# 18. Construção, instalação e publicação

## Código de desenvolvimento e produto instalado

No checkout, Bun executa TypeScript/TSX com o plugin Solid. Em um release, build-release.ps1 prepara um payload temporário, instala dependências de produção com o lockfile congelado, executa prepare-runtime.ts e empacota o resultado com Inno Setup. O usuário recebe JavaScript preparado, Bun privado, bibliotecas nativas/WASM, guias e ícones.

prepare-runtime mantém o diretório de cada módulo. Reescreve importações relativas sem extensão para .js e URLs dos workers de .ts para .js. Redireciona imports do adaptador para runtime-solid.js e imports de Solid para a variante cliente. Agrupa o adaptador com Bun.build, deixando core e Solid externos para compartilhar as implementações corretas.

O script remove devDependencies e scripts do manifesto do payload e segue dependencies e optionalDependencies dos pacotes mantidos para podar o restante. Consolida avisos de licença de pacotes em THIRD-PARTY-NOTICES.txt, remove executáveis de .bin e escopos vazios. Os fontes e lockfiles do repositório continuam completos.

@diagram release | Da branch e dos testes ao instalador, à validação isolada e à publicação autorizada.

## build-release.ps1 passo a passo

Descobre o compilador Inno ou o baixa quando -DownloadCompiler é informado. Nesse caso, verifica assinatura e fornecedor do executável do compilador antes de extrair a instalação portátil. Localiza Bun e exige Windows x64. Gera os ícones pelo script do projeto.

Cria um diretório UUID dentro de dist, copia entradas necessárias, gera preload.js, leva Bun para .ler/runtime e instala dependências com cache isolado. Precompila o código e registra build-sources.json com hashes dos fontes usados. Valida bin/LER.cmd --check com apenas comandos do Windows no PATH. Remove caches/configurações temporárias do payload e invoca ISCC.

No final, calcula SHA-256 do setup e escreve um arquivo .sha256. Em finally, apaga somente o diretório de trabalho verificado dentro de dist. O instalador normal e o de validação têm nomes e AppIds separados.

## O que installer.iss instala

Define AppId, versão, diretório padrão por usuário, idiomas PT/EN, ícone, compressão e registro de desinstalação. As tarefas selecionáveis incluem menu Iniciar, área de trabalho, PATH e menu de contexto para EPUB, PDF e TXT. As associações adicionam uma ação “Abrir com LER”, sem substituir necessariamente o aplicativo padrão do formato.

Atalhos e comandos de contexto apontam ao Bun privado, preload.js e main.js. A página de manutenção permite atualizar ou desinstalar quando encontra a instalação registrada. OwnsShortcut permite atualizar atalhos próprios antigos, inclusive quando a tarefa atual não os selecionou novamente.

PathWithout remove somente a entrada correspondente ao bin do LER e preserva os demais componentes, inclusive entradas vazias e separadores. PrepareToInstall recusa uma pasta já preenchida que não tenha o identificador de instalação gerenciada. InstallDelete substitui pastas de código e dependências antigas, preservando .ler durante a atualização.

## Atualização e desinstalação são operações diferentes

update-installed.ps1 descobre InstallLocation no registro do usuário, valida o identificador, verifica processos na pasta de instalação e interrompe a atualização se LER estiver em uso. Calcula hashes de dados de leitura, chama o novo setup na mesma pasta sem sobrescrever escolhas de tarefas e confere os hashes depois. Compara build-sources.json com os fontes para detectar um instalador desatualizado.

Essa conferência cobre as áreas de dados enumeradas pelo script, não é uma cópia de segurança completa de todo arquivo imaginável que alguém tenha colocado na instalação. O usuário pode manter seu próprio backup de .ler. Um release de branch não deve ser instalado por cima da versão estável sem autorização.

A desinstalação remove o aplicativo e .ler depois da confirmação. Livros externos ficam fora desse diretório e são preservados. O projeto nunca testa remoção desinstalando a instalação real do usuário: test-installer usa o AppId de validação e arquivos sintéticos.

## Instalação a partir do código

install.ps1 e install.cmd servem ao checkout. O modo padrão instala dependências de uso; -Development inclui compilador e tipos. Se Bun não existir, o bootstrap usa npm para preparar o runtime fixado. Save-LerRuntime tenta hard link e usa cópia como alternativa. O modo de uso pode mover uma árvore antiga de node_modules para área temporária e restaurá-la se a instalação nova falhar.

context-menu.ps1 constrói registros de ações para formatos suportados e identifica a pasta proprietária. open-book.ps1 resolve o arquivo e encaminha parâmetros para o runtime, preservando caminhos literais. O método antigo por scripts de PowerShell continua útil no fluxo de checkout; o instalador gráfico usa diretamente Bun no registro.

## Publicar é uma ação explícita

A regra atual considera 1.1.3 estável. Trabalho novo fica em branches codex/. Cada modificação lógica recebe um commit local e seu hash é informado. Push só ocorre por indicação explícita; enviar uma branch não autoriza merge, tag ou publicação. Site e instalação estável são produção.

O formato de versão é A.B.C. A só aumenta quando o usuário pedir. Funcionalidade nova aumenta B e reinicia C. Correção ou atualização menor aumenta C. Exemplos após 1.1.3: 1.1.4 para correção, 1.2.0 para funcionalidades. Não se aumenta a versão do produto a cada commit de documentação.

# 19. Site e automação no GitHub

## Site estático, duas línguas

site/index.html é a página em português; site/en/index.html é a inglesa. A troca de idioma funciona por links comuns. style.css define identidade visual e adaptação de layout. main.js habilita cópia de comandos quando clipboard está disponível e consulta a última release estável do GitHub.

O download dinâmico exige nome de asset compatível e URL com origem github.com e prefixo de caminho do repositório. Em falha de rede ou resposta inadequada, os links estáticos para Releases permanecem. A consulta tem timeout de seis segundos e cache:no-store. A aplicação desktop de leitura não depende dessa API para abrir um livro.

build-site.ts copia recursos, calcula hashes de CSS/JS e os insere como versão nas URLs para renovar cache. Gera logo.svg a partir dos mesmos pixels da interface, copia o PNG existente e cria .nojekyll. Não exige um framework de frontend para servir a apresentação do projeto.

## Workflows

ci.yml instala com Bun fixado e executa typecheck e testes no Windows. package.yml gera os instaladores e valida instalação/remoção sem publicar release. pages.yml constrói o site em Ubuntu e só faz deploy de produção para main, enquanto pull requests podem construir sem publicar.

release.yml verifica se a tag corresponde ao package.json, instala e testa, gera setup normal e de validação, executa as validações em português e inglês e preserva logs. As notas incluem a seção atual do changelog e os guias nos dois idiomas. Gera e verifica também o manual técnico PDF versionado. Cria rascunho, envia setup, checksum e PDF e só depois torna a release pública e latest.

O pipeline não sobrescreve uma release que já é pública. Tags publicadas devem permanecer imutáveis. Os instaladores de validação não são os assets do download. O site descobre a última release estável, portanto a conclusão do upload é parte da atualização do botão de download.

## Verificar uma publicação

Confira conclusão dos testes e dos jobs de instalador, status do GitHub Pages e existência dos três assets normais (setup, checksum e PDF). Baixe o setup e seu .sha256 e compare hashes. Um checksum verifica integridade do arquivo baixado; não equivale a assinatura digital do autor. A edição documentada não configura um certificado de assinatura do setup LER.

# 20. Testes: o que cada família protege

## Estrutura de testes

O projeto usa bun:test e testRender do adaptador Solid. Os testes de interface criam dimensões de terminal conhecidas, simulam teclado e mouse e inspecionam frames. Isso permite validar navegação sem depender da sessão pessoal. Fixtures criam EPUBs ZIP e PDFs próprios; livros pessoais não são necessários para executar a suíte.

Asserções de comportamento perguntam se a tela, a posição ou os dados estão corretos, em vez de apenas repetir o código. Um teste de highlights, por exemplo, seleciona, salva, redimensiona e reabre para verificar que a posição lógica e o texto foram preservados.

## Cobertura por responsabilidade

- core e epub: normalização, identidade de conteúdo, spine, recursos, sumário e falhas de abertura.
- formats e formats-ui: TXT, PDF, pixels, navegação, zoom e limites de páginas.
- catalog e search: metadados sem capítulos, cache, lotes, Unicode, resultados e limites.
- reading, pagination e highlights: telas, âncoras, seleção, marcadores e persistência.
- recovery e storage-location: principal/backup, corrupção, migração, locks e isolamento de dados.
- global-tabs e library-switch: várias origens, troca de biblioteca e sobrevivência de recursos PDF.
- library-locations: favoritos, visitas, recentes e seleção de pastas.
- commands, extra-commands e cli: contexto, argumentos, validação, idiomas e entrada por diretórios externos.
- statistics e performance-ui: contagem, pausa, conclusão, estimativas, debounce e trabalho desnecessário.
- logo, palettes, home, tabs-console e ui: aparência, menus, console, compactação de terminal e eventos.
- install e site: lançadores, caminhos literais, plano de registro, conteúdo bilíngue e links de download.

O catálogo de testes no apêndice lista os nomes exatos extraídos do código. “83 testes” é a contagem do snapshot de referência, não uma promessa eterna. O conjunto pré-compilado de validação usa os testes de execução apropriados ao payload, excluindo verificações que exigem fontes/scripts de checkout ou conteúdo do site.

## Executando e interpretando falhas

```powershell
.\node_modules\bun\bin\bun.exe run check
```

check executa tsc --noEmit e bun test. Uma falha de tipagem acontece antes da suíte. Timeout de um teste pode indicar espera por evento, worker ou renderização. Uma falha de comparação de caminho no Windows pode envolver caixa, caminho real ou alias 8.3; os testes de troca de biblioteca normalizam a raiz temporária com fs.realpath.

Um teste de renderizador não substitui toda validação de um terminal real. Protocolos gráficos, fonte, tamanho de célula, ambiente do console e permissões podem variar. O projeto também validou abertura da home e encerramento em terminal com uma cópia isolada do código instalado.

# 21. Desempenho medido e seus limites

## Inicialização

O histórico em docs/performance.md compara a instalação 1.1.2 com 1.1.3 no mesmo ambiente Windows x64 com Bun 1.4.4. São medianas de cinco processos por cenário após descartar a primeira rodada. --check passou de 527,51 ms para 32,22 ms; importar a interface, de 535,23 ms para 97,73 ms; RSS após importação e GC, de 141,54 MiB para 54,91 MiB.

@chart startup | Medições históricas de preparação do processo. Menor é melhor; os valores não incluem a janela do terminal ou livros restaurados.

A principal alteração foi transferir a compilação TSX/Babel para o build e carregar a interface sob demanda. Não é correto dizer que todo usuário verá a tela inteira em 32 ms: esse é o cenário --check. RSS de importação não é memória total de uma sessão com várias páginas PDF.

## Leitura PDF

O benchmark de PDF usa uma imagem RGB determinística de 1200 por 1600, dentro de um PDF escrito pelo próprio script. Alterna os caminhos, usa workers novos e descarta a primeira rodada. Exclui abertura, hash, inicialização do PDFium e desenho de terminal. O histórico registrou 729,31 ms no caminho PNG, 53,58 ms para pixels diretos e 2,78 ms em cache.

@chart pdf | Histórico da preparação de uma página sintética. As três barras têm a mesma unidade, milissegundos.

Esses números não são resultados de todo tipo de PDF. Vetores, fontes e imagens comprimidas diferentes produzem custos diferentes. O cache também tem custo de memória; a redução de trabalho em revisitas não é gratuita em armazenamento de pixels.

## Espaço em disco

O conjunto de dependências e Bun privado foi de 177,78 MiB para 161,05 MiB. node_modules caiu de 67,84 MiB para 51,11 MiB; o runtime continuou com 109,94 MiB. A contagem do conjunto caiu de 3.767 para 1.054 arquivos. O adaptador agrupado fica em src e não entra nessa tabela de dependências.

@chart size | Distribuição do tamanho lógico das dependências e runtime. Não inclui livros, dados de leitura ou espaço de blocos do sistema de arquivos.

dependency-size.ts considera identidade de arquivo para descontar hard links. Somar comprimentos de bun.exe e bunx.exe sem considerar o compartilhamento poderia superestimar espaço físico. RSS, tamanho do setup comprimido, soma lógica de arquivos e espaço alocado em disco são grandezas diferentes.

## Como investigar o próximo gargalo

Defina uma pergunta mensurável: abertura do processo, primeiro frame, abertura do livro, rasterização, busca, salvamento ou uso de RAM. Use arquivos de teste e delimite o que entra no cronômetro. Compare cenários equivalentes, alterne ordem quando necessário e reporte mediana e exclusões. Uma otimização não deve ser aceita apenas porque removeu linhas de código.

# 22. Ler e alterar o projeto com segurança técnica

## Roteiro de leitura do código

Comece por cli e main. Siga para start e LibrarySession, depois workspace e storage. Leia formats e text antes do leitor EPUB, pois são caminhos menores. Em seguida, leia layout e pagination, highlights e statistics. Deixe App inteiro para quando os contratos de Book e State já forem familiares. Por último, acompanhe PDF, workers e os scripts de distribuição.

Use o catálogo de funções para localizar o símbolo e o apêndice de código para ler o corpo. Um nome curto como text ou flush só ganha significado junto do arquivo e do escopo; o catálogo mantém essa localização. As listas de chamadas são obtidas sintaticamente, não são uma análise perfeita de execução ou de todos os callbacks indiretos.

## Como uma funcionalidade atravessa camadas

Se você quiser uma opção nova de aparência, definirá tipo/default/validação em preferences, talvez derivação de cores em palettes, controles em App e um teste de interface e persistência. Se quiser outro formato, precisará estender bookFormat, criar um leitor que cumpra Book, integrar openBook, catálogo quando aplicável e testar UI e fechamento de recursos.

Adicionar um comando exige revisar sua definição em commands, argumentos e ação em submitCommand, contexto de disponibilidade e tradução. Adicionar apenas um texto ao menu sem implementar seu contrato deixa um produto incompleto. A documentação de comandos e os testes precisam acompanhar o comportamento final.

## Recursos precisam de um dono

Quando criar worker, timer, imagem nativa, arquivo ou lock, identifique quem fecha o recurso. Um cache sem limite pode parecer mais rápido no início e degradar sessões longas. Uma Promise que nunca resolve pode prender a interface em busy. Um callback de worker antigo pode sobrescrever a tela de outro livro se não houver verificação de geração ou contexto.

O padrão observado no LER combina onCleanup em componentes, close em leitores, flags disposed/closed, timers canceláveis, mapas de pedidos e filas. Esses mecanismos não são duplicação casual: cada um protege uma fronteira de vida útil diferente.

## Diagnóstico de situações reais

Se o comando não é encontrado, confira PATH e reabra o terminal, sem reinstalar ferramentas globais por impulso. Se o programa informa biblioteca aberta, confira processos e lock da biblioteca. Se os dados não salvam, confira permissões e aviso de armazenamento em memória. Se o PDF não mostra imagem, teste protocolo blocks e valide o worker e os assets nativos/WASM.

Se o catálogo não encontra um livro novo, use /refresh e confirme o formato e a pasta selecionada. Se uma aba restaurada falha, verifique o arquivo original e seu conteúdo antes de apagar registros. Se o instalador parece antigo, confira versão, build-sources e checksum do arquivo que foi realmente executado.

# 23. Roadmap e evolução controlada

As ideias futuras ficam separadas do que está disponível. Cores confortáveis, modo focado, exportação, duplicatas, backup, novos formatos, busca global, PDF textual, catalogação local, celular, busca online e rede descentralizada têm complexidades distintas. A ordem documentada é uma hipótese de dificuldade, não uma ordem de implementação nem um compromisso de prazo.

Recursos de modelo local e OCR podem alterar fortemente o tamanho da distribuição. Rede e sincronização trazem novas fronteiras de falha e privacidade. O critério atual é manter leitura local disponível e avaliar componentes opcionais, carregados quando usados. Não há modelo, crawler, app mobile ou rede descentralizada implementados na versão estável documentada.

@roadmap

Uma extensão bem projetada deve ser testada em branch, com dados sintéticos, antes de entrar em produção. Quando houver publicação autorizada, o número de versão e o changelog devem refletir o comportamento que realmente ficou disponível. A documentação deste manual também deve ser regenerada quando os contratos mudarem.

# 24. Glossário de consulta rápida

@glossary

# 25. Referência completa por módulo e símbolo

Os registros seguintes são extraídos da árvore sintática TypeScript e de declarações dos scripts. Cada item identifica arquivo, linha, espécie, assinatura e chamadas reconhecidas. A explicação editorial relaciona o símbolo ao subsistema. Callbacks anônimos não ganham nomes artificiais como se fossem API pública; seus corpos continuam no apêndice de código, e os protocolos e eventos principais são explicados nos capítulos.

Uma assinatura extensa pode ser resumida na apresentação; o código completo correspondente está preservado no apêndice. Tipos descrevem dados e são removidos do JavaScript final. Funções internas são detalhes de implementação, mesmo quando aparecem nesta referência para fins de estudo.

@api

# 26. Catálogo dos testes

Os nomes abaixo foram lidos do snapshot do repositório. A descrição do teste é uma especificação executável do comportamento pretendido, não uma comprovação de que todos os casos possíveis do domínio foram cobertos. Testes que interagem com Windows são condicionados à plataforma quando indicado no código.

@tests

# 27. Código-fonte numerado e configuração

Este apêndice contém o código próprio examinado. A numeração preserva a linha original; linhas longas são quebradas visualmente e continuam sem novo número. Isso permite cruzar a referência por símbolo com o corpo da implementação, sem esconder callbacks, estilos, condicionais ou tratamento de erros.

O recorte inclui aplicação, testes, scripts de produto, lançador, site e workflows. Arquivos de dependências instaladas, executáveis, caches, dados pessoais e livros da biblioteca não são incluídos. Os scripts que geram este manual têm finalidade documental e são descritos no arquivo README da documentação, sem serem confundidos com componentes do aplicativo estável.

@source

# 28. Fontes, reprodução e encerramento do estudo

As fontes primárias são os arquivos do repositório identificados pela ficha técnica. Cada módulo tem referência de caminho e linha. As descrições de desempenho usam os registros de docs/performance.md e docs/dependencies.md; não foram inventadas novas medições de RAM ou tempos de tela para esta edição.

Para reconstruir os documentos, execute o snapshot e as capturas com o Bun do projeto e depois o gerador Python com ReportLab, Pillow, pypdf, pdfplumber e pypdfium2 disponíveis (Matplotlib fornece fontes quando DejaVu não está instalado). O EPUB usa o mesmo conteúdo e as mesmas figuras do PDF, com navegação por capítulos e texto refluível. O arquivo EPUB contém HTML/XML empacotado em ZIP, com mimetype não comprimido na primeira entrada.

O PDF e o EPUB são duas apresentações da mesma edição técnica. Uma tela de celular pode reorganizar tabelas ou exigir zoom para consultar um diagrama; o texto principal continua pesquisável e refluível no EPUB. Para estudar a implementação com máximo detalhe, combine capítulos conceituais, catálogo de símbolos e código numerado.

A melhor prova de entendimento é conseguir explicar um fluxo completo: a tecla é interpretada por um contexto, modifica sinais ou chama uma operação, o leitor ou worker produz dados, o estado ganha uma posição lógica, o renderizador recebe uma árvore visual e a persistência salva a leitura no lugar certo. Esse percurso é o fio condutor do LER.
