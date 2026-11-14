/*
 * Masked heading: film footage drifting inside the letters of a headline, revealed word by word.
 * Ported to plain JavaScript (no React, no GSAP) for the CineView website.
 * Original: React Bits "Masked Heading" by David Haz, https://reactbits.dev — MIT + Commons Clause License Condition v1.0.
 * Copyright (c) 2026 David Haz. See /fx/LICENSE-react-bits.txt.
 */
(function () {
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const easeOut4 = (t) => 1 - Math.pow(1 - t, 5); // GSAP power4.out
  let uid = 0;

  function mountMaskedHeading(root, opts = {}) {
    const {
      src = '', poster = '', fillScale = 1.25, parallax = 26, drift = 18,
      brightness = 1, saturation = 1, outline = true, outlineColor = 'currentColor', outlineWidth = 1,
      duration = 1.1, stagger = 0.09
    } = opts;
    const text = root.textContent.trim().replace(/\s+/g, ' ');
    const words = text.split(' ').filter(Boolean);
    const glyphs = words.flatMap((word, w) => Array.from(word).map((char) => ({ char, w })));
    const clipId = `mh-${++uid}`;
    const NS = 'http://www.w3.org/2000/svg';
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    root.classList.add('masked-heading');
    root.setAttribute('aria-label', text);
    root.textContent = '';

    // Real text (transparent) keeps layout, selection and screen readers working
    const measure = document.createElement('span'); measure.className = 'masked-heading__measure';
    const wordEls = [], baseEls = [];
    words.forEach((word) => {
      const w = document.createElement('span'); w.className = 'masked-heading__word'; w.textContent = word;
      const b = document.createElement('i'); b.className = 'masked-heading__baseline'; w.appendChild(b);
      measure.appendChild(w); wordEls.push(w); baseEls.push(b);
    });
    root.appendChild(measure);

    const defs = document.createElementNS(NS, 'svg'); defs.setAttribute('class', 'masked-heading__defs'); defs.setAttribute('aria-hidden', 'true');
    const clip = document.createElementNS(NS, 'clipPath'); clip.setAttribute('id', clipId); clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
    const glyphEls = glyphs.map((g) => { const t = document.createElementNS(NS, 'text'); t.textContent = g.char; clip.appendChild(t); return t; });
    const d = document.createElementNS(NS, 'defs'); d.appendChild(clip); defs.appendChild(d); root.appendChild(defs);

    const layer = document.createElement('span'); layer.className = 'masked-heading__reveal'; layer.setAttribute('aria-hidden', 'true');
    const clipBox = document.createElement('span'); clipBox.className = 'masked-heading__clip'; clipBox.style.clipPath = `url(#${clipId})`;
    const media = document.createElement('span'); media.className = 'masked-heading__media';
    const video = document.createElement('video');
    Object.assign(video, { muted: true, loop: true, playsInline: true, autoplay: !reduce, preload: 'auto' });
    video.setAttribute('muted', ''); video.setAttribute('playsinline', ''); video.className = 'masked-heading__source';
    if (poster) video.poster = poster;
    if (src) video.src = src;
    media.appendChild(video); clipBox.appendChild(media); layer.appendChild(clipBox); root.appendChild(layer);

    let lineEls = [];
    if (outline) {
      const o = document.createElementNS(NS, 'svg'); o.setAttribute('class', 'masked-heading__outline'); o.setAttribute('aria-hidden', 'true');
      o.style.stroke = outlineColor; o.style.strokeWidth = outlineWidth;
      lineEls = glyphs.map((g) => { const t = document.createElementNS(NS, 'text'); t.textContent = g.char; o.appendChild(t); return t; });
      root.appendChild(o);
    }

    let boxes = [];
    const states = glyphs.map(() => ({ y: 0 }));
    const off = { x: 0, y: 0, tx: 0, ty: 0 };

    function renderGlyphs() {
      for (let i = 0; i < glyphEls.length; i++) {
        const st = states[i];
        if (!boxes[i] || st.y === 0) { glyphEls[i].removeAttribute('transform'); continue; }
        glyphEls[i].setAttribute('transform', `translate(0 ${st.y.toFixed(2)})`);
      }
    }
    function place() {
      const scale = fillScale;
      const maxX = Math.max(0, ((scale - 1) / 2) * root.clientWidth);
      const maxY = Math.max(0, ((scale - 1) / 2) * root.clientHeight);
      media.style.transform = `translate3d(${clamp(off.x, -maxX, maxX).toFixed(2)}px, ${clamp(off.y, -maxY, maxY).toFixed(2)}px, 0) scale(${scale})`;
      media.style.filter = `brightness(${brightness}) saturate(${saturation}) contrast(1.08)`;
    }
    function sync() {
      const cs = getComputedStyle(measure);
      const fontPx = parseFloat(cs.fontSize) || 48;
      const rootRect = root.getBoundingClientRect();
      const ratio = root.offsetWidth ? rootRect.width / root.offsetWidth || 1 : 1;
      const range = document.createRange();
      boxes = []; let index = 0;
      wordEls.forEach((box, w) => {
        const node = box.firstChild; const base = baseEls[w];
        if (!node || node.nodeType !== 3) return;
        const boxRect = box.getBoundingClientRect(); const baseline = base.offsetTop;
        let o = 0;
        for (const ch of Array.from(node.data)) {
          range.setStart(node, o); range.setEnd(node, o + ch.length); o += ch.length;
          const r = range.getBoundingClientRect();
          const x = box.offsetLeft + (r.left - boxRect.left) / ratio;
          boxes[index++] = { x, y: baseline, w: r.width / ratio, fontPx };
        }
      });
      const write = (el, b) => {
        el.setAttribute('x', b.x.toFixed(2)); el.setAttribute('y', `${b.y}`);
        el.style.fontFamily = cs.fontFamily; el.style.fontSize = cs.fontSize; el.style.fontWeight = cs.fontWeight;
        el.style.fontStyle = cs.fontStyle; el.style.letterSpacing = cs.letterSpacing;
      };
      boxes.forEach((b, i) => { if (!b) return; write(glyphEls[i], b); if (lineEls[i]) write(lineEls[i], b); });
      renderGlyphs(); place();
    }

    // Drift + pointer parallax
    let raf = 0, last = 0, clock = 0, visible = true;
    const frame = (now) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
      if (!reduce) {
        clock += dt;
        const dx = Math.sin(clock * 0.21) * drift, dy = Math.cos(clock * 0.17) * drift * 0.6;
        const ease = 1 - Math.exp(-dt / 0.18);
        off.x += (off.tx + dx - off.x) * ease; off.y += (off.ty + dy - off.y) * ease;
      }
      place();
      if (visible && !reduce) raf = requestAnimationFrame(frame);
    };
    const wake = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };
    root.addEventListener('pointermove', (e) => {
      const r = root.getBoundingClientRect();
      off.tx = clamp(((e.clientX - r.left) / (r.width || 1)) * 2 - 1, -1, 1) * -parallax;
      off.ty = clamp(((e.clientY - r.top) / (r.height || 1)) * 2 - 1, -1, 1) * -parallax;
    });
    root.addEventListener('pointerleave', () => { off.tx = 0; off.ty = 0; });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { wake(); if (!reduce) video.play().catch(() => {}); } else video.pause(); }).observe(root);
    new ResizeObserver(() => sync()).observe(root);
    if (document.fonts?.ready) document.fonts.ready.then(sync).catch(() => {});

    // Word-by-word rise reveal when the heading comes into view
    sync();
    if (!reduce) {
      const em = () => parseFloat(getComputedStyle(root).fontSize) || 48;
      states.forEach((st) => { st.y = em() * 1.15; }); renderGlyphs();
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const start = performance.now(), from = em() * 1.15;
        const tick = (now) => {
          const t = (now - start) / 1000; let done = true;
          glyphs.forEach((g, i) => {
            const k = clamp((t - g.w * stagger) / duration, 0, 1);
            states[i].y = from * (1 - easeOut4(k)); if (k < 1) done = false;
          });
          renderGlyphs();
          if (!done) requestAnimationFrame(tick); else { states.forEach((s) => { s.y = 0; }); renderGlyphs(); }
        };
        requestAnimationFrame(tick);
      }, { threshold: 0.25 });
      io.observe(root);
    }
    wake();
  }
  window.mountMaskedHeading = mountMaskedHeading;
})();
