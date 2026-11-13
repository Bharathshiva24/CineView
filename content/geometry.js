// CineView – theatre model + viewing metrics (pure functions, no DOM)
(function () {
  const CV = (window.CineView = window.CineView || {});

  CV.DEFAULT_SETTINGS = {
    screenWidth: 0,          // metres; 0 = auto (derived from hall width)
    aspect: 2.39,            // screen aspect ratio – see CV.FORMATS
    firstRowDistance: 0,     // metres from screen to the first row; 0 = auto (≈0.6 × screen width)
    rowPitch: 1.05,          // metres between rows (recliners ≈ 1.6)
    seatWidth: 0.55,         // metres per seat
    riserPerRow: 0.28,       // stadium step height per row (0 = flat floor)
    eyeHeight: 1.15,         // seated eye height above the row's floor
    screenBottom: 1.4,       // screen's bottom edge above the front floor
    fov: 62,                 // horizontal field of view of the preview, degrees
    videoFit: 'cover'        // 'cover' fills the screen like a projector, 'fit' shows the whole 16:9 frame
  };

  const deg = (r) => (r * 180) / Math.PI;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Physical hall width implied by the seat map
  CV.hallWidth = function (layout, s) {
    const span = (layout.maxX - layout.minX) / layout.seatPitchPx; // in seats
    return Math.max(6, (span + 1) * s.seatWidth + 2.4); // + side aisles / walls
  };

  // Cinema screen formats. Width is the hall's screen wall; height follows the format's aspect ratio.
  CV.FORMATS = [
    { id: 'scope', label: 'Scope', name: 'CinemaScope', ratio: 2.39 },
    { id: 'imax', label: 'IMAX', name: 'IMAX', ratio: 1.9, scale: 1.08 },
    { id: 'flat', label: 'Flat', name: 'Widescreen', ratio: 1.85 },
    { id: 'hd', label: '16:9', name: 'Standard 16:9', ratio: 16 / 9 }
  ];
  CV.formatFor = (ratio) => CV.FORMATS.reduce((a, f) => (Math.abs(f.ratio - ratio) < Math.abs(a.ratio - ratio) ? f : a), CV.FORMATS[0]);

  // Width of the screen wall (independent of format), metres
  CV.baseScreenWidth = function (layout, s) {
    const hall = CV.hallWidth(layout, s);
    return s.screenWidth > 0 ? s.screenWidth : clamp(hall * 0.75, 7, 22);
  };

  CV.screenSize = function (layout, s) {
    const hall = CV.hallWidth(layout, s);
    const f = CV.formatFor(s.aspect);
    const w = Math.min(CV.baseScreenWidth(layout, s) * (f.scale || 1), hall - 0.6);
    return { w, h: w / f.ratio, hall, format: f };
  };

  // Distance from the screen to the first row (auto: cinema design guides put it at ~0.6× screen width)
  CV.firstRow = function (layout, s) {
    if (s.firstRowDistance > 0) return s.firstRowDistance;
    return clamp(CV.baseScreenWidth(layout, s) * 0.6, 4, 10);
  };

  CV.seatPosition = function (seat, layout, s) {
    const row = layout.rows[seat.row];
    const depth = row ? row.depth : seat.row;
    const z = CV.firstRow(layout, s) + depth * s.rowPitch;
    const floor = depth * s.riserPerRow;
    const x = ((seat.cx - layout.centerX) / layout.seatPitchPx) * s.seatWidth;
    return { x, y: floor + s.eyeHeight, z, floor };
  };

  CV.rowFloor = function (row, s) { return row.depth * s.riserPerRow; };
  CV.rowDistance = function (row, s, layout) { return CV.firstRow(layout, s) + row.depth * s.rowPitch; };

  // Everything the renderer + side panel need for one seat
  CV.computeView = function (seat, layout, s) {
    const cam = CV.seatPosition(seat, layout, s);
    const scr = CV.screenSize(layout, s);
    const screenCenterY = s.screenBottom + scr.h / 2;

    const dz = cam.z;
    const hAngle = deg(Math.atan((scr.w / 2 - cam.x) / dz) + Math.atan((scr.w / 2 + cam.x) / dz));
    const vAngle = deg(Math.atan((screenCenterY - cam.y) / dz)); // + = look up
    const offAxis = deg(Math.atan(Math.abs(cam.x) / dz));
    const widths = dz / scr.w;

    // Score: THX recommends ~36–40° horizontal view; SMPTE minimum 30°.
    let score = 100;
    if (hAngle < 36) score -= (36 - hAngle) * 2.4;
    if (hAngle > 46) score -= (hAngle - 46) * 2.2;
    if (vAngle > 8) score -= (vAngle - 8) * 2.6;
    if (vAngle < -10) score -= (-10 - vAngle) * 1.5;
    if (offAxis > 12) score -= (offAxis - 12) * 1.9;
    score = Math.round(clamp(score, 0, 100));

    const rowsTotal = layout.rows.length;
    const backFraction = rowsTotal > 1 ? seat.row / (rowsTotal - 1) : 0.5;
    const hallHalf = scr.hall / 2;

    const notes = [];
    if (hAngle > 58) notes.push('Very close – the screen will overflow your vision; expect to turn your head to follow action.');
    else if (hAngle > 46) notes.push('Big and immersive, a little closer than the THX sweet spot.');
    else if (hAngle >= 33) notes.push('Right in the recommended immersion range (THX ≈ 36–40°).');
    else if (hAngle >= 26) notes.push('Comfortable, but the screen will feel smaller than ideal.');
    else notes.push('Far back – the screen will feel small.');
    if (vAngle > 15) notes.push(`You will be looking up ~${Math.round(vAngle)}° – neck strain likely in a long film.`);
    if (offAxis > 22) notes.push('Well off-centre – expect a visibly skewed picture.');
    else if (offAxis > 14) notes.push('Slightly off-centre – mild keystone distortion.');

    let sound, soundShort;
    if (backFraction >= 0.5 && backFraction <= 0.85 && Math.abs(cam.x) < hallHalf * 0.35) { soundShort = 'Sweet spot'; sound = 'Centred, about ⅔ back'; }
    else if (Math.abs(cam.x) > hallHalf * 0.65) { soundShort = 'Side-heavy'; sound = 'Near a side wall'; }
    else if (backFraction < 0.25) { soundShort = 'Front-heavy'; sound = 'Close to the front speakers'; }
    else { soundShort = 'Balanced'; sound = 'Good mix of front and surround'; }

    let headline;
    if (hAngle > 58) headline = 'Very close – you’ll turn your head to follow the action.';
    else if (vAngle > 15) headline = 'You’ll be looking up for the whole film.';
    else if (offAxis > 22) headline = 'Far off-centre – the picture looks skewed.';
    else if (hAngle > 46) headline = 'Big and immersive, slightly closer than ideal.';
    else if (hAngle >= 33) headline = 'Ideal immersion, comfortable to watch.';
    else if (hAngle >= 26) headline = 'Comfortable, the screen feels a little small.';
    else headline = 'Far back – the screen feels small.';

    let verdict;
    if (score >= 85) verdict = 'Excellent seat';
    else if (score >= 70) verdict = 'Good seat';
    else if (score >= 50) verdict = 'Okay seat';
    else verdict = 'Limited view';

    return {
      cam, screen: { w: scr.w, h: scr.h, centerY: screenCenterY, bottom: s.screenBottom, format: scr.format }, hall: scr.hall,
      metrics: { hAngle, vAngle, offAxis, widths, distance: dz, score, verdict, notes, sound, soundShort, headline, backFraction }
    };
  };
})();
