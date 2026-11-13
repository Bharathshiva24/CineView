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

  // Format demo: the screen keeps its width and takes each format's real proportions
  const screen = document.querySelector('.format-screen');
  const buttons = [...document.querySelectorAll('.format-picker button')];
  const select = (btn) => {
    buttons.forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
    const ratio = parseFloat(btn.dataset.ratio);
    const scale = parseFloat(btn.dataset.scale || '1');
    screen.style.aspectRatio = String(ratio);
    screen.style.width = `min(100%, ${Math.round(760 * scale)}px)`;
  };
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
      show('Downloading CineView 2.4.1. Follow the four install steps below.');
      if (!a.closest('#install')) setTimeout(() => document.getElementById('install').scrollIntoView({ behavior: 'smooth' }), 400);
    });
  });
})();
