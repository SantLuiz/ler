# LER — Leitor Extremamente Reduzido: diretrizes e fases até o MVP

## Objetivo e decisões

Leitor EPUB open source de portfólio, com pastas reais como biblioteca, abas internas inspiradas no OpenCode e operação por teclado. Windows primeiro, interface português/inglês, licença MIT. O comando abre a pasta atual ou uma biblioteca escolhida. Todos os arquivos persistentes do aplicativo ficam dentro da pasta clonada; a única configuração persistente externa é o PATH do instalador.

MVP: EPUB 2/3 fluido, navegação de pastas, filtro, abas, sumário, imagens raster, paginação e rolagem, progresso automático, restauração, busca textual e marcadores. Depois: anotações, sincronização, gestão de pastas, executáveis e validação Linux/macOS. Excluídos: DRM, PDF, layout fixo, multimídia e reprodução completa de CSS.

## Arquitetura

- TypeScript estrito, Bun 1.4.4, OpenTUI 0.9.0 e Solid.
- `yauzl` para leitura de entradas ZIP e `htmlparser2` para XML/XHTML.
- Parser e layout independentes da TUI; capítulo, bloco e offset como âncora, nunca página fixa.
- SHA-256 dos bytes identifica livros idênticos movidos/renomeados; caminhos relativos tornam a biblioteca transportável.
- Estado JSON versionado, fila de gravações, substituição atômica, backup e trava por biblioteca.
- Salvamento após 500 ms ociosos e no máximo a cada dois segundos durante navegação; flush ao sair.
- Leitura sem rede; não executar scripts, não buscar imagens remotas, limitar recursos descomprimidos.
- Limites iniciais: 20 mil entradas ZIP, 32 MiB por recurso e 64 MiB de texto por livro.

## Interface e comportamento esperado

Fundo escuro, cinzas discretos, azul de destaque, poucos contornos, coluna até 88 células. Biblioteca fixa e abas independentes de livros, sem duplicação da mesma identidade. Restaurar abas e posições. Abas devem poder ser fechadas por mouse e teclado e permanecer acessíveis quando excederem a largura.

Setas/j/k rolam linhas; Page Up/Down, ←/→ e Espaço movem uma tela com uma linha de contexto; Home/End navegam no capítulo. F6 alterna abas, F4 fecha, F2 abre comandos; `/` busca; n/N percorre resultados; s abre sumário; b alterna marcador, Shift+B lista e d remove. Campos de entrada recebem texto sem disparar comandos de leitura. Mouse é opcional.

Preservar âncora ao redimensionar. Tratar sumário EPUB 3 e NCX EPUB 2, ordem pelo spine. Imagens inline preservam proporção, com SIXEL/Kitty e alternativa Unicode. Antes do MVP concluir visualização ampliada e recorte durante rolagem. Animações breves, movimento reduzido e ausência de redesenho contínuo quando ocioso.

Busca em todos os capítulos sem distinguir maiúsculas, indexação cancelável fora do fluxo de renderização. Mostrar trechos e navegar à âncora. Marcadores persistem âncora, trecho e data. Não alterar EPUBs originais. Refletir organização externa de pastas e ignorar arquivos internos do projeto. Descobrir livros sem obrigar importação.

## Fases e estado real

1. **Prova técnica:** dependências instaladas, tipos verificados e teste do renderizador nativo. Pendente: validar SIXEL, abas e resize em Windows Terminal real.
2. **Biblioteca:** seleção inicial, navegação, comandos e busca na home por arquivo/título/autor em subpastas implementados. Catálogo em worker com metadados, cache por tamanho/mtime, resultados progressivos e atualização via Ctrl+R. Pendente: revisão integral das traduções de erros.
3. **Leitura:** pacote/spine, capítulos, sumário EPUB 2/3 com fragmentos, seleção por teclado/mouse, raster redimensionável, quebra em palavras e teclado implementados. Pendente: fidelidade de ênfase, texto pré-formatado e QA visual.
4. **Sessão:** progresso, identidade por hash, lock, recuperação de backup, abas e marcadores implementados. Pendente: reconexão automática de caminhos movidos durante varredura e revisão de falhas de encerramento.
5. **Pesquisa:** busca literal em worker cancelável, lista navegável, navegação n/N e resultados por aba implementados. Busca da biblioteca é separada da pesquisa de texto e ignora diferenças de caixa e acentuação.
6. **Polimento/MVP:** documentação bilíngue, MIT e CI preparados; faixa de abas acompanha o livro ativo, fechamento por mouse e visualização ampliada disponíveis. Pendentes: localização integral de erros, demonstração e instalação limpa em terminal real.

