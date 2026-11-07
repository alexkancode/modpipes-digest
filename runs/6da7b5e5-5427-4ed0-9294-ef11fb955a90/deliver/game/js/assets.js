// Sprite strips (real art or procedural placeholder), and every boot-time bake: glow, water, vignette, labels, digit atlases.
const Assets = (() => {
  const FONT = '"Trebuchet MS", Verdana, sans-serif';
  const GLYPHS = '0123456789/%';
  const A = { img: {}, ready: false, L: {}, plus: [], settled: 0, total: 0 };

  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function planOf(key) {
    const plan = window.ASSET_PLAN;
    const name = ART_ALIAS[key] || key;
    if (!plan || !plan.sprites) return null;
    for (let i = 0; i < plan.sprites.length; i++) if (plan.sprites[i].name === name) return plan.sprites[i];
    return null;
  }

  // ---------- placeholders (same strip layout as the real art) ----------
  function circle(g, x, y, r, fill, stroke) {
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); }
  }
  function ellipse(g, x, y, rx, ry, fill, stroke) {
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); }
  }
  const P = PALETTE;
  const DRAW = {
    frog(g, f) {
      const body = f === FROG_F.frozen ? P.ice : P.frog;
      const sx = f === FROG_F.crouch ? 1.2 : f === FROG_F.air ? 0.85 : 1;
      const sy = f === FROG_F.crouch ? 0.8 : f === FROG_F.air ? 1.15 : 1;
      if (f === FROG_F.air || f === FROG_F.dive) { g.fillStyle = P.ink; g.fillRect(9, 23, 4, 7); g.fillRect(19, 23, 4, 7); g.fillStyle = body; g.fillRect(10, 24, 2, 5); g.fillRect(20, 24, 2, 5); }
      else { ellipse(g, 8, 25, 4, 3, body, P.ink); ellipse(g, 24, 25, 4, 3, body, P.ink); }
      ellipse(g, 16, 19, 11 * sx, 9 * sy, body, P.ink);
      if (f !== FROG_F.dive) {
        ellipse(g, 16, 22, 6 * sx, 4 * sy, f === FROG_F.puff ? P.frogBelly : P.frogBelly);
        if (f === FROG_F.puff) circle(g, 16, 23, 6, P.frogBelly, P.ink);
        circle(g, 10, 11, 4, body, P.ink); circle(g, 22, 11, 4, body, P.ink);
        g.fillStyle = f === FROG_F.frozen ? P.iceEdge : P.ink; g.fillRect(9, 10, 2, 2); g.fillRect(21, 10, 2, 2);
        if (f === FROG_F.tongue) { g.fillStyle = P.ink; g.fillRect(13, 18, 6, 3); g.fillStyle = P.tongue; g.fillRect(14, 19, 4, 2); }
        if (f === FROG_F.frozen) { g.fillStyle = P.iceEdge; g.fillRect(8, 15, 16, 1); g.fillRect(12, 20, 9, 1); }
      }
    },
    pad(g, f) {
      const frozen = f === PAD_F.frozen;
      g.beginPath(); g.moveTo(24, 24);
      if (frozen) { for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI * 2; g.lineTo(24 + Math.cos(a) * 22, 24 + Math.sin(a) * 22); } }
      else g.arc(24, 24, 22, 0.35, Math.PI * 2 - 0.35);
      g.closePath();
      g.fillStyle = frozen ? P.padFrozen : P.pad; g.fill();
      g.strokeStyle = frozen ? P.ink : f === PAD_F.frosting ? P.iceEdge : P.padLight; g.lineWidth = frozen ? 1 : 2; g.stroke();
      g.strokeStyle = frozen ? P.iceEdge : P.padShadow; g.lineWidth = 1; g.beginPath();
      if (frozen) { g.moveTo(10, 14); g.lineTo(30, 30); g.moveTo(24, 6); g.lineTo(20, 40); g.moveTo(36, 12); g.lineTo(28, 22); }
      else { g.moveTo(24, 24); g.lineTo(8, 16); g.moveTo(24, 24); g.lineTo(14, 40); g.moveTo(24, 24); g.lineTo(30, 6); }
      g.stroke();
      if (f === PAD_F.frosting) { g.fillStyle = P.ice; g.fillRect(12, 10, 2, 2); g.fillRect(34, 32, 2, 2); g.fillRect(16, 36, 2, 2); }
    },
    firefly(g, f) {
      g.fillStyle = P.ink; g.fillRect(1, 2, 2, 2);
      g.fillStyle = f === 0 ? P.fireflyGlow : P.fireflyDim; g.fillRect(2, 2, 4, 4);
      if (f === 0) { g.fillStyle = P.firefly; g.fillRect(3, 3, 2, 2); }
    },
    golden(g, f) {
      const r = f ? 5 : 4;
      g.fillStyle = P.golden;
      for (let i = 0; i < r - 2; i++) { g.fillRect(6 - 3 - i, 6 - 3 - i, 1, 1); g.fillRect(6 + 2 + i, 6 - 3 - i, 1, 1); g.fillRect(6 - 3 - i, 6 + 2 + i, 1, 1); g.fillRect(6 + 2 + i, 6 + 2 + i, 1, 1); }
      g.fillRect(4, 4, 4, 4); g.fillStyle = f ? P.firefly : P.golden; g.fillRect(5, 5, 2, 2);
    },
    jar(g) {
      g.strokeStyle = P.text; g.lineWidth = 1; g.strokeRect(3.5, 8.5, 13, 18);
      g.fillStyle = '#8A6A44'; g.fillRect(6, 2, 8, 5); g.strokeStyle = P.ink; g.strokeRect(5.5, 1.5, 9, 6);
      g.fillStyle = P.iceShadow; g.fillRect(5, 10, 1, 6);
    },
    snowflake(g, f) {
      g.strokeStyle = P.iceEdge; g.lineWidth = 2; g.beginPath();
      for (let i = 0; i < 6; i++) { if (f && i === 4) continue; const a = i / 6 * Math.PI * 2; g.moveTo(6, 6); g.lineTo(6 + Math.cos(a) * 5, 6 + Math.sin(a) * 5); }
      g.stroke();
      if (f) { g.strokeStyle = P.ink; g.lineWidth = 1; g.beginPath(); g.moveTo(1, 2); g.lineTo(11, 10); g.stroke(); }
    },
    chevron(g, f) {
      g.save(); g.translate(4, 4); g.rotate(f * Math.PI / 2);
      g.strokeStyle = P.ink; g.lineWidth = 4; g.beginPath(); g.moveTo(-3, 2); g.lineTo(0, -2); g.lineTo(3, 2); g.stroke();
      g.strokeStyle = P.fireflyGlow; g.lineWidth = 2; g.stroke(); g.restore();
    },
    mute(g, f) {
      g.fillStyle = P.text; g.fillRect(1, 4, 3, 4); g.beginPath(); g.moveTo(3, 4); g.lineTo(7, 1); g.lineTo(7, 11); g.lineTo(3, 8); g.fill();
      g.strokeStyle = P.text; g.lineWidth = 1; g.beginPath();
      if (f) { g.moveTo(8, 4); g.lineTo(11, 8); g.moveTo(11, 4); g.lineTo(8, 8); } else { g.arc(7, 6, 3, -0.9, 0.9); g.moveTo(10.5, 2); g.arc(7, 6, 5, -0.9, 0.9); }
      g.stroke();
    },
    reeds(g, f) {
      g.strokeStyle = P.reed; g.lineWidth = 2; g.beginPath();
      const lean = f ? 2 : -2;
      for (let i = 0; i < 5; i++) { const x = 4 + i * 4; g.moveTo(x, 40); g.lineTo(x + lean * (1 + i % 2), 8 + (i * 7) % 14); }
      g.stroke(); g.fillStyle = P.ripple; g.fillRect(11 + lean * 2, 6, 3, 8);
    },
  };

  function bakePlaceholder(key) {
    const need = SPRITE_NEEDS[key], n = need.frames.length;
    const c = canvas(need.w * n, need.h), g = c.getContext('2d');
    for (let f = 0; f < n; f++) {
      g.save(); g.translate(f * need.w, 0);
      g.beginPath(); g.rect(0, 0, need.w, need.h); g.clip();
      DRAW[key](g, f);
      g.fillStyle = '#FF00FF'; g.fillRect(0, 0, 2, 1); g.fillRect(0, 0, 1, 2);
      g.restore();
    }
    return c;
  }

  function bakeFromImage(key, img, plan) {
    const need = SPRITE_NEEDS[key], n = need.frames.length;
    const planFrames = Math.max(1, plan.frames | 0), fw = img.width / planFrames, fh = img.height;
    const c = canvas(need.w * n, need.h), g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const map = FRAME_MAP[key];
    for (let f = 0; f < n; f++) {
      const pf = Math.min(planFrames - 1, map ? map[f] : f);
      g.drawImage(img, pf * fw, 0, fw, fh, f * need.w, 0, need.w, need.h);
    }
    return c;
  }

  function settle() { A.settled++; if (A.settled >= A.total) A.ready = true; }

  // Adds a 1 px outline of `color` around the chosen frames (all when `only` < 0).
  // Each frame is clipped to its own cell, so the outline never bleeds into the neighbouring frame.
  function outlined(src, fw, color, only) {
    const sil = canvas(src.width, src.height), s = sil.getContext('2d');
    s.drawImage(src, 0, 0); s.globalCompositeOperation = 'source-in'; s.fillStyle = color; s.fillRect(0, 0, sil.width, sil.height);
    const c = canvas(src.width, src.height), g = c.getContext('2d');
    for (let x = 0; x < src.width; x += fw) {
      if (only >= 0 && x !== only * fw) continue;
      g.save(); g.beginPath(); g.rect(x, 0, fw, src.height); g.clip();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) g.drawImage(sil, x, 0, fw, src.height, x + dx, dy, fw, src.height);
      g.restore();
    }
    g.drawImage(src, 0, 0);
    return c;
  }
  // frog: a light rim so it separates from the green pad; frozen pad: ink, so it reads on the white ice sheet.
  const OUTLINED = { frog: ['frogBelly', -1], pad: ['ink', PAD_F.frozen] };
  function outline(key) { const o = OUTLINED[key]; if (o) A.img[key] = outlined(A.img[key], SPRITE_NEEDS[key].w, PALETTE[o[0]], o[1]); }

  function loadSprites() {
    const keys = Object.keys(SPRITE_NEEDS);
    A.total = keys.length;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      A.img[key] = bakePlaceholder(key);
      outline(key);
      const plan = planOf(key);
      if (!plan) { console.warn('placeholder:', key); settle(); continue; }
      const img = new Image();
      img.onload = () => { try { A.img[key] = bakeFromImage(key, img, plan); outline(key); } catch (e) { console.warn('placeholder:', key); } settle(); };
      img.onerror = () => { console.warn('placeholder:', key); settle(); };
      img.src = 'assets/' + plan.file;
    }
  }

  // ---------- text ----------
  function font(size) { return 'bold ' + size + 'px ' + FONT; }
  function text(str, size, color, shadow) {
    const sh = shadow == null ? 1 : shadow;
    const m = canvas(1, 1).getContext('2d'); m.font = font(size);
    const c = canvas(Math.ceil(m.measureText(str).width) + 2 + sh, Math.ceil(size * 1.35) + sh);
    const g = c.getContext('2d'); g.font = font(size); g.textBaseline = 'top';
    g.fillStyle = PALETTE.ink; g.fillText(str, 1 + sh, 1 + sh);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) g.fillText(str, 1 + dx, 1 + dy);   // 1 px ink outline: legible over pads and ice
    g.fillStyle = color; g.fillText(str, 1, 1);
    return c;
  }
  function atlas(size, color) {
    const n = GLYPHS.length, m = canvas(1, 1).getContext('2d'); m.font = font(size);
    const w = new Float32Array(n), x = new Float32Array(n);
    let total = 0;
    for (let i = 0; i < n; i++) { w[i] = Math.ceil(m.measureText(GLYPHS[i]).width); x[i] = total; total += w[i] + 3; }
    const h = Math.ceil(size * 1.35) + 2, c = canvas(total, h), g = c.getContext('2d');
    g.font = font(size); g.textBaseline = 'top';
    for (let i = 0; i < n; i++) {   // glyph at (x+1, 1) inside a w+2 cell: drop shadow plus 1 px ink outline
      g.fillStyle = PALETTE.ink; g.fillText(GLYPHS[i], x[i] + 2, 2);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) g.fillText(GLYPHS[i], x[i] + 1 + dx, 1 + dy);
      g.fillStyle = color; g.fillText(GLYPHS[i], x[i] + 1, 1);
    }
    return { c, w, x, h, size };
  }

  // ---------- procedural bakes ----------
  function radial(size, stops) {
    const c = canvas(size, size), g = c.getContext('2d'), r = size / 2;
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    for (let i = 0; i < stops.length; i += 2) gr.addColorStop(stops[i], stops[i + 1]);
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
    return c;
  }
  function alphaHex(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function bakeWater() {
    const { cx, cy, a, b } = CFG.pond;
    const c = canvas(CFG.W, CFG.H), g = c.getContext('2d');
    g.fillStyle = PALETTE.shore; g.fillRect(0, 0, CFG.W, CFG.H);
    g.save(); g.translate(cx, cy); g.scale(1, b / a);
    const gr = g.createRadialGradient(0, 0, a * 0.2, 0, 0, a);
    gr.addColorStop(0, PALETTE.water); gr.addColorStop(0.75, PALETTE.water); gr.addColorStop(1, PALETTE.deepWater);
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, a, 0, Math.PI * 2); g.fill(); g.restore();
    g.strokeStyle = PALETTE.reed; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, a + 1, b + 1, 0, 0, Math.PI * 2); g.stroke();
    // static ripple marks, from a local generator so gameplay rng is untouched
    let s = 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    g.strokeStyle = PALETTE.ripple; g.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const ang = r() * Math.PI * 2, rho = 0.15 + r() * 0.7, w = 6 + r() * 10;
      const x = cx + Math.cos(ang) * a * rho, y = cy + Math.sin(ang) * b * rho;
      g.beginPath(); g.ellipse(x, y, w, w * 0.3, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    }
    return c;
  }

  function bakeVignette() {
    const c = canvas(CFG.W, CFG.H), g = c.getContext('2d');
    g.save(); g.translate(CFG.W / 2, CFG.H / 2); g.scale(1, CFG.H / CFG.W);
    const gr = g.createRadialGradient(0, 0, CFG.W * 0.3, 0, 0, CFG.W * 0.72);
    gr.addColorStop(0, alphaHex(PALETTE.ice, 0)); gr.addColorStop(1, alphaHex(PALETTE.ice, 0.35));
    g.fillStyle = gr; g.fillRect(-CFG.W, -CFG.W, CFG.W * 2, CFG.W * 2); g.restore();
    return c;
  }

  function bakeLabels() {
    const L = A.L, T = PALETTE.text, G = PALETTE.fireflyGlow;
    L.press = text('click or press Space', 16, G);
    L.snap = text('snap!', 13, T);
    L.ice = text('the pond is freezing!', 13, PALETTE.ice);
    L.gulp = text('gulp', 13, PALETTE.frogBelly);
    L.thaw = text('thaw!', 13, T);
    L.mid = text('×2 mid-hop!', 13, PALETTE.golden);
    L.golden = text('golden!', 13, PALETTE.golden);
    L.tooFar = text('too far', 13, PALETTE.iceEdge);
    L.x2 = text('×2', 13, PALETTE.golden);
    L.streak = text('streak', 13, G);
    L.streakGrey = text('streak', 13, PALETTE.ripple);
    for (let n = 0; n <= 150; n += 5) A.plus[n / 5] = text('+' + n, 13, T);
    A.digits24 = atlas(24, T);
    A.digits24g = atlas(24, G);
    A.digits18g = atlas(18, G);
    A.digits18 = atlas(18, T);
    A.digits18d = atlas(18, PALETTE.danger);
    A.digits13g = atlas(13, G);
    A.digits13grey = atlas(13, PALETTE.ripple);
  }

  A.boot = function () {
    const pal = window.ASSET_PLAN && window.ASSET_PLAN.palette;
    if (pal) for (const k in pal) PALETTE[PALETTE_ALIAS[k] || k] = pal[k];
    loadSprites();
    A.wash = radial(44, [0, alphaHex(PALETTE.fireflyGlow, 0.45), 0.5, alphaHex('#FF9A2E', 0.18), 1, alphaHex('#FF9A2E', 0)]);
    A.halo = radial(28, [0, alphaHex('#FFF4C2', 0.95), 0.35, alphaHex(PALETTE.fireflyGlow, 0.55), 1, alphaHex(PALETTE.fireflyGlow, 0)]);
    A.frogHalo = radial(56, [0, alphaHex(PALETTE.frog, 0.45), 0.6, alphaHex(PALETTE.frog, 0.15), 1, alphaHex(PALETTE.frog, 0)]);
    A.glow = radial(28, [0, alphaHex('#FFF4C2', 1), 0.3, alphaHex(PALETTE.fireflyGlow, 0.7), 1, alphaHex(PALETTE.fireflyGlow, 0)]);
    A.goldGlow = radial(36, [0, alphaHex('#FFFFFF', 1), 0.3, alphaHex(PALETTE.golden, 0.8), 1, alphaHex(PALETTE.golden, 0)]);
    A.bloom = radial(128, [0, alphaHex('#FFFFFF', 0.9), 0.5, alphaHex(PALETTE.ice, 0.5), 1, alphaHex(PALETTE.ice, 0)]);
    A.water = bakeWater();
    A.vignette = bakeVignette();
    bakeLabels();
  };
  A.text = text;
  A.canvas = canvas;
  A.font = font;
  A.glyph = function (ch) { return GLYPHS.indexOf(ch); };
  return A;
})();
