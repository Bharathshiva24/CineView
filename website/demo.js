// CineView website: live seat demo (hero) + trailer in the screen-format section
(() => {
  // Official trailers, played through YouTube's embedded player from the studios' own channels
  const MOVIES = [
    { id: 'f1', title: 'F1 The Movie', sub: 'Warner Bros.', video: '8yh9BPUBbbQ', label: 'F1 The Movie · Main trailer' },
    { id: 'spidey', title: 'Spider-Man', sub: 'Sony Pictures', video: 'P3uI5sLosKU', label: 'Spider-Man: Brand New Day · Final trailer' }
  ];
  let movie = MOVIES[0];

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

  // ---------- 3D stage ----------
  const stage = document.querySelector('.demo-stage');
  if (!stage) return;
  const cam = stage.querySelector('.cam'), env = stage.querySelector('.env'), rowsG = stage.querySelector('.rows'), scr = stage.querySelector('.screen');
  const el = (cls) => { const d = document.createElement('div'); d.className = 'p ' + cls; return d; };
  function place(node, w, h, x, y, z, extra = '') {
    node.style.width = w * PX + 'px'; node.style.height = h * PX + 'px';
    node.style.marginLeft = (-w * PX) / 2 + 'px'; node.style.marginTop = (-h * PX) / 2 + 'px';
    node.style.transform = `translate3d(${x * PX}px, ${-y * PX}px, ${z * PX}px) ${extra}`;
    return node;
  }
  const add = (parent, cls, ...a) => parent.appendChild(place(el(cls), ...a));

  function render(instant) {
    const m = metrics(seat);
    const W = stage.clientWidth || 800;
    const P = W / 2 / Math.tan((FOV * RAD) / 2);
    const aimY = m.cy - Math.min(Math.max(SCREEN_H * 0.3, 0.9), 1.9);
    const dx = -m.x, dy = -(aimY - m.y), dz = -m.z;
    const yaw = Math.atan2(dx, -dz);
    const dz2 = -dx * Math.sin(yaw) + dz * Math.cos(yaw);
    const pitch = Math.atan2(-dy, -dz2);
    stage.style.perspective = P + 'px';
    cam.classList.toggle('instant', !!instant);
    cam.style.transform = `translateZ(${P}px) rotateX(${pitch}rad) rotateY(${yaw}rad) translate3d(${-m.x * PX}px, ${m.y * PX}px, ${-m.z * PX}px)`;

    place(scr, SCREEN_W, SCREEN_H, 0, m.cy, 0);
    const H = Math.max(SCREEN_BOTTOM + SCREEN_H + 2.4, 7.5);
    const end = Math.max(0.6, m.z - 1.2);
    env.textContent = '';
    add(env, 'frontwall', HALL + 2, H + 1, 0, H / 2, -0.15);
    const side = (HALL - SCREEN_W) / 2 - 0.3;
    for (const sg of [-1, 1]) {
      add(env, 'drape', side, H, sg * (SCREEN_W / 2 + 0.3 + side / 2), H / 2, -0.1);
      add(env, 'wall', end, H, (sg * HALL) / 2, H / 2, end / 2, `rotateY(${sg * -90}deg)`);
      for (let z = 3; z < end - 0.5; z += 4.5) add(env, 'glow', 1.6, 1.6, (sg * HALL) / 2 - sg * 0.02, 3.1, z, `rotateY(${sg * -90}deg)`);
    }
    add(env, 'ceiling', HALL, end, 0, H, end / 2, 'rotateX(90deg)');
    const ff = Math.min(FIRST_ROW - ROW_PITCH / 2, m.z - 0.8);
    if (ff > 0.2) add(env, 'floor', HALL, ff, 0, 0, ff / 2, 'rotateX(90deg)');

    rowsG.textContent = '';
    for (let r = 0; r < seat.row; r++) {
      const zr = rowZ(r), fl = rowFloor(r);
      if (m.z - zr < 0.6) continue;
      const t0 = zr - ROW_PITCH / 2, t1 = Math.min(zr + ROW_PITCH / 2, m.z - 0.5);
      add(rowsG, 'tread', HALL, t1 - t0, 0, fl, (t0 + t1) / 2, 'rotateX(90deg)');
      if (r > 0) add(rowsG, 'riser', HALL, RISER, 0, fl - RISER / 2, t0);
      for (let c = 1; c <= COLS; c++) add(rowsG, 'seatback', SEAT_W * 0.82, 0.7, seatX(c), fl + 0.63, zr + 0.32);
    }
    sizeVideos();
    renderPanel(m);
  }

  // ---------- Panel ----------
  const seg = document.querySelector('.movie-seg'), map = document.querySelector('.seatmap'), stats = document.querySelector('.stats');
  MOVIES.forEach((mv) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.id = mv.id;
    b.innerHTML = `<b>${mv.title}</b><span>${mv.sub}</span>`;
    b.addEventListener('click', () => setMovie(mv));
    seg.appendChild(b);
  });

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
  const players = {};
  let muted = true;
  const ORIGIN = location.origin;
  function src(id) {
    const p = new URLSearchParams({ autoplay: '1', mute: '1', controls: '0', rel: '0', playsinline: '1', loop: '1', playlist: id,
      modestbranding: '1', iv_load_policy: '3', disablekb: '1', enablejsapi: '1', origin: ORIGIN });
    return `https://www.youtube-nocookie.com/embed/${id}?${p}`;
  }
  function mount(key) {
    const box = document.querySelector(`.vid[data-video="${key}"]`);
    if (!box) return;
    if (!players[key]) {
      const f = document.createElement('iframe');
      f.title = `${movie.label} (muted autoplay)`;
      f.allow = 'autoplay; encrypted-media; picture-in-picture';
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      f.setAttribute('tabindex', '-1');
      f.src = src(movie.video);
      f.addEventListener('load', () => { post(f, 'listening'); if (key === 'hero' && !muted) cmd(f, 'unMute'); });
      box.appendChild(f);
      players[key] = { f, video: movie.video, box };
    } else if (players[key].video !== movie.video) {
      players[key].f.src = src(movie.video); players[key].video = movie.video; players[key].f.title = `${movie.label} (muted autoplay)`;
    }
    sizeVideos();
  }
  const post = (f, event) => { try { f.contentWindow.postMessage(JSON.stringify({ event, id: 'cv' }), '*'); } catch (_) {} };
  const cmd = (f, func, args = []) => { try { f.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*'); } catch (_) {} };

  // Fill each screen like a projector: 16:9 video covers the screen (scope trailers' black bars fall outside a 2.39 screen)
  function sizeVideos() {
    Object.values(players).forEach(({ f, box }) => {
      const w = box.clientWidth, h = box.clientHeight;
      if (!w || !h) return;
      const r = 16 / 9;
      let vw, vh;
      if (w / h > r) { vw = w; vh = w / r; } else { vh = h; vw = h * r; }
      f.style.width = vw + 'px'; f.style.height = vh + 'px';
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

  function setMovie(mv) {
    movie = mv;
    seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === mv.id)));
    stage.querySelector('.movie-pill').textContent = mv.label;
    document.querySelectorAll('.format-now').forEach((p) => { p.textContent = `Now showing: ${mv.label}`; });
    Object.keys(players).forEach(mount);
    if (!players.hero) mount('hero');
  }

  // Play only while visible (saves battery and bandwidth); the formats trailer loads when you scroll to it
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const key = e.target.dataset.video;
      if (e.isIntersecting) { if (!players[key]) mount(key); else cmd(players[key].f, 'playVideo'); }
      else if (players[key]) cmd(players[key].f, 'pauseVideo');
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

  setMovie(movie);
  render(true);
})();
