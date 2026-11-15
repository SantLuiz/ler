# Desempenho

Análise local de 15/11/2026, Windows, Bun 1.4.4. Os números abaixo são medições de uma imagem sintética, não uma promessa para todos os livros.

## PDF

O caminho anterior renderizava a página no PDFium, codificava PNG em JavaScript, enviava os bytes entre processos e decodificava a imagem para exibi-la. A interface agora recebe pixels RGBA por transferência de buffer e importa a imagem diretamente no renderizador nativo. A resolução, as cores e os campos de formulário permanecem iguais. O recurso PNG continua disponível para os consumidores que precisam dele.

| Preparação da página | Mediana |
| --- | ---: |
| Caminho anterior com PNG | 729,31 ms |
| Pixels diretos, primeira visita | 53,58 ms |
| Pixels em cache | 2,78 ms |

Para reproduzir, execute `bun scripts/benchmark-pdf.ts` na raiz. O script cria e remove um PDF próprio com imagem RGB determinística de 1200 × 1600 pixels. Usa um documento e worker novos para cada caminho, alterna a ordem, descarta a primeira rodada e informa a mediana de três amostras. Inclui renderização e preparação nativa da imagem; exclui abertura do documento, hash, inicialização do PDFium e saída para o terminal. Não usa livros pessoais nem deixa arquivos binários no projeto.

O cache de pixels é compartilhado entre todas as abas PDF e limitado a **48 MiB e seis páginas**, com descarte das menos recentemente usadas. Esse limite se refere ao cache, não à memória total do processo: PDFium, o documento e as imagens nativas também consomem memória. Solicitações simultâneas da mesma página reutilizam o processamento em curso. A próxima página é preparada após 250 ms de estabilidade; sair da página cancela a preparação ainda não iniciada. Uma renderização já em andamento não é interrompida. Fechar a aba limpa seu cache e encerra o worker. Zoom e deslocamento reutilizam a imagem atual.

## Outras melhorias

- Livros fechados deixam a lista de recursos abertos; seus históricos temporários de busca e navegação também são liberados. Progresso, marcadores e destaques continuam salvos.
- Estatísticas e listagem de destaques só são recalculadas enquanto suas telas estão abertas.
- Salvamentos sem alterações não regravam o estado nem a lista de abas. A primeira gravação já cria uma cópia de recuperação; gravações posteriores preservam o estado anterior no backup.
- A divisão de texto reutiliza o segmentador Unicode, mantendo acentos, emojis e posições de leitura.

Não foram adicionadas dependências, reduzida a resolução dos PDFs ou alterado o formato dos dados existentes. Não há um cache de páginas em disco.

## Limites e validação

PDFs com vetores, fontes ou imagens complexas ainda exigem trabalho no PDFium. Abrir livros grandes ainda envolve hash do arquivo; cada PDF aberto mantém seu worker. O terminal, seu protocolo de imagens e o tamanho da janela influenciam o tempo até a imagem aparecer. Essas etapas não foram estimadas a partir do benchmark.

`bun run check` passou com **79 testes**, incluindo comparação de todos os pixels entre PNG e RGBA, cache, preparação antecipada, descarte de imagens, navegação, zoom, EPUB/TXT, destaques, estatísticas, troca de biblioteca, instalação e recuperação de estado.
