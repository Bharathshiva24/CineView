// CineView website: live seat demo (hero) + trailer in the screen-format section
(() => {
  // Official trailers from the studios' own YouTube channels (all checked as embeddable).
  // Each page load picks one at random for each screen, never the one shown last time.
  const MOVIES = [
    { video: 'irVNGjRFZGk', label: 'Avengers: Doomsday · Official trailer' },
    { video: 'uJqaGLmZpGo', label: 'Dune: Part Three · Final trailer' },
    { video: 'f_bKjZeJBBI', label: 'The Odyssey · Official trailer' },
    { video: 'QftAW9TTmuQ', label: 'Toy Story 5 · Final trailer' },
    { video: 's1-pfiVMKAs', label: 'Supergirl · Official trailer' },
    { video: 'IHWlvwu8t1w', label: 'The Mandalorian and Grogu · Official trailer' },
    { video: 'P0XN3-n-2Lo', label: 'Project Hail Mary · Final trailer' },
    { video: 'Ma1x7ikpid8', label: 'Avatar: Fire and Ash · Trailer' },
    { video: 'En5QZmL5R1s', label: 'The Super Mario Galaxy Movie · Final trailer' },
    { video: 'P3uI5sLosKU', label: 'Spider-Man: Brand New Day · Final trailer' },
    { video: '8yh9BPUBbbQ', label: 'F1 The Movie · Official trailer' }
  ];
  const store = { get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} } };
  function pickTrailer(avoid = []) {
    const pool = MOVIES.filter((m) => !avoid.includes(m.video));
    return (pool.length ? pool : MOVIES)[Math.floor(Math.random() * (pool.length || MOVIES.length))];
  }
  const lastShown = (store.get('cv:lastTrailers') || '').split(',').filter(Boolean);
  const assigned = {};
  assigned.hero = pickTrailer(lastShown);
  assigned.formats = pickTrailer([...lastShown, assigned.hero.video]);
  store.set('cv:lastTrailers', [assigned.hero.video, assigned.formats.video].join(','));

  // ---------- Hall model (metres) ----------
  const ROWS = 'ABCDEFGHIJ'.split('');          // A is nearest the screen
  const COLS = 16, AISLE_AFTER = 8;
  const SEAT_W = 0.55, ROW_PITCH = 1.05, RISER = 0.28, EYE = 1.15;
  const HALL = (COLS + 1) * SEAT_W + 2.4;
  const SCREEN_W = 9.2, SCREEN_RATIO = 2.39, SCREEN_BOTTOM = 1.4;
  const SCREEN_H = SCREEN_W / SCREEN_RATIO;
  const FIRST_ROW = SCREEN_W * 0.6;
  const PX = 100, RAD = Math.PI / 180, FOV = 62;

  // Deterministic "booked" seats so the map looks like a real show
  let seed = 11; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const booked = new Set();
  ROWS.forEach((r, ri) => { for (let c = 1; c <= COLS; c++) if (rnd() < (ri < 3 ? 0.22 : ri > 7 ? 0.35 : 0.45)) booked.add(`${r}${c}`); });
  let seat = { row: 6, col: 8 };                    // G8: centre, about two-thirds back
  booked.delete('G8');

  const seatX = (col) => { const u = col - 1 + (col > AISLE_AFTER ? 1 : 0); return (u - COLS / 2) * SEAT_W; };
  const rowZ = (row) => FIRST_ROW + row * ROW_PITCH;
  const rowFloor = (row) => row * RISER;

  function metrics(s) {
    const x = seatX(s.col), z = rowZ(s.row), y = rowFloor(s.row) + EYE;
    const cy = SCREEN_BOTTOM + SCREEN_H / 2;
    const deg = (r) => (r * 180) / Math.PI;
    const h = deg(Math.atan((SCREEN_W / 2 - x) / z) + Math.atan((SCREEN_W / 2 + x) / z));
    const v = deg(Math.atan((cy - y) / z));
    const off = deg(Math.atan(Math.abs(x) / z));
    let score = 100;
    if (h < 36) score -= (36 - h) * 2.4;
    if (h > 46) score -= (h - 46) * 2.2;
    if (v > 8) score -= (v - 8) * 2.6;
    if (off > 12) score -= (off - 12) * 1.9;
    score = Math.round(Math.max(0, Math.min(100, score)));
    const verdict = score >= 85 ? 'Excellent seat' : score >= 70 ? 'Good seat' : score >= 50 ? 'Okay seat' : 'Limited view';
    let headline;
    if (h > 58) headline = 'Very close: you’ll turn your head to follow the action.';
    else if (v > 15) headline = 'You’ll be looking up for the whole film.';
    else if (off > 22) headline = 'Far off-centre: the picture looks skewed.';
    else if (h > 46) headline = 'Big and immersive, slightly closer than ideal.';
    else if (h >= 33) headline = 'Ideal immersion, comfortable to watch.';
    else headline = 'Comfortable, but the screen feels small.';
    return { x, y, z, h, v, off, dist: z, score, verdict, headline, cy };
  }

  // ---------- 3D stage (drawn on canvas so every browser, including iOS Safari, renders it the same) ----------
  const stage = document.querySelector('.demo-stage');
  if (!stage) return;
  const backC = stage.querySelector('canvas.hall-back'), frontC = stage.querySelector('canvas.hall-front');
  const flat = stage.querySelector('.flat-screen .vid');
  let scene = { env: [], rows: [], cy: 0 };

  // A flat panel in world metres. orient: '' faces the viewer, 'x' lies flat (floor/ceiling), 'y' is a side wall.
  function panel(cls, w, h, x, y, z, orient = '', shape = 'rect') {
    let local;
    if (shape === 'seat') {
      // rounded top corners, slightly rounded bottom (matches the old CSS border-radius)
      const rx = w * 0.34, ry = h * 0.24, bx = w * 0.1, by = h * 0.06, pts = [];
      const arc = (cx, cy, ax, ay, a0, a1) => { for (let i = 0; i <= 5; i++) { const a = a0 + ((a1 - a0) * i) / 5; pts.push([cx + ax * Math.cos(a), cy + ay * Math.sin(a)]); } };
      const hw = w / 2, hh = h / 2;
      arc(-hw + rx, hh - ry, rx, ry, Math.PI, Math.PI / 2);
      arc(hw - rx, hh - ry, rx, ry, Math.PI / 2, 0);
      arc(hw - bx, -hh + by, bx, by, 0, -Math.PI / 2);
      arc(-hw + bx, -hh + by, bx, by, -Math.PI / 2, -Math.PI);
      local = pts;
    } else if (shape === 'circle') {
      local = Array.from({ length: 20 }, (_, i) => [(w / 2) * Math.cos((i / 20) * 2 * Math.PI), (h / 2) * Math.sin((i / 20) * 2 * Math.PI)]);
    } else local = [[-w / 2, h / 2], [w / 2, h / 2], [w / 2, -h / 2], [-w / 2, -h / 2]];
    const map = orient === 'x' ? ([u, v]) => [x + u, y, z + v] : orient === 'y' ? ([u, v]) => [x, y + v, z + u] : ([u, v]) => [x + u, y + v, z];
    return { cls, pts: local.map(map), w, h, x, y, z, orient };
  }

  function render(instant) {
    const m = metrics(seat);
    const aimY = m.cy - Math.min(Math.max(SCREEN_H * 0.3, 0.9), 1.9);
    const dx = -m.x, dy = -(aimY - m.y), dz = -m.z;
    const yaw = Math.atan2(dx, -dz);
    const dz2 = -dx * Math.sin(yaw) + dz * Math.cos(yaw);
    const pitch = Math.atan2(-dy, -dz2);

    const H = Math.max(SCREEN_BOTTOM + SCREEN_H + 2.4, 7.5);
    const end = Math.max(0.6, m.z - 1.2);
    const env = [];
    env.push(panel('frontwall', HALL + 2, H + 1, 0, H / 2, -0.15));
    const side = (HALL - SCREEN_W) / 2 - 0.3;
    for (const sg of [-1, 1]) {
      // drapes as vertical folds
      const x0 = sg * (SCREEN_W / 2 + 0.3), n = Math.max(2, Math.round(side / 0.4));
      for (let i = 0; i < n; i++) { const pw = side / n; env.push(panel(i % 3 === 1 ? 'drape2' : i % 3 === 2 ? 'drape3' : 'drape', pw + 0.01, H, x0 + sg * (pw * i + pw / 2), H / 2, -0.1)); }
    }
    env.push(panel('ceiling', HALL, end, 0, H, end / 2, 'x'));
    const ff = Math.min(FIRST_ROW - ROW_PITCH / 2, m.z - 0.8);
    if (ff > 0.2) env.push(panel('floor', HALL, ff, 0, 0, ff / 2, 'x'));
    for (const sg of [-1, 1]) {
      env.push(panel('wall', end, H, (sg * HALL) / 2, H / 2, end / 2, 'y'));
      for (let z = 3; z < end - 0.5; z += 4.5) env.push(panel('glow', 1.6, 1.6, (sg * HALL) / 2 - sg * 0.02, 3.1, z, 'y', 'circle'));
    }
    env.push(panel('screen', SCREEN_W, SCREEN_H, 0, m.cy, 0));

    const rows = [];
    for (let r = 0; r < seat.row; r++) {
      const zr = rowZ(r), fl = rowFloor(r);
      if (m.z - zr < 0.6) continue;
      const t0 = zr - ROW_PITCH / 2, t1 = Math.min(zr + ROW_PITCH / 2, m.z - 0.5);
      if (r > 0) rows.push(panel('riser', HALL, RISER, 0, fl - RISER / 2, t0));
      rows.push(panel('tread', HALL, t1 - t0, 0, fl, (t0 + t1) / 2, 'x'));
      // centre seats last so they overlap the outer ones naturally
      const cols = Array.from({ length: COLS }, (_, i) => i + 1).sort((a, b) => Math.abs(seatX(b) - m.x) - Math.abs(seatX(a) - m.x));
      for (const c of cols) rows.push(panel('seatback', SEAT_W * 0.82, 0.7, seatX(c), fl + 0.63, zr + 0.32, '', 'seat'));
    }
    scene = { env, rows, cy: m.cy };
    moveCamera({ x: m.x, y: m.y, z: m.z, yaw, pitch }, instant);
    renderPanel(m);
  }

  // ---------- Camera ----------
  let camNow = null, camAnim = 0;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NEAR = 8; // px in front of the eye; geometry closer than this is clipped

  function viewer(c, W) {
    const P = W / 2 / Math.tan((FOV * RAD) / 2);
    const cyw = Math.cos(c.yaw), syw = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    // camera space: same order CSS used (translate, rotateY, rotateX); depth z < 0 is in front of the eye
    const toCam = ([X, Y, Z]) => {
      let x = (X - c.x) * PX, y = (c.y - Y) * PX, z = (Z - c.z) * PX;
      [x, z] = [x * cyw + z * syw, -x * syw + z * cyw];
      [y, z] = [y * cp - z * sp, y * sp + z * cp];
      return [x, y, z];
    };
    return { P, toCam };
  }
  function clipNear(poly) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const ia = a[2] <= -NEAR, ib = b[2] <= -NEAR;
      if (ia) out.push(a);
      if (ia !== ib) { const t = (-NEAR - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, -NEAR]); }
    }
    return out;
  }

  const FILL = { frontwall: '#0d0d10', drape: '#121214', drape2: '#1a1a1e', drape3: '#0e0e10', wall: '#0e0e11', ceiling: '#050506', floor: '#08080a', tread: '#0d0d10', riser: '#060607', screen: '#000' };
  function drawLayer(canvas, list, c, W, H) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const { P, toCam } = viewer(c, W);
    const project = ([x, y, z]) => { const f = P / -z; return [W / 2 + x * f, H / 2 + y * f]; };
    const projPt = (p) => { const q = toCam(p); return q[2] <= -NEAR ? project(q) : null; };
    for (const it of list) {
      const poly = clipNear(it.pts.map(toCam));
      if (poly.length < 3) continue;
      const pts = poly.map(project);
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      ctx.save();
      if (it.cls === 'seatback') {
        const a = projPt([it.x, it.y + it.h / 2, it.z]), b = projPt([it.x, it.y - it.h / 2, it.z]);
        if (a && b) {
          const g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
          g.addColorStop(0, '#2b2b31'); g.addColorStop(0.3, '#212126'); g.addColorStop(0.75, '#17171b'); g.addColorStop(1, '#101012');
          ctx.fillStyle = g;
        } else ctx.fillStyle = '#1a1a1e';
        ctx.fill();
      } else if (it.cls === 'glow') {
        const ctr = projPt([it.x, it.y, it.z]);
        if (ctr) {
          const r = Math.max(...pts.map(([x, y]) => Math.hypot(x - ctr[0], y - ctr[1])));
          const g = ctx.createRadialGradient(ctr[0], ctr[1], 0, ctr[0], ctr[1], r);
          g.addColorStop(0, 'rgba(255,214,170,.42)'); g.addColorStop(0.62, 'rgba(255,200,150,.06)'); g.addColorStop(1, 'rgba(255,200,150,0)');
          ctx.fillStyle = g; ctx.fill();
        }
      } else if (it.cls === 'frontwall') {
        const ctr = projPt([0, scene.cy, -0.15]);
        const xs = pts.map((p) => p[0]);
        if (ctr) {
          const g = ctx.createRadialGradient(ctr[0], ctr[1], 0, ctr[0], ctr[1], (Math.max(...xs) - Math.min(...xs)) * 0.55);
          g.addColorStop(0, '#18181c'); g.addColorStop(1, '#0a0a0c'); ctx.fillStyle = g;
        } else ctx.fillStyle = FILL.frontwall;
        ctx.fill();
      } else if (it.cls === 'screen') {
        ctx.shadowColor = 'rgba(170,180,255,.22)'; ctx.shadowBlur = Math.min(120, W * 0.12);
        ctx.fillStyle = '#000'; ctx.fill();
        ctx.shadowBlur = 0; ctx.lineWidth = Math.max(2, W / 120); ctx.strokeStyle = '#020203'; ctx.stroke();
      } else {
        ctx.fillStyle = FILL[it.cls] || '#0a0a0c'; ctx.fill();
        if (it.cls === 'riser') {
          const a = projPt([-it.w / 2, it.y + it.h / 2, it.z]), b = projPt([it.w / 2, it.y + it.h / 2, it.z]);
          if (a && b) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,214,170,.14)'; ctx.stroke(); }
        }
      }
      ctx.restore();
    }
    return { toCam, project };
  }

  function applyCamera(c) {
    const W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return;
    drawLayer(backC, scene.env, c, W, H);
    const { toCam, project } = drawLayer(frontC, scene.rows, c, W, H);
    // Place the flat trailer layer exactly over the projected screen
    const hw = SCREEN_W / 2, top = scene.cy + SCREEN_H / 2, bot = scene.cy - SCREEN_H / 2;
    const q = [[-hw, top, 0], [hw, top, 0], [hw, bot, 0], [-hw, bot, 0]].map((p) => project(toCam(p)));
    const xs = q.map((v) => v[0]), ys = q.map((v) => v[1]);
    const l = Math.min(...xs), t0 = Math.min(...ys), w = Math.max(...xs) - l, h = Math.max(...ys) - t0;
    Object.assign(flat.style, { left: l + 'px', top: t0 + 'px', width: w + 'px', height: h + 'px' });
    flat.style.clipPath = flat.style.webkitClipPath = `polygon(${q.map(([x, y]) => `${(x - l).toFixed(1)}px ${(y - t0).toFixed(1)}px`).join(',')})`;
    sizeVideos();
  }
  function moveCamera(target, instant) {
    cancelAnimationFrame(camAnim);
    if (instant || reduceMotion || !camNow) { camNow = target; applyCamera(camNow); return; }
    const from = { ...camNow }, t0 = performance.now(), D = 1000;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
      camNow = {};
      for (const key in target) camNow[key] = from[key] + (target[key] - from[key]) * e;
      applyCamera(camNow);
      if (k < 1) camAnim = requestAnimationFrame(step);
    };
    camAnim = requestAnimationFrame(step);
  }

  // ---------- Panel ----------
  const map = document.querySelector('.seatmap'), stats = document.querySelector('.stats');

  const screenBar = document.createElement('div'); screenBar.className = 'map-screen'; screenBar.innerHTML = '<span>Screen</span>';
  map.appendChild(screenBar);
  const seatBtns = [];
  ROWS.forEach((r, ri) => {
    const line = document.createElement('div'); line.className = 'map-row'; line.setAttribute('role', 'row');
    line.innerHTML = `<span class="rl" aria-hidden="true">${r}</span>`;
    for (let c = 1; c <= COLS; c++) {
      if (c === AISLE_AFTER + 1) { const g = document.createElement('span'); g.className = 'aisle'; line.appendChild(g); }
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'st'; b.setAttribute('role', 'gridcell'); b.tabIndex = -1;
      const id = `${r}${c}`; const isBooked = booked.has(id);
      if (isBooked) { b.classList.add('booked'); b.setAttribute('aria-disabled', 'true'); }
      b.setAttribute('aria-label', `Row ${r}, seat ${c}${isBooked ? ', booked' : ''}`);
      b.dataset.row = ri; b.dataset.col = c;
      b.addEventListener('click', () => { if (!isBooked) setSeat(ri, c, true); });
      line.appendChild(b); seatBtns.push(b);
    }
    map.appendChild(line);
  });
  map.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
    if (!k) return;
    e.preventDefault();
    let r = seat.row, c = seat.col;
    for (let i = 0; i < 16; i++) { // skip booked seats
      r = Math.max(0, Math.min(ROWS.length - 1, r + k[0])); c = Math.max(1, Math.min(COLS, c + k[1]));
      if (!booked.has(`${ROWS[r]}${c}`)) { setSeat(r, c, true); return; }
    }
  });

  function renderPanel(m) {
    seatBtns.forEach((b) => {
      const on = +b.dataset.row === seat.row && +b.dataset.col === seat.col;
      b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1;
    });
    const color = m.score >= 85 ? '#1F9D55' : m.score >= 70 ? '#6BAA1F' : m.score >= 50 ? '#C98A00' : '#D70201';
    const arc = document.querySelector('.ring .arc'), C = 2 * Math.PI * 20;
    arc.setAttribute('stroke', color); arc.setAttribute('stroke-dasharray', `${(m.score / 100) * C} ${C}`);
    document.querySelector('.ring .num').textContent = m.score;
    document.querySelector('.verdict').textContent = m.verdict;
    document.querySelector('.headline').textContent = m.headline;
    const cls = (ok, mid) => (ok ? 'good' : mid ? 'mid' : 'bad');
    stats.innerHTML = [
      ['Screen in view', `${Math.round(m.h)}°`, cls(m.h >= 33 && m.h <= 46, m.h >= 26 && m.h <= 56)],
      ['Distance', `${m.dist.toFixed(1)} m`, ''],
      ['Neck angle', `${Math.abs(Math.round(m.v))}°`, cls(Math.abs(m.v) <= 8, Math.abs(m.v) <= 15)],
      ['Off-centre', `${Math.round(m.off)}°`, cls(m.off <= 12, m.off <= 22)]
    ].map(([k, v, c]) => `<div><dt>${k}</dt><dd class="${c}">${v}</dd></div>`).join('');
    stage.querySelector('.seat-pill').textContent = `Row ${ROWS[seat.row]}, Seat ${seat.col} · ${m.dist.toFixed(1)} m`;
  }

  function setSeat(r, c, focus) {
    seat = { row: r, col: c };
    render(false);
    if (focus) { const b = seatBtns.find((x) => +x.dataset.row === r && +x.dataset.col === c); b && b.focus({ preventScroll: true }); }
  }

  // ---------- YouTube players ----------
  // A clean projector look: YouTube's controls are off, the iframe takes no clicks, the edges where YouTube draws its
  // title bar and logo are cropped, and a black cover hides the player until the trailer is actually playing
  // (so buttons, the title bar and "more videos" thumbnails never show). When a trailer ends, another one starts.
  const players = {};
  let muted = true;
  const ORIGIN = location.origin;
  const CROP = 1.2;            // extra zoom so YouTube's top title bar and bottom-right logo fall outside the screen
  function src(id) {
    const p = new URLSearchParams({ autoplay: '1', mute: '1', controls: '0', rel: '0', playsinline: '1', fs: '0',
      modestbranding: '1', iv_load_policy: '3', disablekb: '1', cc_load_policy: '0', enablejsapi: '1', origin: ORIGIN });
    return `https://www.youtube-nocookie.com/embed/${id}?${p}`;
  }
  function labelFor(key, mv) {
    if (key === 'hero') stage.querySelector('.movie-pill').textContent = mv.label;
    else document.querySelectorAll('.format-now').forEach((p) => { p.textContent = `Now showing: ${mv.label}`; });
  }
  function load(key, mv) {
    const pl = players[key];
    pl.movie = mv; pl.state = -1; pl.everPlayed = false;
    pl.box.classList.remove('live'); clearTimeout(pl.reveal);
    pl.f.title = `${mv.label} (muted autoplay)`;
    pl.f.src = src(mv.video);
    labelFor(key, mv);
  }
  function mount(key) {
    const box = document.querySelector(`.vid[data-video="${key}"]`);
    if (!box || players[key]) return;
    const f = document.createElement('iframe');
    f.allow = 'autoplay; encrypted-media';
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.setAttribute('tabindex', '-1');
    f.setAttribute('aria-hidden', 'true');
    const cover = document.createElement('div'); cover.className = 'vid-cover';
    box.append(f, cover);
    players[key] = { key, f, box, visible: true };
    f.addEventListener('load', () => {
      // Ask the player to report its state; it keeps sending updates after this
      let n = 0; const t = setInterval(() => { post(f, 'listening'); if (++n > 8 || players[key].state !== -1) clearInterval(t); }, 250);
      if (key === 'hero' && !muted) cmd(f, 'unMute');
    });
    load(key, assigned[key]);
    sizeVideos();
  }
  const post = (f, event) => { try { f.contentWindow.postMessage(JSON.stringify({ event, id: 'cv' }), '*'); } catch (_) {} };
  const cmd = (f, func, args = []) => { try { f.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*'); } catch (_) {} };

  // YouTube player states: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
  function onState(pl, st) {
    if (st === pl.state) return;
    pl.state = st;
    clearTimeout(pl.reveal);
    if (st === 1) {
      // The title bar fades out a few seconds after a trailer first starts; reveal after that, quickly on resume
      pl.reveal = setTimeout(() => pl.box.classList.add('live'), pl.everPlayed ? 350 : 2600);
      pl.everPlayed = true;
    } else {
      pl.box.classList.remove('live');
      if (st === 0) {
        const other = Object.values(players).filter((o) => o !== pl).map((o) => o.movie && o.movie.video);
        load(pl.key, pickTrailer([pl.movie.video, ...other]));
      } else if ((st === 2 || st === 5) && pl.visible) cmd(pl.f, 'playVideo');   // never sit paused on screen
    }
  }
  window.addEventListener('message', (e) => {
    let host = ''; try { host = new URL(e.origin).hostname; } catch (_) { return; }
    if (!/youtube(-nocookie)?\.com$/.test(host)) return;
    const pl = Object.values(players).find((p) => p.f.contentWindow === e.source);
    if (!pl) return;
    let d; try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch (_) { return; }
    if (!d) return;
    if (d.event === 'onStateChange' && typeof d.info === 'number') onState(pl, d.info);
    else if (d.event === 'infoDelivery' && d.info && typeof d.info.playerState === 'number') onState(pl, d.info.playerState);
  });

  // If the browser blocked autoplay (low-power mode, strict settings), start on the visitor's first interaction
  const kick = () => Object.values(players).forEach((pl) => { if (pl.visible && pl.state !== 1) cmd(pl.f, 'playVideo'); });
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, kick, { passive: true }));

  // Fill each screen like a projector: the 16:9 video covers the screen, plus a little extra zoom to crop YouTube's overlays
  function sizeVideos() {
    Object.values(players).forEach(({ f, box }) => {
      const w = box.clientWidth, h = box.clientHeight;
      if (!w || !h) return;
      const r = 16 / 9;
      let vw, vh;
      if (w / h > r) { vw = w; vh = w / r; } else { vh = h; vw = h * r; }
      f.style.width = vw * CROP + 'px'; f.style.height = vh * CROP + 'px';
    });
  }

  const soundBtn = stage.querySelector('.sound');
  soundBtn.addEventListener('click', () => {
    muted = !muted;
    const p = players.hero && players.hero.f;
    if (p) { if (muted) cmd(p, 'mute'); else { cmd(p, 'unMute'); cmd(p, 'setVolume', [80]); } }
    soundBtn.textContent = muted ? 'Sound off' : 'Sound on';
    soundBtn.setAttribute('aria-pressed', String(!muted));
  });

  // Play only while visible (saves battery and bandwidth); the formats trailer loads when you scroll to it
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const key = e.target.dataset.video;
      if (e.isIntersecting) { if (!players[key]) mount(key); else { players[key].visible = true; cmd(players[key].f, 'playVideo'); } }
      else if (players[key]) { players[key].visible = false; cmd(players[key].f, 'pauseVideo'); }
    });
  }, { rootMargin: '200px 0px' });
  document.querySelectorAll('.vid[data-video]').forEach((v) => io.observe(v));

  // Keep the formats trailer sized while the screen animates between ratios
  const fs = document.querySelector('.format-screen');
  if (fs) { new ResizeObserver(sizeVideos).observe(fs); fs.addEventListener('transitionend', sizeVideos); }
  // Give the stage an explicit height on stacked layouts (iOS Safari can collapse it to zero otherwise)
  function sizeStage() {
    const vw = window.innerWidth;
    if (vw <= 980) stage.style.height = Math.round(stage.clientWidth * (vw <= 760 ? 0.82 : 0.56)) + 'px';
    else stage.style.height = '';
  }
  sizeStage();
  window.addEventListener('resize', sizeStage);
  let lastW = 0;
  new ResizeObserver(() => { const w = stage.clientWidth; if (Math.abs(w - lastW) > 1) { lastW = w; sizeStage(); render(true); } }).observe(stage);

  labelFor('hero', assigned.hero);
  labelFor('formats', assigned.formats);
  if (!players.hero) mount('hero');
  render(true);
})();
