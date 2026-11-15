# Comandos do LER

[Voltar ao README](README.pt-BR.md) · [English](commands.md)

Abra a paleta com `/`, F2 ou Ctrl+P. Digite para filtrar, use setas para escolher, Tab para completar, Enter para executar e Esc para voltar. O mouse também funciona. Os nomes são sempre em inglês e as opções se ajustam ao contexto.

`<argumento>` é obrigatório e `[argumento]` é opcional: digite apenas o valor, sem os sinais. Números de capítulo, página e aba começam em **1**. Um valor inválido mantém a caixa aberta sem alterar sua posição ou configuração.

| Comando | Uso |
| --- | --- |
| `/change-library [path]` | Trocar o diretório da biblioteca sem fechar o LER; sem valor abre o seletor |
| `/library` | Explorar pastas da biblioteca |
| `/palette [name]` | Escolher `blue`, `mint`, `lavender`, `amber` ou `coral`; sem valor alterna |
| `/settings` | Abrir aparência e preferências |
| `/continue` | Retomar a última leitura |
| `/help` | Ver atalhos de teclado |
| `/refresh` | Atualizar o catálogo após mudar arquivos |
| `/quit` | Salvar e sair |
| `/highlights` | Ver, filtrar e abrir destaques |
| `/stats` | Ver estatísticas da biblioteca |
| `/search [text]` | Buscar um trecho em EPUB/TXT |
| `/contents` | Abrir sumário ou páginas do PDF |
| `/bookmark` | Adicionar/remover marcador na posição atual |
| `/bookmarks` | Listar marcadores do livro |
| `/highlight` | Ativar/desativar o cursor de seleção em EPUB/TXT |
| `/pause` | Pausar/retomar o tempo de leitura |
| `/home` | Voltar à home mantendo livros abertos |
| `/close` | Salvar e fechar o livro atual |
| `/save` | Gravar progresso, destaques e preferências agora |
| `/info` | Ver informações e arquivo do livro atual |
| `/tabs` | Filtrar e escolher um livro aberto |
| `/switch <number>` | Abrir a aba com o número mostrado em /tabs |
| `/next-tab` | Próximo livro aberto |
| `/previous-tab` | Livro aberto anterior |
| `/chapter <number>` | Ir ao capítulo/seção de EPUB/TXT |
| `/page <number>` | Ir à página do PDF |
| `/next` | Próximo capítulo ou página |
| `/previous` | Capítulo ou página anterior |
| `/start` | Início do livro |
| `/end` | Fim do livro |
| `/back` | Posição anterior a um salto, nesta sessão |
| `/width <40–140>` | Largura de leitura em colunas |
| `/spacing <0–2>` | Linhas adicionais de espaçamento |
| `/zoom <100–400>` | Zoom do PDF em porcentagem; aceita também 150% |
| `/fit` | Página inteira do PDF, centralizada |
| `/animation [on\|off]` | Animações da home; sem argumento alterna |
| `/language [en\|pt-BR]` | Idioma; sem argumento alterna |
| `/protocol [auto\|blocks]` | Protocolo gráfico; sem argumento alterna |

Exemplos: `/chapter 12`, `/page 25`, `/search uma frase`, `/width 88`, `/zoom 150`, `/animation off`.

`/back` guarda até 50 posições por livro durante a sessão. Saltos não contam como capítulos concluídos. As preferências são salvas por biblioteca; o zoom de PDF vale para a visualização atual. `/search` permanece indisponível em PDFs exibidos como imagem.

Na lista de destaques, digite para filtrar, use Tab para alternar entre todos os livros e o último livro lido, Enter para abrir e Ctrl+D para excluir.