Configurações: aba F3 com fundo/texto personalizados, largura, espaçamento, altura das imagens (padrão 80%), idioma e protocolo, salvos por biblioteca. Fonte é controlada pelo emulador; orientação de zoom incluída na interface.

Identidade e navegação atualizadas: nome LER, logo em caracteres, home central com busca e slash commands, atalhos iniciais e retomada de leitura. Abas em uma linha sem bordas, com fundos sutis e fechamento. A biblioteca por pastas fica num popup filtrável abaixo da busca. Pesquisa vazia não lista o catálogo; resultados são limitados à área da home.

Armazenamento revisado: `LER/.ler/libraries/<id>/` guarda dados separados por biblioteca; a identidade é derivada da referência relativa à pasta clonada. Caches e temporários do instalador/runtime também ficam em `.ler/`. Nenhum desses dados vem preenchido no Git. A versão antiga é migrada por cópia verificada antes da remoção dos arquivos conhecidos de `.leitor/`; arquivos desconhecidos são preservados. O antigo config do perfil é arquivado no clone, sem gerar nova configuração externa.

Validação executada: verificação TypeScript e testes automatizados de núcleo e interface, incluindo navegação do sumário por teclado e mouse e persistência de configurações. Inicialização da interface em PTY e saída via Ctrl+C verificadas, com restauração do terminal. Isso não substitui inspeção visual das imagens SIXEL em Windows Terminal.

As fases não estão marcadas como concluídas apenas porque há código. Publicar v0.1.0 somente após cumprir os critérios abaixo.

## Validação e aceite

Testar EPUBs válidos e inválidos, ordem diferente no ZIP/spine, caminhos relativos, Unicode, âncoras, backup corrompido, concorrência e renomeação. Teste nativo em memória cobre saída de células, não comprova protocolo gráfico real.

No Windows Terminal 1.22+: abrir dois livros, alternar e fechar abas, ler com os dois modos de navegação, atravessar capítulos sem perder texto, redimensionar, abrir painéis sobre imagens e sair com terminal restaurado. Reabrir deve restaurar sessão e trecho; mover ou copiar livros deve manter progresso. Buscar em outro capítulo e restaurar marcadores deve funcionar nos dois idiomas.

Registrar versões do terminal/runtime, dimensões e protocolo. Validar instalação limpa pelo README, sem conta ou rede durante leitura. Só então criar demonstração e release. Usar apenas fixtures próprias ou redistribuíveis; nunca incluir livros pessoais no Git.

## Instalação e revisão de usabilidade

Fluxo Windows: criar biblioteca, clonar o LER numa subpasta e executar `install.cmd`. O instalador usa Bun existente ou prepara Bun local via npm, instala dependências com lockfile e registra `bin/` no PATH do usuário. `LER` abre a pasta atual; dentro do repositório, abre a pasta pai. `LER "caminho"`, `--library` e `--choose` permitem outra biblioteca. O launcher preserva o diretório de execução e carrega explicitamente a transformação Solid, mesmo fora do repositório.

Legendas contextuais: teclas em destaque e descrições curtas, sem repetir listas de atalhos em cada botão. Rodapé da leitura apresenta progresso e acesso à busca/sumário; home apresenta comandos; configurações e popups exibem apenas seus controles.

Novas verificações e evidências estão em [VALIDATION.md](VALIDATION.md). A validação do instalador usa `-NoPath` para não alterar o PATH persistente durante testes.

## Fontes da pesquisa

- [OpenTUI: runtime](https://opentui.com/docs/getting-started/runtime-support/)
- [OpenTUI: imagens e protocolos](https://opentui.com/docs/components/image/)
- [OpenTUI: testes](https://opentui.com/docs/core-concepts/testing/)
- [Microsoft: SIXEL no Windows Terminal](https://devblogs.microsoft.com/commandline/windows-terminal-preview-1-23-release/)
- [W3C EPUB](https://www.w3.org/TR/epub-33/)
- [yauzl](https://github.com/thejoshwolfe/yauzl)
- [htmlparser2](https://github.com/fb55/htmlparser2)
