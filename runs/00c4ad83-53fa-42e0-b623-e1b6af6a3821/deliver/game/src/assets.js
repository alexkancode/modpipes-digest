// Assets: asset-plan resolution, sprite loading with visible placeholders, and every bake.
// shadowBlur and gradients appear only in this file, at bake time.
const Assets = {
  plan: { sprites: [], sfx: [] },
  spr: {},          // name -> sprite record (always present, placeholder until the PNG loads)
  shapes: [],       // baked building shapes
  sky: null, glyph: {}, k: 1,
  warmList: [],     // canvases/images to draw once for GPU warm-up

  init() {
    this.plan = window.ASSET_PLAN || this.plan;
    this.makeRecords();
    this.loadImages();
    // Over http the live JSON wins over the embedded mirror (file:// can't fetch).
    if (location.protocol.startsWith('http') && window.fetch) {
      fetch('assets/asset-plan.json').then((r) => (r.ok ? r.json() : null)).then((p) => {
        if (p && p.sprites) { this.plan = p; this.makeRecords(); this.loadImages(); Snd.resolve(); }
      }).catch(() => {});
    }
  },

  planSprite(name) {
    const list = this.plan.sprites || [];
    for (let i = 0; i < list.length; i++) if (list[i].name === name) return list[i];
    return null;
  },

  makeRecords() {
    for (const name in SPRITE_NEEDS) {
      const d = this.planSprite(name) || { name, file: name + '.png', w: 32, h: 32, frames: 1, anchor: [16, 16] };
      const frames = d.frames || 1;
      // Plan w/h are per frame; the strip is frames*w wide.
      const old = this.spr[name];
      const rec = old && old.data.file === d.file ? old : (this.spr[name] = {
        name, ok: false, img: null, s: 1, tintMag: null, tintLime: null, fallback: SPRITE_NEEDS[name], loading: null,
      });
      rec.data = d; rec.frames = frames;
      rec.ax = d.anchor ? d.anchor[0] : d.w / 2; rec.ay = d.anchor ? d.anchor[1] : d.h / 2;
      if (rec.ok) { rec.fw = rec.img.width / frames; rec.fh = rec.img.height; } else { rec.fw = d.w; rec.fh = d.h; }
    }
    this.placeholders();
  },

  loadImages() {
    for (const name in this.spr) {
      const rec = this.spr[name];
      const file = rec.data.file;
      if (!file || rec.loading === file) continue;
      rec.loading = file;
      const img = new Image();
      img.onload = () => {
        const r = this.spr[name];
        r.img = img; r.s = 1; r.ok = true;
        r.fw = img.width / r.frames; r.fh = img.height;
        if (name.startsWith('monster_')) { r.tintMag = this.tint(img, PAL.mag); r.tintLime = this.tint(img, PAL.lime); }
        this.warmList.push(img);
      };
      img.onerror = () => console.warn('[assets] missing sprite, using placeholder:', name);
      img.src = 'assets/' + file;
    }
  },

  canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    return c;
  },

  tint(img, col) {
    const c = this.canvas(img.width, img.height), g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
    return c;
  },

  // ---------- k-dependent bakes ----------
  bake(k) {
    this.k = k;
    this.placeholders();
    this.bakeSky();
    this.bakeBuildings();
    this.bakeGlyphs();
    this.card = this.canvas(320 * k, 248 * k);
  },

  // A placeholder per sprite, drawn at scale k so stand-ins stay sharp. Missing art is obvious but playable.
  placeholders() {
    const k = this.k;
    for (const name in this.spr) {
      const r = this.spr[name];
      if (r.ok || r.fallback === 'rig') continue;
      const fw = r.data.w, fh = r.data.h, n = r.frames;
      const c = this.canvas(fw * n * k, fh * k), g = c.getContext('2d');
      g.scale(k, k);
      for (let i = 0; i < n; i++) {
        g.save(); g.translate(i * fw, 0);
        if (r.fallback === 'box') this.drawBox(g, name, fw, fh, i);
        else if (r.fallback === 'rubble') this.drawRubble(g, fw, fh, i);
        else if (r.fallback === 'signs') this.drawSign(g, fw, fh, i);
        else if (r.fallback === 'crosshair') this.drawCross(g, fw, fh);
        else if (r.fallback === 'logo') this.drawLogo(g, fw, fh);
        g.restore();
      }
      r.img = c; r.s = k; r.fw = fw; r.fh = fh;
    }
  },

  drawBox(g, name, w, h, i) {
    const col = name === 'tank' || name === 'heli' || name === 'tank_barrel' ? PAL.mag : name === 'antenna' ? PAL.yellow : PAL.lime;
    g.fillStyle = PAL.night; g.fillRect(1, 1, w - 2, h - 2);
    g.strokeStyle = col; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
    g.lineWidth = 1; g.beginPath(); g.moveTo(2, 2); g.lineTo(w - 2, h - 2); g.moveTo(w - 2, 2); g.lineTo(2, h - 2); g.stroke();
    g.fillStyle = col;
    for (let t = 0; t <= i; t++) g.fillRect(3 + t * 3, 3, 2, 3);
  },

  drawRubble(g, w, h, i) {
    const r = mkRng(77 + i * 13);
    g.beginPath(); g.moveTo(2, h - 2);
    for (let x = 6; x < w - 4; x += 8 + r() * 8) g.lineTo(x, h - 4 - 6 - r() * 14);
    g.lineTo(w - 2, h - 2); g.closePath();
    g.fillStyle = PAL.face; g.fill();
    glowStroke(g, PAL.cyan, 2, 6);
  },

  drawSign(g, w, h, i) {
    g.font = 'bold 12px "Courier New", ui-monospace, monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.beginPath();
    if (i === 0) roundRect(g, 4, 8, 72, 24, 5);
    else if (i === 1) { roundRect(g, 6, 4, 20, 32, 9); g.moveTo(16, 4); g.lineTo(16, 16); g.moveTo(6, 16); g.lineTo(26, 16); }
    else { roundRect(g, 4, 10, 22, 22, 4); roundRect(g, 54, 4, 20, 32, 9); g.moveTo(64, 4); g.lineTo(64, 16); g.moveTo(54, 16); g.lineTo(74, 16); }
    glowStroke(g, PAL.lime, 2, 6);
    g.fillStyle = PAL.lime;
    if (i === 0) g.fillText('SPACE', 40, 21);
    else if (i === 1) { g.fillRect(7, 5, 9, 11); g.fillText('CLICK', 53, 21); }
    else { g.fillRect(65, 5, 8, 11); g.fillText('F', 15, 22); g.fillText('/', 40, 21); }
  },

  drawCross(g, w, h) {
    const c = w / 2;
    g.fillStyle = PAL.night; g.fillRect(c - 1.5, 0, 3, h); g.fillRect(0, c - 1.5, w, 3);
    g.fillStyle = PAL.lime;
    g.fillRect(c - 0.5, 1, 1, 4); g.fillRect(c - 0.5, h - 5, 1, 4); g.fillRect(1, c - 0.5, 4, 1); g.fillRect(w - 5, c - 0.5, 4, 1);
    g.fillRect(c - 0.5, c - 0.5, 1, 1);
  },

  drawLogo(g, w, h) {
    g.font = 'bold 44px "Courier New", ui-monospace, monospace';
    g.textAlign = 'right'; g.textBaseline = 'middle';
    g.lineWidth = 2; g.shadowBlur = 12;
    g.shadowColor = g.strokeStyle = PAL.cyan; g.strokeText('NEON', w / 2 - 6, h / 2);
    g.textAlign = 'left';
    g.shadowColor = g.strokeStyle = PAL.lime; g.strokeText('KAIJU', w / 2 + 6, h / 2);
  },

  bakeSky() {
    const k = this.k, W = 832, H = 300;
    const c = this.canvas(W * k, H * k), g = c.getContext('2d');
    g.scale(k, k);
    const gr = g.createLinearGradient(0, 0, 0, 190);
    gr.addColorStop(0, PAL.night); gr.addColorStop(1, '#150c3a');
    g.fillStyle = gr; g.fillRect(0, 0, W, 190);
    g.fillStyle = PAL.night; g.fillRect(0, 190, W, H - 190);
    const r = mkRng(4242);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 60; i++) g.fillRect((r() * W) | 0, (r() * 150) | 0, 1, 1);
    // far skyline: outlined blocks on the horizon (y = 190)
    let x = 0;
    g.beginPath();
    const blocks = [];
    while (x < W) { const bw = 18 + r() * 34, bh = 30 + r() * 50; blocks.push(x, bw, bh); g.rect(x + 0.5, 190 - bh + 0.5, bw, bh); x += bw + 2 + r() * 10; }
    g.fillStyle = '#0e0828'; g.fill();
    g.shadowBlur = 6; g.shadowColor = PAL.grid; g.strokeStyle = PAL.grid; g.lineWidth = 1; g.stroke();
    g.shadowBlur = 0;
    g.fillStyle = 'rgba(25,240,255,0.3)';
    for (let i = 0; i < blocks.length; i += 3) {
      for (let wy = 190 - blocks[i + 2] + 5; wy < 186; wy += 6)
        for (let wx = blocks[i] + 4; wx < blocks[i] + blocks[i + 1] - 3; wx += 5) if (r() < 0.3) g.fillRect(wx, wy, 1, 1);
    }
    g.strokeStyle = PAL.grid; g.beginPath(); g.moveTo(0, 190.5); g.lineTo(W, 190.5); g.stroke();
    this.sky = c;
    this.warmList.push(c);
  },

  // Buildings: random-size shapes baked per damage stage (0 standing, 1 cracked, 2 heavy, 3 flash outline).
  bakeBuildings() {
    const C = CONFIG.city, k = this.k, pad = C.pad, r = mkRng(1977);
    this.shapes.length = 0;
    for (let i = 0; i < C.shapes + C.powerShapes; i++) {
      const power = i >= C.shapes;
      const w = Math.round(power ? lerp(C.powerW[0], C.powerW[1], r()) : lerp(C.wMin, C.wMax, r()));
      const h = Math.round(power ? lerp(C.powerH[0], C.powerH[1], r()) : lerp(C.hMin, C.hMax, r()));
      const roof = power ? 0 : i % 3;
      const color = power ? PAL.yellow : PAL.cyan;
      const cw = w + pad * 2 + 10, ch = h + pad + 34;
      const sh = { w, h, roof, power, color, cw, ch, bx: cw / 2, by: ch - pad, canv: [] , seed: 100 + i * 31 };
      for (let st = 0; st < 4; st++) {
        const c = this.canvas(cw * k, ch * k), g = c.getContext('2d');
        g.scale(k, k);
        drawBuilding(g, sh, st);
        sh.canv.push(c); this.warmList.push(c);
      }
      this.shapes.push(sh);
    }
  },

  // Glyph atlases: one canvas per (colour, size), fixed-advance monospace, outlined and glow-baked.
  CHARS: ' 0123456789+-x:/.ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  bakeGlyphs() {
    const k = this.k, defs = [['y12', PAL.yellow, 12], ['y14', PAL.yellow, 14], ['y16', PAL.yellow, 16], ['y18', PAL.yellow, 18],
      ['y20', PAL.yellow, 20], ['y24', PAL.yellow, 24], ['l12', PAL.lime, 12], ['w12', PAL.white, 12], ['w16', PAL.white, 16], ['m12', PAL.mag, 12]];
    const map = new Int16Array(128).fill(-1);
    for (let i = 0; i < this.CHARS.length; i++) map[this.CHARS.charCodeAt(i)] = i;
    for (const [id, col, px] of defs) {
      const font = 'bold ' + px + 'px "Courier New", ui-monospace, monospace';
      const m = this.canvas(8, 8).getContext('2d'); m.font = font;
      const adv = Math.ceil(m.measureText('M').width);
      const cellW = adv + 6, cellH = px + 8;
      const c = this.canvas(cellW * this.CHARS.length * k, cellH * k), g = c.getContext('2d');
      g.scale(k, k); g.font = font; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
      const base = 4 + Math.round(px * 0.85);
      for (let i = 0; i < this.CHARS.length; i++) {
        const ch = this.CHARS[i], x = i * cellW + 3;
        g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = PAL.night; g.strokeText(ch, x, base);
        g.shadowBlur = 4; g.shadowColor = col; g.fillStyle = col; g.fillText(ch, x, base); g.shadowBlur = 0;
      }
      this.glyph[id] = { c, adv, cellW, cellH, base, map, px };
      this.warmList.push(c);
    }
  },
};

