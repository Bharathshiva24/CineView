// CineView site: nav state, format demo, copy button, download hint
(() => {
  const nav = document.querySelector('.nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Hero parallax: the preview rises a little faster than the page while the headline stays fixed
  const par = document.querySelector('[data-parallax]');
  const hero = document.querySelector('.hero');
  const copy = document.querySelector('.hero-copy');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const small = window.matchMedia('(max-width: 760px)');
  let ticking = false;
  const update = () => {
    ticking = false;
    if (!par || reduce.matches || small.matches) { if (par) { par.style.setProperty('--py', '0px'); copy.style.opacity = ''; } return; }
    const y = Math.min(window.scrollY, hero.offsetHeight);
    par.style.setProperty('--py', `${(-y * 0.12).toFixed(1)}px`);
    // fade the fixed headline as the preview slides over it, so it never peeks out once the image has passed
    const c = copy.getBoundingClientRect(), img = par.getBoundingClientRect();
    const covered = Math.min(1, Math.max(0, (c.bottom - img.top) / (c.height * 0.55)));
    copy.style.opacity = String(1 - covered);
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  update();

  // Format demo: size the screen in pixels from the stage size and the format's real proportions.
  // (Explicit sizes instead of CSS aspect-ratio, which iOS Safari can ignore here.)
  const screen = document.querySelector('.format-screen');
  const fstage = document.querySelector('.format-stage');
  const buttons = [...document.querySelectorAll('.format-picker button')];
  let current = buttons[0];
  const fit = () => {
    if (!screen || !fstage || !current) return;
    const cs = getComputedStyle(fstage);
    const availW = fstage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const availH = fstage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const ratio = parseFloat(current.dataset.ratio);
    const scale = parseFloat(current.dataset.scale || '1');
    // One base width for every format, chosen so the largest (IMAX) still fits: sizes stay comparable
    const fits = buttons.map((b) => { const sc = parseFloat(b.dataset.scale || '1'), r = parseFloat(b.dataset.ratio); return Math.min(availW / sc, (availH * r) / sc); });
    const base = Math.min(760, ...fits);
    const w = base * scale, h = w / ratio;
    screen.style.width = Math.round(w) + 'px';
    screen.style.height = Math.round(h) + 'px';
  };
  const select = (btn) => {
    current = btn;
    buttons.forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
    fit();
  };
  if (fstage) new ResizeObserver(fit).observe(fstage);
  buttons.forEach((b, i) => {
    b.addEventListener('click', () => select(b));
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = buttons[(i + (e.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length];
      next.focus(); select(next);
    });
  });
  if (buttons[0]) select(buttons[0]);

  // Toast
  const toast = document.querySelector('.toast');
  let t;
  const show = (msg) => { toast.textContent = msg; toast.classList.add('show'); clearTimeout(t); t = setTimeout(() => toast.classList.remove('show'), 3200); };

  // Copy chrome://extensions
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = document.querySelector(btn.dataset.copy).textContent.trim();
      try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; show('Copied. Paste it into Chrome\'s address bar.'); }
      catch { show('Select the text and copy it manually.'); }
      setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
    });
  });

  // After a download starts, point people to the install steps
  document.querySelectorAll('[data-download]').forEach((a) => {
    a.addEventListener('click', () => {
      show('Downloading CineView 2.4.2. Follow the four install steps below.');
      if (!a.closest('#install')) setTimeout(() => document.getElementById('install').scrollIntoView({ behavior: 'smooth' }), 400);
    });
  });
})();
