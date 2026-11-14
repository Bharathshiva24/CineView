// CineView – runs in the page's own JavaScript world (manifest "world": "MAIN").
// BookMyShow's newer seat layout is drawn with Konva on a <canvas>, so the seats aren't DOM elements.
// When CineView asks, this reads the seat objects from the Konva stage and answers with plain JSON.
// It only reads; it never changes the page.
(function () {
  if (window.__cineviewKonvaBridge) return;
  window.__cineviewKonvaBridge = true;

  function read() {
    const K = window.Konva;
    if (!K || !K.stages || !K.stages.length) return null;
    const base = new Map();
    const selected = new Set();
    let screenY = null;
    for (const stage of K.stages) {
      const box = stage.container().getBoundingClientRect();
      if (!box.width || !box.height) continue;
      stage.find((n) => {
        const id = (n.id && n.id()) || '';
        const o = n.attrs && n.attrs.seatObj;
        if (o && typeof o === 'object') {
          const row = String(o.rowNumber || '').trim();
          const label = String(o.displaySeatNumber || o.cinemaSeatNumber || '').trim();
          const key = `${row}|${label}|${o.areaCode || ''}`;
          if (/-selected$/i.test(id)) { selected.add(key); return false; }
          const shape = (n.findOne && n.findOne('Rect')) || n;
          const r = shape.getClientRect();
          if (!r.width || !r.height) return false;
          const status = o.seatStatus;
          const available = status === 1 || status === '1' || /^available$/i.test(String(o.seatType || ''));
          base.set(key, { row, label, available, x: box.left + r.x, y: box.top + r.y, w: r.width, h: r.height, key });
        } else if (n.className === 'Text' && /eyes this way|screen this way|^screen$/i.test(String(n.text && n.text()))) {
          const r = n.getClientRect();
          screenY = box.top + r.y + r.height / 2;
        }
        return false;
      });
    }
    if (!base.size) return null;
    const seats = [...base.values()].map((s) => ({ ...s, selected: selected.has(s.key) }));
    return { seats, screenY };
  }

  document.addEventListener('cineview:konva-request', () => {
    let out = null;
    try { out = read(); } catch (_) { out = null; }
    document.dispatchEvent(new CustomEvent('cineview:konva-response', { detail: JSON.stringify(out) }));
  });
})();
