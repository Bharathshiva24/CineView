// CineView website effects (ported from React Bits; see /fx/LICENSE-react-bits.txt)
(function () {
  const ready = (fn) => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn());
  ready(() => {
    // Headline: open-movie footage drifting inside the letters, revealed word by word
    const h1 = document.querySelector('[data-masked]');
    if (h1 && window.mountMaskedHeading) {
      try {
        mountMaskedHeading(h1, { src: '/assets/headline-reel.mp4', poster: '/assets/headline-reel.jpg', fillScale: 1.25, parallax: 22, drift: 16,
          brightness: 0.9, saturation: 1.2, outline: false, duration: 1.1, stagger: 0.09 });
      } catch (e) { console.warn('masked heading', e); }
    }

    // Install section: a cinema-screen glow drawn in ASCII, scrambling under the cursor
    const ascii = document.querySelector('[data-ascii]');
    if (ascii && window.mountGradientASCII) {
      try {
        mountGradientASCII(ascii, { colors: ['#2a0406', '#b3060f', '#e50914', '#ff7a45', '#ffe2c8'], shape: 'horizon', cellSize: 16,
          density: 0.6, glyphOpacity: 0.3, glow: 0.15, flicker: 0.2, softness: 0.55, flow: 0.45, speed: 0.6,
          gradientOpacity: 0.4, grain: 0.06, scrambleRadius: 0.09, clickEffect: 'wave' });
      } catch (e) { console.warn('gradient ascii', e); }
    }

    // Admit-one ticket with a tearable stub
    const host = document.querySelector('[data-ticket]');
    const note = document.querySelector('.ticket-note');
    if (host && window.mountTearTicket) {
      try {
        const bodyHTML = `<div class="tk-body">
            <p class="tk-kicker">CineView · Admit one</p>
            <p class="tk-title">Sintel</p>
            <dl class="tk-meta"><div><dt>Row</dt><dd>F</dd></div><div><dt>Seat</dt><dd>8</dd></div><div><dt>Screen</dt><dd>IMAX</dd></div><div><dt>View</dt><dd>95</dd></div></dl>
          </div>`;
        const stubHTML = `<div class="tk-stub"><span class="tk-stub-label">Admit one</span><span class="tk-stub-seat">F8</span><span class="tk-stub-hint">Tear here</span></div>`;
        const ticket = mountTearTicket(host, { bodyHTML, stubHTML, image: '/assets/ticket-sintel.jpg', imageAlt: '', width: 460, height: 250,
          stubSize: 140, background: '#1c1a1b', color: '#f5f5f5', rotate: -3, ariaLabel: 'Tear off the ticket stub',
          onTear: () => {
            if (!note) return;
            note.innerHTML = 'Enjoy the show 🍿 <button type="button" class="ticket-again">Get another ticket</button>';
            note.querySelector('.ticket-again').addEventListener('click', () => { ticket.reset(); note.textContent = ''; });
          } });
      } catch (e) { console.warn('tear ticket', e); }
    }

    // Big interactive wordmark above the footer
    const mark = document.querySelector('[data-techtext]');
    if (mark && window.mountTechText) {
      try {
        mountTechText(mark, { text: 'CineView', fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 800, fontSize: 260, letterSpacing: -0.025,
          color: '#1B1718', accentColor: '#D70201', reach: 180, dashLength: 5, dashGap: 3, strokeWidth: 1.5, reveal: 'letter',
          specks: 12, labels: true, draggable: true, bounce: 0.4, sweep: true, speed: 0.8, intro: 'assemble', introDuration: 1.8 });
      } catch (e) { console.warn('tech text', e); }
    }
  });
})();
