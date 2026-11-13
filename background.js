// CineView background service worker
// Finds the *right* trailer for a movie:
//   1. Trailer IDs found on the District / BookMyShow page, verified against the movie title (YouTube oEmbed)
//   2. YouTube search, keeping only videos whose title contains the movie title AND is a trailer/teaser
// Unrelated videos are never returned – an empty list is better than the wrong movie.

const CACHE_TTL_MS = 2 * 24 * 60 * 60 * 1000;
const CACHE_VERSION = 'v2';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'cineview:findTrailer') {
    findTrailer(msg)
      .then((results) => sendResponse({ ok: true, results }))
      .catch((err) => sendResponse({ ok: false, error: String((err && err.message) || err) }));
    return true;
  }
  return false;
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-preview') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id != null) chrome.tabs.sendMessage(tab.id, { type: 'cineview:toggle' }).catch(() => {});
});

// ---------- matching ----------
const norm = (s) => ` ${String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9ऀ-෿]+/g, ' ').trim()} `;
const TRAILER_RE = /\b(trailer|teaser|glimpse|promo|first look|sneak peek|official video)\b/;
const NEGATIVE = ['reaction', 'review', 'explained', 'breakdown', 'fan made', 'fanmade', 'concept', 'spoof', 'parody', 'recap', 'ending',
  'song', 'songs', 'lyric', 'lyrical', 'jukebox', 'interview', 'making', 'bts', 'behind the scenes', 'full movie', 'scene', 'clip',
  'gameplay', 'game', 'ps5', 'xbox', 'steam', 'nintendo', 'esrb', 'mod', 'roblox', 'minecraft', 'shorts', 'edit', 'status', 'ringtone',
  'public talk', 'public review', 'press meet', 'event', 'pre release'];

function matchesMovie(videoTitle, movieTitle) {
  const v = norm(videoTitle), m = norm(movieTitle);
  if (m.trim().length < 1) return false;
  return v.includes(m) || (m.trim().includes(' ') && v.replace(/ /g, '').includes(m.replace(/ /g, '')));
}

function negativesFor(movieTitle) {
  const m = norm(movieTitle);
  return NEGATIVE.filter((w) => !m.includes(` ${w} `));
}

function score(v, movieTitle, lang, idx) {
  const t = norm(v.title);
  let s = -idx * 0.3;
  if (/\btrailer\b/.test(t)) s += 4;
  if (/\bofficial\b/.test(t)) s += 3;
  if (/\bteaser\b/.test(t)) s += 1;
  if (lang && t.includes(` ${lang.toLowerCase()} `)) s += 3;
  if (t.startsWith(norm(movieTitle))) s += 1.5;
  const secs = durationSeconds(v.length);
  if (secs != null) { if (secs >= 40 && secs <= 270) s += 2; else if (secs > 420) s -= 6; }
  const pub = (v.published || '').toLowerCase();
  if (/(hour|day|week)s? ago/.test(pub)) s += 3; else if (/months? ago/.test(pub)) s += 1.5; else if (/years? ago/.test(pub)) s -= 2;
  return s;
}

function filterAndRank(list, movieTitle, lang) {
  const neg = negativesFor(movieTitle);
  const seen = new Set();
  return list
    .filter((v) => v.videoId && v.title && !seen.has(v.videoId) && seen.add(v.videoId))
    .filter((v) => matchesMovie(v.title, movieTitle))
    .filter((v) => TRAILER_RE.test(norm(v.title)))
    .filter((v) => !neg.some((w) => norm(v.title).includes(` ${w} `)))
    .map((v, i) => ({ ...v, score: score(v, movieTitle, lang, i), source: 'youtube' }))
    .sort((a, b) => b.score - a.score);
}

