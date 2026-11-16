"""Inspect layout bounds, create contact sheets and validate EPUB local links."""
import json,re,zipfile,posixpath
from pathlib import Path
from xml.etree import ElementTree as ET
from PIL import Image,ImageDraw,ImageFont
import pdfplumber
from pypdf import PdfReader

root=Path(__file__).resolve().parents[2];data=root/'dist/manual-data'
report=json.loads((data/'build-report.json').read_text(encoding='utf-8'))
pdf=Path(report['pdf']);reader=PdfReader(pdf)
chapters=[]
for i,page in enumerate(reader.pages,1):
 text=page.extract_text() or ''
 lines=text.splitlines()
 for line in lines[:8]:
  if re.match(r'^\d+\. ',line):chapters.append({'page':i,'title':line})
bounds=[];sparse=[]
with pdfplumber.open(pdf) as document:
 for i,page in enumerate(document.pages,1):
  if i==1:continue
  chars=page.chars
  outside=[c for c in chars if c.get('text','').strip() and (c['x0']<39 or c['x1']>page.width-39 or c['top']<5 or c['bottom']>page.height-13)]
  if outside:bounds.append({'page':i,'count':len(outside),'sample':''.join(c['text'] for c in outside[:90])})
  if len(chars)<100:sparse.append(i)
with zipfile.ZipFile(report['epub']) as z:
 names=set(z.namelist());broken=[]
 for name in names:
  if not name.endswith(('.xhtml','.opf','.ncx','.xml')):continue
  tree=ET.fromstring(z.read(name))
  for node in tree.iter():
   for key in ('href','src','full-path'):
    link=node.attrib.get(key,'')
    if not link or '://' in link or link.startswith('#'):continue
    target=posixpath.normpath(posixpath.join(posixpath.dirname(name),link.split('#')[0])) if key!='full-path' else link
    if target not in names:broken.append((name,target))
 assert not broken,broken
pages=sorted(data.glob('page-*.png'));sheets=[]
font_path=Path('C:/Windows/Fonts/DejaVuSans.ttf')
if not font_path.exists():
 import matplotlib
 font_path=Path(matplotlib.get_data_path())/'fonts/ttf/DejaVuSans.ttf'
font=ImageFont.truetype(str(font_path),14)
for start in range(0,len(pages),12):
 group=pages[start:start+12];tw,th=290,430
 sheet=Image.new('RGB',(tw*4,th*3),'#dce5f1');draw=ImageDraw.Draw(sheet)
 for j,path in enumerate(group):
  im=Image.open(path).convert('RGB');im.thumbnail((tw-12,th-29));x=(j%4)*tw+(tw-im.width)//2;y=(j//4)*th+24
  sheet.paste(im,(x,y));draw.text(((j%4)*tw+9,(j//4)*th+3),f'Pág. {start+j+1}',fill='#172236',font=font)
 dest=data/f'contact-{start//12+1:02}.jpg';sheet.save(dest,quality=85);sheets.append(str(dest))
qa={'pages':len(reader.pages),'outOfBounds':bounds,'sparsePages':sparse,'brokenEpubLinks':broken,'chapterPages':chapters,'contactSheets':sheets}
(data/'qa-report.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in qa.items() if k!='contactSheets'},ensure_ascii=False,indent=2))
assert not bounds,'Text exceeds safe page bounds'
