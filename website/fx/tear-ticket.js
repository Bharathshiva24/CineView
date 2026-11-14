/*
 * Tear ticket: drag the stub to tear it off along the perforation.
 * Ported to plain JavaScript (no React, no Motion) for the CineView website.
 * Original: React Bits "Tear Ticket" by David Haz, https://reactbits.dev — MIT + Commons Clause License Condition v1.0.
 * Copyright (c) 2026 David Haz. See /fx/LICENSE-react-bits.txt.
 */
(function () {
const TILT_SPRING = { stiffness: 220, damping: 24, mass: 0.6 };
const GRAVITY = 2400;
const ART_INSET = 8;
const ART_SPAN = 0.78;
const RETRACT = 0.17;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rad = deg => (deg * Math.PI) / 180;
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const noise = seed => {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const f = n => n.toFixed(2);

const buildGeometry = (W, H, S, R, holes, hole, notch, rough, vertical) => {
  const main = vertical ? H : W;
  const cross = vertical ? W : H;
  const x = main - S;
  const hr = hole / 2;
  const n = Math.max(1, Math.round(holes));
  const span = cross - 2 * notch;
  const bridge = Math.max(2, (span - n * hole) / (n + 1));
  const random = noise(n * 7919 + Math.round(cross));
  const at = (u, v) => (vertical ? { x: v, y: u } : { x: u, y: v });
  const pt = (u, v) => (vertical ? `${f(v)},${f(u)}` : `${f(u)},${f(v)}`);
  const arc = (r, sweep, u, v) => `A${f(r)},${f(r)} 0 0 ${vertical ? 1 - sweep : sweep} ${pt(u, v)}`;
  const bridges = [];
  for (let i = 0; i <= n; i += 1) {
    const y0 = notch + i * (bridge + hole);
    const y1 = y0 + bridge;
    const steps = Math.max(2, Math.round(bridge / 2.2));
    const pts = [];
    for (let k = 1; k < steps; k += 1) pts.push([x + (random() - 0.5) * 2 * rough, y0 + (bridge * k) / steps]);
    bridges.push({ y0, y1, mid: (y0 + y1) / 2, pts, ...at(x, (y0 + y1) / 2) });
  }
  let body = `M${pt(R, 0)}L${pt(x - notch, 0)}${arc(notch, 0, x, notch)}`;
  bridges.forEach((b, i) => {
    b.pts.forEach(p => {
      body += `L${pt(p[0], p[1])}`;
    });
    body += `L${pt(x, b.y1)}`;
    if (i < n) body += arc(hr, 0, x, b.y1 + hole);
  });
  body += `${arc(notch, 0, x - notch, cross)}L${pt(R, cross)}${arc(R, 1, 0, cross - R)}L${pt(0, R)}${arc(R, 1, R, 0)}Z`;
  let stub = `M${pt(x + notch, 0)}L${pt(main - R, 0)}${arc(R, 1, main, R)}L${pt(main, cross - R)}${arc(R, 1, main - R, cross)}L${pt(x + notch, cross)}${arc(notch, 0, x, cross - notch)}`;
  for (let i = n; i >= 0; i -= 1) {
    const b = bridges[i];
    for (let k = b.pts.length - 1; k >= 0; k -= 1) stub += `L${pt(b.pts[k][0], b.pts[k][1])}`;
    stub += `L${pt(x, b.y0)}`;
    if (i > 0) stub += arc(hr, 0, x, b.y0 - hole);
  }
  stub += `${arc(notch, 0, x + notch, 0)}Z`;
  const ends = [
    { ...at(x, notch), v: notch },
    { ...at(x, cross - notch), v: cross - notch }
  ];
  const bodyOutline = `M${pt(x, cross - notch)}${arc(notch, 0, x - notch, cross)}L${pt(R, cross)}${arc(R, 1, 0, cross - R)}L${pt(0, R)}${arc(R, 1, R, 0)}L${pt(x - notch, 0)}${arc(notch, 0, x, notch)}`;
  const stubOutline = `M${pt(x, notch)}${arc(notch, 0, x + notch, 0)}L${pt(main - R, 0)}${arc(R, 1, main, R)}L${pt(main, cross - R)}${arc(R, 1, main - R, cross)}L${pt(x + notch, cross)}${arc(notch, 0, x, cross - notch)}`;
  return { vertical, cross, body, stub, bridges, ends, bodyOutline, stubOutline };
};
function mountTearTicket(host, opts = {}) {
  const {
    bodyHTML = '', stubHTML = '', image = '', imageAlt = '', scrim = true, imageRadius = 8,
    width = 460, height = 250, stubSize = 150, radius = 16, holes = 12, holeSize = 6, notch = 3, roughness = 0,
    tearAngle = 30, stretch = 30, resistance = 0.45, rotate = 4, tilt = true, tiltMax = 9, tiltReach = 260,
    parallax = 6, perspective = 1000, background = '#27272a', color = '#f5f5f5', border = true, borderColor = '',
    borderWidth = 1, stubBackground = '', recenter = true, ariaLabel = 'Tear off the stub', onTear = null
  } = opts;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const vertical = false;
  const geo = buildGeometry(width, height, stubSize, radius, holes, holeSize, notch, roughness, vertical);
  let used = false, fit = 1;
  const NS = 'http://www.w3.org/2000/svg';

  const root = document.createElement('div');
  root.className = 'tear-ticket';
  root.dataset.orientation = 'horizontal';
  const vars = {
    '--tt-w': `${width}px`, '--tt-h': `${height}px`, '--tt-stub': `${stubSize}px`, '--tt-bg': background,
    '--tt-stub-bg': stubBackground || background, '--tt-ink': color,
    '--tt-edge': borderColor || `color-mix(in srgb, ${color} 16%, transparent)`, '--tt-edge-w': borderWidth,
    '--tt-parallax': `${parallax}px`, '--tt-body-w': `${width - stubSize}px`, '--tt-body-h': `${height}px`,
    '--tt-inset': `${ART_INSET}px`, '--tt-span': ART_SPAN, '--tt-art-radius': `${imageRadius}px`
  };
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  const edge = (d) => border ? `<svg class="tear-ticket__edge" viewBox="0 0 ${width} ${height}" aria-hidden="true"><path d="${d}"/></svg>` : '';
  root.innerHTML = `
    <div class="tear-ticket__stage">
      <div class="tear-ticket__plane">
        <div class="tear-ticket__piece tear-ticket__piece--body">
          ${edge(geo.bodyOutline)}
          <div class="tear-ticket__paper" style="clip-path: path('${geo.body}')">
            ${image ? `<div class="tear-ticket__art"><img class="tear-ticket__image" src="${image}" alt="${imageAlt}" draggable="false">${scrim ? '<div class="tear-ticket__scrim"></div>' : ''}</div>` : ''}
            <div class="tear-ticket__content">${bodyHTML}</div>
          </div>
        </div>
        <svg class="tear-ticket__fibres" aria-hidden="true">${geo.bridges.map(() => '<g><path/><path/></g>').join('')}</svg>
        <div class="tear-ticket__piece tear-ticket__piece--stub" role="button" tabindex="0" aria-label="${ariaLabel}">
          ${edge(geo.stubOutline)}
          <div class="tear-ticket__paper tear-ticket__paper--stub" style="clip-path: path('${geo.stub}')">
            <div class="tear-ticket__stub">${stubHTML}</div>
          </div>
        </div>
      </div>
    </div>
    <span class="tear-ticket__sr" role="status"></span>`;
  host.appendChild(root);
  const stage = root.querySelector('.tear-ticket__stage');
  const planeEl = root.querySelector('.tear-ticket__plane');
  const bodyEl = root.querySelector('.tear-ticket__piece--body');
  const stubEl = root.querySelector('.tear-ticket__piece--stub');
  const artEl = root.querySelector('.tear-ticket__image');
  const inkEl = root.querySelector('.tear-ticket__content');
  const status = root.querySelector('.tear-ticket__sr');
  const fibres = [...root.querySelectorAll('.tear-ticket__fibres path')];
  stubEl.addEventListener('dragstart', (e) => e.preventDefault());

  const measure = () => {
    fit = Math.min(1, root.clientWidth / width) || 1;
    root.style.setProperty('--tt-fit', fit);
    root.style.height = `${height * fit}px`;
  };
  new ResizeObserver(measure).observe(root); measure();

  // Tilt: a small spring like motion's useSpring(stiffness 220, damping 24, mass .6)
  const tiltS = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, raf: 0, last: 0 };
  const depth = tiltMax > 0 ? parallax / tiltMax : 0;
  const applyTilt = () => {
    planeEl.style.transform = `perspective(${perspective}px) rotate(${rotate}deg) rotateX(${tiltS.x.toFixed(3)}deg) rotateY(${tiltS.y.toFixed(3)}deg)`;
    if (!reduce) {
      if (artEl) artEl.style.transform = `translate(${(-tiltS.y * depth).toFixed(2)}px, ${(tiltS.x * depth).toFixed(2)}px)`;
      inkEl.style.transform = `translate(${(tiltS.y * depth * 0.22).toFixed(2)}px, ${(-tiltS.x * depth * 0.22).toFixed(2)}px)`;
    }
  };
  const tiltStep = (now) => {
    const dt = Math.min(0.034, (now - tiltS.last) / 1000 || 0.016); tiltS.last = now;
    const { stiffness: k, damping: c, mass: m } = TILT_SPRING;
    tiltS.vx += ((-k * (tiltS.x - tiltS.tx) - c * tiltS.vx) / m) * dt; tiltS.x += tiltS.vx * dt;
    tiltS.vy += ((-k * (tiltS.y - tiltS.ty) - c * tiltS.vy) / m) * dt; tiltS.y += tiltS.vy * dt;
    applyTilt();
    const moving = Math.abs(tiltS.x - tiltS.tx) > 0.01 || Math.abs(tiltS.y - tiltS.ty) > 0.01 || Math.abs(tiltS.vx) > 0.01 || Math.abs(tiltS.vy) > 0.01;
    tiltS.raf = moving ? requestAnimationFrame(tiltStep) : 0;
  };
  const setTilt = (x, y, now) => { tiltS.tx = x; tiltS.ty = y; if (!tiltS.raf) { tiltS.last = performance.now(); tiltS.raf = requestAnimationFrame(tiltStep); } };
  const jumpTilt = () => { tiltS.x = tiltS.y = tiltS.tx = tiltS.ty = tiltS.vx = tiltS.vy = 0; applyTilt(); };
  applyTilt();

  const s = { raf: 0, last: 0, phase: 'idle', id: null, sign: 1, hinge: { x: 0, y: 0 }, hingeV: 0, grab: { x: 0, y: 0 },
    start: { x: 0, y: 0 }, point: { x: 0, y: 0 }, a0: 0, theta: 0, thetaV: 0, sx: 0, sy: 0, vx: 0, vy: 0, spin: 0,
    pvx: 0, pvy: 0, pt: 0, fade: 1, age: 0, bx: 0, bv: 0, snapped: [], snapAt: [], span: [] };
  const c = { geo, tearAngle, stretch, resistance, reduce };

  const paint = (now) => {
    stubEl.style.transform = `translate(${s.sx.toFixed(2)}px, ${s.sy.toFixed(2)}px) rotate(${((s.theta * s.sign * 180) / Math.PI).toFixed(3)}deg)`;
    stubEl.style.opacity = s.fade.toFixed(3);
    bodyEl.style.transform = `translateX(${s.bx.toFixed(2)}px)`;
    const cos = Math.cos(s.theta * s.sign), sin = Math.sin(s.theta * s.sign);
    const lx = 0, ly = 1.6;
    let busy = false;
    c.geo.bridges.forEach((b, i) => {
      const dx = b.x - s.hinge.x, dy = b.y - s.hinge.y;
      const tx = s.hinge.x + dx * cos - dy * sin + s.sx, ty = s.hinge.y + dx * sin + dy * cos + s.sy;
      const ox = b.x + s.bx, oy = b.y;
      const gx = tx - ox, gy = ty - oy, gap = Math.hypot(gx, gy);
      const near = fibres[i * 2], far = fibres[i * 2 + 1];
      if (!near || !far) return;
      const live = s.phase !== 'idle' && !c.reduce;
      if (!s.snapped[i]) {
        if (!live || gap < 0.35) { near.style.opacity = '0'; far.style.opacity = '0'; return; }
        const k = clamp(gap / c.stretch, 0, 1), sag = gap * 0.18, w = (1.7 - 1.15 * k).toFixed(2);
        const qx = gx / 2, qy = sag + gy / 2;
        near.setAttribute('d', `M${f(ox - lx)},${f(oy - ly)}Q${f(ox - lx + qx)},${f(oy - ly + qy)} ${f(tx - lx)},${f(ty - ly)}`);
        far.setAttribute('d', `M${f(ox + lx)},${f(oy + ly)}Q${f(ox + lx + gx - qx)},${f(oy + ly + gy - qy)} ${f(tx + lx)},${f(ty + ly)}`);
        near.style.strokeWidth = w; far.style.strokeWidth = w; near.style.opacity = '1'; far.style.opacity = '1';
        s.span[i] = gap; return;
      }
      const t = (now - s.snapAt[i]) / 1000 / RETRACT;
      if (!live || t >= 1 || !s.snapAt[i]) { near.style.opacity = '0'; far.style.opacity = '0'; return; }
      busy = true;
      const left = (1 - t) * (1 - t), len = (s.span[i] || c.stretch) * 0.5 * left;
      const ux = gap > 0.01 ? gx / gap : 1, uy = gap > 0.01 ? gy / gap : 0;
      near.setAttribute('d', `M${f(ox)},${f(oy)}L${f(ox + ux * len)},${f(oy + uy * len)}`);
      far.setAttribute('d', `M${f(tx)},${f(ty)}L${f(tx - ux * len)},${f(ty - uy * len)}`);
      near.style.strokeWidth = '0.9'; far.style.strokeWidth = '0.9';
      near.style.opacity = left.toFixed(2); far.style.opacity = left.toFixed(2);
    });
    return busy;
  };

  const setUsed = (v) => {
    used = v;
    if (v) { root.dataset.used = ''; if (recenter) root.dataset.shift = 'x'; stubEl.setAttribute('tabindex', '-1'); stubEl.setAttribute('aria-hidden', 'true'); status.textContent = 'Used'; }
    else { delete root.dataset.used; delete root.dataset.shift; stubEl.setAttribute('tabindex', '0'); stubEl.removeAttribute('aria-hidden'); status.textContent = ''; }
  };
  const finish = () => { stubEl.style.visibility = 'hidden'; setUsed(true); onTear?.(); };

  const step = (now) => {
    const dt = clamp((now - s.last) / 1000, 0.001, 0.034); s.last = now;
    const limit = rad(c.tearAngle);
    if (s.phase === 'held') {
      const count = c.geo.bridges.length; let intact = 0;
      for (let i = 0; i < count; i++) if (!s.snapped[i]) intact++;
      const hold = count ? intact / count : 0;
      const follow = 0.92 * (1 - clamp(c.resistance, 0, 0.95) * hold);
      const a = Math.atan2(s.point.y - s.hinge.y, s.point.x - s.hinge.x);
      const want = clamp(wrap(a - s.a0) * s.sign * follow, 0, limit + 0.1);
      s.theta += (want - s.theta) * (1 - Math.exp(-dt / 0.035));
      const away = clamp((s.point.x - s.start.x || 0) * 0.05, -2, 4);
      const side = clamp((s.point.y - s.start.y || 0) * 0.05, -3, 3);
      s.sx += (away - s.sx) * (1 - Math.exp(-dt / 0.05));
      s.sy += (side - s.sy) * (1 - Math.exp(-dt / 0.05));
      const slack = Math.hypot(s.sx, s.sy); let left = 0;
      c.geo.bridges.forEach((b, i) => {
        if (s.snapped[i]) return;
        const d = Math.abs(b.mid - s.hingeV);
        if (2 * d * Math.sin(s.theta / 2) + slack > c.stretch || s.theta >= limit) { s.snapped[i] = true; s.snapAt[i] = now; s.bv -= 560 / c.geo.bridges.length; }
        else left++;
      });
      if (left === 0) { s.phase = 'free'; s.bv -= 150; }
    } else if (s.phase === 'free') {
      const cos = Math.cos(s.theta * s.sign), sin = Math.sin(s.theta * s.sign);
      const gx = s.grab.x - s.hinge.x, gy = s.grab.y - s.hinge.y;
      const wx = s.point.x - s.hinge.x - (gx * cos - gy * sin), wy = s.point.y - s.hinge.y - (gx * sin + gy * cos);
      s.sx += (wx - s.sx) * (1 - Math.exp(-dt / 0.045)); s.sy += (wy - s.sy) * (1 - Math.exp(-dt / 0.045));
      const hang = limit * 0.55 + clamp(s.pvx * 0.0009 * s.sign, -0.3, 0.3);
      s.theta += (hang - s.theta) * (1 - Math.exp(-dt / 0.12));
    } else if (s.phase === 'drop') {
      s.age += dt; s.vy += GRAVITY * dt; s.sx += s.vx * dt; s.sy += s.vy * dt; s.theta += s.spin * dt;
      if (s.age > 0.16) s.fade = clamp(1 - (s.age - 0.16) / 0.42, 0, 1);
      if (s.fade <= 0) { s.phase = 'idle'; finish(); }
    } else if (s.phase === 'return') {
      s.thetaV += (-300 * s.theta - 24 * s.thetaV) * dt; s.theta += s.thetaV * dt;
      s.sx += (0 - s.sx) * (1 - Math.exp(-dt / 0.07)); s.sy += (0 - s.sy) * (1 - Math.exp(-dt / 0.07));
      if (Math.abs(s.theta) < 0.0008 && Math.abs(s.thetaV) < 0.01 && Math.hypot(s.sx, s.sy) < 0.05) { s.theta = 0; s.thetaV = 0; s.sx = 0; s.sy = 0; s.phase = 'idle'; }
    }
    s.bv += (-520 * s.bx - 30 * s.bv) * dt; s.bx += s.bv * dt;
    const busy = paint(now);
    const moving = Math.abs(s.bx) > 0.02 || Math.abs(s.bv) > 0.5;
    if (s.phase !== 'idle' || moving || busy) s.raf = requestAnimationFrame(step);
    else { s.bx = 0; s.bv = 0; paint(now); s.raf = 0; }
  };
  const run = () => { if (s.raf) return; s.last = performance.now(); s.raf = requestAnimationFrame(step); };

  const reset = () => {
    cancelAnimationFrame(s.raf);
    Object.assign(s, { raf: 0, phase: 'idle', id: null, theta: 0, thetaV: 0, sx: 0, sy: 0, fade: 1, age: 0, bx: 0, bv: 0, snapped: [], snapAt: [], span: [] });
    stubEl.style.visibility = ''; root.removeAttribute('data-instant');
    setUsed(false); paint(performance.now());
  };

  const local = (e) => {
    const r = stage.getBoundingClientRect(); const k = r.width / width || 1;
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  };
  const tearNow = () => { cancelAnimationFrame(s.raf); s.raf = 0; s.phase = 'idle'; root.dataset.instant = ''; finish(); };

  stubEl.addEventListener('pointerdown', (e) => {
    if (used || e.button !== 0 || s.id !== null || s.phase === 'drop') return;
    try { stubEl.setPointerCapture(e.pointerId); } catch (_) {}
    const p = local(e);
    s.id = e.pointerId; s.start = p; s.point = p; s.pt = performance.now(); s.pvx = 0; s.pvy = 0;
    if (s.theta < 0.01) {
      const farSide = p.y < geo.cross / 2; const end = geo.ends[farSide ? 1 : 0];
      s.sign = farSide ? 1 : -1; s.hinge = { x: end.x, y: end.y }; s.hingeV = end.v;
      stubEl.style.transformOrigin = `${s.hinge.x}px ${s.hinge.y}px`;
    }
    const cos = Math.cos(-s.theta * s.sign), sin = Math.sin(-s.theta * s.sign);
    const ux = p.x - s.sx - s.hinge.x, uy = p.y - s.sy - s.hinge.y;
    s.grab = { x: s.hinge.x + ux * cos - uy * sin, y: s.hinge.y + ux * sin + uy * cos };
    s.a0 = Math.atan2(s.grab.y - s.hinge.y, s.grab.x - s.hinge.x) - (s.theta * s.sign) / 0.92;
    s.phase = 'held'; s.thetaV = 0; jumpTilt(); root.dataset.grabbing = ''; run();
  });
  stubEl.addEventListener('pointermove', (e) => {
    if (s.id !== e.pointerId) return;
    const p = local(e); const now = performance.now(); const dt = Math.max(0.004, (now - s.pt) / 1000);
    s.pvx += ((p.x - s.point.x) / dt - s.pvx) * 0.35; s.pvy += ((p.y - s.point.y) / dt - s.pvy) * 0.35;
    s.pt = now; s.point = p;
    if (c.reduce && Math.hypot(p.x - s.start.x, p.y - s.start.y) > 28) { s.id = null; delete root.dataset.grabbing; tearNow(); }
  });
  const up = (e) => {
    if (s.id !== e.pointerId) return;
    s.id = null;
    try { if (stubEl.hasPointerCapture(e.pointerId)) stubEl.releasePointerCapture(e.pointerId); } catch (_) {}
    delete root.dataset.grabbing;
    if (s.phase === 'free') {
      const still = performance.now() - s.pt > 80;
      s.vx = still ? 0 : clamp(s.pvx, -1600, 1600); s.vy = still ? 0 : clamp(s.pvy, -1600, 1200);
      s.spin = clamp(s.vx * 0.004, -6, 6) + 1.2 * s.sign; s.age = 0; s.phase = 'drop';
    } else if (s.phase === 'held') s.phase = 'return';
    run();
  };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => stubEl.addEventListener(ev, up));
  stubEl.addEventListener('keydown', (e) => {
    if (used || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault(); if (!e.repeat) tearNow();
  });

  if (tilt && !reduce) {
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || s.id !== null) return;
      const r = root.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;
      const nx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2 + tiltReach), -1, 1);
      const ny = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2 + tiltReach), -1, 1);
      setTilt(-ny * tiltMax, nx * tiltMax);
    }, { passive: true });
  }
  paint(performance.now());
  return { reset, root };
}
window.mountTearTicket = mountTearTicket;

})();
