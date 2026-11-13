const key = document.getElementById('key');
const saved = document.getElementById('saved');
const flash = (t) => { saved.textContent = t; saved.classList.add('on'); setTimeout(() => saved.classList.remove('on'), 1600); };
chrome.storage.sync.get({ apiKey: '' }).then(({ apiKey }) => { key.value = apiKey; });
document.getElementById('save').onclick = async () => { await chrome.storage.sync.set({ apiKey: key.value.trim() }); flash('Saved'); };
document.getElementById('reset').onclick = async () => {
  await chrome.storage.sync.remove('settings');
  const all = await chrome.storage.local.get(null);
  await chrome.storage.local.remove(Object.keys(all).filter((k) => k.startsWith('yt:') || k === 'lastMovie'));
  flash('Reset');
};
