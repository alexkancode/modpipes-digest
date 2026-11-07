// Render: canvas sizing, layer order, the monster (sprite or rig), HUD, screens and atlas text.
// Live glow is a double stroke or an additive pass; blur and gradient bakes live in assets.js only.
const FONT = '"Courier New", ui-monospace, monospace';

const Render = {
  canvas: null, ctx: null, k: 1, gridFlash: 0, titleT: 0, warmIdx: 0, readyFlashT: 0, wasReady: true,
  // cached style state
  _fill: '', _stroke: '', _lw: -1, _alpha: -1,
  // world transform (camera + shake), in device px
  we: 0, wf: 0, camX: 0,
  codes: new Uint16Array(48), nCodes: 0, digits: new Uint8Array(12),
  rig: null,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.buildRig();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.watchDpr();
  },

  watchDpr() {
    if (!window.matchMedia) return;
    const mq = matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)');
    const on = () => { if (mq.removeEventListener) mq.removeEventListener('change', on); this.resize(); this.watchDpr(); };
    if (mq.addEventListener) mq.addEventListener('change', on);
  },

  resize() {
    const W = CONFIG.W, H = CONFIG.H, vw = window.innerWidth || W, vh = window.innerHeight || H;
    const scale = Math.min(vw / W, vh / H);
    const cssW = Math.floor(W * scale), cssH = Math.floor(H * scale);
    const k = cssW * (window.devicePixelRatio || 1) >= 960 ? 2 : 1;
    const c = this.canvas;
    c.style.width = cssW + 'px'; c.style.height = cssH + 'px';
    c.style.left = ((vw - cssW) >> 1) + 'px'; c.style.top = ((vh - cssH) >> 1) + 'px';
    if (c.width !== W * k) { c.width = W * k; c.height = H * k; }
    this.resetState();
    if (k !== this.k || !Assets.sky) { this.k = k; Assets.bake(k); this.warmIdx = 0; }
    Input.rect = c.getBoundingClientRect();
  },

  resetState() {
    const g = this.ctx;
    g.imageSmoothingEnabled = false;
    g.lineJoin = 'round'; g.lineCap = 'round';
    this._fill = this._stroke = ''; this._lw = this._alpha = -1;
  },

  // ---------- cached setters ----------
  fill(c) { if (c !== this._fill) { this.ctx.fillStyle = c; this._fill = c; } },
  stroke(c) { if (c !== this._stroke) { this.ctx.strokeStyle = c; this._stroke = c; } },
  lw(w) { if (w !== this._lw) { this.ctx.lineWidth = w; this._lw = w; } },
  alpha(a) { if (a !== this._alpha) { this.ctx.globalAlpha = a; this._alpha = a; } },
  screen() { const k = this.k; this.ctx.setTransform(k, 0, 0, k, 0, 0); },
  world() { const k = this.k; this.ctx.setTransform(k, 0, 0, k, this.we, this.wf); },
  // world transform * translate(x,y) * rotate(rot) * scale(sx,sy)
  xf(x, y, rot, sx, sy) {
    const k = this.k, c = Math.cos(rot) * k, s = Math.sin(rot) * k;
    this.ctx.setTransform(c * sx, s * sx, -s * sy, c * sy, this.we + x * k, this.wf + y * k);
  },

  // draw frame `f` of a sprite record with its anchor at the current transform origin
  spr(rec, f, img) {
    const s = rec.s, fw = rec.fw, fh = rec.fh;
    this.ctx.drawImage(img || rec.img, f * fw * s, 0, fw * s, fh * s, -rec.ax * (fw / rec.data.w), -rec.ay, fw, fh);
  },
  sprAt(name, f, x, y, rot, sx, sy) {
    const rec = Assets.spr[name];
    if (!rec || !rec.img) return;
    this.xf(x, y, rot, sx, sy); this.spr(rec, f);
  },
  sprScreen(name, f, x, y, sc) {
    const rec = Assets.spr[name];
    if (!rec || !rec.img) return;
    const k = this.k * (sc || 1);
    this.ctx.setTransform(k, 0, 0, k, Math.round(x * this.k), Math.round(y * this.k));
    this.spr(rec, f);
  },

  // ---------- atlas text (zero allocation) ----------
  begin() { this.nCodes = 0; return this; },
  str(s) { for (let i = 0; i < s.length && this.nCodes < 48; i++) this.codes[this.nCodes++] = s.charCodeAt(i); return this; },
  num(n) {
    n = Math.max(0, Math.floor(n));
    let d = 0;
    do { this.digits[d++] = n % 10; n = (n / 10) | 0; } while (n > 0 && d < 12);
    while (d > 0 && this.nCodes < 48) this.codes[this.nCodes++] = 48 + this.digits[--d];
    return this;
  },
  time(sec) {
    const s = Math.max(0, Math.floor(sec));
    this.num((s / 60) | 0);
    this.codes[this.nCodes++] = 58;
    const r = s % 60;
    this.codes[this.nCodes++] = 48 + ((r / 10) | 0); this.codes[this.nCodes++] = 48 + (r % 10);
    return this;
  },
  // align: 0 left, 1 centre, 2 right. y is the baseline.
  draw(id, x, y, align, sc) {
    const at = Assets.glyph[id];
    if (!at) return 0;
    const k = this.k, s = sc || 1, adv = at.adv * s, w = this.nCodes * adv;
    let x0 = align === 1 ? x - w / 2 : align === 2 ? x - w : x;
    this.screen();
    for (let i = 0; i < this.nCodes; i++) {
      const code = this.codes[i], idx = code < 128 ? at.map[code] : -1;
      if (idx > 0) this.ctx.drawImage(at.c, idx * at.cellW * k, 0, at.cellW * k, at.cellH * k,
        Math.round(x0 + i * adv - 3 * s), Math.round(y - at.base * s), at.cellW * s, at.cellH * s);
    }
    return w;
  },

  // ---------- frame ----------
  frame(alpha, state) {
    const g = this.ctx, k = this.k;
    if (this.gridFlash > 0) this.gridFlash -= 1 / 60;
    const title = state === 'title';
    const camX = title ? 0 : lerp(Cam.px, Cam.x, alpha);
    this.camX = camX;
    const shX = title ? 0 : Fx.shakeX(), shY = title ? 0 : Fx.shakeY();
    this.we = Math.round((-camX + shX) * k); this.wf = Math.round(shY * k);
    g.globalCompositeOperation = 'source-over';
    this.alpha(1);

    this.background(title ? 96 + 90 * Math.sin(this.titleT / 24) : camX * 0.3, title ? this.titleT * 8 : camX);
    this.world();
    this.buildings();
    this.signs();
    this.monster(alpha);
    if (!title) { this.units(alpha); this.shots(); }
    this.particlesFlat();

    g.globalCompositeOperation = 'lighter';
    this.particlesAdd();
    this.rings();
    this.buildingGlows();
    if (!title) { this.unitGlows(); this.swipeTrail(alpha); this.beam(); }
    this.monsterGlow(alpha);
    g.globalCompositeOperation = 'source-over';
    this.alpha(1);

    if (title) this.titleScreen();
    else {
      this.popups();
      this.vignette();
      this.hud();
      if (state === 'play' && !Input.touchMode && Input.cursor.seen) this.crosshair();
      if (Input.touchMode && state === 'play') this.touchUi();
      if (state === 'pause') this.pauseScreen();
      if (state === 'over') this.overScreen();
    }
    this.warm();
  },

  background(skyOff, gridCam) {
    const g = this.ctx, k = this.k, G = CONFIG.GROUND;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(Assets.sky, -Math.round(clamp(skyOff, 0, 192) * k), 0);
    this.screen();
    this.fill(PAL.night); g.fillRect(0, G, CONFIG.W, CONFIG.H - G);
    if (Fx.reducedMotion && Main.state === 'title') gridCam = 0;
    // perspective grid: one path, one stroke
    const flash = this.gridFlash > 0 && ((this.gridFlash * 4) | 0) % 2 === 1;
    this.stroke(flash ? PAL.mag : PAL.grid); this.lw(1); this.alpha(flash ? 0.6 : 1);
    g.beginPath();
    const hz = [0, 4, 10, 19, 32, 51];
    for (let i = 0; i < hz.length; i++) { const y = G + hz[i] + 0.5; g.moveTo(0, y); g.lineTo(CONFIG.W, y); }
    const vpx = 320, vpy = 190, tt = (CONFIG.H - G) / (CONFIG.H - vpy);
    const first = Math.floor((gridCam - 420) / 32);
    for (let i = first; i < first + 46; i++) {
      const bx = i * 32 - gridCam;
      g.moveTo(bx, CONFIG.H); g.lineTo(bx + (vpx - bx) * tt, G);
    }
    g.stroke();
    this.alpha(1);
  },

  buildings() {
    const g = this.ctx, k = this.k, G = CONFIG.GROUND, lots = City.lots, C = CONFIG.city;
    for (let i = 0; i < lots.length; i++) {
      const b = lots[i];
      if (b.cx + 80 < this.camX || b.cx - 80 > this.camX + CONFIG.W) continue;
      if (b.state === B_RUBBLE || b.state === B_COLLAPSE) {
        const rr = Assets.spr.rubble;
        this.alpha(b.state === B_COLLAPSE ? clamp(b.t / C.collapse, 0, 1) * 0.4 : 0.4);
        this.xf(b.cx, G, 0, b.w / rr.data.w, 1); this.spr(rr, b.rubble);
        this.alpha(1);
        if (b.state === B_RUBBLE) continue;
      }
      const sh = Assets.shapes[b.shape];
      let off = 0;
      if (b.state === B_COLLAPSE) off = b.h * easeIn(clamp(b.t / C.collapse, 0, 1));
      else if (b.state === B_REGROW) off = b.h * (1 - easeOut(clamp(b.t / C.regrowT, 0, 1)));
      const wob = b.wobbleT > 0 ? b.swayAmp * Math.sin(b.wobbleT * CONFIG.quake.freq) * (b.wobbleT / b.swayDur) : 0;
      const st = b.state <= B_HEAVY ? b.state : 0;
      const srcH = sh.by - off;
      if (srcH <= 0) continue;
      // lean: shear about the ground line so the base stays planted and the roof moves wob px
      const dx = this.we + Math.round((b.cx - sh.bx) * k), dy = this.wf + Math.round((G - sh.by + off) * k);
      const lean = -wob / srcH;
      g.setTransform(1, 0, lean, 1, -lean * (dy + srcH * k), 0);
      g.drawImage(sh.canv[st], 0, 0, sh.cw * k, srcH * k, dx, dy, sh.cw * k, srcH * k);
      if (b.flashT > 0) g.drawImage(sh.canv[3], 0, 0, sh.cw * k, srcH * k, dx, dy, sh.cw * k, srcH * k);
      if (b.power && b.state !== B_COLLAPSE) this.sprAt('antenna', ((Run.t + Render.titleT) % 1) < 0.5 ? 0 : 1, b.cx + wob, G - b.h + off, 0, 1, 1);
    }
  },

  buildingGlows() {
    const g = this.ctx, G = CONFIG.GROUND, lots = City.lots, t = Run.t + this.titleT;
    this.world();
    for (let i = 0; i < lots.length; i++) {
      const b = lots[i];
      if (b.power && b.state <= B_HEAVY) { // pulsing core diamond
        const y = G - b.h * 0.7, r = 7;
        this.alpha(0.45 + 0.35 * Math.sin(t * 2 * Math.PI)); this.fill(PAL.yellow);
        g.beginPath(); g.moveTo(b.cx, y - r); g.lineTo(b.cx + r, y); g.lineTo(b.cx, y + r); g.lineTo(b.cx - r, y); g.fill();
      }
      if (b.state === B_REGROW) { // glow line sweeping up the face
        const off = b.h * (1 - easeOut(clamp(b.t / CONFIG.city.regrowT, 0, 1)));
        this.alpha(0.9); this.fill(PAL.cyan);
        g.fillRect(b.cx - b.w / 2, G - b.h + off - 2, b.w, 4);
      }
    }
    this.alpha(1);
  },

  signs() {
    const t = Run.t;
    for (let i = 0; i < 3; i++) {
      const s = Signs.list[i];
      if (s.alpha <= 0.01) continue;
      this.alpha(s.alpha * (0.9 + 0.1 * Math.sin(t * 2 * Math.PI)));
      this.sprAt('glyph_signs', i, s.x, s.y + 2 * Math.sin(t * 3), 0, 1, 1);
    }
    this.alpha(1);
  },

  // ---------- monster ----------
  monster(alpha) {
    const m = Monster, P = m.computePose();
    const x = lerp(m.px, m.x, alpha) + P.offX * m.facing, f = m.facing;
    const rec = Assets.spr[P.strip];
    if (rec && rec.ok) {
      const dead = P.strip === 'monster_dead';
      const fr = Math.min(P.frame, rec.frames - 1);
      this.xf(x, CONFIG.GROUND - (dead ? 0 : P.bob), dead ? 0 : P.lean * f, f * P.sx, P.sy);
      this.spr(rec, fr, m.hurtT > 0 ? rec.tintMag : rec.img);
      if (m.healPulseT > 0 && m.hurtT <= 0) { // heal: an additive lime glow that keeps the outline readable
        const g = this.ctx;
        g.globalCompositeOperation = 'lighter'; this.alpha(m.healPulseT * 2);
        this.spr(rec, fr, rec.tintLime);
        g.globalCompositeOperation = 'source-over'; this.alpha(1);
      }
    } else this.drawRig(x, P);
  },

  buildRig() {
    const p = (d) => new Path2D(d);
    this.rig = {
      tail: p('M0,-10 C-30,-14 -56,0 -74,40 L-90,58 C-70,52 -50,30 -24,14 L4,12 Z M-30,-12 L-35,-24 L-41,-9 Z M-50,-5 L-58,-15 L-61,1 Z M-65,12 L-75,6 L-73,22 Z'),
      leg: p('M-12,-4 C-16,20 -12,34 -8,46 L-13,58 L19,58 L12,46 C14,30 14,14 12,-4 Z'),
      body: p('M-30,-52 C-40,-80 -38,-118 -18,-136 C-2,-148 22,-146 32,-128 C42,-110 40,-80 30,-60 C22,-48 -10,-44 -30,-52 Z'),
      belly: p('M30,-70 Q18,-74 8,-70 M35,-88 Q22,-92 12,-88 M35,-106 Q24,-110 14,-106 M21,-100 A5,5 0 1 1 11,-100 A5,5 0 1 1 21,-100'),
      head: p('M-8,-10 L-4,-14 L-14,-34 L4,-18 L10,-19 L6,-38 L20,-18 L40,-10 L48,-2 L44,4 L10,6 L-6,8 Z'),
      jaw: p('M0,0 L36,-2 L34,6 L4,10 Z'),
      arm: p('M-7,-4 C-9,20 -6,44 -2,62 L-7,76 L0,67 L3,80 L6,67 L12,75 L8,62 C10,44 10,20 8,-4 Z'),
    };
  },

  // Draw one rig part: root * translate(px,py) * rotate(ang), then fill + double stroke.
  part(path, px, py, ang, col) {
    const g = this.ctx, R = this.root, c = Math.cos(ang), s = Math.sin(ang);
    g.setTransform(R[0] * c + R[2] * s, R[1] * c + R[3] * s, -R[0] * s + R[2] * c, -R[1] * s + R[3] * c,
      R[0] * px + R[2] * py + R[4], R[1] * px + R[3] * py + R[5]);
    this.fill(PAL.night); g.fill(path);
    this.stroke(col); this.lw(6); this.alpha(0.25); g.stroke(path);
    this.lw(2); this.alpha(1); g.stroke(path);
  },
  root: new Float64Array(6),

  drawRig(x, P) {
    const g = this.ctx, k = this.k, m = Monster, f = m.facing, R = this.root, rg = this.rig;
    const rot = P.lean * f, c = Math.cos(rot) * k, s = Math.sin(rot) * k;
    R[0] = c * f * P.sx; R[1] = s * f * P.sx; R[2] = -s * P.sy; R[3] = c * P.sy;
    R[4] = this.we + x * k; R[5] = this.wf + (CONFIG.GROUND - P.bob) * k;
    const col = m.hurtT > 0 ? PAL.mag : m.healPulseT > 0.14 ? '#b8ffb8' : PAL.lime;
    this.part(rg.tail, -26, -60, P.tail, col);
    this.part(rg.arm, -6, -108, P.armB, col);
    this.part(rg.leg, -14, -58 - P.liftB, P.legB, col);
    this.part(rg.body, 0, 0, 0, col);
    this.stroke(col); this.lw(1); this.alpha(0.6); g.stroke(rg.belly); this.alpha(1);
    this.part(rg.leg, 12, -58 - P.liftF, P.legF, col);
    // head + jaw share the head transform
    this.part(rg.head, 26, -128, P.head, col);
    const hc = Math.cos(P.head), hs = Math.sin(P.head);
    const H0 = R[0] * hc + R[2] * hs, H1 = R[1] * hc + R[3] * hs, H2 = -R[0] * hs + R[2] * hc, H3 = -R[1] * hs + R[3] * hc;
    const H4 = R[0] * 26 + R[2] * -128 + R[4], H5 = R[1] * 26 + R[3] * -128 + R[5];
    const jc = Math.cos(P.jaw), js = Math.sin(P.jaw);
    g.setTransform(H0 * jc + H2 * js, H1 * jc + H3 * js, -H0 * js + H2 * jc, -H1 * js + H3 * jc, H0 * 8 + H2 * 6 + H4, H1 * 8 + H3 * 6 + H5);
    this.fill(PAL.night); g.fill(rg.jaw); this.stroke(col); this.lw(6); this.alpha(0.25); g.stroke(rg.jaw); this.lw(2); this.alpha(1); g.stroke(rg.jaw);
    g.setTransform(H0, H1, H2, H3, H4, H5);
    if (P.eyes !== 2) {
      this.fill(PAL.lime);
      if (P.eyes === 1) { g.fillRect(16, -6, 10, 1.5); g.fillRect(12, -3, 6, 1.5); }
      else {
        g.fillRect(17, -10, 3, 3); g.fillRect(13, -6, 3, 3); g.fillRect(21, -6, 3, 3); g.fillRect(17, -2, 3, 3);
        this.fill(PAL.white); g.fillRect(18, -9, 1, 1); g.fillRect(14, -5, 1, 1); g.fillRect(22, -5, 1, 1); g.fillRect(18, -1, 1, 1);
      }
    }
    this.part(rg.arm, 20, -104, P.armF, col);
  },

  monsterGlow(alpha) {
    const m = Monster, g = this.ctx;
    if (m.action !== A_BEAM || m.phase === 2 || Main.state === 'over') return;
    const P = m.pose, x = lerp(m.px, m.x, alpha) + P.offX * m.facing;
    const rec = Assets.spr.monster_beam, ch = rec.ok && rec.data.chest ? rec.data.chest : null;
    const cx = x + m.facing * (ch ? ch[0] - rec.ax : 16), cy = CONFIG.GROUND - P.bob - (ch ? rec.ay - ch[1] : 100);
    this.world();
    const r = 6 + 8 * P.chest;
    this.fill(PAL.lime); this.alpha(0.35 * P.chest + 0.15); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    this.fill(PAL.white); this.alpha(0.6 * P.chest); g.beginPath(); g.arc(cx, cy, r * 0.4, 0, Math.PI * 2); g.fill();
    if (m.phase === 0) { // 6 sparks converging on the mouth
      m.calcMouth();
      const u = clamp(m.phaseT / CONFIG.beam.charge, 0, 1), d = 34 * (1 - u);
      this.fill(PAL.lime); this.alpha(0.9);
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + u * 2; g.fillRect(m.mouth.x + Math.cos(a) * d - 1.5, m.mouth.y + Math.sin(a) * d - 1.5, 3, 3); }
    }
    this.alpha(1);
  },

  swipeTrail(alpha) {
    const m = Monster, g = this.ctx, S = CONFIG.swipe;
    if (m.trailT <= 0) return;
    const strike = m.action === A_SWIPE && m.phase === 1;
    const u = strike ? clamp(m.phaseT / S.strike, 0.1, 1) : 1;
    const fade = strike ? 1 : clamp(m.trailT / 0.12, 0, 1);
    const sx = lerp(m.px, m.x, alpha) + m.facing * S.shoulderOff, sy = S.shoulderY, f = m.facing;
    const a0 = m.swipeAng - S.halfArc * f, a1 = a0 + 2 * S.halfArc * f * u, ccw = f < 0;
    this.world();
    // smear wedge from the claw out to full reach, so the whole reach reads as one sweep
    this.fill(PAL.lime); this.alpha(0.1 * fade);
    g.beginPath(); g.arc(sx, sy, S.reach, a0, a1, ccw); g.arc(sx, sy, S.smearIn, a1, a0, !ccw); g.closePath(); g.fill();
    this.stroke(PAL.yellow); this.lw(2); this.alpha(0.7 * fade); // leading claw edge
    g.beginPath(); g.moveTo(sx + Math.cos(a1) * S.smearIn, sy + Math.sin(a1) * S.smearIn);
    g.lineTo(sx + Math.cos(a1) * S.reach, sy + Math.sin(a1) * S.reach); g.stroke();
    for (let i = 0; i < 3; i++) {
      const r = S.reach - 10 + i * 5;
      this.stroke(PAL.lime); this.lw(6); this.alpha(0.12 * fade); g.beginPath(); g.arc(sx, sy, r, a0, a1, ccw); g.stroke();
      this.lw(2); this.alpha(0.3 * fade); g.stroke();
      // leading 20 degrees in yellow
      const lead = 20 * DEG * f;
      this.stroke(PAL.yellow); this.lw(3); this.alpha(fade); g.beginPath(); g.arc(sx, sy, r, a1 - lead, a1, ccw); g.stroke();
    }
    this.alpha(1);
  },

  beam() {
    const m = Monster, g = this.ctx, B = CONFIG.beam;
    if (m.action !== A_BEAM || m.phase !== 1 || Main.state !== 'play' && Main.state !== 'pause') return;
    const w = 14 + (Math.random() * 4 - 2);
    this.xf(m.mouth.x, m.mouth.y, m.beamAng, 1, 1);
    this.fill(PAL.lime); this.alpha(0.35); g.fillRect(0, -w / 2, B.length, w);
    this.alpha(0.8); g.fillRect(0, -4, B.length, 8);
    this.fill(PAL.white); this.alpha(1); g.fillRect(0, -1.5, B.length, 3);
    this.fill(PAL.yellow); this.alpha(0.8); g.beginPath(); g.arc(0, 0, 8 + Math.random() * 3, 0, Math.PI * 2); g.fill();
    this.alpha(1);
  },

  // ---------- army ----------
  units(alpha) {
    const U = Army.units, G = CONFIG.GROUND, T = CONFIG.army.tank, mx = Monster.x;
    for (let i = 0; i < U.length; i++) {
      const u = U[i];
      if (!u.alive) continue;
      const x = lerp(u.px, u.x, alpha), y = lerp(u.py, u.y, alpha);
      if (x < this.camX - 60 || x > this.camX + CONFIG.W + 60) continue;
      if (u.type === T_TANK) {
        if (u.st === U_DYING) this.alpha(1 - u.t / T.dieT);
        // barrel aims along the shell's launch direction
        const bx = x + u.face * 2, by = G - 15, dx = mx - bx, Tt = T.flight;
        const ang = Math.atan2((CONFIG.army.aimY - by - 0.5 * T.g * Tt * Tt) / Tt, dx / Tt);
        const rec = u.st === U_TELE ? -3 : 0;
        this.sprAt('tank_barrel', 0, bx + Math.cos(ang) * rec, by + Math.sin(ang) * rec, ang, 1, u.face);
        const fr = u.hp < T.hp || u.st === U_DYING ? 2 : u.st === U_MOVE ? ((u.t * 10) | 0) & 1 : 0;
        this.sprAt('tank', fr, x, y, 0, u.face, 1);
        this.alpha(1);
      } else {
        const dying = u.st === U_DYING;
        const rot = dying ? u.rot : u.st === U_TELE ? 10 * DEG * u.face : 0;
        this.sprAt('heli', dying ? 3 : ((u.t / 0.03) | 0) % 3, x, y, rot, u.face, 1);
      }
    }
  },

  unitGlows() {
    const U = Army.units, g = this.ctx, G = CONFIG.GROUND, T = CONFIG.army.tank;
    this.world();
    for (let i = 0; i < U.length; i++) {
      const u = U[i];
      if (!u.alive || u.st === U_DYING) continue;
      let gx, gy;
      if (u.type === T_TANK) {
        const bx = u.x + u.face * 2, by = G - 15, Tt = T.flight;
        const ang = Math.atan2((CONFIG.army.aimY - by - 0.5 * T.g * Tt * Tt) / Tt, (Monster.x - bx) / Tt);
        gx = bx + Math.cos(ang) * 15; gy = by + Math.sin(ang) * 15;
      } else { gx = u.x + u.face * 18; gy = u.y + 4; }
      if (u.st === U_TELE) { // telegraph glint
        const p = 0.6 + 0.4 * Math.sin(u.t * 40);
        this.fill(PAL.yellow); this.alpha(p); g.fillRect(gx - 2, gy - 2, 4, 4);
        this.alpha(p * 0.4); g.fillRect(gx - 5, gy - 0.5, 10, 1); g.fillRect(gx - 0.5, gy - 5, 1, 10);
      }
      if (u.flashT > 0) { // magenta muzzle flash star
        this.fill(PAL.mag); this.alpha(1);
        g.fillRect(gx - 6, gy - 1, 12, 2); g.fillRect(gx - 1, gy - 6, 2, 12); g.fillRect(gx - 3, gy - 3, 6, 6);
      }
    }
    this.alpha(1);
  },

  shots() {
    const S = Army.shots, g = this.ctx;
    this.world();
    this.stroke(PAL.yellow); this.lw(2); this.alpha(0.5);
    g.beginPath();
    for (let i = 0; i < S.length; i++) {
      const s = S[i];
      if (!s.alive) continue;
      g.moveTo(s.x, s.y); g.lineTo(s.tx0, s.ty0); g.lineTo(s.tx1, s.ty1); g.lineTo(s.tx2, s.ty2);
    }
    g.stroke();
    this.alpha(1);
    for (let i = 0; i < S.length; i++) {
      const s = S[i];
      if (!s.alive) continue;
      this.fill(PAL.yellow); g.fillRect(s.x - 2.5, s.y - 2.5, 5, 5);
      this.fill(PAL.white); g.fillRect(s.x - 1, s.y - 1, 2, 2);
    }
  },

  // ---------- fx ----------
  particlesFlat() {
    const g = this.ctx;
    this.world(); this.fill(PAL.dust);
    for (let i = 0; i < Fx.n; i++) {
      if (Fx.life[i] <= 0 || Fx.kind[i] < P_DUST) continue;
      const a = Fx.life[i] / Fx.max[i], sz = Fx.size[i];
      this.alpha(0.55 * a);
      g.fillRect(Fx.px[i] - sz / 2, Fx.py[i] - sz / 2, sz, sz);
    }
    this.alpha(1);
  },

  particlesAdd() {
    const g = this.ctx;
    for (let i = 0; i < Fx.n; i++) {
      if (Fx.life[i] <= 0 || Fx.kind[i] >= P_DUST) continue;
      const a = Fx.life[i] / Fx.max[i], sz = Fx.size[i];
      this.fill(PCOL[Fx.col[i]]); this.alpha(Fx.kind[i] === P_SHARD ? Math.min(1, a * 1.5) : a);
      g.fillRect(Fx.px[i] - sz / 2, Fx.py[i] - sz / 2, sz, sz);
    }
    this.alpha(1);
  },

  rings() {
    const g = this.ctx, R = Fx.rings;
    for (let i = 0; i < R.length; i++) {
      const r = R[i];
      if (!r.alive) continue;
      const u = r.t / r.dur, rad = r.rMax * easeOut(u), a = 1 - u * u;
      this.stroke(u < 0.4 ? PAL.white : PCOL[r.col]);
      g.beginPath(); g.ellipse(r.x, r.y, Math.max(1, rad), Math.max(1, rad * 0.12), 0, 0, Math.PI * 2);
      this.lw(6); this.alpha(0.25 * a); g.stroke();
      this.lw(3); this.alpha(a); g.stroke();
    }
    this.alpha(1);
  },

  popups() {
    const F = CONFIG.fx, P = Fx.popups, H = CONFIG.hud;
    // at most 3 score popups visible (art direction): skip any with 3+ newer live ones
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      if (!p.alive) continue;
      let newer = 0;
      for (let j = 0; j < P.length; j++) if (P[j].alive && P[j].born > p.born) newer++;
      if (newer >= 3) continue;
      const u = p.t / F.popupT, y = Math.max(F.popupMinY + 12, p.y - F.popupRise * easeOut(u));
      this.alpha(u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4);
      const c = clamp(p.combo, 1, 5);
      this.begin().str('+').num(p.value);
      if (p.combo > 1) this.str(' x').num(p.combo);
      this.draw(c === 1 ? 'y12' : c === 2 ? 'y14' : c === 3 ? 'y16' : c === 4 ? 'y18' : 'y20', p.x - this.camX, y, 1);
    }
    const tx = H.barX + H.barW * clamp(Monster.hp / 100, 0, 1), ty = H.barY + 8;
    for (let i = 0; i < Fx.flies.length; i++) {
      const p = Fx.flies[i];
      if (!p.alive) continue;
      const u = clamp(p.t / F.healFlyT, 0, 1), e = easeIn(u);
      const sx = p.x - this.camX, sy = p.y;
      const cx = (sx + tx) / 2, cy = Math.min(sy, ty) - 40;
      const x = (1 - e) * (1 - e) * sx + 2 * (1 - e) * e * cx + e * e * tx;
      const y = (1 - e) * (1 - e) * sy + 2 * (1 - e) * e * cy + e * e * ty;
      this.alpha(p.t > F.healFlyT ? 1 - (p.t - F.healFlyT) / 0.15 : 1);
      const w = this.begin().str('+').num(p.value).draw('l12', x, y, 1);
      this.sprScreen('icon_heart', 0, x + w / 2 + 6, y - 4);
    }
    this.alpha(1);
  },

  vignette() {
    if (Monster.hp >= 25 || Main.state === 'over') return;
    const g = this.ctx, W = CONFIG.W, H = CONFIG.H;
    this.screen(); this.fill(PAL.mag); this.alpha(0.25 * (Fx.reducedMotion ? 0.5 : 1));
    g.fillRect(0, 0, W, 6); g.fillRect(0, H - 6, W, 6); g.fillRect(0, 6, 6, H - 12); g.fillRect(W - 6, 6, 6, H - 12);
    this.alpha(1);
  },

  // ---------- HUD ----------
  hud() {
    const g = this.ctx, H = CONFIG.hud, m = Monster, t = Run.t;
    this.screen();
    this.fill(PAL.night); this.alpha(0.8); g.fillRect(0, 0, CONFIG.W, 36);
    this.alpha(1); this.fill(PAL.grid); g.fillRect(0, 36, CONFIG.W, 1);
    this.begin().str('HP').draw('l12', 8, 22, 0);
    const hp = clamp(m.hp, 0, 100), low = hp < 25, pulse = 0.5 + 0.5 * Math.sin(t * 1.5 * 2 * Math.PI);
    const fw = H.barW * hp / 100;
    this.screen();
    this.fill(m.healPulseT > 0 ? '#b8ffb8' : PAL.lime); g.fillRect(H.barX, H.barY, fw, H.barH);
    if (fw > 2) { this.fill(PAL.limeDim); g.fillRect(H.barX + fw - 2, H.barY, 2, H.barH); }
    if (m.lossT > 0) { // the lost piece flashes white
      this.fill(PAL.white);
      const a = H.barW * clamp(m.lossTo, 0, 100) / 100, b = H.barW * clamp(m.lossFrom, 0, 100) / 100;
      g.fillRect(H.barX + a, H.barY, b - a, H.barH);
    }
    this.stroke(low ? PAL.mag : PAL.white); this.lw(1); this.alpha(low ? 0.5 + 0.5 * pulse : 1);
    g.strokeRect(H.barX - 0.5, H.barY - 0.5, H.barW + 1, H.barH + 1);
    this.alpha(1);
    if (low) { this.alpha(0.5 + 0.5 * pulse); this.begin().str('LOW').draw('m12', 196, 22, 0); this.alpha(1); }
    // beam cooldown ring
    const rx = low ? H.ringXLow : H.ringX, cdu = 1 - m.cd.beam / CONFIG.beam.cooldown;
    this.cooldownRing(rx, H.ringY, H.ringR, cdu, true);
    // combo
    if (Run.combo > 1) {
      const sc = Run.comboBumpT > 0 ? 1 + 0.2 * (Run.comboBumpT / CONFIG.fx.comboBumpT) : 1;
      this.begin().str('x').num(Run.combo).str(' COMBO').draw(Run.combo >= 5 ? 'y24' : 'y14', 320, Run.combo >= 5 ? 27 : 24, 1, sc); // full size only when x5 is earned
    }
    // score / time / best
    this.begin().num(Run.score).draw('y16', 632, 20, 2);
    this.begin().time(t).draw('w12', 632, 33, 2);
    if (Run.best.has) { this.alpha(0.7); this.begin().str('BEST ').time(Run.best.time).draw('w12', 590, 33, 2); this.alpha(1); }
  },

  cooldownRing(x, y, r, u, hud) {
    const g = this.ctx;
    this.screen();
    if (hud) { this.stroke(PAL.grid); this.lw(2); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); }
    const ready = u >= 1;
    if (ready && !this.wasReady) this.readyFlashT = 0.15;
    if (hud) { this.wasReady = ready; if (this.readyFlashT > 0) this.readyFlashT -= 1 / 60; }
    this.stroke(hud && this.readyFlashT > 0 ? PAL.white : PAL.lime); this.lw(hud ? 2 : 1);
    g.beginPath(); g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(u, 0, 1)); g.stroke();
    if (ready && hud) { this.fill(PAL.lime); g.fillRect(x - 2, y - 2, 4, 4); }
  },

  crosshair() {
    const c = Input.cursor;
    this.sprScreen('crosshair', 0, c.sx, c.sy);
    this.alpha(0.8);
    this.cooldownRing(c.sx, c.sy, 12, 1 - Monster.cd.beam / CONFIG.beam.cooldown, false);
    this.alpha(1);
  },

  touchUi() {
    const g = this.ctx;
    this.alpha(Input.held.stomp ? 1 : 0.8);
    this.sprScreen('touch_buttons', 0, 588, 308, Input.held.stomp ? 0.95 : 1);
    this.alpha(Input.touch.beamDown > 0 ? 1 : 0.8);
    this.sprScreen('touch_buttons', 1, 588, 236, Input.touch.beamDown > 0 ? 0.95 : 1);
    this.screen(); this.alpha(0.7); this.fill(PAL.lime);
    g.fillRect(313, 40, 4, 12); g.fillRect(323, 40, 4, 12);
    this.alpha(1);
  },

  // ---------- screens (live fillText is fine outside play) ----------
  label(txt, x, y, px, col, a) {
    const g = this.ctx;
    this.screen();
    g.font = 'bold ' + px + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    this.alpha(a === undefined ? 1 : a);
    this.stroke(PAL.night); this.lw(3); g.strokeText(txt, x, y);
    this.fill(col); g.fillText(txt, x, y);
    this.alpha(1);
  },

  titleScreen() {
    const t = this.titleT;
    const flick = (t % 4.3) < 0.06 ? 0.4 : 0.97 + 0.03 * Math.sin(t * 13);
    this.alpha(flick); this.sprScreen('logo', 0, 320, 70); this.alpha(1);
    this.screen(); this.fill(PAL.night); this.alpha(0.8); this.ctx.fillRect(0, 108, CONFIG.W, 40); // backing band over the skyline
    this.fill(PAL.grid); this.alpha(1); this.ctx.fillRect(0, 108, CONFIG.W, 1); this.ctx.fillRect(0, 147, CONFIG.W, 1);
    this.label('Destruction heals. Health drains.', 320, 125, 16, PAL.white);
    this.label('A/D walk · SPACE stomp · CLICK swipe · RMB/F beam', 320, 141, 12, PAL.white, 0.85);
    if (t % 0.9 < 0.6) this.label('Click or Space to start', 320, 336, 16, PAL.yellow);
  },

  pauseScreen() {
    this.screen(); this.fill(PAL.night); this.alpha(0.6); this.ctx.fillRect(0, 0, CONFIG.W, CONFIG.H); this.alpha(1);
    this.label('PAUSED', 320, 164, 32, PAL.white);
    this.label('Esc/P to resume', 320, 190, 12, PAL.white);
  },

  // Card text is baked once on game over; the over loop draws one image plus the blinking prompt.
  bakeCard() {
    const k = this.k, c = Assets.card, g = c.getContext('2d'), W = 320, H = 248, L = Run.last, st = Run.stats;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    g.setTransform(k, 0, 0, k, 0, 0);
    g.globalAlpha = 0.92; g.fillStyle = PAL.night; g.fillRect(2, 2, W - 4, H - 4); g.globalAlpha = 1;
    g.strokeStyle = PAL.mag; g.lineWidth = 6; g.globalAlpha = 0.25; g.strokeRect(2, 2, W - 4, H - 4);
    g.globalAlpha = 1; g.lineWidth = 2; g.strokeRect(2, 2, W - 4, H - 4);
    const txt = (s, x, y, px, col, al) => {
      g.font = 'bold ' + px + 'px ' + FONT; g.textAlign = al; g.fillStyle = col; g.fillText(s, x, y);
    };
    const mmss = (s) => { s = Math.floor(s); return ((s / 60) | 0) + ':' + String(s % 60).padStart(2, '0'); };
    txt('GAME OVER', W / 2, 36, 32, PAL.mag, 'center');
    const cause = Run.cause === SRC_DRAIN ? 'Starved: ' + Math.max(0, Math.round(Run.t - Run.lastHealT)) + ' s since last heal'
      : Run.cause === SRC_TANK ? 'Shot down by tanks' : 'Shot down by helicopters';
    txt(cause, W / 2, 60, 12, PAL.white, 'center');
    const rows = [['TIME', mmss(L.time)], ['BUILDINGS', '' + st.buildings], ['UNITS', '' + st.units], ['BEST COMBO', 'x' + st.bestCombo]];
    for (let i = 0; i < rows.length; i++) { txt(rows[i][0], 24, 82 + i * 18, 12, PAL.white, 'left'); txt(rows[i][1], 296, 82 + i * 18, 12, PAL.yellow, 'right'); }
    const timePts = L.score - Run.destructionPts;
    g.globalAlpha = 0.75; txt('TIME ' + timePts + ' + DESTRUCTION ' + Run.destructionPts, W / 2, 164, 12, PAL.white, 'center'); g.globalAlpha = 1;
    txt('SCORE ' + L.score, W / 2, 188, 24, PAL.yellow, 'center');
    if (!L.newBest) txt(mmss(L.time) + ' — ' + L.short + ' s short of your best', W / 2, 210, 12, PAL.white, 'center');
    this.cardBest = L.newBest;
  },

  overScreen() {
    const T = Run.overT;
    if (T < 1.05) return;
    const k = this.k, g = this.ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(Assets.card, 160 * k, 64 * k);
    if (this.cardBest && (T * 2 | 0) % 2 === 0) this.begin().str('NEW BEST').draw('y16', 320, 272, 1);
    if (T >= 1.65) { this.alpha(0.7); this.begin().str('CLICK OR SPACE TO RESTART').draw('w12', 320, 300, 1); this.alpha(1); }
  },

  // GPU warm-up: draw every baked canvas and loaded image once, nearly invisible.
  warm() {
    const L = Assets.warmList;
    if (this.warmIdx >= L.length) return;
    const g = this.ctx;
    g.setTransform(1, 0, 0, 1, 0, 0); this.alpha(0.01);
    g.globalCompositeOperation = 'lighter';
    for (; this.warmIdx < L.length; this.warmIdx++) g.drawImage(L[this.warmIdx], 0, 0, 4, 4);
    g.globalCompositeOperation = 'source-over';
    this.alpha(1);
  },
};
