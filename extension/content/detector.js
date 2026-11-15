// CineView – reads the seat map from the page (works on District, BookMyShow and similar layouts)
//
// Strategy (deliberately site-agnostic, so it survives class-name changes):
//  1. Seats are many small, roughly square, same-sized elements, usually labelled with a number.
//  2. The most common size bucket with enough members is the seat grid.
//  3. Rows are clusters by vertical position; the screen side is found from "screen this way"-type text.
//  4. Status (selected / occupied / available) comes from ARIA/classes, then from colour, then from
//     the seats the user actually clicked.
(function () {
  const CV = (window.CineView = window.CineView || {});

  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'svg', 'SVG', 'path', 'PATH', 'IMG', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'IFRAME', 'VIDEO', 'CANVAS', 'HTML', 'BODY', 'HEAD']);
  const OCCUPIED_RE = /(sold|occupied|booked|blocked|unavailable|disabled|reserved|taken|inactive)/i;
  const SELECTED_RE = /(^|[\s_-])(selected|is-selected|seat-selected|chosen|picked|checked)([\s_-]|$)/i;
  const SCREEN_TEXT_RE = /(screen this way|all eyes this way|eyes this way|screen)/i;

  CV.clickedSeatEls = new Set();

  function parseColor(str) {
    const m = str && str.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    const a = p.length > 3 ? p[3] : 1;
    if (a < 0.2) return null;
    return { r: p[0], g: p[1], b: p[2], a };
  }

  function hsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    let h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return { h, s, l };
  }

  // First opaque background colour on the element or its descendants (seat styling is often on an inner node)
  function seatFill(el) {
    const nodes = [el, ...el.querySelectorAll('*')].slice(0, 6);
    for (const n of nodes) {
      const cs = getComputedStyle(n);
      const c = parseColor(cs.backgroundColor);
      if (c) return c;
      if (cs.backgroundImage && cs.backgroundImage.includes('gradient')) {
        const g = parseColor(cs.backgroundImage);
        if (g) return g;
      }
    }
    return null;
  }

  function classAndAria(el) {
    let txt = '';
    const nodes = [el, ...el.querySelectorAll('*')].slice(0, 6);
    for (const n of nodes) {
      txt += ' ' + (typeof n.className === 'string' ? n.className : (n.className && n.className.baseVal) || '');
      for (const a of ['aria-label', 'data-status', 'data-state', 'title']) {
        const v = n.getAttribute && n.getAttribute(a);
        if (v) txt += ' ' + v;
      }
    }
    return txt;
  }

  function ariaSelected(el) {
    const nodes = [el, ...el.querySelectorAll('*')].slice(0, 6);
    return nodes.some((n) => ['aria-pressed', 'aria-selected', 'aria-checked', 'data-selected'].some((a) => n.getAttribute && n.getAttribute(a) === 'true'));
  }

  function ariaDisabled(el) {
    return el.disabled === true || el.getAttribute('aria-disabled') === 'true';
  }

  function median(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  }

  function findCandidates(root) {
    const all = root.querySelectorAll('*');
    const out = [];
    for (const el of all) {
      if (SKIP_TAGS.has(el.tagName)) continue;
      if (el.closest && el.closest('#cineview-root')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 10 || r.width > 80 || r.height < 10 || r.height > 80) continue;
      const ratio = r.width / r.height;
      if (ratio < 0.6 || ratio > 1.6) continue;
      const text = (el.textContent || '').trim();
      if (text.length > 4) continue;
      if (text && !/^[A-Za-z]?\d{1,3}[A-Za-z]?$/.test(text)) continue; // seat numbers like 12, A12, 12B
      out.push({ el, r, text });
    }
    return out;
  }

  // Pick the dominant seat size and drop nested duplicates (keep the outermost element)
  function pickSeatGrid(cands) {
    const buckets = new Map();
    for (const c of cands) {
      const key = Math.round(c.r.width / 3) + 'x' + Math.round(c.r.height / 3);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(c);
    }
    let best = null;
    for (const [, list] of buckets) {
      // score by number of distinct positions (nested duplicates share a position)
      const pos = new Set(list.map((c) => Math.round(c.r.left) + ',' + Math.round(c.r.top)));
      if (!best || pos.size > best.distinct) best = { list, distinct: pos.size };
    }
    if (!best || best.distinct < 12) return [];
    const { width: W, height: H } = best.list[0].r;
    const inSize = cands.filter((c) => Math.abs(c.r.width - W) <= 4 && Math.abs(c.r.height - H) <= 4);

    // de-duplicate by position, keeping outermost
    const byPos = new Map();
    for (const c of inSize) {
      const key = Math.round(c.r.left / 2) + ',' + Math.round(c.r.top / 2);
      const prev = byPos.get(key);
      if (!prev || c.el.contains(prev.el)) byPos.set(key, c);
    }
    return [...byPos.values()];
  }

  function findScreenSide(seatsTop, seatsBottom, seatsCenterX) {
    const leaves = document.body.querySelectorAll('div,span,p,h1,h2,h3,h4,h5,h6,small,strong,b,svg text,text');
    let best = null;
    for (const el of leaves) {
      if (el.children.length > 2) continue;
      const t = (el.textContent || '').trim();
      if (!t || t.length > 40 || !SCREEN_TEXT_RE.test(t)) continue;
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      const cy = r.top + r.height / 2;
      const dist = Math.min(Math.abs(cy - seatsTop), Math.abs(cy - seatsBottom)) + Math.abs(r.left + r.width / 2 - seatsCenterX) * 0.2;
      if (!best || dist < best.dist) best = { cy, dist };
    }
    if (!best) return 'bottom'; // both BookMyShow and District put the screen at the bottom
    return best.cy > (seatsTop + seatsBottom) / 2 ? 'bottom' : 'top';
  }

  function findRowLabels(rows, seatH, minX, maxX) {
    const els = document.body.querySelectorAll('div,span,p,td,li,b,strong');
    const labels = [];
    for (const el of els) {
      if (el.children.length) continue;
      const t = (el.textContent || '').trim();
      if (!/^[A-Z]{1,2}$/.test(t)) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || r.height > 60) continue;
      const cx = r.left + r.width / 2;
      if (cx > minX - 4 && cx < maxX + 4) continue; // must sit outside the seat block
      labels.push({ t, cy: r.top + r.height / 2 });
    }
    for (const row of rows) {
      const hit = labels.find((l) => Math.abs(l.cy - row.y) < seatH * 0.6);
      if (hit) row.label = hit.t;
    }
  }

  // Booked seats often show an icon instead of their number – infer it from labelled neighbours
  function rowDirection(rowSeats) {
    const known = rowSeats.map((s) => parseInt(s.text, 10)).filter((n) => !isNaN(n));
    return known.length >= 2 ? (known[known.length - 1] >= known[0] ? 1 : -1) : 0;
  }

  function inferSeatNumbers(rowSeats, defaultDir = 1) {
    const known = rowSeats.map((s, i) => ({ i, n: parseInt(s.text, 10) })).filter((k) => !isNaN(k.n));
    if (!known.length) return;
    let dir = defaultDir;
    if (known.length >= 2) dir = known[known.length - 1].n >= known[0].n ? 1 : -1;
    rowSeats.forEach((s, i) => {
      if (s.label) return;
      let near = known[0];
      for (const k of known) if (Math.abs(k.i - i) < Math.abs(near.i - i)) near = k;
      const n = near.n + (i - near.i) * dir;
      if (n > 0) s.label = String(n);
    });
  }

  // The seat's own accessible label wins over class names inside it (District puts an "unavailableIcon" element
  // inside every seat, including available ones).
  function ownSeatState(el) {
    for (const n of [el, ...el.querySelectorAll('[aria-label]')].slice(0, 4)) {
      const v = (n.getAttribute && n.getAttribute('aria-label')) || '';
      if (/^\s*(selected|chosen)\b/i.test(v)) return 'selected';
      if (/^\s*(unavailable|sold|booked|occupied|blocked|reserved|not available)\b/i.test(v)) return 'occupied';
      if (/^\s*available\b/i.test(v)) return 'available';
    }
    return '';
  }

  function classify(seats) {
    // Base statuses from semantics
    for (const s of seats) {
      const own = ownSeatState(s.el);
      if (own) { s.status = own === 'available' && ariaSelected(s.el) ? 'selected' : own; s.fill = seatFill(s.el); s.trusted = true; continue; }
      const meta = classAndAria(s.el);
      const hasSvg = !!s.el.querySelector('svg');
      if (ariaSelected(s.el) || SELECTED_RE.test(meta)) s.status = 'selected';
      else if (ariaDisabled(s.el) || OCCUPIED_RE.test(meta) || (!s.text && hasSvg)) s.status = 'occupied';
      else if (!s.text && !hasSvg) s.status = 'gap';
      else s.status = 'available';
      s.fill = seatFill(s.el);
    }

    // Colour heuristic: a strongly coloured, mid/dark fill that differs from the common fill = selected
    const fillKey = (c) => (c ? `${Math.round(c.r / 16)},${Math.round(c.g / 16)},${Math.round(c.b / 16)}` : 'none');
    const counts = new Map();
    for (const s of seats) counts.set(fillKey(s.fill), (counts.get(fillKey(s.fill)) || 0) + 1);
    const commonKey = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];

    for (const s of seats) {
      if (s.status !== 'available' || !s.fill || s.trusted) continue;
      const k = fillKey(s.fill);
      if (k === commonKey) continue;
      const { s: sat, l } = hsl(s.fill);
      if (sat > 0.35 && l > 0.15 && l < 0.72 && counts.get(k) <= Math.max(10, seats.length * 0.08)) s.status = 'selected';
      else if (sat > 0.25 && l >= 0.72) s.status = 'available'; // "best seat" hints etc.
    }

    // Seats the user clicked this session that still look non-default
    for (const s of seats) {
      if (s.status === 'available' && !s.trusted && [...CV.clickedSeatEls].some((c) => c === s.el || s.el.contains(c) || c.contains(s.el))) {
        if (fillKey(s.fill) !== commonKey) s.status = 'selected';
      }
    }
    return seats.filter((s) => s.status !== 'gap');
  }

  // Main entry. Returns null if no seat map is found.
  CV.detectLayout = function () {
    const cands = findCandidates(document.body);
    const grid = pickSeatGrid(cands);
    if (grid.length < 12) return null;

    let seats = grid.map((c, i) => ({
      id: i,
      el: c.el,
      text: c.text,
      label: c.text,
      cx: c.r.left + c.r.width / 2,
      cy: c.r.top + c.r.height / 2,
      w: c.r.width,
      h: c.r.height
    }));
    seats = classify(seats);
    if (seats.length < 12) return null;
    return buildLayout(seats);
  };

  // Seats that describe themselves, e.g. District: aria-label="available seat, class BALCONY, row G, column 14, price 150"
  // (and "selected class BALCONY, row G, column 14 …" / "unavailable seat, …"). Row and state come straight from the label;
  // the seat number is the one printed on the seat ("1A", "14"), since the label's column count can differ from it.
  const ARIA_SEAT_RE = /\brow\s+([A-Z]{1,3})\b[\s\S]*?\b(?:column|col|seat(?:\s+no\.?|\s+number)?)\s+([A-Z]?\d{1,3}[A-Z]?)\b/i;
  CV.detectAriaLayout = function () {
    const seen = new Set();
    const seats = [];
    for (const el of document.querySelectorAll('[aria-label]')) {
      if (el.closest('#cineview-root')) continue;
      const aria = el.getAttribute('aria-label') || '';
      const m = aria.match(ARIA_SEAT_RE);
      if (!m) continue;
      if ([...seen].some((o) => o.contains(el) || el.contains(o))) continue; // nested duplicates
      const r = el.getBoundingClientRect();
      if (r.width < 6 || r.height < 6 || r.width > 120 || r.height > 120) continue;
      seen.add(el);
      const printed = (el.textContent || '').trim();
      const label = /^[A-Za-z]?\d{1,3}[A-Za-z]?$/.test(printed) ? printed : m[2];
      const cls = typeof el.className === 'string' ? el.className : '';
      let status = 'available';
      if (/^\s*(selected|chosen)\b/i.test(aria) || ariaSelected(el) || /(^|[\s_-])(selected|seat-selected)([\s_-]|$)/i.test(cls)) status = 'selected';
      else if (/^\s*(unavailable|sold|booked|occupied|blocked|reserved|not available)\b/i.test(aria) || ariaDisabled(el) || /(^|[\s_-])(sold|occupied|booked|blocked)([\s_-]|$)|__disable/i.test(cls)) status = 'occupied';
      seats.push({ id: seats.length, el, text: label, label, rowLabel: m[1].toUpperCase(), cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height, status });
    }
    if (seats.length < 12) return null;
    return buildLayout(seats);
  };

  // Seats drawn on a Konva canvas (BookMyShow's newer seat layout). konva-bridge.js runs in the page and reads the
  // seat objects; here they become the same seat list the DOM reader produces.
  CV.readKonvaSeats = function (timeoutMs = 400) {
    return new Promise((resolve) => {
      let done = false;
      const onRes = (e) => {
        if (done) return; done = true;
        document.removeEventListener('cineview:konva-response', onRes);
        try { resolve(JSON.parse(e.detail)); } catch (_) { resolve(null); }
      };
      document.addEventListener('cineview:konva-response', onRes);
      document.dispatchEvent(new CustomEvent('cineview:konva-request'));
      setTimeout(() => { if (!done) { done = true; document.removeEventListener('cineview:konva-response', onRes); resolve(null); } }, timeoutMs);
    });
  };

  CV.detectKonvaLayout = async function () {
    const data = await CV.readKonvaSeats();
    if (!data || !data.seats || data.seats.length < 12) return null;
    const seats = data.seats.map((k, i) => ({
      id: i, el: null, text: k.label, label: k.label, rowLabel: k.row,
      cx: k.x + k.w / 2, cy: k.y + k.h / 2, w: k.w, h: k.h,
      status: k.selected ? 'selected' : k.available ? 'available' : 'occupied'
    }));
    const ys = seats.map((s) => s.cy);
    let screenSide = 'bottom';
    if (data.screenY != null) screenSide = data.screenY < Math.min(...ys) ? 'top' : 'bottom';
    return buildLayout(seats, { screenSide });
  };

  function buildLayout(seats, opts = {}) {
    const seatH = median(seats.map((s) => s.h));
    const seatW = median(seats.map((s) => s.w));

    // Row clustering by y
    const sorted = [...seats].sort((a, b) => a.cy - b.cy);
    const rowsByY = [];
    for (const s of sorted) {
      const last = rowsByY[rowsByY.length - 1];
      if (last && Math.abs(s.cy - last.y) < seatH * 0.5) { last.seats.push(s); last.y = (last.y * (last.seats.length - 1) + s.cy) / last.seats.length; }
      else rowsByY.push({ y: s.cy, seats: [s] });
    }

    const minY = rowsByY[0].y, maxY = rowsByY[rowsByY.length - 1].y;
    const minX = Math.min(...seats.map((s) => s.cx));
    const maxX = Math.max(...seats.map((s) => s.cx));
    const screenSide = opts.screenSide || findScreenSide(minY, maxY, (minX + maxX) / 2);

    const rows = screenSide === 'bottom' ? [...rowsByY].reverse() : rowsByY; // rows[0] = closest to screen
    const gaps = [];
    for (let i = 1; i < rows.length; i++) gaps.push(Math.abs(rows[i].y - rows[i - 1].y));
    const rowPitchPx = Math.max(seatH, median(gaps.filter((g) => g < seatH * 3)) || seatH * 1.3);

    let depth = 0;
    rows.forEach((row, i) => {
      if (i > 0) {
        const g = gaps[i - 1] / rowPitchPx;
        depth += g > 1.7 ? 1.5 : 1; // big visual gap = section break / cross aisle
      }
      row.ordinal = i;
      row.depth = depth;
      row.seats.sort((a, b) => a.cx - b.cx);
      for (const s of row.seats) s.row = i;
    });
    // Numbering direction (left→right ascending or descending) from rows that show at least two numbers
    const dirVotes = rows.map((r) => rowDirection(r.seats)).reduce((a, d) => a + d, 0);
    rows.forEach((row) => inferSeatNumbers(row.seats, dirVotes < 0 ? -1 : 1));

    // Horizontal seat pitch
    const dx = [];
    for (const row of rows) for (let i = 1; i < row.seats.length; i++) {
      const d = row.seats[i].cx - row.seats[i - 1].cx;
      if (d > seatW * 0.8) dx.push(d);
    }
    const seatPitchPx = median(dx) || seatW * 1.25;

    // Rows where every seat is booked have no visible numbers: borrow the number of the seat in the same column
    const labelled = seats.filter((s) => s.label);
    for (const s of seats) {
      if (s.label) continue;
      let best = null;
      for (const o of labelled) if (Math.abs(o.cx - s.cx) < seatW * 0.5 && (!best || Math.abs(o.cy - s.cy) < Math.abs(best.cy - s.cy))) best = o;
      if (best) s.label = best.label;
    }

    // Seats that carry their own row letter (canvas layouts) label their row directly
    rows.forEach((row) => { const l = row.seats.find((s) => s.rowLabel); if (l) row.label = l.rowLabel; });
    if (rows.some((r) => !r.label)) findRowLabels(rows.filter((r) => !r.label), seatH, minX - seatW / 2, maxX + seatW / 2);
    rows.forEach((row, i) => { if (!row.label) row.label = String(i + 1); });

    return {
      seats,
      rows,
      seatPitchPx,
      rowPitchPx,
      minX, maxX, minY, maxY,
      centerX: (minX + maxX) / 2,
      seatW, seatH,
      screenSide,
      synthetic: false
    };
  }

  // Fallback when the seat map can't be read (canvas-rendered maps, unknown sites)
  CV.syntheticLayout = function (rowCount = 14, perRow = 22) {
    const seats = [];
    const rows = [];
    const pitch = 20;
    for (let r = 0; r < rowCount; r++) {
      const row = { y: (rowCount - r) * pitch, seats: [], ordinal: r, depth: r, label: String.fromCharCode(65 + (rowCount - 1 - r)) };
      for (let c = 0; c < perRow; c++) {
        const aisle = c >= perRow / 2 ? 30 : 0;
        const s = { id: seats.length, el: null, label: String(c + 1), text: String(c + 1), cx: c * pitch + aisle, cy: row.y, w: 16, h: 16, row: r, status: 'available' };
        seats.push(s); row.seats.push(s);
      }
      rows.push(row);
    }
    const minX = 0, maxX = (perRow - 1) * pitch + 30;
    return { seats, rows, seatPitchPx: pitch, rowPitchPx: pitch, minX, maxX, minY: pitch, maxY: rowCount * pitch, centerX: maxX / 2, seatW: 16, seatH: 16, screenSide: 'bottom', synthetic: true };
  };

  // Default seat to show when nothing is selected: centre, about two-thirds back
  CV.suggestSeat = function (layout) {
    const target = Math.round((layout.rows.length - 1) * 0.65);
    const row = layout.rows[target] || layout.rows[0];
    let best = row.seats[0];
    for (const s of row.seats) if (Math.abs(s.cx - layout.centerX) < Math.abs(best.cx - layout.centerX)) best = s;
    return best;
  };
})();
