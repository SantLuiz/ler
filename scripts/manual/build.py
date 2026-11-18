"""Build the LER technical book from reviewed prose and a source-code snapshot.

Dependencies: reportlab, Pillow, pypdf, pdfplumber. Poppler renders QA previews.
Generated artifacts live in output/ and dist/, never in production installation.
"""
from __future__ import annotations
import hashlib, html, json, math, os, re, textwrap, zipfile, uuid as uuidlib
from pathlib import Path
from xml.etree import ElementTree as ET
from PIL import Image as PILImage, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, PageBreak, Image, Table, TableStyle, Preformatted, KeepTogether, Flowable
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.graphics.shapes import Drawing, Rect, Line, String, Polygon
from reportlab.graphics import renderPDF
from pypdf import PdfReader
import pypdfium2 as pdfium

ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'dist/manual-data'
ASSETS=DATA/'assets'; ASSETS.mkdir(parents=True,exist_ok=True)
OUTPDF=ROOT/'output/pdf'; OUTEPUB=ROOT/'output/epub'
OUTPDF.mkdir(parents=True,exist_ok=True); OUTEPUB.mkdir(parents=True,exist_ok=True)
SNAP=json.loads((DATA/'snapshot.json').read_text(encoding='utf-8'))
NOTES=json.loads((ROOT/'docs/manual/notes.json').read_text(encoding='utf-8'))
TITLE='LER por dentro - Manual completo do projeto'
VERSION=SNAP['version']
STEM='LER_por_dentro_Manual_completo_'+VERSION
PDF=OUTPDF/(STEM+'.pdf'); EPUB=OUTEPUB/(STEM+'.epub')
FONTDIR=Path(os.environ.get('WINDIR','C:/Windows'))/'Fonts'
if not (FONTDIR/'DejaVuSans.ttf').exists():
 import matplotlib
 FONTDIR=Path(matplotlib.get_data_path())/'fonts/ttf'
for name,file in [('Sans','DejaVuSans.ttf'),('SansB','DejaVuSans-Bold.ttf'),('SansI','DejaVuSans-Oblique.ttf'),('Mono','DejaVuSansMono.ttf')]:
 pdfmetrics.registerFont(TTFont(name,str(FONTDIR/file)))
pdfmetrics.registerFontFamily('Sans',normal='Sans',bold='SansB',italic='SansI',boldItalic='SansB')
INK='#172236'; BLUE='#477BC5'; SKY='#7BB4FF'; DARK='#101114'; MUTED='#66758C'; LIGHT='#EDF3FB'
W,H=A4; M=48; BODYW=W-2*M
styles={
 'p':ParagraphStyle('body',fontName='Sans',fontSize=9.3,leading=14.4,textColor=INK,spaceAfter=8,allowWidows=0,allowOrphans=0),
 'h1':ParagraphStyle('chapter',fontName='SansB',fontSize=23,leading=29,textColor=INK,spaceBefore=14,spaceAfter=17,keepWithNext=True),
 'h2':ParagraphStyle('section',fontName='SansB',fontSize=13,leading=18,textColor=BLUE,spaceBefore=15,spaceAfter=8,keepWithNext=True),
 'h3':ParagraphStyle('symbol',fontName='SansB',fontSize=10.5,leading=15,textColor=INK,spaceBefore=10,spaceAfter=5,keepWithNext=True),
 'small':ParagraphStyle('small',fontName='Sans',fontSize=7.7,leading=11,textColor=MUTED,spaceAfter=5),
 'caption':ParagraphStyle('caption',fontName='SansI',fontSize=8,leading=11,textColor=MUTED,spaceAfter=12),
 'cell':ParagraphStyle('cell',fontName='Sans',fontSize=8,leading=11,textColor=INK,spaceAfter=0,wordWrap='CJK'),
 'head':ParagraphStyle('head',fontName='SansB',fontSize=8,leading=11,textColor=colors.white,spaceAfter=0),
 'code':ParagraphStyle('code',fontName='Mono',fontSize=7.1,leading=9.5,textColor=INK,spaceAfter=0),
}
sections=[]; current=None
for part in re.split(r'(?m)^# ',(ROOT/'docs/manual/manuscript.md').read_text(encoding='utf-8')):
 if not part.strip():continue
 title,_,content=part.partition('\n');sections.append({'title':title.strip(),'content':content.strip(),'blocks':[]})
def clean(s): return s.replace('\u2011','-').replace('\u2013','-').replace('\u2014','-')
def esc(s): return html.escape(clean(str(s)))
def inline(s):
 s=esc(s);s=re.sub(r'`([^`]+)`',r'<font name="Mono">\1</font>',s);s=re.sub(r'\*\*([^*]+)\*\*',r'<b>\1</b>',s);return s
def para(s,kind='p'):return Paragraph(inline(s),styles[kind])
def block(sec,kind,text='',**kwargs):sec['blocks'].append({'kind':kind,'text':text,**kwargs})

