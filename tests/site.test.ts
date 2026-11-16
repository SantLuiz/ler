import {test, expect} from 'bun:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {parseDocument, DomUtils} from 'htmlparser2';

test('both static site languages provide matching sections and reciprocal language links',()=>{
 const portuguese=parseDocument(readFileSync(new URL('../site/index.html',import.meta.url),'utf8'));
 const english=parseDocument(readFileSync(new URL('../site/en/index.html',import.meta.url),'utf8'));
 const elements=(doc:typeof english)=>DomUtils.findAll(node=>node.type==='tag',doc.children);
 const en=elements(english),pt=elements(portuguese);
 expect(en.find(node=>node.name==='html')?.attribs.lang).toBe('en');
 expect(pt.find(node=>node.name==='html')?.attribs.lang).toBe('pt-BR');
 expect(en.filter(node=>node.name==='section').map(node=>node.attribs.id)).toEqual(pt.filter(node=>node.name==='section').map(node=>node.attribs.id));
 expect(en.some(node=>node.attribs.hreflang==='pt-BR'&&node.attribs.href==='../')).toBe(true);
 expect(pt.some(node=>node.attribs.hreflang==='en'&&node.attribs.href==='en/')).toBe(true);
 expect(en.find(node=>node.attribs['aria-current']==='page')?.attribs.lang).toBe('en');
 expect(pt.find(node=>node.attribs['aria-current']==='page')?.attribs.lang).toBe('pt-BR');
 expect(DomUtils.textContent(english)).toContain('Copy commands');
 expect(DomUtils.textContent(english)).not.toMatch(/Baixar|Instalar|Copiar comandos|Biblioteca/);
 expect(en.some(node=>node.attribs.href?.endsWith('/docs/commands.md'))).toBe(true);
});

async function siteSession(lang:string, failClipboard=false, releaseUrl='https://github.com/SantLuiz/ler/releases/download/v1.1.4/LER-1.1.4-Setup-x64.exe',manualUrl='https://github.com/SantLuiz/ler/releases/download/v1.1.4/LER_por_dentro_Manual_completo_1.1.4.pdf') {
 const status={textContent:''},info={textContent:''},link={href:'https://github.com/SantLuiz/ler/releases/latest'};
 const manual={href:'https://github.com/SantLuiz/ler/releases/latest'};
 let click:undefined|(()=>Promise<void>),copied='';
 const button={hidden:true,addEventListener:(_event:string,callback:()=>Promise<void>)=>{click=callback;}};
 const nodes:Record<string,unknown>={'#copy':button,'#copy-status':status,'#release-info':info,'#clone-command':{textContent:'git clone https://github.com/SantLuiz/ler.git'}};
 runInNewContext(readFileSync(new URL('../site/main.js',import.meta.url),'utf8'),{
  document:{documentElement:{lang},querySelector:(selector:string)=>nodes[selector],querySelectorAll:(selector:string)=>selector==='[data-manual]'?[manual]:[link]},
  navigator:{clipboard:{writeText:async(text:string)=>{if(failClipboard)throw new Error('Permission denied');copied=text;}}},
  fetch:async()=>({ok:true,json:async()=>({tag_name:'v1.1.4',assets:[{name:'LER-1.1.4-Setup-x64.exe',browser_download_url:releaseUrl,size:52.6*1024*1024},{name:'LER_por_dentro_Manual_completo_1.1.4.pdf',browser_download_url:manualUrl}]})}),
  URL,AbortSignal
 });
 await Bun.sleep(0);
 await click?.();
 return {status,info,link,manual,button,copied};
}
test('site download metadata and clipboard feedback follow the page language',async()=>{
 const en=await siteSession('en'),pt=await siteSession('pt-BR');
 expect(en.info.textContent).toContain('52.6 MB · MIT license');
 expect(pt.info.textContent).toContain('52,6 MB · Licença MIT');
 expect(en.status.textContent).toBe('Commands copied.');
 expect(pt.status.textContent).toBe('Comandos copiados.');
 expect(en.copied).toContain('git clone');
 expect(en.button.hidden).toBe(false);
 expect(en.link.href).toContain('/releases/download/v1.1.4/');
 expect(en.manual.href).toContain('/v1.1.4/LER_por_dentro_Manual_completo_1.1.4.pdf');
 expect(en.info.textContent).toContain('v1.1.4');
});
test('site keeps its fallback download link for untrusted asset URLs and translates clipboard failures',async()=>{
 const en=await siteSession('en',true,'https://example.com/untrusted.exe');
 expect(en.link.href).toBe('https://github.com/SantLuiz/ler/releases/latest');
 expect(en.status.textContent).toBe('Select and copy the commands above with Ctrl+C.');
 const pt=await siteSession('pt-BR',true);
 expect(pt.status.textContent).toBe('Selecione e copie os comandos acima com Ctrl+C.');
 const untrustedManual=await siteSession('en',false,undefined,'https://example.com/untrusted.pdf');
 expect(untrustedManual.manual.href).toBe('https://github.com/SantLuiz/ler/releases/latest');
});
