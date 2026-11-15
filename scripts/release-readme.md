# Instalar o LER no Windows x64

Abra `LER-<versao>-Setup-x64.exe` com dois cliques e siga o assistente grafico: escolha a pasta, selecione as integracoes desejadas e clique em Instalar.

O instalador inclui tudo o que o LER precisa e funciona offline. Nao instala Git, Node.js, npm, Bun global, servicos ou atualizadores na maquina. O runtime e as dependencias sao componentes privados dentro da pasta do LER, removidos junto com ele.

A pasta padrao e `%LOCALAPPDATA%\Programs\LER`, no perfil do usuario, sem exigir administrador. A pasta pode ser alterada no assistente; escolha um local exclusivo para o LER em que seu usuario possa gravar.

Depois da instalacao, voce pode apagar o instalador. Conforme as opcoes selecionadas, abra **LER** pelo menu Iniciar ou pelo atalho da area de trabalho, execute `LER` em um novo terminal ou use **Abrir com LER** no menu de contexto de EPUB, TXT e PDF (no Windows 11, em **Mostrar mais opcoes**).

Atalhos e o comando `LER` abrem diretamente a home, sem perguntar um diretorio. Para escolher outra biblioteca, use o caminho na busca ou Ctrl+L dentro do aplicativo. Os icones do instalador, atalhos e Aplicativos instalados usam o logo LER pixelizado.

Guarde os livros fora da pasta do aplicativo. Progresso, destaques, preferencias e caches ficam na subpasta `.ler` da instalacao.

## Atualizar

Feche o LER e execute o novo instalador na mesma pasta. Os dados de leitura em `.ler` sao preservados durante a atualizacao. Faca backup dessa pasta antes, se desejar. Pastas existentes que nao sejam uma instalacao deste assistente sao recusadas para evitar misturar arquivos.

## Remover

Feche o LER e use **Configuracoes > Aplicativos > Aplicativos instalados > LER > Desinstalar**, ou abra `unins000.exe` na pasta instalada. O desinstalador grafico pede confirmacao antes de remover o aplicativo e todos os dados de leitura.

Tambem pode abrir novamente o instalador e escolher **Desinstalar o LER e apagar todos os seus dados e configuracoes** na pagina de manutencao.

Isso apaga os arquivos do aplicativo, runtime privado, dependencias, progresso, destaques, preferencias e caches. Remove tambem as integracoes instaladas e o registro em Aplicativos instalados. Livros fora da pasta do LER sao preservados. Faca backup de `.ler` antes se quiser guardar seus dados.

O instalador nao inclui ferramentas de desenvolvimento, historico Git ou dados pessoais da maquina de build.
