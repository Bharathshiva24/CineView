// Builds a District-style seat map to try CineView without visiting a booking site
(function () {
  const root = document.getElementById('layout');
  const X = '<svg viewBox="0 0 10 10"><path d="M1 1L9 9M9 1L1 9" stroke-width="1.4"/></svg>';
  let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const sections = [{ name: 'PRIME : ₹250', rows: 'ABCDE' }, { name: 'ELITE : ₹180', rows: 'FGHIJKLMNO' }];
  const preselect = new Set(['K-12', 'K-13']);
  for (const sec of sections) {
    root.insertAdjacentHTML('beforeend', `<div class="section">${sec.name}</div>`);
    for (const r of sec.rows) {
      const row = document.createElement('div'); row.className = 'row';
      row.innerHTML = `<span class="rl">${r}</span>`;
      const blocks = [[1, 2], [3, 15], [16, 21]];
      blocks.forEach(([a, b], bi) => {
        const blk = document.createElement('div'); blk.className = 'blk';
        for (let n = a; n <= b; n++) {
          const s = document.createElement('div'); s.className = 'seat';
          const key = `${r}-${n}`;
          const nearFront = r < 'F';
          const occupied = !preselect.has(key) && rnd() < (nearFront ? 0.25 : 0.55);
          if (occupied) { s.classList.add('sold'); s.innerHTML = X; }
          else { s.textContent = n; if (preselect.has(key)) s.classList.add('sel'); s.onclick = () => s.classList.toggle('sel'); }
          blk.appendChild(s);
        }
        row.appendChild(blk);
        if (bi < blocks.length - 1) row.appendChild(Object.assign(document.createElement('div'), { className: 'gap' }));
      });
      row.insertAdjacentHTML('beforeend', `<span class="rl">${r}</span>`);
      root.appendChild(row);
    }
  }
  document.getElementById('go').onclick = () => window.CineView.openPreview();
})();
