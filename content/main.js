// CineView – content-script entry: detects the movie, finds platform trailer hints, opens the preview
(function () {
  const CV = (window.CineView = window.CineView || {});
  if (CV.__mainLoaded) return;
  CV.__mainLoaded = true;

  const LANGS = ['Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'English', 'Bengali', 'Marathi', 'Punjabi', 'Gujarati', 'Odia'];
  const JUNK_RE = /^(district|bookmyshow|book ?my ?show|movies?|cinemas?|select seats?|seat layout|home|sign ?in|log ?in|profile|back|proceed|page loaded|loading.*|skip to.*|menu|search|\d+ (seat|ticket)s?|selected|screen this way|elite|prime|classic|recliner)$/i;
  const SHOW_LINE_RE = /(\d{1,2}:\d{2}\s?(am|pm))|(\bat\b.{2,60}(cinema|cinemas|pvr|inox|cinepolis|multiplex|theatre|theater|mall|screens?|audi))/i;

  // ---- remember seat clicks (helps confirm which seats the user selected) ----
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element) || t.closest('#cineview-root')) return;
    CV.clickedSeatEls.add(t);
    if (CV.clickedSeatEls.size > 60) CV.clickedSeatEls.delete(CV.clickedSeatEls.values().next().value);
  }, true);

  // ---------- helpers ----------
  function cleanTitle(t) {
    if (!t) return '';
    let s = String(t).replace(/\s+/g, ' ').trim();
    s = s.split(/\s[|–—]\s|\s-\s(?=(book|buy|movie|district|bookmyshow|seat|tickets?))/i)[0];
    s = s.replace(/\b(book|buy)\s+(movie\s+)?tickets?\b.*$/i, '')
      .replace(/\b(movie\s+tickets?|seat\s+layout|select\s+seats?|online|showtimes?)\b/gi, '')
      .replace(/\((u|ua|u\/a|a|s|ua\s?\d+\+?|\d+\+)\)/gi, '')
      .replace(/\b(2d|3d|4dx|imax|mx4d|screenx|ice|dolby\s+atmos|dolby\s+cinema|epiq|playhouse)\b/gi, '')
      .replace(/\s{2,}/g, ' ').replace(/[\s,:\-|·•]+$/, '').replace(/^[\s,:\-|·•]+/, '').trim();
    if (s.length < 1 || s.length > 80 || JUNK_RE.test(s) || SHOW_LINE_RE.test(s) || /₹|\btickets?\b/i.test(s)) return '';
    return s;
  }

  function isVisible(el, r) {
    if (!r.width || !r.height || r.width < 8 || r.height < 8) return false;
    if (el.closest('[aria-live],[role="status"],[role="alert"],[aria-hidden="true"],.sr-only,.visually-hidden,#cineview-root')) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.15) return false;
    if (cs.clip && cs.clip !== 'auto') return false;
    if (cs.clipPath && cs.clipPath.includes('inset(50%')) return false;
    return true;
  }

  function leafTextEls(selector, maxTop) {
    const out = [];
    for (const el of document.querySelectorAll(selector)) {
      if ([...el.children].some((c) => (c.textContent || '').trim())) continue;
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length > 120) continue;
      const r = el.getBoundingClientRect();
      if (r.top < -5 || r.top > maxTop || !isVisible(el, r)) continue;
      out.push({ el, text, r, size: parseFloat(getComputedStyle(el).fontSize) || 0, weight: parseInt(getComputedStyle(el).fontWeight, 10) || 400 });
    }
    return out;
  }

  // 1) Booking headers show "Movie" above "15 Nov, 10:30 AM at Cinema…": find that line, take the text just above it
  function titleFromShowLine() {
    const leaves = leafTextEls('h1,h2,h3,h4,p,span,div,a', 340);
    const lines = leaves.filter((l) => SHOW_LINE_RE.test(l.text) && l.text.length > 10);
    let best = null;
    for (const line of lines) {
      for (const c of leaves) {
        if (c === line || c.r.bottom > line.r.top + 4 || line.r.top - c.r.bottom > 70) continue;
        const overlapX = Math.min(c.r.right, line.r.right) - Math.max(c.r.left, line.r.left);
        if (overlapX < Math.min(c.r.width, line.r.width) * 0.3) continue;
        const t = cleanTitle(c.text);
        if (!t || c.size < line.size) continue;
        const score = c.size * 2 + (c.weight >= 600 ? 6 : 0) - (line.r.top - c.r.bottom) / 8;
        if (!best || score > best.score) best = { text: t, score, el: c.el, line: line.text };
      }
    }
    return best;
  }

  // 2) Largest bold heading in the page header
  function titleFromHeader() {
    const leaves = leafTextEls('h1,h2,h3,header *,[class*="title" i],[class*="name" i]', 260);
    let best = null;
    for (const c of leaves) {
      if (c.size < 15) continue;
      const t = cleanTitle(c.text);
      if (!t) continue;
      const score = c.size + (c.weight >= 600 ? 4 : 0) - c.r.top / 60;
      if (!best || score > best.score) best = { text: t, score, el: c.el };
    }
    return best;
  }

  // 3) Structured data (JSON-LD Movie / ScreeningEvent)
  function titleFromJsonLd() {
    for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const items = [].concat(JSON.parse(s.textContent));
        for (const it of items) {
          const type = [].concat(it['@type'] || []).join(',');
          if (/Movie/i.test(type) && it.name) return cleanTitle(it.name);
          if (/ScreeningEvent|Event/i.test(type) && it.workPresented && it.workPresented.name) return cleanTitle(it.workPresented.name);
        }
      } catch (_) {}
    }
    return '';
  }

  function detectLanguage(scopeText) {
    const text = scopeText || '';
    return LANGS.find((l) => new RegExp('\\b' + l + '\\b', 'i').test(text)) || '';
  }

  // YouTube IDs present in the page (platform-provided trailers), preferring those near the movie title in page data.
  function platformTrailerIds(title) {
    const ids = new Map();
    const add = (id, weight) => ids.set(id, (ids.get(id) || 0) + weight);
    const YT = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^"'\s]*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([\w-]{11})/g;
    for (const el of document.querySelectorAll('iframe[src*="youtu"], a[href*="youtu"], [data-src*="youtu"], [data-video*="youtu"]')) {
      if (el.closest('#cineview-root')) continue;
      const s = el.getAttribute('src') || el.getAttribute('href') || el.getAttribute('data-src') || el.getAttribute('data-video') || '';
      for (const m of s.matchAll(YT)) add(m[1], 3);
    }
    const needle = (title || '').toLowerCase();
    for (const sc of document.querySelectorAll('script:not([src])')) {
      let text = sc.textContent || '';
      if (!/youtu/i.test(text)) continue;
      text = text.replace(/\\u002F/gi, '/').replace(/\\\//g, '/');
      const lower = needle ? text.toLowerCase() : '';
      for (const m of text.matchAll(YT)) {
        let w = 1;
        if (needle) {
          const near = lower.slice(Math.max(0, m.index - 2500), m.index + 2500);
          if (near.includes(needle)) w += 3;
          if (/trailer/.test(near)) w += 1;
        }
        add(m[1], w);
      }
    }
    return [...ids.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id);
  }

  async function remembered() {
    try {
      const { lastMovie } = await chrome.storage.local.get('lastMovie');
      if (lastMovie && Date.now() - lastMovie.t < 12 * 3600 * 1000) return lastMovie;
    } catch (_) {}
    return null;
  }

  async function detectMovie() {
    const fromLine = titleFromShowLine();
    const fromHeader = fromLine ? null : titleFromHeader();
    const meta = document.querySelector('meta[property="og:title"]');
    let title = (fromLine && fromLine.text) || (fromHeader && fromHeader.text) || titleFromJsonLd() || cleanTitle(meta && meta.content) || cleanTitle(document.title);

    const mem = await remembered();
    const pageText = (document.body.innerText || '').toLowerCase();
    if (mem && (!title || title.toLowerCase() === mem.title.toLowerCase() || (title.length < 3 && pageText.includes(mem.title.toLowerCase())))) title = mem.title;

    const headScope = (fromLine && fromLine.line) || '';
    const headerEl = (fromLine && fromLine.el) || (fromHeader && fromHeader.el);
    const nearText = headScope + ' ' + ((headerEl && headerEl.parentElement && headerEl.parentElement.innerText) || '');
    let lang = detectLanguage(nearText);
    let ids = title ? platformTrailerIds(title) : [];
    if (mem && title && mem.title.toLowerCase() === title.toLowerCase()) {
      lang = lang || mem.lang || '';
      ids = [...new Set([...(mem.ids || []), ...ids])];
    }
    // Screen format from the show line / header (e.g. "IMAX 2D", "4K Laser Dolby Atmos")
    const fmtText = nearText + ' ' + ((document.querySelector('header') || {}).innerText || '');
    let format = null;
    if (/\bimax\b/i.test(fmtText)) format = 1.9;
    else if (/\b(scope|cinemascope)\b/i.test(fmtText)) format = 2.39;
    else if (/\b(flat|1\.85)\b/i.test(fmtText)) format = 1.85;
    return { title, lang, ids, format };
  }
  CV.detectMovie = detectMovie;

  // On a movie's details page, remember title/language/trailer so the seat page can use them
  function rememberMovieOnDetailsPage() {
    const path = location.pathname;
    if (/seat|buytickets|booking|checkout|payment/i.test(path) || !/\/movies?\//i.test(path)) return;
    const h1 = [...document.querySelectorAll('h1')].find((e) => isVisible(e, e.getBoundingClientRect()));
    const title = cleanTitle(h1 && h1.textContent) || titleFromJsonLd();
    if (!title) return;
    const lang = detectLanguage((document.body.innerText || '').slice(0, 4000));
    const ids = platformTrailerIds(title);
    chrome.storage.local.set({ lastMovie: { title, lang, ids, t: Date.now(), url: location.href } }).catch(() => {});
  }

  // ---------- open / close ----------
  async function openPreview() {
    if (CV.Overlay.isOpen()) { CV.Overlay.close(); return; }
    let layout = CV.detectLayout();
    let message = '';
    if (!layout) {
      layout = CV.syntheticLayout();
      message = 'Seat map not readable here – showing a typical hall. Pick your seat on the map.';
    }
    const selected = layout.seats.filter((s) => s.status === 'selected').sort((a, b) => a.row - b.row || a.cx - b.cx);
    let seat = selected[0];
    if (!seat) {
      seat = CV.suggestSeat(layout);
      if (!message) message = 'No seat selected yet – showing a recommended seat.';
    }

    let settings = {};
    try { settings = (await chrome.storage.sync.get({ settings: {} })).settings || {}; } catch (_) {}
    const movie = await detectMovie();
    settings.aspect = movie.format || 2.39; // format is per show, not a saved preference
    CV.Overlay.open({ layout, selected, seat, title: movie.title, hints: { lang: movie.lang, ids: movie.ids }, settings, message });
    lastSeenTitle = movie.title;
  }
  CV.openPreview = openPreview;

  try {
    chrome.runtime.onMessage.addListener((msg, _s, send) => {
      if (msg && msg.type === 'cineview:toggle') { openPreview(); send({ ok: true }); }
      if (msg && msg.type === 'cineview:ping') send({ ok: true });
    });
  } catch (_) { /* demo page outside an extension */ }

  // ---------- keep up with SPA navigation (movie / showtime changes) ----------
  let lastHref = location.href;
  let lastSeenTitle = '';
  // Re-detect the movie only when the page URL changes (new movie / showtime) – no polling of the page itself
  setInterval(async () => {
    if (location.href === lastHref) return;
    lastHref = location.href;
    setTimeout(rememberMovieOnDetailsPage, 1500);
    if (CV.Overlay && CV.Overlay.isOpen()) {
      await new Promise((r) => setTimeout(r, 1200)); // let the new page render
      const m = await detectMovie();
      if (m.title && m.title !== lastSeenTitle) {
        lastSeenTitle = m.title;
        CV.Overlay.updateMovie(m.title, { lang: m.lang, ids: m.ids });
      }
    }
  }, 1000);

  setTimeout(rememberMovieOnDetailsPage, 1200);
})();