// ---------- main ----------
async function findTrailer({ title, lang = '', ids = [] }) {
  title = (title || '').trim();
  if (!title) return [];
  const cacheKey = `yt:${CACHE_VERSION}:${title.toLowerCase()}|${lang.toLowerCase()}|${ids.join(',')}`;
  const cached = (await chrome.storage.local.get(cacheKey))[cacheKey];
  if (cached && Date.now() - cached.t < CACHE_TTL_MS) return cached.results;

  // 1) Platform-provided trailer IDs, verified by title
  const platform = [];
  for (const id of ids.slice(0, 6)) {
    const info = await oembed(id).catch(() => null);
    if (info && matchesMovie(info.title, title) && !/reaction|review|song|lyric/i.test(info.title)) {
      platform.push({ videoId: id, title: info.title, channel: info.author_name, length: '', source: 'platform', score: 100 });
    }
  }

  // 2) YouTube search (strictly filtered)
  const { apiKey } = await chrome.storage.sync.get({ apiKey: '' });
  const shortTitle = title.split(/\s+/).length === 1 || title.length <= 6;
  const queries = [
    `${title}${lang ? ' ' + lang : ''}${shortTitle ? ' movie' : ''} official trailer`,
    `${title} movie trailer ${new Date().getFullYear()}`
  ];
  let found = [];
  for (const q of queries) {
    let raw = [];
    if (apiKey) raw = await searchWithDataApi(q, apiKey).catch(() => []);
    if (!raw.length) raw = await searchWithResultsPage(q);
    found = filterAndRank([...found, ...raw], title, lang);
    if (found.length >= 3) break;
  }

  const seen = new Set(platform.map((p) => p.videoId));
  const results = [...platform, ...found.filter((f) => !seen.has(f.videoId))].slice(0, 6);
  await chrome.storage.local.set({ [cacheKey]: { t: Date.now(), results } });
  return results;
}

async function oembed(id) {
  const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}`);
  if (!res.ok) return null; // 401/404 = private, removed or not embeddable
  return res.json();
}

async function searchWithDataApi(query, key) {
  const url = 'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=15'
    + '&q=' + encodeURIComponent(query) + '&key=' + encodeURIComponent(key);
  const res = await fetch(url);
  if (!res.ok) throw new Error('YouTube API ' + res.status);
  const data = await res.json();
  return (data.items || []).map((it) => ({
    videoId: it.id.videoId, title: decodeEntities(it.snippet.title), channel: it.snippet.channelTitle, length: '',
    published: it.snippet.publishedAt && (Date.now() - Date.parse(it.snippet.publishedAt) < 3e10 ? '1 month ago' : '2 years ago')
  }));
}

async function searchWithResultsPage(query) {
  const url = 'https://www.youtube.com/results?hl=en&gl=IN&sp=EgIQAQ%253D%253D&search_query=' + encodeURIComponent(query);
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error('YouTube search ' + res.status);
  const html = await res.text();
  const data = extractInitialData(html);
  const out = [];
  if (data) {
    walk(data, (node) => {
      const vr = node.videoRenderer;
      if (vr && vr.videoId) {
        out.push({
          videoId: vr.videoId, title: runsText(vr.title), channel: runsText(vr.ownerText) || runsText(vr.longBylineText),
          length: (vr.lengthText && vr.lengthText.simpleText) || '', published: runsText(vr.publishedTimeText)
        });
      }
    });
  }
  return out;
}

function extractInitialData(html) {
  for (const marker of ['var ytInitialData = ', 'window["ytInitialData"] = ', 'ytInitialData = ']) {
    const start = html.indexOf(marker);
    if (start === -1) continue;
    const s = start + marker.length, end = findJsonEnd(html, s);
    if (end > s) { try { return JSON.parse(html.slice(s, end)); } catch (_) {} }
  }
  return null;
}

function findJsonEnd(s, i) {
  let depth = 0, inStr = false, esc = false;
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true; else if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) return k + 1; }
  }
  return -1;
}

function walk(node, fn, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 40) return;
  fn(node);
  if (Array.isArray(node)) for (const n of node) walk(n, fn, depth + 1); else for (const k in node) walk(node[k], fn, depth + 1);
}

function runsText(t) {
  if (!t) return '';
  if (t.simpleText) return t.simpleText;
  if (Array.isArray(t.runs)) return t.runs.map((r) => r.text).join('');
  return '';
}

function durationSeconds(len) {
  if (!len) return null;
  const p = len.split(':').map(Number);
  return p.some(isNaN) ? null : p.reduce((a, x) => a * 60 + x, 0);
}

function decodeEntities(s) {
  return String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
