const copyButton = document.querySelector('#copy');
if (navigator.clipboard && copyButton) {
  copyButton.hidden = false;
  copyButton.addEventListener('click', async () => {
    const status = document.querySelector('#copy-status');
    try {
      await navigator.clipboard.writeText(document.querySelector('#clone-command').textContent);
      status.textContent = 'Comandos copiados.';
    } catch {
      status.textContent = 'Selecione e copie os comandos acima com Ctrl+C.';
    }
  });
}

// Keep ordinary Releases links usable without JavaScript, during API outages,
// before the first release, and when the public API rate limit is reached.
async function loadRelease() {
  try {
    const response = await fetch('https://api.github.com/repos/SantLuiz/ler/releases/latest', {signal: AbortSignal.timeout(6000)});
    if (!response.ok) return;
    const release = await response.json();
    const installer = release.assets?.find(asset => /^LER-(?:\d+\.\d+\.\d+-)?Setup-x64\.exe$/.test(asset.name));
    if (!installer) return;
    const url = new URL(installer.browser_download_url);
    if (url.origin !== 'https://github.com' || !url.pathname.startsWith('/SantLuiz/ler/releases/download/')) return;
    document.querySelectorAll('[data-download]').forEach(link => { link.href = url.href; });
    const size = (installer.size / 1024 / 1024).toLocaleString('pt-BR', {maximumFractionDigits: 1});
    document.querySelector('#release-info').textContent = `${release.tag_name} · Windows x64 · ${size} MB · Licença MIT`;
  } catch { /* The static download links remain available. */ }
}
loadRelease();