def frame_png(path):
 data=json.loads(path.read_text(encoding='utf-8'));font=ImageFont.truetype(str(FONTDIR/'DejaVuSansMono.ttf'),18);bold=ImageFont.truetype(str(FONTDIR/'DejaVuSansMono-Bold.ttf'),18)
 cw=font.getlength('M');ch=26;pad=24;title=36
 img=PILImage.new('RGB',(round(data['cols']*cw+pad*2),data['rows']*ch+pad*2+title),DARK);d=ImageDraw.Draw(img)
 d.rounded_rectangle((6,6,img.width-6,img.height-6),radius=12,outline='#33445e',width=2)
 for i,c in enumerate(['#7396c8','#9cb3d6','#d6e4f6']):d.ellipse((pad+i*16,17,pad+i*16+7,24),fill=c)
 d.text((pad+70,10),f'LER {VERSION} | captura do renderizador de testes',font=ImageFont.truetype(str(FONTDIR/'DejaVuSansMono.ttf'),13),fill='#a6b6cd')
 def rgb(v):return tuple(int(v.get('buffer',{}).get(str(i),255)) for i in range(3))
 for y,line in enumerate(data['lines']):
  x=pad
  for sp in line['spans']:
   width=sp['width']*cw;top=pad+title+y*ch
   d.rectangle((round(x),top,math.ceil(x+width),top+ch),fill=rgb(sp['bg']))
   d.text((round(x),top+2),sp['text'],font=bold if sp['attributes']&1 else font,fill=rgb(sp['fg']))
   x+=width
 dest=ASSETS/(path.stem+'.png');img.save(dest,optimize=True);return dest
for capture in (DATA/'captures').glob('*.json'):frame_png(capture)

def drawing_png(drawing,name):
 temp=DATA/(name+'.pdf');renderPDF.drawToFile(drawing,str(temp))
 prefix=ASSETS/name
 document=pdfium.PdfDocument(str(temp))
 page=document[0];bitmap=page.render(scale=180/72)
 bitmap.to_pil().save(str(prefix)+'.png')
 bitmap.close();page.close();document.close()
 return str(prefix)+'.png'

