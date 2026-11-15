# Dependências, espaço e memória

Análise de 15/11/2026, Windows x64, Bun 1.4.4. Nenhum formato ou recurso de leitura foi removido.

## Espaço medido

| Instalação | Arquivos de dependências e Bun local |
| --- | ---: |
| Desenvolvimento, antes | 208,59 MiB |
| Uso, agora | 177,78 MiB |
| Redução | 30,81 MiB (14,8%) |

O modo de uso contém 67,84 MiB em `node_modules/` e 109,94 MiB no runtime local. Esses valores excluem livros, caches, backups e o arredondamento dos blocos do sistema de arquivos. Hard links são contados apenas uma vez: `bun.exe` e `bunx.exe` ocupavam o mesmo conteúdo físico, embora a soma ingênua dos arquivos indicasse mais 110 MiB.

Reproduza com `bun scripts/dependency-size.ts [pasta-da-instalação]`. O script usa a identidade dos arquivos para descontar hard links; não mede RAM nem espaço alocado por compressão do sistema de arquivos.

## Instalação de uso e desenvolvimento

`scripts/install.cmd` instala apenas as dependências de execução. Se Bun não estiver no sistema, baixa o runtime fixado no projeto e o mantém em `.ler/runtime/bun.exe`. A inicialização pelo comando LER e pelo Explorador encontra esse runtime. A instalação funciona offline após os downloads.

`scripts/install.cmd -Development` inclui o compilador e os tipos necessários para desenvolver e executar `bun run check`. O projeto de desenvolvimento continua completo. O modo de uso não tem o compilador TypeScript; isso não impede a execução do código pelo Bun.

O Bun não remove pacotes já instalados apenas com `--production`. Ao converter uma instalação antiga, o instalador preserva o runtime, move a árvore anterior para uma pasta temporária verificada e instala uma nova a partir do lockfile. Se o gerenciador falhar, restaura a árvore anterior. A migração deve ser feita com o LER fechado. Downloads/cache podem ser removidos depois com `scripts/clean.ps1`, sem apagar o runtime, livros ou dados de leitura.

`web-tree-sitter` já era instalado como dependência indireta da interface. Agora está explícito na mesma versão para permitir omitir peers exclusivos de desenvolvimento sem remover um módulo exigido pelo OpenTUI. Não houve atualização das versões resolvidas.

## Bibliotecas mantidas

- **Bun:** runtime necessário para executar o aplicativo, os workers e a transformação do código.
- **OpenTUI, Solid e Babel:** interface, teclado, mouse, imagens e transformação de TSX no modo atual de distribuição. Remover Babel exigiria uma distribuição pré-compilada separada.
- **PDFium:** renderização de PDF, incluindo páginas escaneadas e campos de formulário. O pacote possui variantes para outros ambientes, mas apagar arquivos internos manualmente tornaria a instalação frágil.
- **htmlparser2 e yauzl:** leitura do conteúdo e dos metadados EPUB, HTML, entidades e arquivos ZIP.
- **fast-png:** compatibilidade do recurso PNG e validação das imagens. Não é mais carregado no worker quando ele só atende à exibição direta dos pixels.

## Memória

O PDFium 3.0.0 já devolve os pixels em um buffer independente, por meio de `HEAPU8.slice()`. O LER agora transfere esse buffer diretamente, sem criar uma segunda cópia completa. Na resolução máxima existente de quatro milhões de pixels RGBA, isso evita uma alocação temporária de **16.000.000 bytes (15,26 MiB)** por renderização. Esse número representa a cópia eliminada, não uma medição da redução de RAM total do processo. A resolução e todos os pixels permanecem iguais; há uma cópia de segurança para buffers que não sejam independentes.

O codificador PNG é carregado sob demanda. O cache compartilhado de páginas continua limitado a 48 MiB; não foi reduzido para obter economia às custas da velocidade de navegação.

Cada PDF aberto ainda mantém documento e worker próprios. Compartilhar uma única instância ou suspender documentos reduziria memória em cenários com muitas abas, mas também poderia aumentar a espera ou fazer uma falha afetar todos os PDFs. Essas mudanças não foram aplicadas sem uma estratégia de recuperação e novas medições. Carregar capítulos EPUB sob demanda também exigiria adaptar busca, seleção e estatísticas.

## Validação

Tipagem estrita e 79 testes passaram no projeto. A instalação de uso, sem os tipos e o compilador, também passou pelos 79 testes, incluindo EPUB/TXT/PDF, igualdade dos pixels, teclado, mouse, destaques, estatísticas, abas, persistência e abertura pelo Explorador. Primeira instalação com npm e migração de uma instalação anterior foram verificadas em cópias isoladas. Caches e arquivos de teste não pertencem ao Git.
