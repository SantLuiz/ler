# Manual técnico do LER

Fonte editável do livro **LER por dentro - Manual completo do projeto**, em português, com a identidade visual existente do projeto.

## Conteúdo e rastreabilidade

- `manuscript.md`: capítulos explicativos e pontos de inserção de tabelas, capturas, diagramas e gráficos.
- `notes.json`: explicações editoriais dos módulos, tipos, campos, funções e métodos.
- `../../scripts/manual/snapshot.ts`: lê os arquivos versionados, usa a AST TypeScript para inventariar símbolos/testes e registra versões declaradas/resolvidas de dependências.
- `../../scripts/manual/capture.tsx`: usa o renderizador real de testes OpenTUI, com arquivos demonstrativos próprios; não acessa livros ou dados de leitura pessoais.
- `../../scripts/manual/build.py`: gera PDF e EPUB a partir dos mesmos blocos de conteúdo. Inclui sumário, código numerado, fontes e inventário do lockfile.
- `../../scripts/manual/qa.py`: verifica limites de texto do PDF, XML e referências locais do EPUB e produz folhas de contato para revisão visual.

O snapshot registra o commit examinado e o commit da base funcional. Os números de linha do livro se referem a esse recorte. O código das bibliotecas externas não é reproduzido integralmente: o livro documenta seus contratos de integração, versões e responsabilidades. As listas de chamadas são extraídas sintaticamente e não representam um perfil de execução.

## Gerar novamente no Windows

Requer dependências de desenvolvimento do projeto e Python com `reportlab`, `Pillow`, `pypdf` e `pdfplumber`, `pypdfium2` e `matplotlib`. O gerador usa fontes DejaVu em `C:\Windows\Fonts` ou as fornecidas pelo Matplotlib. Poppler é usado para a revisão visual opcional. Essas ferramentas são do processo de documentação, não dependências adicionais da aplicação instalada.

```powershell
.\node_modules\bun\bin\bun.exe scripts/manual/snapshot.ts
.\node_modules\bun\bin\bun.exe scripts/manual/capture.tsx
python scripts/manual/build.py
pdftoppm -r 42 -png output/pdf/LER_por_dentro_Manual_completo_1.1.4.pdf dist/manual-data/page
python scripts/manual/qa.py
```

Os fontes editoriais e scripts ficam no Git. Os arquivos em `dist/manual-data/` e `output/` são gerados e ficam ignorados. O PDF final vai para `output/pdf/`; o EPUB para `output/epub/`. A cópia para a biblioteca pessoal é uma etapa de entrega, não uma publicação do produto.

O gerador valida a estrutura básica do EPUB e seus links; sua abertura também foi verificada com o leitor EPUB do próprio LER. Isso não substitui uma certificação por todas as ferramentas externas ou leitores digitais existentes. O PDF precisa de revisão das páginas renderizadas após mudanças de conteúdo/layout. A release gera e anexa o PDF versionado junto ao instalador e checksum. O snapshot aceita `MANUAL_BASE_REF` para identificar a base funcional; por padrão usa o último commit que alterou `src` ou `package.json`.

## Preservar produção

Criar ou revisar este manual não incrementa a versão do aplicativo nem autoriza push, tag, instalação ou publicação. A versão estável e a instalação do usuário permanecem intactas.
