# LER portatil — Windows x64

1. Transfira o ZIP e extraia **todo o conteudo** para uma pasta exclusiva e gravavel pelo seu usuario, por exemplo `Documentos\LER`. Nao execute dentro do ZIP.
2. Abra `LER.cmd` com dois cliques. Nenhuma configuracao e obrigatoria. A home abre diretamente; escolha a biblioteca dentro do aplicativo com Ctrl+L.
3. Para verificar os arquivos e disponibilizar o comando `LER` no terminal, abra o PowerShell na pasta extraida e execute:

```powershell
.\Configurar-LER.ps1 -AdicionarAoPath
```

Feche e reabra o terminal. Se o comando ainda nao aparecer, encerre a sessao do Windows e entre novamente. O PATH e alterado apenas para seu usuario, sem administrador. Mantenha a pasta no mesmo local depois de configurar o PATH.

Opcoes adicionais:

```powershell
.\Configurar-LER.ps1                      # apenas verificar os arquivos e o runtime
.\Configurar-LER.ps1 -AdicionarAoPath -CriarAtalho
.\Configurar-LER.ps1 -RemoverDoPath       # desfazer a entrada desta pasta no PATH
```

O atalho opcional `LER.lnk` fica na propria pasta. O script nao instala programas, nao baixa arquivos, nao altera associacoes, nao modifica politicas de execucao e nao exige administrador. Execute os scripts somente se permitido pela empresa. Se a politica do PowerShell impedir sua execucao, solicite orientacao a TI; `LER.cmd` pode ser usado sem o script, desde que autorizado.

## Dependencias e seguranca corporativa

O pacote inclui o runtime Bun **privado**, as bibliotecas JavaScript, a biblioteca nativa do terminal e os arquivos WASM de PDF e sintaxe. Nao e necessario instalar Node.js, npm ou Bun no sistema nem baixar dependencias na maquina de destino. Ainda existe um `bun.exe` dentro de `.ler\runtime`: o pacote dispensa sua instalacao global, mas depende da permissao de executar esse componente.

O ZIP nao garante liberacao no CrowdStrike ou em outras politicas corporativas. Se um arquivo ou script for bloqueado, pare e solicite a aprovacao da equipe de TI. Nao desative protecoes nem altere politicas para executar o LER. Envie a TI o ZIP, seu arquivo `.sha256`, o manifesto `SHA256SUMS.json` e `THIRD-PARTY-NOTICES.txt` para analise. Os hashes detectam alteracoes; nao substituem assinatura digital nem aprovacao da empresa. O ZIP nao inclui um instalador executavel.

## Dados, atualizacao e remocao

Progresso, destaques, preferencias e caches ficam na pasta `.ler` deste pacote. Livros devem ficar fora da pasta do aplicativo. O pacote original nao inclui dados pessoais ou livros da maquina de build.

Para atualizar, feche o LER, faca backup de `.ler` e extraia a nova versao sobre a mesma pasta, preservando os dados existentes em `.ler`. Nao apague `.ler`: ela tambem contem o runtime privado. O manifesto de integridade verifica apenas os arquivos distribuidos, sem incluir os dados criados durante o uso.

Para mover ou remover: feche o LER, execute `Configurar-LER.ps1 -RemoverDoPath` na pasta antiga se configurou o PATH, e depois mova ou apague a pasta. Ao apagar `.ler`, os dados de leitura tambem sao removidos. Configure novamente o PATH no novo local, se desejado.
