// CineView – in-page preview: a CSS-3D theatre seen from the chosen seat, with the trailer on screen
(function () {
  const CV = (window.CineView = window.CineView || {});
  const PX = 100; // CSS pixels per metre in the 3D world
  const RAD = Math.PI / 180;
  const EASE = 'cubic-bezier(.32,.72,0,1)';

  const ICON = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><rect x="6.5" y="5" width="3.6" height="14" rx="1.2" fill="currentColor"/><rect x="13.9" y="5" width="3.6" height="14" rx="1.2" fill="currentColor"/></svg>',
    muted: '<svg viewBox="0 0 24 24"><path d="M4 9.5h3l4.4-3.7c.6-.5 1.6-.1 1.6.7v11c0 .8-1 1.2-1.6.7L7 14.5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z" fill="currentColor"/><path d="M16.5 9.5l5 5m0-5l-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    sound: '<svg viewBox="0 0 24 24"><path d="M4 9.5h3l4.4-3.7c.6-.5 1.6-.1 1.6.7v11c0 .8-1 1.2-1.6.7L7 14.5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z" fill="currentColor"/><path d="M16 9a4.2 4.2 0 0 1 0 6M18.6 6.5a7.8 7.8 0 0 1 0 11" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M5 6.2v11.6a.9.9 0 0 0 1.4.75L14.5 13a1.2 1.2 0 0 0 0-2L6.4 5.45A.9.9 0 0 0 5 6.2z" fill="currentColor"/><rect x="16.5" y="5.5" width="2.6" height="13" rx="1" fill="currentColor"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    chevron: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    updown: '<svg viewBox="0 0 24 24"><path d="M8 9.5l4-4 4 4M8 14.5l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    external: '<svg viewBox="0 0 24 24"><path d="M14 5h5v5M19 5l-8 8M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6" stroke="currentColor" stroke-width="2" fill="none"/><path d="M15 15l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-2.6-1.5L14.1 2.6h-4.2l-.4 2.4a7.5 7.5 0 0 0-2.6 1.5l-2.3-.9-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.3-.9a7.5 7.5 0 0 0 2.6 1.5l.4 2.4h4.2l.4-2.4a7.5 7.5 0 0 0 2.6-1.5l2.3.9 2-3.4-2-1.5z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  const CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; margin: 0; }
  svg { width: 100%; height: 100%; display: block; }
  .backdrop { position: fixed; inset: 0; z-index: 2147483646; display: flex; padding: 20px;
    background: rgba(0,0,0,.62); -webkit-backdrop-filter: blur(24px) saturate(160%); backdrop-filter: blur(24px) saturate(160%);
    font: 400 13px/1.38 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", "Inter", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased; color: #f5f5f7; letter-spacing: -.003em;
    animation: fade .35s ${EASE}; }
  .backdrop.closing { animation: fadeout .22s ease forwards; }
  @keyframes fade { from { opacity: 0 } }
  @keyframes fadeout { to { opacity: 0 } }
  @keyframes rise { from { opacity: 0; transform: translateY(14px) scale(.985) } }
  .shell { display: flex; gap: 16px; width: 100%; max-width: 1720px; margin: auto; height: 100%; animation: rise .55s ${EASE}; }

  /* ---------- Stage ---------- */
  .stage { position: relative; flex: 1; min-width: 0; border-radius: 22px; overflow: hidden; background: #000;
    perspective-origin: 50% 50%; box-shadow: 0 0 0 .5px rgba(255,255,255,.1), 0 40px 100px rgba(0,0,0,.5); }
  .camera, .group { position: absolute; inset: 0; transform-style: preserve-3d; transform-origin: 50% 50%; }
  .camera { transition: transform 1.1s ${EASE}; }
  .camera.instant { transition: none; }
  .p { position: absolute; left: 50%; top: 50%; backface-visibility: visible; transform-origin: 50% 50%; }
  .screen { background: #000; overflow: hidden; box-shadow: 0 0 160px 40px rgba(170,180,255,.10), 0 0 0 10px #020203;
    transition: width .8s ${EASE}, height .8s ${EASE}, margin .8s ${EASE}, transform .8s ${EASE}; }
  .camera.instant .screen, .camera.instant .screen iframe { transition: none; }
  .screen iframe { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); border: 0; display: block; pointer-events: none;
    transition: width .8s ${EASE}, height .8s ${EASE}; }
  .placeholder { container-type: size; position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 4cqh; background: radial-gradient(80% 90% at 50% 40%, #1d1d22, #050506); text-align: center; padding: 5%; }
  .placeholder h2 { font-size: min(9cqw, 26cqh); font-weight: 700; letter-spacing: -.03em; line-height: 1; color: #fff; }
  .placeholder p { font-size: min(2.6cqw, 8cqh); color: rgba(235,235,245,.55); }
  .placeholder .spin { width: min(6cqw, 14cqh); height: min(6cqw, 14cqh); border-radius: 50%;
    border: max(3px, .5cqw) solid rgba(255,255,255,.15); border-top-color: #fff; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg) } }
  .grid { position: absolute; inset: 0; background:
    linear-gradient(#fff 0 0) center/4px 100% no-repeat, linear-gradient(#fff 0 0) center/100% 4px no-repeat,
    repeating-linear-gradient(90deg, rgba(255,255,255,.28) 0 2px, transparent 2px 10%),
    repeating-linear-gradient(0deg, rgba(255,255,255,.28) 0 2px, transparent 2px 20%), #141416; }
  .grid::after { content: ""; position: absolute; left: 50%; top: 50%; width: 38%; aspect-ratio: 1; transform: translate(-50%,-50%);
    border: 8px solid #fff; border-radius: 50%; }
  .frontwall { background: radial-gradient(55% 50% at 50% 42%, #18181c 0%, #0a0a0c 75%); }
  .drape { background: repeating-linear-gradient(90deg, #121214 0 46px, #1a1a1e 46px 78px, #0e0e10 78px 120px); }
  .wall { background: linear-gradient(90deg, #0b0b0d, #121215 45%, #0a0a0c); }
  .glow { background: radial-gradient(closest-side, rgba(255,214,170,.42), rgba(255,200,150,.06) 62%, transparent); border-radius: 50%; }
  .ceiling { background: radial-gradient(60% 70% at 50% 0%, #0f0f12, #050506); }
  .floor { background: #08080a; }
  .tread { background: linear-gradient(#111114, #0a0a0c); }
  .riser { background: #060607; box-shadow: inset 0 2px 0 rgba(255,214,170,.14); }
  .seatback { background: linear-gradient(180deg, #2b2b31 0%, #212126 30%, #17171b 75%, #101012 100%);
    border-radius: 34% 34% 10% 10% / 24% 24% 6% 6%;
    box-shadow: inset 0 3px 0 rgba(255,255,255,.08), inset 3px 0 0 rgba(255,255,255,.025), inset -3px 0 0 rgba(0,0,0,.35); }
  .seattop { background: linear-gradient(#2e2e34, #1d1d21); border-radius: 50%; }
  .arm { background: linear-gradient(#202024, #0d0d0f); border-radius: 6px 6px 2px 2px; }
  .vignette { position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(125% 105% at 50% 45%, transparent 58%, rgba(0,0,0,.5)); }

  /* glass */
  .glass { background: rgba(30,30,32,.62); -webkit-backdrop-filter: blur(30px) saturate(180%); backdrop-filter: blur(30px) saturate(180%);
    box-shadow: inset 0 0 0 .5px rgba(255,255,255,.12), 0 8px 30px rgba(0,0,0,.35); }
  .capsule { position: absolute; left: 16px; top: 16px; display: flex; align-items: baseline; gap: 8px; padding: 8px 14px;
    border-radius: 999px; pointer-events: none; font-weight: 600; font-size: 13px; transition: opacity .4s ease; }
  .capsule span { font-weight: 400; color: rgba(235,235,245,.6); }
  .toast { position: absolute; left: 50%; top: 16px; transform: translate(-50%, -8px); opacity: 0; padding: 8px 14px; border-radius: 12px;
    font-weight: 500; pointer-events: none; transition: opacity .3s ease, transform .4s ${EASE}; max-width: 70%; text-align: center; }
  .toast.show { opacity: 1; transform: translate(-50%, 0); }

  .player { position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); display: flex; align-items: center; gap: 4px;
    padding: 6px; border-radius: 999px; transition: opacity .45s ease, transform .5s ${EASE}; max-width: calc(100% - 32px); }
  .stage.idle .player { opacity: 0; transform: translate(-50%, 8px); }
  .stage.idle .capsule { opacity: 0; }
  .ib { width: 36px; height: 36px; flex: none; border: 0; border-radius: 50%; background: transparent; color: #f5f5f7; cursor: pointer;
    display: grid; place-items: center; padding: 9px; transition: background .2s ease, transform .15s ease; }
  .ib:hover { background: rgba(255,255,255,.12); }
  .ib:active { transform: scale(.92); }
  .ib.lg { width: 42px; height: 42px; padding: 10px; background: #f5f5f7; color: #000; }
  .ib.lg:hover { background: #fff; }
  .trailer-btn { display: flex; align-items: center; gap: 6px; height: 36px; border: 0; border-radius: 999px; padding: 0 12px 0 14px;
    background: transparent; color: #f5f5f7; font: inherit; font-weight: 500; cursor: pointer; min-width: 0; max-width: 420px; }
  .trailer-btn:hover { background: rgba(255,255,255,.1); }
  .trailer-btn b { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .trailer-btn i { width: 14px; height: 14px; flex: none; opacity: .55; }
  .sep { width: .5px; height: 20px; background: rgba(255,255,255,.18); margin: 0 4px; }
  .menu { position: absolute; left: 50%; bottom: 72px; transform: translateX(-50%) scale(.96); transform-origin: 50% 100%; opacity: 0;
    pointer-events: none; width: min(460px, calc(100% - 32px)); border-radius: 14px; padding: 6px; transition: opacity .2s ease, transform .3s ${EASE}; }
  .menu.open { opacity: 1; transform: translateX(-50%) scale(1); pointer-events: auto; }
  .mi { display: grid; grid-template-columns: 18px 1fr auto; gap: 8px; align-items: center; padding: 8px 10px; border-radius: 8px; cursor: pointer; }
  .mi:hover { background: rgba(255,255,255,.1); }
  .mi i { width: 16px; height: 16px; color: #fff; }
  .mi b { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mi small { color: rgba(235,235,245,.5); font-variant-numeric: tabular-nums; }
  .mdiv { height: .5px; background: rgba(255,255,255,.12); margin: 5px 8px; }

  /* ---------- Sidebar ---------- */
  aside { width: 340px; flex: none; border-radius: 22px; overflow: hidden; display: flex; flex-direction: column;
    background: rgba(22,22,24,.78); -webkit-backdrop-filter: blur(40px) saturate(180%); backdrop-filter: blur(40px) saturate(180%);
    box-shadow: inset 0 0 0 .5px rgba(255,255,255,.1); }
  .views { position: relative; flex: 1; overflow: hidden; }
  .view { position: absolute; inset: 0; display: flex; flex-direction: column; transition: transform .5s ${EASE}, opacity .35s ease; }
  .view.prefs { transform: translateX(100%); }
  aside.show-prefs .view.main { transform: translateX(-28%); opacity: 0; pointer-events: none; }
  aside.show-prefs .view.prefs { transform: none; }
  .top { display: flex; align-items: center; gap: 8px; min-height: 62px; padding: 16px 16px 8px 20px; }
  .top .eyebrow { margin: 0; }
  .top .ttl { font-size: 17px; font-weight: 600; letter-spacing: -.015em; position: absolute; left: 50%; transform: translateX(-50%); }
  .tools { margin-left: auto; display: flex; gap: 8px; }
  .tool { width: 30px; height: 30px; padding: 7px; background: rgba(118,118,128,.24); color: rgba(235,235,245,.85); }
  .tool:hover { background: rgba(118,118,128,.38); color: #fff; }
  .backbtn { display: flex; align-items: center; gap: 2px; border: 0; background: none; color: #f5f5f7; font: inherit; font-size: 15px; cursor: pointer; padding: 4px 6px 4px 0; }
  .backbtn i { width: 18px; height: 18px; }
  .backbtn:hover { opacity: .7; }
  .scroll { flex: 1; overflow-x: hidden; overflow-y: auto; padding: 4px 20px 24px; display: flex; flex-direction: column; gap: 22px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.15) transparent; }
  .eyebrow { font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: rgba(235,235,245,.45); margin-bottom: 6px; }
  .movie form { position: relative; }
  .movie input { width: 100%; font: inherit; font-size: 24px; font-weight: 700; letter-spacing: -.025em; color: #fff; background: transparent;
    border: 0; border-radius: 10px; padding: 4px 34px 4px 8px; margin-left: -8px; outline: none; transition: background .2s ease; }
  .movie input:hover { background: rgba(118,118,128,.16); }
  .movie input:focus { background: rgba(118,118,128,.24); }
  .movie button { position: absolute; right: -4px; top: 50%; transform: translateY(-50%); width: 30px; height: 30px; padding: 7px; opacity: .55; }
  .movie button:hover { opacity: 1; }
  .src { display: flex; align-items: center; gap: 6px; margin-top: 4px; color: rgba(235,235,245,.6); }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: #8e8e93; flex: none; }
  .dot.ok { background: #30d158; } .dot.warn { background: #ff9f0a; } .dot.busy { background: #0a84ff; animation: pulse 1.2s ease infinite; }
  @keyframes pulse { 50% { opacity: .3 } }
  .seg { display: flex; padding: 2px; border-radius: 9px; background: rgba(118,118,128,.24); gap: 2px; }
  .seg button { flex: 1; border: 0; background: transparent; color: #f5f5f7; font: inherit; font-weight: 500; padding: 6px 4px; border-radius: 7px;
    cursor: pointer; transition: background .25s ${EASE}; }
  .seg button small { display: block; font-size: 10.5px; font-weight: 400; color: rgba(235,235,245,.5); font-variant-numeric: tabular-nums; margin-top: 1px; }
  .seg button.on small { color: rgba(235,235,245,.75); }
  .seg button.on { background: rgba(99,99,102,.95); box-shadow: 0 3px 8px rgba(0,0,0,.25), inset 0 0 0 .5px rgba(255,255,255,.08); }
  .score { display: flex; align-items: center; gap: 16px; }
  .ring { position: relative; width: 68px; height: 68px; flex: none; }
  .ring svg { transform: rotate(-90deg); }
  .ring circle { transition: stroke-dasharray .8s ${EASE}, stroke .4s ease; }
  .ring b { position: absolute; inset: 0; display: grid; place-items: center; font-size: 22px; font-weight: 700; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  .verdict { font-size: 17px; font-weight: 600; letter-spacing: -.015em; }
  .summary { color: rgba(235,235,245,.6); margin-top: 2px; }
  .list { border-radius: 12px; background: rgba(118,118,128,.12); overflow: hidden; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 14px; position: relative; }
  .row + .row::before { content: ""; position: absolute; top: 0; left: 14px; right: 0; height: .5px; background: rgba(255,255,255,.09); }
  .row .k { color: #f5f5f7; } .row .k small { display: block; color: rgba(235,235,245,.45); font-size: 11.5px; margin-top: 1px; }
  .row .v { font-weight: 600; font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
  .v.good { color: #30d158; } .v.mid { color: #ffd60a; } .v.bad { color: #ff9f0a; }
  .map { position: relative; border-radius: 12px; background: rgba(118,118,128,.12); overflow: hidden; }
  .map .s { position: absolute; border-radius: 2.5px; cursor: pointer; background: rgba(235,235,245,.28); transition: transform .2s ${EASE}, background .2s; }
  .map .s.occupied { background: rgba(235,235,245,.09); }
  .map .s.selected { background: #fff; }
  .map .s.current { background: #ff2d2d; transform: scale(1.5); z-index: 2; box-shadow: 0 0 0 2px rgba(255,45,45,.3); }
  .map .s:hover { transform: scale(1.6); background: #fff; z-index: 3; }
  .map .scr { position: absolute; left: 18%; right: 18%; height: 3px; border-radius: 3px; background: rgba(235,235,245,.5); }
  .map .scrl { position: absolute; left: 0; right: 0; text-align: center; font-size: 9px; font-weight: 600; letter-spacing: .25em; color: rgba(235,235,245,.35); }
  .legend { display: flex; gap: 14px; margin-top: 8px; color: rgba(235,235,245,.5); font-size: 11.5px; }
  .legend span { display: flex; align-items: center; gap: 5px; } .legend i { width: 8px; height: 8px; border-radius: 2px; }
  .set { padding: 12px 14px; position: relative; }
  .set + .set::before { content: ""; position: absolute; top: 0; left: 14px; right: 0; height: .5px; background: rgba(255,255,255,.09); }
  .set header { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .set header span:last-child { color: rgba(235,235,245,.6); font-variant-numeric: tabular-nums; }
  input[type=range] { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 4px; background: rgba(118,118,128,.4); outline: none; }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #fff;
    box-shadow: 0 2px 6px rgba(0,0,0,.35), 0 0 0 .5px rgba(0,0,0,.1); cursor: pointer; }
  .set .seg { margin-top: 2px; }
  .link { border: 0; background: transparent; color: #ff453a; font: inherit; cursor: pointer; padding: 12px 14px; text-align: left; width: 100%; }
  .foot { color: rgba(235,235,245,.38); font-size: 11.5px; line-height: 1.45; }
  kbd { font: inherit; padding: 0 4px; border-radius: 4px; background: rgba(118,118,128,.24); }
  @media (max-width: 980px) { .shell { flex-direction: column; } aside { width: auto; max-height: 46vh; } }
  `;

  const state = {
    host: null, root: null, els: {}, layout: null, seat: null, selected: [], settings: null,
    trailers: [], trailerIdx: 0, muted: true, playing: true, title: '', hints: null, view: null, iframe: null
  };

  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function build() {
    const host = document.createElement('div');
    host.id = 'cineview-root';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${CSS}</style>
    <div class="backdrop">
      <div class="shell">
        <div class="stage">
          <div class="camera">
            <div class="group env"></div>
            <div class="group rows"></div>
            <div class="p screen"></div>
          </div>
          <div class="vignette"></div>
          <div class="capsule glass"></div>
          <div class="toast glass"></div>
          <div class="menu glass"></div>
          <div class="player glass">
            <button class="ib lg play" title="Play / Pause  (Space)"></button>
            <button class="ib mute" title="Sound  (M)"></button>
            <div class="sep"></div>
            <button class="trailer-btn" title="Choose video"><b>Trailer</b><i>${ICON.updown}</i></button>
            <button class="ib next" title="Next result">${ICON.next}</button>
            <a class="ib yt" target="_blank" rel="noopener" title="Open on YouTube">${ICON.external}</a>
          </div>
        </div>
        <aside>
          <div class="views">
            <div class="view main">
              <div class="top"><div class="eyebrow">Now previewing</div>
                <div class="tools"><button class="ib tool gear" title="Theatre settings">${ICON.gear}</button><button class="ib tool x" title="Close  (Esc)">${ICON.close}</button></div></div>
              <div class="scroll">
                <section class="movie">
                  <form><input class="title" spellcheck="false" placeholder="Movie title"><button class="ib" type="submit" title="Find trailer">${ICON.search}</button></form>
                  <div class="src"><i class="dot"></i><span class="srctext"></span></div>
                </section>
                <section><div class="eyebrow">Screen format</div><div class="seg formatseg"></div></section>
                <section class="seats"><div class="eyebrow">Your seats</div><div class="seg seatseg"></div></section>
                <section>
                  <div class="score">
                    <div class="ring"><svg viewBox="0 0 68 68"><circle cx="34" cy="34" r="29" fill="none" stroke="rgba(118,118,128,.28)" stroke-width="6"/>
                      <circle class="arc" cx="34" cy="34" r="29" fill="none" stroke-width="6" stroke-linecap="round" stroke-dasharray="0 999"/></svg><b class="num"></b></div>
                    <div><div class="verdict"></div><div class="summary"></div></div>
                  </div>
                </section>
                <section><div class="eyebrow">From this seat</div><div class="list metrics"></div></section>
                <section><div class="eyebrow">Seat map</div><div class="map"></div>
                  <div class="legend"><span><i style="background:#ff2d2d"></i>Previewing</span><span><i style="background:#fff"></i>Selected</span><span><i style="background:rgba(235,235,245,.28)"></i>Available</span></div></section>
              </div>
            </div>
            <div class="view prefs">
              <div class="top"><button class="backbtn"><i>${ICON.back}</i>Back</button><div class="ttl">Theatre</div>
                <div class="tools"><button class="ib tool x2" title="Close  (Esc)">${ICON.close}</button></div></div>
              <div class="scroll">
                <div class="list setlist"></div>
                <p class="foot">CineView estimates the hall from the seat map. Adjust these if you know the theatre – recliner halls usually have about 1.6 m between rows.<br><br>
                  Click any seat on the map to compare. <kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> move · <kbd>Space</kbd> play · <kbd>M</kbd> sound · <kbd>Esc</kbd> close.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>`;
    const q = (s) => root.querySelector(s);
    state.els = {
      backdrop: q('.backdrop'), stage: q('.stage'), camera: q('.camera'), env: q('.env'), rows: q('.rows'), screen: q('.screen'),
      capsule: q('.capsule'), toast: q('.toast'), menu: q('.menu'), play: q('.play'), mute: q('.mute'), trailerBtn: q('.trailer-btn'),
      next: q('.next'), yt: q('.yt'), close: q('.x'), close2: q('.x2'), gear: q('.gear'), backbtn: q('.backbtn'), aside: q('aside'), formatseg: q('.formatseg'), form: q('.movie form'), title: q('.title'), dot: q('.dot'), srctext: q('.srctext'),
      seats: q('.seats'), seatseg: q('.seatseg'), arc: q('.arc'), num: q('.num'), verdict: q('.verdict'), summary: q('.summary'),
      metrics: q('.metrics'), map: q('.map'), setlist: q('.setlist')
    };
    state.host = host; state.root = root;

    const E = state.els;
    E.close.onclick = E.close2.onclick = () => CV.Overlay.close();
    E.gear.onclick = () => togglePrefs(true);
    E.backbtn.onclick = () => togglePrefs(false);
    E.backdrop.addEventListener('mousedown', (e) => { if (e.target === E.backdrop) CV.Overlay.close(); });
    E.play.onclick = togglePlay;
    E.mute.onclick = toggleMute;
    E.next.onclick = () => playTrailer(state.trailerIdx + 1);
    E.trailerBtn.onclick = (e) => { e.stopPropagation(); E.menu.classList.toggle('open'); };
    root.addEventListener('mousedown', (e) => { if (!e.composedPath().includes(E.menu) && !e.composedPath().includes(E.trailerBtn)) E.menu.classList.remove('open'); });
    E.form.onsubmit = (e) => { e.preventDefault(); E.title.blur(); loadTrailers(E.title.value, null); };

    // auto-hide the player controls while watching
    let idleT;
    const wake = () => { E.stage.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => { if (!E.menu.classList.contains('open')) E.stage.classList.add('idle'); }, 2600); };
    E.stage.addEventListener('mousemove', wake); E.stage.addEventListener('mouseleave', () => { clearTimeout(idleT); idleT = setTimeout(() => E.stage.classList.add('idle'), 900); });
    wake();

    for (const t of ['keydown', 'keyup', 'keypress']) host.addEventListener(t, (e) => e.stopPropagation());
    new ResizeObserver(() => render(true)).observe(E.stage);
    return host;
  }

  // ---------- 3D placement ----------
  function place(el, w, hgt, x, y, z, extra = '') {
    el.style.width = w * PX + 'px';
    el.style.height = hgt * PX + 'px';
    el.style.marginLeft = (-w * PX) / 2 + 'px';
    el.style.marginTop = (-hgt * PX) / 2 + 'px';
    el.style.transform = `translate3d(${x * PX}px, ${-y * PX}px, ${z * PX}px) ${extra}`;
    return el;
  }
  function plane(parent, cls, w, hgt, x, y, z, extra) { return parent.appendChild(place(h('div', 'p ' + cls), w, hgt, x, y, z, extra)); }

  function cameraTransform(view, stageW) {
    const s = state.settings;
    const P = stageW / 2 / Math.tan((s.fov * RAD) / 2);
    const { cam, screen } = view;
    // Aim a little below the screen centre so the rows of seats ahead sit in the lower part of the view,
    // the way your eyes take them in at the cinema.
    const aimY = screen.centerY - Math.min(Math.max(screen.h * 0.42, 1.2), 3.2);
    const dx = 0 - cam.x, dy = -(aimY - cam.y), dz = 0 - cam.z;
    const yaw = Math.atan2(dx, -dz);
    const dz2 = -dx * Math.sin(yaw) + dz * Math.cos(yaw);
    const pitch = Math.atan2(-dy, -dz2);
    return { P, yaw, pitch, css: `translateZ(${P}px) rotateX(${pitch}rad) rotateY(${yaw}rad) translate3d(${-cam.x * PX}px, ${cam.y * PX}px, ${-cam.z * PX}px)` };
  }

  // ---------- Scene (theatre only – no people) ----------
  function render(instant) {
    if (!state.host || !state.seat) return;
    const E = state.els, s = state.settings, layout = state.layout;
    const view = CV.computeView(state.seat, layout, s);
    state.view = view;
    const camT = cameraTransform(view, E.stage.clientWidth || 1000);
    E.stage.style.perspective = camT.P + 'px';
    E.camera.classList.toggle('instant', !!instant);
    E.camera.style.transform = camT.css;

    const { cam, screen, hall } = view;
    const halfFov = (s.fov / 2 + 12) * RAD;
    const pitchUp = Math.max(0, camT.pitch);
    const lookAngle = Math.atan2(-cam.x, cam.z);
    const angLo = Math.max(-85 * RAD, lookAngle - halfFov), angHi = Math.min(85 * RAD, lookAngle + halfFov);
    const xRangeAt = (d) => [cam.x + d * Math.tan(angLo), cam.x + d * Math.tan(angHi)];
    const maxDepress = 80 * RAD - pitchUp;

    place(E.screen, screen.w, screen.h, 0, screen.centerY, 0);
    sizeVideo();

    const env = E.env; env.textContent = '';
    const H = Math.max(screen.bottom + screen.h + 2.5, 8);
    const backZ = cam.z;
    plane(env, 'frontwall', hall + 2, H + 1, 0, H / 2, -0.15);
    const side = (hall - screen.w) / 2 - 0.3;
    if (side > 0.2) for (const sg of [-1, 1]) plane(env, 'drape', side, H, sg * (screen.w / 2 + 0.3 + side / 2), H / 2, -0.1);

    for (const sg of [-1, 1]) {
      const xw = (sg * hall) / 2;
      const lateral = Math.abs(xw - cam.x);
      const budget = xw < cam.x ? -angLo : angHi;
      const minAhead = budget > 0.05 ? Math.max(0.6, lateral / Math.tan(Math.min(budget, 85 * RAD))) : lateral * 4;
      const zEnd = Math.max(0.5, backZ - minAhead);
      plane(env, 'wall', zEnd, H, xw, H / 2, zEnd / 2, `rotateY(${sg * -90}deg)`);
      for (let z = 3; z < zEnd - 0.5; z += 4.5) plane(env, 'glow', 1.6, 1.6, xw - sg * 0.02, 3.2, z, `rotateY(${sg * -90}deg)`);
    }
    const ceilAhead = Math.max(0.8, (H - cam.y) / Math.tan(80 * RAD + Math.min(0, camT.pitch)));
    const ceilEnd = Math.max(0.5, backZ - ceilAhead);
    plane(env, 'ceiling', hall, ceilEnd, 0, H, ceilEnd / 2, 'rotateX(90deg)');
    const frontFloorEnd = Math.min(CV.firstRow(layout, s) - s.rowPitch / 2, backZ - 0.8);
    if (frontFloorEnd > 0.2) plane(env, 'floor', hall, frontFloorEnd, 0, 0, frontFloorEnd / 2, 'rotateX(90deg)');

    const rowsG = E.rows; rowsG.textContent = '';
    for (let i = 0; i < state.seat.row; i++) {
      const row = layout.rows[i];
      const zr = CV.rowDistance(row, s, layout);
      const fl = CV.rowFloor(row, s);
      const ahead = cam.z - zr;
      if (ahead < 0.3) continue;
      const [xa, xb] = xRangeAt(ahead - 0.35);
      const lo = Math.max(xa, -hall / 2), hi = Math.min(xb, hall / 2);
      if (hi <= lo) continue;
      const minY = cam.y - (ahead - 0.35) * Math.tan(maxDepress);

      const t0 = zr - s.rowPitch / 2, t1 = Math.min(zr + s.rowPitch / 2, cam.z - 0.4);
      if (fl > minY && t1 > t0) plane(rowsG, 'tread', hi - lo, t1 - t0, (lo + hi) / 2, fl, (t0 + t1) / 2, 'rotateX(90deg)');
      if (s.riserPerRow > 0 && i > 0) {
        const rb = Math.max(fl - s.riserPerRow, minY);
        if (fl > rb) plane(rowsG, 'riser', hi - lo, fl - rb, (lo + hi) / 2, (fl + rb) / 2, t0);
      }
      // every seat drawn on its own (seat back + armrest) so each one is distinguishable
      const top = fl + 0.98, bot = Math.max(fl + 0.3, minY);
      if (top <= bot) continue;
      const sw = s.seatWidth * 0.82;
      const zBack = zr + 0.32;
      for (const seat of row.seats) {
        const sx = ((seat.cx - layout.centerX) / layout.seatPitchPx) * s.seatWidth;
        if (sx + s.seatWidth / 2 < lo || sx - s.seatWidth / 2 > hi) continue;
        plane(rowsG, 'seatback', sw, top - bot, sx, (top + bot) / 2, zBack);
        plane(rowsG, 'arm', 0.07, 0.28, sx + s.seatWidth / 2, Math.max(fl + 0.52, bot + 0.14), zBack - 0.22);
      }
    }
    renderPanel(view);
  }

  // ---------- Sidebar ----------
  function seatName(seat) { return `Row ${state.layout.rows[seat.row].label}, Seat ${seat.label || '–'}`; }
  function shortSeat(seat) { return `${state.layout.rows[seat.row].label}${seat.label || ''}`; }

  function metricRow(k, sub, v, cls) {
    return `<div class="row"><div class="k">${esc(k)}${sub ? `<small>${esc(sub)}</small>` : ''}</div><div class="v ${cls || ''}">${esc(v)}</div></div>`;
  }

  function renderPanel(view) {
    const E = state.els, m = view.metrics, seat = state.seat;
    const color = m.score >= 85 ? '#30d158' : m.score >= 70 ? '#a5e05b' : m.score >= 50 ? '#ffd60a' : '#ff9f0a';
    const circ = 2 * Math.PI * 29;
    E.arc.setAttribute('stroke', color);
    E.arc.setAttribute('stroke-dasharray', `${(m.score / 100) * circ} ${circ}`);
    E.num.textContent = m.score;
    E.verdict.textContent = m.verdict;
    E.summary.textContent = m.headline;
    E.capsule.innerHTML = `${esc(seatName(seat))}${seat.status === 'occupied' ? ' · booked' : ''}<span>${m.distance.toFixed(1)} m from screen</span>`;

    const fill = m.hAngle >= 33 && m.hAngle <= 46 ? 'good' : m.hAngle >= 26 && m.hAngle <= 56 ? 'mid' : 'bad';
    const neck = Math.abs(m.vAngle) <= 8 ? 'good' : Math.abs(m.vAngle) <= 15 ? 'mid' : 'bad';
    const off = m.offAxis <= 12 ? 'good' : m.offAxis <= 22 ? 'mid' : 'bad';
    E.metrics.innerHTML =
      metricRow('Screen in view', 'Ideal 36–40°', `${Math.round(m.hAngle)}°`, fill) +
      metricRow('Distance', `${m.widths.toFixed(1)}× screen width`, `${m.distance.toFixed(1)} m`) +
      metricRow('Neck angle', m.vAngle >= 0 ? 'Looking up' : 'Looking down', `${Math.abs(Math.round(m.vAngle))}°`, neck) +
      metricRow('Off-centre', m.offAxis > 14 ? 'Picture appears skewed' : 'Square-on view', `${Math.round(m.offAxis)}°`, off) +
      metricRow('Sound', m.sound, m.soundShort, m.soundShort === 'Sweet spot' ? 'good' : '');

    E.seats.style.display = state.selected.length > 1 ? '' : 'none';
    E.seatseg.textContent = '';
    for (const sel of state.selected) {
      const b = h('button', sel === seat ? 'on' : '', esc(shortSeat(sel)));
      b.title = seatName(sel);
      b.onclick = () => setSeat(sel);
      E.seatseg.appendChild(b);
    }
    renderMap();
  }

  function renderMap() {
    const E = state.els, L = state.layout, map = E.map;
    const width = map.clientWidth || 300;
    const pad = 14, band = 26;
    const spanX = L.maxX - L.minX + L.seatW, spanY = L.maxY - L.minY + L.seatH;
    const k = Math.min((width - pad * 2) / spanX, 190 / spanY, 9 / Math.max(L.seatW, 1));
    map.style.height = spanY * k + pad * 2 + band + 'px';
    map.textContent = '';
    const top = L.screenSide === 'bottom' ? pad : pad + band;
    const offX = (width - spanX * k) / 2;
    const w = Math.max(3, L.seatW * k * 0.78);
    const frag = document.createDocumentFragment();
    for (const seat of L.seats) {
      const d = h('div', 's ' + seat.status + (seat === state.seat ? ' current' : ''));
      d.style.width = d.style.height = w + 'px';
      d.style.left = offX + (seat.cx - L.minX + L.seatW / 2) * k - w / 2 + 'px';
      d.style.top = top + (seat.cy - L.minY + L.seatH / 2) * k - w / 2 + 'px';
      d.title = seatName(seat) + (seat.status === 'occupied' ? ' (booked)' : '');
      d.onclick = () => setSeat(seat);
      frag.appendChild(d);
    }
    const bar = h('div', 'scr'), lbl = h('div', 'scrl', 'SCREEN');
    if (L.screenSide === 'bottom') { bar.style.bottom = '20px'; lbl.style.bottom = '6px'; } else { bar.style.top = '8px'; lbl.style.top = '14px'; }
    frag.append(bar, lbl);
    map.appendChild(frag);
  }

  function renderFormats() {
    const seg = state.els.formatseg;
    seg.textContent = '';
    const cur = CV.formatFor(state.settings.aspect);
    for (const f of CV.FORMATS) {
      const b = h('button', f === cur ? 'on' : '', `${f.label}<small>${f.id === 'hd' ? '1.78:1' : f.ratio.toFixed(2) + ':1'}</small>`);
      b.type = 'button'; b.title = f.name;
      b.onclick = () => { state.settings.aspect = f.ratio; renderFormats(); render(false); };
      seg.appendChild(b);
    }
  }

  function togglePrefs(open) { state.els.aside.classList.toggle('show-prefs', open); }

  // Fill the screen with the trailer like a projector would ("cover"): scope trailers are letterboxed 16:9 files,
  // so cropping to a 2.39 screen shows exactly the picture. "Fit" shows the whole 16:9 frame instead.
  function sizeVideo() {
    const f = state.iframe, v = state.view;
    if (!f || !v) return;
    const sw = v.screen.w * PX, sh = v.screen.h * PX, va = 16 / 9;
    const cover = state.settings.videoFit !== 'fit';
    let w, hh;
    if ((sw / sh > va) === cover) { w = sw; hh = sw / va; } else { hh = sh; w = sh * va; }
    f.style.width = w + 'px'; f.style.height = hh + 'px';
  }

  const SETTING_DEFS = [
    { key: 'screenWidth', label: 'Screen width', min: 0, max: 26, step: 0.5, fmt: (v) => (v > 0 ? v + ' m' : 'Auto') },
    { key: 'firstRowDistance', label: 'First row to screen', min: 0, max: 10, step: 0.1, fmt: (v) => (v > 0 ? v.toFixed(1) + ' m' : 'Auto') },
    { key: 'rowPitch', label: 'Row spacing', min: 0.8, max: 2, step: 0.05, fmt: (v) => v.toFixed(2) + ' m' },
    { key: 'riserPerRow', label: 'Stadium step', min: 0, max: 0.5, step: 0.02, fmt: (v) => v.toFixed(2) + ' m' },
    { key: 'fov', label: 'Field of view', min: 40, max: 90, step: 1, fmt: (v) => v + '°' }
  ];

  function renderSettings() {
    const list = state.els.setlist, s = state.settings;
    list.textContent = '';
    const fit = h('div', 'set', '<header><span>Trailer on screen</span><span></span></header>');
    const seg = h('div', 'seg');
    for (const [v, t] of [['cover', 'Fill screen'], ['fit', 'Show full frame']]) {
      const b = h('button', (s.videoFit || 'cover') === v ? 'on' : '', t);
      b.type = 'button'; b.onclick = () => { state.settings.videoFit = v; save(); renderSettings(); sizeVideo(); };
      seg.appendChild(b);
    }
    fit.appendChild(seg); list.appendChild(fit);
    for (const d of SETTING_DEFS) {
      const row = h('div', 'set', `<header><span>${d.label}</span><span>${d.fmt(s[d.key])}</span></header>`);
      const r = h('input'); r.type = 'range'; r.min = d.min; r.max = d.max; r.step = d.step; r.value = s[d.key];
      const paint = () => { const p = ((r.value - d.min) / (d.max - d.min)) * 100; r.style.background = `linear-gradient(90deg, #fff ${p}%, rgba(118,118,128,.4) ${p}%)`; };
      r.oninput = () => { row.querySelector('header span:last-child').textContent = d.fmt(Number(r.value)); paint(); update(d.key, Number(r.value), true); };
      paint(); row.appendChild(r); list.appendChild(row);
    }
    const reset = h('button', 'link', 'Reset to defaults'); reset.type = 'button';
    reset.onclick = () => { state.settings = { ...CV.DEFAULT_SETTINGS, aspect: state.settings.aspect }; save(); renderSettings(); render(); };
    list.appendChild(reset);
  }

  function update(key, value, instant) { state.settings[key] = value; save(); render(instant); }
  function save() { try { const { aspect, ...keep } = state.settings; chrome.storage.sync.set({ settings: keep }); } catch (_) {} }
  function setSeat(seat) { if (!seat) return; state.seat = seat; render(false); }

  function moveSeat(dx, dRow) {
    const L = state.layout, cur = state.seat;
    if (dx) { const r = L.rows[cur.row].seats; const n = r[r.indexOf(cur) + dx]; if (n) setSeat(n); return; }
    const t = L.rows[cur.row + dRow]; if (!t) return;
    let best = t.seats[0];
    for (const s of t.seats) if (Math.abs(s.cx - cur.cx) < Math.abs(best.cx - cur.cx)) best = s;
    setSeat(best);
  }

  // ---------- Trailer ----------
  function toast(msg, ms = 3200) {
    const t = state.els.toast; t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), ms);
  }
  function status(kind, text) { state.els.dot.className = 'dot ' + kind; state.els.srctext.textContent = text; }

  function showPlaceholder(kind, sub) {
    const scr = state.els.screen;
    scr.textContent = '';
    state.iframe = null;
    if (kind === 'grid') { scr.appendChild(h('div', 'grid')); return; }
    const ph = h('div', 'placeholder');
    ph.innerHTML = kind === 'loading' ? `<div class="spin"></div><p>Finding the trailer</p>` : `<h2>${esc(state.title || 'CineView')}</h2><p>${esc(sub || '')}</p>`;
    scr.appendChild(ph);
  }

  function renderMenu() {
    const menu = state.els.menu;
    menu.textContent = '';
    state.trailers.forEach((t, i) => {
      const it = h('div', 'mi', `<i>${i === state.trailerIdx && state.iframe ? ICON.check : ''}</i><b>${esc(t.title || 'Video ' + (i + 1))}</b><small>${esc(t.length || '')}</small>`);
      it.onclick = () => { menu.classList.remove('open'); playTrailer(i); };
      menu.appendChild(it);
    });
    if (state.trailers.length) menu.appendChild(h('div', 'mdiv'));
    const g = h('div', 'mi', `<i>${!state.iframe && state.els.screen.querySelector('.grid') ? ICON.check : ''}</i><b>Calibration grid</b><small>Check distortion</small>`);
    g.onclick = () => { menu.classList.remove('open'); playTrailer(-1); };
    menu.appendChild(g);
  }

  async function loadTrailers(title, hints) {
    title = (title || '').trim();
    state.title = title;
    state.els.title.value = title;
    if (hints !== undefined) state.hints = hints;
    if (!title) { state.trailers = []; renderMenu(); showPlaceholder('', 'Type the movie title above'); status('warn', 'Movie not detected – enter the title'); return; }
    status('busy', 'Looking for the official trailer…');
    showPlaceholder('loading');
    const reqTitle = title;
    let res;
    try {
      res = await chrome.runtime.sendMessage({
        type: 'cineview:findTrailer', title,
        lang: (state.hints && state.hints.lang) || '', ids: (state.hints && state.hints.ids) || []
      });
    } catch (e) { res = { ok: false, error: String(e) }; }
    if (!state.host || reqTitle !== state.title) return; // closed, or title changed meanwhile
    if (!res || !res.ok) {
      state.trailers = []; renderMenu();
      status('warn', 'Couldn’t reach YouTube'); showPlaceholder('', 'Trailer unavailable right now');
      return;
    }
    if (!res.results.length) {
      state.trailers = []; renderMenu();
      status('warn', `No trailer found for “${title}”. Check the title.`);
      showPlaceholder('', 'No matching trailer');
      return;
    }
    state.trailers = res.results;
    playTrailer(0);
  }

  function playTrailer(i) {
    const E = state.els;
    if (i === -1) { showPlaceholder('grid'); E.yt.removeAttribute('href'); E.trailerBtn.querySelector('b').textContent = 'Calibration grid'; renderMenu(); return; }
    if (!state.trailers.length) return;
    if (i >= state.trailers.length) { toast('No more matching trailers'); return; }
    state.trailerIdx = i;
    const t = state.trailers[i];
    E.yt.href = 'https://www.youtube.com/watch?v=' + t.videoId;
    E.trailerBtn.querySelector('b').textContent = t.title || 'Trailer';
    status('ok', t.source === 'platform' ? `Official trailer · from ${location.hostname.includes('bookmyshow') ? 'BookMyShow' : 'District'}` : `Official trailer · ${t.channel || 'YouTube'}`);
    const params = new URLSearchParams({
      autoplay: '1', mute: state.muted ? '1' : '0', controls: '0', rel: '0', playsinline: '1', modestbranding: '1',
      loop: '1', playlist: t.videoId, enablejsapi: '1', iv_load_policy: '3', disablekb: '1'
    });
    if (/^https?:/.test(location.origin)) params.set('origin', location.origin);
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${t.videoId}?${params}`;
    f.allow = 'autoplay; encrypted-media; picture-in-picture';
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.title = t.title || 'Trailer';
    f.addEventListener('load', () => { ytPost({ event: 'listening', id: 'cineview', channel: 'widget' }); if (!state.muted) ytCommand('unMute'); });
    E.screen.textContent = '';
    E.screen.appendChild(f);
    state.iframe = f;
    sizeVideo();
    state.playing = true;
    syncButtons(); renderMenu();
  }

  function ytPost(o) { try { state.iframe && state.iframe.contentWindow.postMessage(JSON.stringify(o), '*'); } catch (_) {} }
  function ytCommand(func, args = []) { ytPost({ event: 'command', func, args }); }

  function onYtMessage(e) {
    if (!state.iframe || e.source !== state.iframe.contentWindow) return;
    let d = e.data;
    try { if (typeof d === 'string') d = JSON.parse(d); } catch (_) { return; }
    if (!d) return;
    if (d.event === 'onError') { toast('This video can’t be embedded – trying the next one'); setTimeout(() => playTrailer(state.trailerIdx + 1), 500); }
    const ps = d.event === 'onStateChange' ? d.info : d.event === 'infoDelivery' && d.info ? d.info.playerState : undefined;
    if (ps === 1 && !state.playing) { state.playing = true; syncButtons(); }
    if (ps === 2 && state.playing) { state.playing = false; syncButtons(); }
  }

  function togglePlay() { state.playing = !state.playing; ytCommand(state.playing ? 'playVideo' : 'pauseVideo'); syncButtons(); }
  function toggleMute() { state.muted = !state.muted; if (state.muted) ytCommand('mute'); else { ytCommand('unMute'); ytCommand('setVolume', [80]); } syncButtons(); }
  function syncButtons() { state.els.play.innerHTML = state.playing ? ICON.pause : ICON.play; state.els.mute.innerHTML = state.muted ? ICON.muted : ICON.sound; }

  function onKey(e) {
    if (!state.host) return;
    const inInput = e.composedPath().some((n) => n && n.tagName === 'INPUT' && n.type !== 'range');
    if (e.key === 'Escape') { e.preventDefault(); if (state.els.menu.classList.contains('open')) state.els.menu.classList.remove('open'); else if (state.els.aside.classList.contains('show-prefs')) togglePrefs(false); else CV.Overlay.close(); return; }
    if (inInput) return;
    const up = state.layout.screenSide === 'bottom' ? 1 : -1;
    const map = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, up], ArrowDown: [0, -up] };
    if (map[e.key]) { e.preventDefault(); e.stopPropagation(); moveSeat(...map[e.key]); }
    else if (e.key === ' ') { e.preventDefault(); e.stopPropagation(); togglePlay(); }
    else if (e.key === 'm' || e.key === 'M') { e.preventDefault(); toggleMute(); }
  }

  CV.Overlay = {
    isOpen: () => !!state.host,
    currentTitle: () => state.title,
    // ctx: { layout, selected, seat, title, hints: {lang, ids}, settings, message }
    open(ctx) {
      if (state.host) this.close(true);
      Object.assign(state, {
        layout: ctx.layout, selected: ctx.selected || [], seat: ctx.seat, settings: { ...CV.DEFAULT_SETTINGS, ...(ctx.settings || {}) },
        trailers: [], trailerIdx: 0, muted: true, playing: true, iframe: null, hints: ctx.hints || null
      });
      document.documentElement.appendChild(build());
      window.addEventListener('message', onYtMessage);
      window.addEventListener('keydown', onKey, true);
      renderSettings(); renderFormats(); syncButtons(); renderMenu();
      requestAnimationFrame(() => render(true));
      if (ctx.message) setTimeout(() => toast(ctx.message, 6000), 500);
      loadTrailers(ctx.title || '', ctx.hints || null);
    },
    // Called when the page switches to another movie/show while open
    updateMovie(title, hints) { if (state.host && title && title !== state.title) loadTrailers(title, hints || null); },
    close(immediate) {
      if (!state.host) return;
      window.removeEventListener('message', onYtMessage);
      window.removeEventListener('keydown', onKey, true);
      const host = state.host;
      state.host = null; state.iframe = null;
      if (immediate) { host.remove(); return; }
      host.shadowRoot.querySelector('.backdrop').classList.add('closing');
      setTimeout(() => host.remove(), 220);
    }
  };
})();