DIAGRAMS={}
def flow(name,nodes,edges,cols=2):
 width=500;bw=212;bh=66;gapx=48;gapy=43;rows=math.ceil(len(nodes)/cols);height=rows*(bh+gapy)+15
 d=Drawing(width,height);d.add(Rect(0,0,width,height,fillColor=colors.HexColor('#F3F7FD'),strokeColor=None))
 coords=[]
 for i,(title,subtitle) in enumerate(nodes):
  x=14+(i%cols)*(bw+gapx);y=height-18-bh-(i//cols)*(bh+gapy);coords.append((x,y,bw,bh))
 for a,b in edges:
  xa,ya,wa,ha=coords[a];xb,yb,wb,hb=coords[b]
  if abs(ya-yb)<1:x1,y1=xa+wa,ya+ha/2;x2,y2=xb,yb+hb/2
  else:x1,y1=xa+wa/2,ya;x2,y2=xb+wb/2,yb+hb
  d.add(Line(x1,y1,x2,y2,strokeColor=colors.HexColor(BLUE),strokeWidth=1.5))
  angle=math.atan2(y2-y1,x2-x1);p=[x2,y2,x2-8*math.cos(angle-.4),y2-8*math.sin(angle-.4),x2-8*math.cos(angle+.4),y2-8*math.sin(angle+.4)]
  d.add(Polygon(p,fillColor=colors.HexColor(BLUE),strokeColor=None))
 for (x,y,w,h),(title,subtitle) in zip(coords,nodes):
  d.add(Rect(x,y,w,h,rx=7,ry=7,fillColor=colors.HexColor(DARK),strokeColor=None))
  d.add(String(x+12,y+h-20,clean(title),fontName='SansB',fontSize=10,fillColor=colors.HexColor(SKY)))
  for j,line in enumerate(textwrap.wrap(subtitle,34)):
   d.add(String(x+12,y+h-36-j*12,clean(line),fontName='Sans',fontSize=8.3,fillColor=colors.HexColor('#E6E8ED')))
 png=drawing_png(d,name);DIAGRAMS[name]=(d,png)

flow('architecture',[('Entrada Windows','LER.cmd, atalhos, Explorer'),('main e CLI','Argumentos, pasta e encerramento'),('LibrarySession + App','Sessão, sinais e eventos da UI'),('Leitores e reading','Book, EPUB/TXT/PDF e âncoras'),('state','Dados, estatísticas e workspace'),('Workers','Catálogo, busca e PDFium')],[(0,1),(1,2),(2,3),(2,4),(3,5)])
flow('startup',[('Interpretar opções','Ajuda e versão terminam aqui'),('Validar pasta/arquivo','--check termina sem abrir a UI'),('Abrir store','Lock e recuperação de dados'),('Já aberto + --open','Enfileirar arquivo e encerrar'),('Importar ui/start','Criar renderizador nativo'),('Restaurar + montar App','Home, abas e biblioteca ativa')],[(0,1),(1,2),(2,3),(2,4),(4,5)])
flow('data',[('Book','id, formato, resource(), close()'),('Chapter[]','href, título, blocks, targets'),('Block[]','texto, imagem, heading'),('Anchor','chapter + block + offset'),('State.books[id]','Saved, marcas, destaques e tempo'),('State + workspace','abas, preferências e origem')],[(0,1),(1,2),(2,3),(3,4),(4,5)])
flow('persistence',[('save()','Snapshot JSON entra na fila'),('Comparar conteúdo','Sem mudança: evitar gravação'),('state.json.tmp','Escrever nova versão completa'),('state.json.bak','Preservar anterior ou criar inicial'),('rename(tmp, principal)','Promover nova versão'),('close()','Aguardar fila e remover lock')],[(0,1),(1,2),(2,3),(3,4),(4,5)])
flow('workspace',[('Biblioteca A','Store e estado de origem'),('Biblioteca B','Outro store, mesmo workspace'),('Livro A / aba 1','Owner continua sendo A'),('Livro B / aba 2','Owner continua sendo B'),('Visão global','Caminhos absolutos em memória'),('Biblioteca ativa','Catálogo e preferências da busca')],[(0,2),(1,3),(2,4),(3,4),(4,5)])
flow('epub',[('Arquivo ZIP','Entradas com leitura preguiçosa'),('container.xml -> OPF','Localizar pacote e manifest'),('spine','Ordem lógica de leitura'),('HTML -> blocks','Texto, imagens e targets'),('nav / NCX','Sumário e fragmentos'),('Book','Capítulos + recursos + close')],[(0,1),(1,2),(2,3),(1,4),(3,5),(4,5)])
flow('pdf',[('Interface: openPdf','Request com id e timeout'),('Worker PDFium','Documento e fila de operações'),('Render RGBA','Escala <=3, lado <=3000'),('Transferir ArrayBuffer','Evitar cópia de pixels independente'),('PdfBitmapCache','48 MiB / 6 páginas, LRU'),('PdfPage -> NativeImage','Recorte, zoom, dispose + prefetch')],[(0,1),(1,2),(2,3),(3,4),(4,5)])
flow('workers',[('Catálogo: entrada','root, ignored, cached'),('Catálogo: resposta','entries[] em lotes, done/error'),('Busca: entrada','chapters + query'),('Busca: resposta','label + Anchor, até 1.000'),('PDF: entrada','id + filename/page/raw'),('PDF: resposta','id + pages/bitmap/bytes/error')],[(0,1),(2,3),(4,5)])
flow('ui',[('Área principal: active','Home, livro, aparência, dados'),('Sobreposição: panel','Comando, busca, picker, menu'),('Evento de teclado','Atalhos globais antes do contexto'),('Handlers do contexto','Validar, navegar, abrir ou salvar'),('Sinais + memos','Atualizar somente dependências'),('Árvore OpenTUI','Texto, spans, imagens e atalhos')],[(0,2),(1,2),(2,3),(3,4),(4,5)])
flow('release',[('Branch de desenvolvimento','Commits locais; push autorizado'),('Verificações','Tipagem e testes com fixtures'),('Build Windows','Bun + JS pronto + DLL/WASM'),('Instalação de validação','AppId separado, PT e EN'),('Publicação autorizada','Setup + SHA-256 na release'),('Site e produção','Latest + atualização preservando dados')],[(0,1),(1,2),(2,3),(3,4),(4,5)])

def chart(name,title,groups,unit,maxvalue=None):
 width=500;height=72+len(groups)*48;d=Drawing(width,height)
 d.add(Rect(0,0,width,height,fillColor=colors.HexColor('#F3F7FD'),strokeColor=None));d.add(String(15,height-24,title,fontName='SansB',fontSize=11,fillColor=colors.HexColor(INK)))
 maximum=maxvalue or max(v for _,v,_ in groups)*1.05
 for i,(label,val,color) in enumerate(groups):
  y=height-60-i*48;d.add(String(15,y+15,label,fontName='Sans',fontSize=8.7,fillColor=colors.HexColor(INK)))
  d.add(Rect(175,y,265,16,fillColor=colors.HexColor('#DDE6F2'),strokeColor=None));d.add(Rect(175,y,265*val/maximum,16,fillColor=colors.HexColor(color),strokeColor=None));d.add(String(175,y-11,f'{val:,.2f} {unit}'.replace(',','X').replace('.',',').replace('X','.'),fontName='Sans',fontSize=8,fillColor=colors.HexColor(MUTED)))
 d.add(String(15,11,'Fonte: medições históricas documentadas no repositório.',fontName='Sans',fontSize=7,fillColor=colors.HexColor(MUTED)))
 DIAGRAMS['chart-'+name]=(d,drawing_png(d,'chart-'+name))
chart('startup','Inicialização e importação | milissegundos',[('--check: antes',527.51,'#91A2B9'),('--check: 1.1.3',32.22,BLUE),('UI: antes',535.23,'#91A2B9'),('UI: 1.1.3',97.73,BLUE)],'ms')
chart('pdf','Preparação da página PDF sintética',[('PNG anterior',729.31,'#91A2B9'),('Pixels diretos',53.58,BLUE),('Pixels em cache',2.78,'#609E86')],'ms')
chart('size','Dependências e Bun privado | MiB',[('Total: antes',177.78,'#91A2B9'),('Total: 1.1.3',161.05,BLUE),('Bun privado atual',109.94,'#5B6C84'),('node_modules atual',51.11,'#609E86')],'MiB')

GLOSSARY={
 'Âncora':'Posição lógica de capítulo, bloco e offset, independente da largura de janela.',
 'AST':'Árvore sintática: estrutura que representa o código para análise e transformação.',
 'Assíncrono':'Operação cujo resultado chega depois; Promise/await coordenam a espera.',
 'Asset':'Arquivo de recurso, como ícone, imagem, DLL ou WASM.',
 'BOM':'Marca inicial de bytes que pode informar a codificação do texto.',
 'Buffer':'Área de bytes; um Uint8Array pode ser uma visão de um ArrayBuffer.',
 'Cache':'Dados derivados retidos para evitar repetir trabalho; precisa de política de descarte.',
 'Callback':'Função fornecida para ser chamada quando uma operação ou evento acontece.',
 'Checksum':'Resumo calculado dos bytes para conferir integridade, como SHA-256.',
 'Closure':'Função com acesso ao estado do escopo em que foi criada.',
 'Componente':'Função que descreve uma parte reativa da interface.',
 'Debounce':'Espera curta que reúne mudanças rápidas antes de iniciar trabalho.',
 'DLL':'Biblioteca nativa carregada dinamicamente no Windows.',
 'DOM de parser':'Árvore de nós obtida ao interpretar HTML/XML; aqui não é a tela do terminal.',
 'EPUB':'Publicação digital empacotada em ZIP com documentos e metadados.',
 'FFI':'Integração entre JavaScript/runtime e código nativo de outra linguagem.',
 'Fixture':'Dados ou arquivos artificiais controlados para um teste reproduzível.',
 'GC':'Coletor de lixo: recupera memória de objetos gerenciados que deixaram de ser alcançáveis.',
 'Getter':'Propriedade calculada por uma função ao ser lida.',
 'Grapheme/grafema':'Unidade de escrita percebida que pode envolver vários pontos de código.',
 'Hash de conteúdo':'Identidade derivada dos bytes de um arquivo, não de seu nome.',
 'Hard link':'Dois nomes do sistema de arquivos apontando para a mesma identidade de arquivo.',
 'Idempotência':'Executar uma ação repetidamente sem repetir seus efeitos indevidos.',
 'JSON':'Formato textual de dados com objetos, arrays, números, strings e valores básicos.',
 'Lock':'Mecanismo que impede acessos concorrentes incompatíveis; no LER, arquivo com PID.',
 'Lockfile':'Registro de versões resolvidas de dependências para instalação reproduzível.',
 'LRU':'Least Recently Used: descartar primeiro o item usado há mais tempo.',
 'Manifest':'Inventário de recursos ou metadados de um pacote; OPF e package.json têm papéis diferentes.',
 'Memo':'Cálculo reativo derivado, atualizado conforme suas dependências.',
 'Offset':'Deslocamento dentro de um conteúdo; no texto JS é índice de string.',
 'OPF':'Documento de pacote EPUB que informa metadados, manifest e spine.',
 'Payload':'Conjunto preparado de arquivos que o instalador colocará na máquina de destino.',
 'PID':'Identificador de um processo em execução no sistema operacional.',
 'Prefetch':'Preparação antecipada de conteúdo provavelmente necessário em seguida.',
 'Promise':'Objeto que representa conclusão futura ou falha de uma operação.',
 'Rasterizar':'Transformar uma página em uma matriz de pixels.',
 'Reflow':'Reorganizar texto conforme largura e tamanho de fonte disponíveis.',
 'RGBA':'Quatro canais por pixel: vermelho, verde, azul e alfa.',
 'RSS':'Memória residente do processo; não equivale ao tamanho de arquivos em disco.',
 'Runtime':'Ambiente que executa o código e oferece APIs, como Bun.',
 'Signal':'Valor reativo lido por accessor e alterado por setter.',
 'Snapshot':'Fotografia de um estado ou conjunto de fontes em um momento identificado.',
 'Spine':'Ordem de leitura dos documentos no EPUB.',
 'Stream':'Leitura ou escrita em partes, sem exigir todos os bytes de uma vez.',
 'TSX':'Sintaxe de componentes integrada a TypeScript, transformada antes da execução.',
 'UUID':'Identificador usado para nomes de pedidos, temporários e destaques.',
 'Viewport':'Área visível de um conteúdo maior, como uma página PDF ampliada.',
 'WASM':'WebAssembly: formato compilado usado aqui pela implementação PDFium.',
 'Worker':'Contexto de execução separado que troca mensagens com a interface.',
 'ZIP':'Contêiner de entradas compactadas, usado pelo formato EPUB.'}

LIMITS=[('TXT','64 MiB por arquivo','openBook/openText'),('PDF','256 MiB por arquivo','openBook/openPdf'),('EPUB','20.000 entradas; recurso 32 MiB; capítulos somados 64 MiB','openBook'),('Metadados EPUB','2 MiB por XML de catálogo','epubMetadata'),('PDF renderizado','20.000 páginas; escala 3; lado 3.000; 4 milhões de pixels','pdf.worker'),('Cache RGBA','48 MiB e 6 entradas compartilhadas','PdfBitmapCache'),('Cache PNG','Até 2 páginas por worker','pdf.worker'),('Pedido PDF','30 s até fechar por timeout','request'),('Prefetch PDF','250 ms após estabilizar','PdfPage'),('Busca de texto','Debounce 150 ms; até 1.000 resultados','App/search.worker'),('Catálogo','Lotes de 100 ou flush após 50 ms','catalog.worker'),('Pedido de abrir','16 KiB; idade <120 s; até 20 por rodada; consulta 500 ms','open-requests/App'),('Histórico de saltos','Até 50 posições por livro','jump'),('Manifesto global','Até 200 abas consideradas na restauração','ReadingWorkspace.restore'),('Relógio','Inatividade 120 s; intervalo entre amostras <=5 s','ReadingClock'),('Zoom PDF','100% a 400% nos comandos','submitCommand'),('Preferências','Largura 40-140; espaçamento 0-2; imagem 30%-100%','preferences')]

def note(module,sym):
 if sym['name'] in NOTES['symbols']:return NOTES['symbols'][sym['name']]
 if sym['kind']=='tipo':return 'Contrato de dados TypeScript. A assinatura declara seus campos, alternativas e funções aceitas; o tipo é removido na transformação para JavaScript. Leia sua aplicação no capítulo do subsistema e o corpo exato no código numerado.'
 if sym['kind']=='campo':return 'Estado de uma instância da classe. A declaração mostra visibilidade, inicialização e tipo quando explícito. Sua duração acompanha a instância; os métodos listados no mesmo módulo definem quando esse estado muda e é liberado.'
 return NOTES['symbols'].get(sym['name'],'Helper identificado no código. Consulte a assinatura e a implementação no apêndice para seu contrato local.')

def parse_content(sec):
 lines=sec['content'].splitlines();i=0
 while i<len(lines):
  line=lines[i].strip()
  if not line:i+=1;continue
  if line.startswith('```'):
   code=[];i+=1
   while i<len(lines) and not lines[i].startswith('```'):code.append(lines[i]);i+=1
   block(sec,'code','\n'.join(code));i+=1;continue
  if line.startswith('## '):block(sec,'h2',line[3:]);i+=1;continue
  if line.startswith('@'):
   cmd,*rest=line[1:].split(' ',1);val=rest[0] if rest else ''
   if cmd in ('figure','diagram','chart'):
    ident,caption=[v.strip() for v in val.split('|',1)];block(sec,'figure',caption,asset=('chart-'+ident if cmd=='chart' else ident),vector=cmd!='figure')
   elif cmd=='dependencies':
    rows=[['Biblioteca','Declarada / instalada','Função']]
    for dep in SNAP['dependencies']:rows.append([dep['name'],str(dep['requested'])+' / '+dep['resolved'],'Execução' if dep['production'] else 'Desenvolvimento'])
    block(sec,'table',rows=rows,widths=[.36,.37,.27])
   elif cmd=='commands':
    text=(ROOT/'docs/commands.pt-BR.md').read_text(encoding='utf-8');rows=[]
    for ln in text.splitlines():
     if ln.startswith('|') and not ln.startswith('| ---'):
      cells=re.split(r'(?<!\\)\|',ln)[1:-1];rows.append([c.strip().replace('\\|','|').replace('`','') for c in cells])
    block(sec,'table',rows=rows,widths=[.34,.66])
   elif cmd=='limits':block(sec,'table',rows=[['Área','Limite / frequência','Responsável']]+[list(row) for row in LIMITS],widths=[.18,.49,.33])
   elif cmd=='roadmap':
    for ln in (ROOT/'docs/roadmap.md').read_text(encoding='utf-8').splitlines():
     if re.match(r'\| \d+ \|',ln):
      cells=[c.strip() for c in ln.split('|')[1:-1]];block(sec,'p',f"{cells[0]}. {cells[1]} ({cells[3]}; {cells[2]}). {cells[4]}")
   elif cmd=='glossary':
    for k,v in GLOSSARY.items():block(sec,'h3',k);block(sec,'p',v)
   elif cmd=='api':
    for m in SNAP['modules']:
     if m['file'].startswith('tests/') or not m['symbols'] and m['file'] not in NOTES['modules']:continue
     block(sec,'h2',m['file']);block(sec,'p',NOTES['modules'].get(m['file'],'Módulo próprio da aplicação ou do processo de distribuição.'))
     block(sec,'small',f"{m['lines']} linhas originais; {m['bytes']} bytes. Importações: {', '.join(m['imports']) or 'sem importações ESM identificadas'}. Código integral no capítulo 27.")
     if m['constants']:block(sec,'small','Declarações de módulo: '+'; '.join(f"{c['name']} (L{c['line']}, {c['type']})" for c in m['constants']))
     for s in m['symbols']:
      block(sec,'h3',f"{s['name']} | {s['kind']} | L{s['line']}");block(sec,'p',note(m,s));block(sec,'code',s['signature'])
      if s['calls']:block(sec,'small','Chamadas reconhecidas no corpo: '+', '.join(s['calls'])+'.')
   elif cmd=='tests':
    for m in SNAP['modules']:
     if not m['file'].startswith('tests/'):continue
     block(sec,'h2',m['file'])
     for j,t in enumerate(m['tests'],1):block(sec,'p',f'{j}. {t}')
     for s in m['symbols']:
      if s['kind'] not in ('tipo','campo'):block(sec,'p',f"Helper {s['name']} (L{s['line']}): "+note(m,s))
   elif cmd=='source':
    for m in SNAP['modules']:
     block(sec,'source-title',m['file']);block(sec,'small',f"Fonte do snapshot; {m['lines']} linhas, {m['bytes']} bytes. SHA-256: {hashlib.sha256(m['source'].encode('utf-8')).hexdigest()}")
     block(sec,'source',m['source'])
    block(sec,'h2','Pacotes resolvidos no bun.lock')
    block(sec,'p','Inventário de resolução do lockfile, incluindo variantes opcionais de outras plataformas. Presença nesta tabela não significa que o pacote foi incluído no instalador Windows.')
    rows=[['Chave do pacote','Resolução registrada']]
    for name,value in SNAP.get('lockPackages',{}).items():rows.append([name,str(value[0])])
    block(sec,'table',rows=rows,widths=[.49,.51])
   i+=1;continue
  if re.match(r'^[-] |^\d+\. ',line):block(sec,'p',line);i+=1;continue
  text=[line];i+=1
  while i<len(lines) and lines[i].strip() and not lines[i].startswith(('## ','@','```','- ')) and not re.match(r'^\d+\. ',lines[i]):text.append(lines[i].strip());i+=1
  block(sec,'p',' '.join(text))
for sec in sections:parse_content(sec)
figure_number=0
for sec in sections:
 for item in sec['blocks']:
  if item['kind']=='figure':
   figure_number+=1;item['text']=f'Figura {figure_number:02} - '+item['text']

class LERDoc(BaseDocTemplate):
 def __init__(self,filename):
  super().__init__(str(filename),pagesize=A4,rightMargin=M,leftMargin=M,topMargin=54,bottomMargin=48,title=TITLE,author='Documentação técnica do projeto LER',subject=f'Arquitetura, código, dependências e fluxos do LER {VERSION}',pageCompression=1)
  self.addPageTemplates(PageTemplate(id='normal',frames=[Frame(M,48,BODYW,H-108,id='body',leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)],onPage=self.chrome))
 def chrome(self,c,doc):
  if doc.page==1:return
  c.saveState();c.setFillColor(colors.HexColor(DARK));c.rect(0,H-31,W,31,fill=1,stroke=0);c.setFillColor(colors.HexColor(SKY));c.setFont('SansB',8);c.drawString(M,H-20,'LER / POR DENTRO');c.setFillColor(colors.HexColor('#D6D6D6'));c.setFont('Sans',7);c.drawRightString(W-M,H-20,f'Manual técnico | base {VERSION}');c.setStrokeColor(colors.HexColor('#DCE5F1'));c.line(M,35,W-M,35);c.setFont('Sans',7);c.setFillColor(colors.HexColor(MUTED));c.drawString(M,23,'Código explicado, dados preservados.');c.drawRightString(W-M,23,str(doc.page));c.restoreState()
 def afterFlowable(self,flowable):
  if isinstance(flowable,Paragraph) and hasattr(flowable,'toclevel'):
   level=flowable.toclevel;title=flowable.getPlainText();key=flowable.bookmark
   self.canv.bookmarkPage(key)
   if level==0:self.canv.addOutlineEntry(title,key,level=0,closed=True)
   self.notify('TOCEntry',(level,title,self.page,key))

class Cover(Flowable):
 def __init__(self):super().__init__();self.width=BODYW;self.height=H-110
 def draw(self):
  c=self.canv;c.saveState();c.setFillColor(colors.HexColor(DARK));c.rect(-M,-49,W,H,fill=1,stroke=0)
  c.setFillColor(colors.HexColor('#21304A'))
  for row in range(9):
   for col in range(13):
    if (row*7+col*3)%5==0:c.rect(300+col*13,430+row*13,4,4,fill=1,stroke=0)
  c.drawImage(ImageReader(str(ROOT/'assets/ler.png')),0,470,width=132,height=132,mask='auto')
  c.setFillColor(colors.HexColor(SKY));c.setFont('SansB',10);c.drawString(0,440,'LEITOR EXTREMAMENTE REDUZIDO')
  c.setFillColor(colors.HexColor('#E6E8ED'));c.setFont('SansB',37);c.drawString(0,372,'LER por dentro')
  c.setFont('Sans',19);c.drawString(0,336,'Manual completo do projeto')
  c.setFont('Sans',11)
  for i,line in enumerate(['Da primeira tecla aos pixels na tela.','Arquitetura, funções, classes, dados, testes','e distribuição explicados com o código aberto.']):c.drawString(0,280-i*19,line)
  c.setFillColor(colors.HexColor(SKY));c.rect(0,179,70,4,fill=1,stroke=0)
  c.setFont('SansB',11);c.drawString(0,143,f'EDIÇÃO TÉCNICA / {VERSION}')
  c.setFillColor(colors.HexColor('#AAB9D0'));c.setFont('Sans',9);c.drawString(0,118,'Português • 15 de novembro de 2026');c.drawString(0,98,'Conceitos + capturas reais + diagramas + referência integral')
  c.setFont('Mono',7.5);c.drawString(0,52,'snapshot '+SNAP['commit'][:12]);c.drawString(0,36,'stable   '+SNAP['stableCommit'][:12]);c.restoreState()

def table_flow(rows,widths):
 vals=[]
 for i,row in enumerate(rows):vals.append([Paragraph(esc(c),styles['head' if i==0 else 'cell']) for c in row])
 t=Table(vals,colWidths=[BODYW*w for w in widths],repeatRows=1,hAlign='LEFT')
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#233C60')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#F1F5FB'),colors.white]),('LINEBELOW',(0,0),(-1,0),.5,colors.HexColor(SKY))]));return t

def code_lines(text,numbered=False):
 maxcols=105 if numbered else 111;result=[]
 for i,line in enumerate(text.splitlines(),1):
  # Keep every original code point and line number. Only expand tabs for display.
  line=line.expandtabs(2).replace('\x00','\\0');parts=textwrap.wrap(line,width=maxcols,replace_whitespace=False,drop_whitespace=False,break_long_words=True,break_on_hyphens=False) or ['']
  for j,p in enumerate(parts):result.append((f'{i:4}  ' if j==0 else '      ')+p if numbered else p)
 return result

class CodeBlock(Preformatted):
 def split(self,availWidth,availHeight):
  count=int(availHeight/self.style.leading)
  if count>=len(self.lines):return [self]
  if len(self.lines)-count<5:count=len(self.lines)-5
  if count<3:return []
  return [CodeBlock('\n'.join(self.lines[:count]),self.style),CodeBlock('\n'.join(self.lines[count:]),self.style)]

story=[Cover(),PageBreak(),para('Ficha da edição','h1')]
source_modules=[m for m in SNAP['modules'] if m['file'].startswith('src/')]
story.append(table_flow([['Item','Valor'],['Produto estável','LER '+SNAP['version']],['Snapshot examinado',SNAP['commit']],['Commit da base funcional',SNAP['stableCommit']],['Módulos/arquivos no inventário',str(len(SNAP['modules']))],['Arquivos da aplicação em src',str(len(source_modules))],['Símbolos nomeados identificados',str(sum(len(m['symbols']) for m in SNAP['modules']))],['Casos de teste identificados',str(sum(len(m['tests']) for m in SNAP['modules']))],['Estado desta entrega',f'Manual técnico da versão {VERSION}. Capturas usam apenas dados demonstrativos.']], [.34,.66]))
story.extend([Spacer(1,16),para('Como usar este livro','h2'),para('Primeira leitura: capítulos 1 a 6. Entendimento da implementação: 7 a 17. Desenvolvimento e operação: 18 a 23. Consulta: glossário, símbolos, testes e código numerado. O conteúdo técnico é compartilhado pelo PDF e pelo EPUB.'),para('As datas e medidas históricas estão contextualizadas no texto. Diagramas são explicativos e derivados do código, não capturas de ferramentas de monitoramento. As telas usam dados demonstrativos.'),PageBreak(),para('Sumário navegável','h1')])
toc=TableOfContents();toc.levelStyles=[ParagraphStyle('toc0',fontName='SansB',fontSize=9.4,leading=15,spaceBefore=8,textColor=INK),ParagraphStyle('toc1',fontName='Sans',fontSize=8,leading=11,leftIndent=12,textColor=MUTED)];story.append(toc)
for idx,sec in enumerate(sections):
 story.append(PageBreak());h=para(sec['title'],'h1');h.toclevel=0;h.bookmark=f'chapter-{idx}';story.append(h)
 for bi,b in enumerate(sec['blocks']):
  kind=b['kind'];text=b['text']
  if kind in ('p','small','h2','h3'):story.append(para(text,kind))
  elif kind=='source-title':story.extend([PageBreak(),para(text,'h2')])
  elif kind=='table':story.extend([table_flow(b['rows'],b['widths']),Spacer(1,11)])
  elif kind in ('code','source'):
   lines=code_lines(text,numbered=kind=='source');story.append(CodeBlock('\n'.join(lines),styles['code']))
   if kind=='code':story.append(Spacer(1,5))
  elif kind=='figure':
   if b['vector']:
    drawing,_=DIAGRAMS[b['asset']];scale=min(BODYW/drawing.width,360/drawing.height);d=Drawing(drawing.width*scale,drawing.height*scale);drawing.scale(scale,scale);d.add(drawing);graphic=d
   else:
    path=ASSETS/(b['asset']+'.png');im=PILImage.open(path);scale=BODYW/im.width;graphic=Image(str(path),width=BODYW,height=im.height*scale)
   story.append(KeepTogether([graphic,para(text,'caption')]))
doc=LERDoc(PDF);doc.multiBuild(story)

# The same typed blocks generate reflowable XHTML; every source module remains present.
CSS='''body{font-family:serif;line-height:1.5;color:#172236;margin:5%;}h1,h2,h3{font-family:sans-serif;color:#315c99;}h1{margin-top:1em;}h2{margin-top:1.5em;}h3{margin-top:1.2em;}p{margin:.6em 0;}pre{font-family:monospace;font-size:.72em;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;background:#edf3fb;padding:.6em;}table{border-collapse:collapse;width:100%;font-size:.8em;}td,th{border-bottom:1px solid #dce5f1;padding:.45em;text-align:left;vertical-align:top;overflow-wrap:anywhere;}th{background:#233c60;color:white;}img{max-width:100%;height:auto;}.caption{font-size:.85em;color:#66758c;}.small{font-size:.8em;color:#66758c;}.source-title{page-break-before:always;}a{color:#315c99;}'''
def xhtml(title,body):return '<?xml version="1.0" encoding="utf-8"?>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="pt-BR" xml:lang="pt-BR"><head><title>'+esc(title)+'</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body>'+body+'</body></html>'
def htmlinline(s):return re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',esc(s))
assetpaths={};chapters=[]
coverjpg=ASSETS/'cover.png'
document=pdfium.PdfDocument(str(PDF));page=document[0];bitmap=page.render(scale=120/72)
bitmap.to_pil().save(str(ASSETS/'cover.png'))
bitmap.close();page.close();document.close()
for idx,sec in enumerate(sections):
 parts=['<h1>'+esc(sec['title'])+'</h1>']
 for b in sec['blocks']:
  kind=b['kind'];txt=b['text']
  if kind in ('p','small'):parts.append('<p'+(' class="small"' if kind=='small' else '')+'>'+htmlinline(txt)+'</p>')
  elif kind in ('h2','h3','source-title'):tag='h3' if kind=='h3' else 'h2';parts.append(f'<{tag}'+(' class="source-title"' if kind=='source-title' else '')+'>'+esc(txt)+f'</{tag}>')
  elif kind=='table':
   parts.append('<table>')
   for i,row in enumerate(b['rows']):tag='th' if i==0 else 'td';parts.append('<tr>'+''.join(f'<{tag}>'+htmlinline(c)+f'</{tag}>' for c in row)+'</tr>')
   parts.append('</table>')
  elif kind in ('source','code'):parts.append('<pre>'+html.escape('\n'.join(code_lines(txt,numbered=kind=='source'))).replace('\x00','')+'</pre>')
  elif kind=='figure':
   path=Path(DIAGRAMS[b['asset']][1]) if b['vector'] else ASSETS/(b['asset']+'.png');assetpaths[path.name]=path
   parts.append('<div><img src="images/'+esc(path.name)+'" alt="'+esc(txt)+'"/><p class="caption">'+esc(txt)+'</p></div>')
 name=f'chapter-{idx:02}.xhtml';chapters.append((name,sec['title'],xhtml(sec['title'],''.join(parts))))
cover=xhtml(TITLE,'<div><img src="images/cover.png" alt="Capa: LER por dentro, manual completo do projeto"/></div><h1>'+esc(TITLE)+'</h1><p>Base funcional: '+VERSION+'. Snapshot: '+SNAP['commit']+'.</p>')
tocbody='<h1>Sumário</h1><nav epub:type="toc" id="toc"><ol>'+''.join('<li><a href="'+name+'">'+esc(title)+'</a></li>' for name,title,_ in chapters)+'</ol></nav>'
nav=xhtml('Sumário',tocbody)
uuid='urn:uuid:'+str(uuidlib.UUID(hashlib.sha256((SNAP['commit']+TITLE).encode()).hexdigest()[:32]))
manifest='<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="css" href="style.css" media-type="text/css"/><item id="cover-image" href="images/cover.png" media-type="image/png" properties="cover-image"/>'
manifest+=''.join(f'<item id="c{i}" href="{name}" media-type="application/xhtml+xml"/>' for i,(name,_,_) in enumerate(chapters))
manifest+=''.join(f'<item id="img{i}" href="images/{esc(name)}" media-type="image/png"/>' for i,name in enumerate(assetpaths))
spine='<itemref idref="cover"/>'+''.join(f'<itemref idref="c{i}"/>' for i in range(len(chapters)))
opf='<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="pt-BR"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">'+uuid+'</dc:identifier><dc:title>'+esc(TITLE)+'</dc:title><dc:language>pt-BR</dc:language><dc:creator>Documentação técnica do projeto LER</dc:creator><dc:description>Manual completo com explicações, capturas, diagramas, funções, classes e código numerado.</dc:description><meta property="dcterms:modified">2026-11-15T12:00:00Z</meta><meta name="cover" content="cover-image"/></metadata><manifest>'+manifest+'</manifest><spine toc="ncx">'+spine+'</spine></package>'
ncx='<?xml version="1.0" encoding="utf-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="'+uuid+'"/></head><docTitle><text>'+esc(TITLE)+'</text></docTitle><navMap>'+''.join(f'<navPoint id="p{i}" playOrder="{i+1}"><navLabel><text>{esc(title)}</text></navLabel><content src="{name}"/></navPoint>' for i,(name,title,_) in enumerate(chapters))+'</navMap></ncx>'
with zipfile.ZipFile(EPUB,'w') as z:
 z.writestr('mimetype','application/epub+zip',compress_type=zipfile.ZIP_STORED)
 def put(name,value):z.writestr(name,value,compress_type=zipfile.ZIP_DEFLATED)
 put('META-INF/container.xml','<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
 for name,value in [('package.opf',opf),('nav.xhtml',nav),('toc.ncx',ncx),('cover.xhtml',cover),('style.css',CSS)]:put('OEBPS/'+name,value)
 for name,_,value in chapters:put('OEBPS/'+name,value)
 put('OEBPS/images/cover.png',coverjpg.read_bytes())
 for name,path in assetpaths.items():put('OEBPS/images/'+name,path.read_bytes())

# Structural validation and traceability report. Rendered-page review is a separate QA step.
reader=PdfReader(PDF);pdftext='\n'.join(page.extract_text() or '' for page in reader.pages)
assert len(reader.pages)>40
assert all(s['title'] in pdftext for s in sections), 'A chapter was lost from the PDF'
assert len(reader.outline)==len(sections)
assert not any(c in pdftext for c in ['\u25a0\u25a0\u25a0\u25a0\u25a0\u25a0\u25a0\u25a0'])
with zipfile.ZipFile(EPUB) as z:
 assert z.infolist()[0].filename=='mimetype' and z.infolist()[0].compress_type==0
 assert z.read('mimetype')==b'application/epub+zip'
 for name in z.namelist():
  if name.endswith(('.xml','.opf','.ncx','.xhtml')):ET.fromstring(z.read(name))
 for name,_,_ in chapters:assert 'OEBPS/'+name in z.namelist()
report={'pdf':str(PDF),'epub':str(EPUB),'pages':len(reader.pages),'chapters':len(sections),'files':len(SNAP['modules']),'symbols':sum(len(m['symbols']) for m in SNAP['modules']),'tests':sum(len(m['tests']) for m in SNAP['modules']),'pdfBytes':PDF.stat().st_size,'epubBytes':EPUB.stat().st_size,'textCharacters':len(pdftext),'snapshot':SNAP['commit'],'stableCommit':SNAP['stableCommit']}
(DATA/'build-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
