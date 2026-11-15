# Página e releases do LER

O site está em `site/`. O build (`bun scripts/build-site.ts`) gera `dist/site/` e deriva o logo de `src/ui/logo.ts`, sem dependências de frontend. A página usa links relativos, funciona sob `/ler/` e mantém links para Releases mesmo sem JavaScript. Quando a API pública do GitHub está disponível, o botão passa a apontar diretamente para o instalador da última release estável.

## Ativar o GitHub Pages

Em **Settings → Pages → Build and deployment → Source**, selecione **GitHub Actions**. Envie os arquivos para `main`: o workflow `pages.yml` compila e publica o site. Também é possível executar **Actions → GitHub Pages → Run workflow**. Endereço esperado: https://santluiz.github.io/ler/.

Pull requests compilam a página sem publicar. Para visualizar localmente, compile e sirva `dist/site/` com um servidor HTTP de sua preferência.

## Publicar uma versão

1. Atualize a versão em `package.json` e as notas em `CHANGELOG.md`. Faça commit e envie as alterações para `main`.
2. Crie e envie uma tag correspondente à versão, por exemplo:

```powershell
git tag -a v1.1.0 -m "LER 1.1.0"
git push origin v1.1.0
```

3. O workflow `release.yml` executa os testes, gera o instalador com `scripts/build-release.ps1`, testa instalação e remoção usando o AppId separado de validação e publica o `.exe` e seu SHA-256. Uma falha no upload mantém a release como rascunho. Releases públicas existentes nunca são sobrescritas.
4. Confira os dois anexos em **Releases**. O botão do site acompanha automaticamente a última versão estável; não exige editar o HTML.

Para repetir uma execução, use **Actions → Publish Windows release → Run workflow**, informando a tag já existente. Não mova tags de versões publicadas. O workflow usa o `GITHUB_TOKEN` fornecido pelo GitHub; não precisa de PAT ou segredo adicional.

O workflow `package.yml` continua disponível para gerar artefatos sem publicar uma release. Os instaladores de validação nunca são disponibilizados para download público.

## Verificar o download

Baixe o instalador e o arquivo `.sha256` da mesma release. No PowerShell:

```powershell
Get-FileHash .\LER-1.1.0-Setup-x64.exe -Algorithm SHA256
Get-Content .\LER-1.1.0-Setup-x64.exe.sha256
```

Compare os hashes. O checksum verifica integridade; não substitui assinatura digital do executável. O build atual não configura certificado de assinatura do instalador LER.
