# Roadmap do LER

Este documento reúne ideias para experimentar no futuro. Registrar uma ideia não autoriza sua implementação nem define prazo, prioridade ou versão de lançamento. Nenhum dos itens abaixo está em desenvolvimento.

A versão estável de referência é a **1.1.4**. Experimentos devem acontecer em branches próprias, preservando a instalação estável e o site em produção. Cada modificação lógica concluída recebe um commit local informado ao usuário; push e publicação dependem de indicação explícita.

## Ideias em ordem de dificuldade estimada

Ordem teórica do mais simples ao mais difícil, considerando o LER atual e uma primeira versão útil de cada recurso. A ordem representa complexidade, não prioridade de execução. Todos os itens continuam como ideias para experimentos futuros; os identificados como sugestões ainda dependem de avaliação do usuário.

| Ordem | Frente | Origem | Dificuldade | Escopo e motivo da estimativa |
| --- | --- | --- | --- | --- |
| 1 | Modo de leitura com cores que não cansem a vista | Solicitado | Baixa | Explorar paletas suaves, fundos e contraste ajustáveis para uma leitura confortável, aproveitando o sistema de aparência existente. |
| 2 | Modo de leitura focada | Sugestão | Baixa | Um comando para pausar efeitos visuais e reduzir elementos da interface, reutilizando controles existentes. |
| 3 | Exportar destaques, notas e referências | Sugestão | Baixa a média | Gerar Markdown ou texto a partir dos dados já salvos; começar pelos destaques e ampliar para notas e referências. |
| 4 | Detectar duplicatas e preservar a organização | Sugestão | Média | Começar por arquivos de conteúdo idêntico, aproveitando a identificação existente dos livros; avaliar edições semelhantes em uma etapa posterior. |
| 5 | Backup e restauração pela interface | Sugestão | Média | Facilitar a cópia dos dados de leitura entre instalações, com validação, tratamento de conflitos e recuperação em caso de falha. |
| 6 | Suporte a outros formatos de arquivos | Solicitado | Média a alta | Começar por formatos de texto e marcação mais simples; avaliar fidelidade, dependências e desempenho de cada novo leitor. |
| 7 | Busca no conteúdo de toda a biblioteca | Sugestão | Alta | Criar um índice local com atualização incremental para encontrar passagens entre vários livros, controlando espaço, memória e tempo de indexação. |
| 8 | PDF com seleção de texto e mais recursos | Solicitado | Alta | Permitir seleção, cópia, busca e destaques, integrando o texto às coordenadas da página. Avaliar OCR opcional para documentos escaneados em uma etapa posterior. |
| 9 | Modelo local/algoritmo para catalogar e organizar livros | Solicitado | Alta | Identificar metadados, classificar e organizar livros. Começar por regras e metadados; comparar depois um modelo local em qualidade, velocidade, tamanho e consumo de memória. |
| 10 | Aplicativo mobile ou web para leitura no celular | Solicitado | Muito alta | Avaliar um leitor web adaptado ao celular ou um aplicativo mobile, com interface de toque, importação de arquivos, persistência e leitura offline. Exige uma nova interface além do terminal e testes nos dispositivos escolhidos. Sincronização com o desktop pode ser avaliada separadamente. |
| 11 | Deep search e web scraping | Solicitado | Muito alta | Buscar livros, artigos, trabalhos acadêmicos e outros materiais na internet, com fontes configuráveis, indicação de origem, deduplicação e adaptação às mudanças das fontes. |
| 12 | Rede de compartilhamento descentralizado de livros | Solicitado | Muito alta | Definir descoberta de usuários e obras, transferência, integridade, disponibilidade e privacidade antes de escolher a tecnologia. Envolve uma arquitetura de rede além do leitor local. |

A dificuldade depende do recorte: um novo formato simples ou uma catalogação baseada em regras pode ficar pronto antes de recursos acima dele; formatos complexos, OCR e modelos locais podem elevar bastante o esforço. Um leitor web básico para celular também pode ser mais simples que um aplicativo mobile completo com sincronização. As estimativas deverão ser revistas ao definir cada experimento.

Na organização automática, considerar uma prévia das alterações e a possibilidade de desfazer renomeações e movimentações. Na descoberta online, separar busca, revisão de resultados e importação para a biblioteca. O escopo de cada experimento será definido quando o usuário decidir iniciá-lo.

## Critérios para os futuros experimentos

- Preservar a proposta de um leitor pequeno, rápido e econômico em recursos.
- Carregar recursos mais pesados, como modelos, OCR e acesso à rede, somente quando forem usados; avaliar componentes opcionais.
- Manter a leitura local disponível sem rede e preservar os dados existentes.
- Medir os resultados antes de promover um experimento a funcionalidade estável.
- Definir a ordem de trabalho com o usuário, sem iniciar implementações automaticamente a partir deste documento.
