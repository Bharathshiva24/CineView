const SUPPORTED = /^https?:\/\/([^/]*\.)?(district\.in|bookmyshow\.com)\//i;
const FILES = ['content/geometry.js', 'content/detector.js', 'content/overlay.js', 'content/main.js'];

function showHelp(text) {
  document.getElementById('busy').hidden = true;
  document.getElementById('msg').textContent = text;
  document.getElementById('help').hidden = false;
}

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !SUPPORTED.test(tab.url || '')) return showHelp('Open a seat selection page to preview your view.');
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'cineview:toggle' });
    window.close();
  } catch (_) {
    try {
      // Page was open before CineView was installed: add the canvas seat-map reader (page context) too
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/konva-bridge.js'], world: 'MAIN' }).catch(() => {});
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: FILES });
      await chrome.tabs.sendMessage(tab.id, { type: 'cineview:toggle' });
      window.close();
    } catch (e) {
      showHelp('CineView couldn’t start on this page. Reload it and try again.');
    }
  }
})();

document.getElementById('demo').onclick = () => chrome.tabs.create({ url: chrome.runtime.getURL('demo/demo.html') });
document.getElementById('opts').onclick = (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); };