// ---------- bake-time drawing helpers ----------
function mkRng(seed) {
  let s = seed >>> 0;
  return () => {
    let t = (s = (s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRect(g, x, y, w, h, r) {
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// Neon outline on the current path: wide faint stroke, blurred glow, crisp core.
function glowStroke(g, col, w, wide) {
  g.save();
  g.lineJoin = 'round'; g.strokeStyle = col;
  g.globalAlpha = 0.22; g.lineWidth = wide; g.stroke();
  g.globalAlpha = 1; g.shadowBlur = 8; g.shadowColor = col; g.lineWidth = w; g.stroke();
  g.restore();
}

function buildingPath(g, sh) {
  const x0 = sh.bx - sh.w / 2, x1 = sh.bx + sh.w / 2, y1 = sh.by, y0 = sh.by - sh.h;
  g.beginPath();
  if (sh.roof === 1) { // stepped setback: top third 70% wide
    const sy = y0 + sh.h / 3, inset = sh.w * 0.15;
    g.moveTo(x0, y1); g.lineTo(x0, sy); g.lineTo(x0 + inset, sy); g.lineTo(x0 + inset, y0);
    g.lineTo(x1 - inset, y0); g.lineTo(x1 - inset, sy); g.lineTo(x1, sy); g.lineTo(x1, y1);
  } else if (sh.roof === 2) { // slanted roof
    g.moveTo(x0, y1); g.lineTo(x0, y0 + 14); g.lineTo(x1, y0); g.lineTo(x1, y1);
  } else { // flat with a ledge
    g.moveTo(x0, y1); g.lineTo(x0, y0 + 4); g.lineTo(x0 - 3, y0 + 4); g.lineTo(x0 - 3, y0); g.lineTo(x1 + 3, y0);
    g.lineTo(x1 + 3, y0 + 4); g.lineTo(x1, y0 + 4); g.lineTo(x1, y1);
  }
  g.closePath();
}

function drawBuilding(g, sh, st) {
  const r = mkRng(sh.seed);
  const x0 = sh.bx - sh.w / 2, y0 = sh.by - sh.h;
  if (st === 2) { g.translate(sh.bx, sh.by); g.rotate(2 * DEG); g.translate(-sh.bx, -sh.by); }
  buildingPath(g, sh);
  if (st === 3) { glowStroke(g, PAL.white, 3, 8); return; }
  g.fillStyle = PAL.face; g.fill();
  g.save(); g.clip();
  // floor lines
  g.strokeStyle = PAL.cyan; g.globalAlpha = 0.25; g.lineWidth = 1; g.beginPath();
  for (let y = sh.by - 16; y > y0 + 6; y -= 16) { g.moveTo(x0, y + 0.5); g.lineTo(x0 + sh.w, y + 0.5); }
  g.stroke(); g.globalAlpha = 1;
  // windows: 6x8 cells on a 12x16 pitch
  const darkP = st === 0 ? 0 : st === 1 ? 0.25 : 0.5;
  const cols = Math.floor((sh.w - 8) / 12), mx = x0 + (sh.w - cols * 12) / 2 + 3;
  const top = y0 + (sh.roof === 1 ? 6 : 18);
  for (let y = sh.by - 14; y > top; y -= 16) {
    for (let c = 0; c < cols; c++) {
      const wx = mx + c * 12, a = r(), b = r();
      if (sh.roof === 1 && y < y0 + sh.h / 3 && (wx < x0 + sh.w * 0.15 + 2 || wx + 6 > x0 + sh.w * 0.85 - 2)) continue;
      if (b < darkP) { g.fillStyle = PAL.cyanDim; g.globalAlpha = 0.35; }
      else { g.fillStyle = sh.power ? PAL.cyan : a < 0.7 ? PAL.yellow : PAL.cyan; g.globalAlpha = 0.9; }
      g.fillRect(wx, y - 8, 6, 8);
    }
  }
  g.globalAlpha = 1;
  // cracks
  if (st > 0) {
    g.strokeStyle = PAL.white; g.globalAlpha = st === 1 ? 0.7 : 0.9; g.lineWidth = st === 1 ? 1 : 2;
    const n = st === 1 ? 2 : 4;
    for (let i = 0; i < n; i++) {
      let x = x0 + sh.w * (0.2 + 0.6 * r()), y = y0 + (sh.roof === 2 ? 10 : 0);
      g.beginPath(); g.moveTo(x, y);
      const len = sh.h * (0.3 + 0.4 * r());
      for (let s = 0; s < 6; s++) { x += (r() - 0.5) * 14; y += len / 6; g.lineTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  g.restore();
  buildingPath(g, sh);
  glowStroke(g, st === 0 ? sh.color : st === 1 && !sh.power ? PAL.cyanDim : sh.color, 2, 6);
  if (sh.roof === 2) { // rod on slanted roofs
    g.beginPath(); g.moveTo(x0 + sh.w * 0.75, y0 + 4); g.lineTo(x0 + sh.w * 0.75, y0 - 14);
    glowStroke(g, sh.color, 1.5, 4);
  }
}
