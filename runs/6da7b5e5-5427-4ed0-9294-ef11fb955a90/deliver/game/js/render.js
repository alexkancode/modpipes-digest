// Draw order per tech plan §7: water, frost tint, [shake] ice, glow, ripples, pads, frog, particles, fireflies, text [/shake], vignette, HUD, overlay.
const Render = (() => {
  const TAU = Math.PI * 2;
  const KC = [1, 0, -1, 0], KS = [0, 1, 0, -1];
  const PCOL = ['fireflyGlow', 'ice', 'iceShadow', 'golden', 'frogBelly'];
  const R = {
    ctx: null, ice: null, iceG: null, Rbaked: -1, bakedAt: -1,
    poly: new Float32Array(CFG.iceFingers * 4), fingerPh: new Float32Array(CFG.iceFingers), fingerSp: new Float32Array(CFG.iceFingers),
    cracks: new Float32Array(64), reeds: [], buf: new Int8Array(16), bufLen: 0, warm: 30,
    over: null, button: null, pausePanel: null,
  };

  R.init = function (canvas) {
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.ice = Assets.canvas(CFG.W, CFG.H); this.iceG = this.ice.getContext('2d');
    let s = 11;
    const lr = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < CFG.iceFingers; i++) { this.fingerPh[i] = lr() * TAU; this.fingerSp[i] = 0.5 + lr(); }
    const p = CFG.pond;
    for (let i = 0; i < 16; i++) {   // static radial cracks in the ice sheet, visible only where ice is
      const a = lr() * TAU, r0 = 1.0, r1 = 0.62 + lr() * 0.25, bend = (lr() - 0.5) * 0.12;
      this.cracks[i * 4] = p.cx + Math.cos(a) * p.a * r0; this.cracks[i * 4 + 1] = p.cy + Math.sin(a) * p.b * r0;
      this.cracks[i * 4 + 2] = p.cx + Math.cos(a + bend) * p.a * r1; this.cracks[i * 4 + 3] = p.cy + Math.sin(a + bend) * p.b * r1;
    }
    const xs = [0, 22, 46, 70, 548, 572, 596, 616], ys = [44, 96, 150, 204, 258, 300, 320];
    for (let i = 0; i < xs.length; i++) for (let j = 0; j < ys.length; j++) {
      const x = xs[i], y = ys[j];
      if (Pond.rho(x + 12, y + 8) > 1.03 && Pond.rho(x + 12, y + 40) > 1.03 && !(x > 600 && y > 300)) this.reeds.push(x, y);
    }
    // Title in two small panels set in the pond's pad-free gaps (top centre, bottom centre); pads and fireflies draw over them.
    this.titleTop = this.panel(['Last Light Pond', 28, PALETTE.text], 280, 42, 2, 0);
    this.titleBottom = this.panel(['Click a pad to hop', 13, PALETTE.text, 'Click a firefly to snap', 13, PALETTE.text, 'keys: arrows + X', 13, PALETTE.text], 168, 88, 3, 0);
    this.pausePanel = this.panel(['Paused', 32, PALETTE.text, 'click or P to resume', 13, PALETTE.text], 260, 110);
  };

  // ---------- baked overlays ----------
  R.panel = function (lines, w, h, top = 14, gap = 4, alpha = 0.85) {
    const c = Assets.canvas(w, h), g = c.getContext('2d');
    g.globalAlpha = alpha; g.fillStyle = PALETTE.deepWater; g.fillRect(0, 0, w, h); g.globalAlpha = 1;
    g.strokeStyle = PALETTE.iceEdge; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, h - 1);
    let y = top;
    for (let i = 0; i < lines.length; i += 3) {
      const t = Assets.text(lines[i], lines[i + 1], lines[i + 2], lines[i + 1] >= 32 ? 2 : 1);
      g.drawImage(t, ((w - t.width) / 2) | 0, y); y += t.height + gap;
    }
    return c;
  };

  const TIPS = ['Mid-hop snaps count double', 'Catch fireflies faster to push the ice back', 'Watch the pad rims: white means it is about to freeze', 'Golden fireflies melt three times as much ice'];
  R.bakeOver = function (W) {
    const win = W.result === 1, toGo = Math.max(0, CFG.jarTarget - W.caught);
    const mm = Math.floor(W.t / 60), ss = Math.floor(W.t % 60);
    const lines = [
      win ? 'Jar full!' : 'Frozen', 32, win ? PALETTE.fireflyGlow : PALETTE.ice,
      win ? 'the frog hibernates warm under its pad' : TIPS[(W.losses - 1) % TIPS.length], 13, win ? PALETTE.text : PALETTE.iceEdge,
      'Score ' + W.score + (W.newBest ? (W.prevBest > 0 ? '   New best!' : '') : '   Best ' + W.best), 16, PALETTE.text,
      Math.min(W.caught, CFG.jarTarget) + '/' + CFG.jarTarget + (win ? '   warmth ' + Math.round(W.R * 100) + '%' : '   ' + toGo + ' to go'), 16, win ? PALETTE.text : PALETTE.fireflyGlow,
      'Time ' + mm + ':' + (ss < 10 ? '0' : '') + ss + '   Best streak ' + W.bestStreak, 13, PALETTE.text,
    ];
    if (Rng.urlSeed !== null) lines.push('seed ' + W.seed, 13, PALETTE.iceEdge);
    this.over = this.panel(lines, 320, 252);
    const b = Assets.canvas(140, 46), g = b.getContext('2d');
    g.fillStyle = PALETTE.fireflyGlow; g.fillRect(0, 0, 140, 28); g.strokeStyle = PALETTE.ink; g.strokeRect(0.5, 0.5, 139, 27);
    g.font = Assets.font(14); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = PALETTE.ink; g.fillText('Play again', 70, 15);
    const sub = Assets.text('or press Space', 13, PALETTE.text); g.drawImage(sub, ((140 - sub.width) / 2) | 0, 30);
    this.button = b;
  };

  // ---------- ice ----------
  R.bakeIce = function (Rs, crawl, creep) {
    const g = this.iceG, p = CFG.pond, n = CFG.iceFingers, poly = this.poly;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, CFG.W, CFG.H);
    if (Rs >= 1) { this.Rbaked = Rs; return; }
    g.fillStyle = PALETTE.ice; g.beginPath(); g.ellipse(p.cx, p.cy, p.a, p.b, 0, 0, TAU); g.fill();
    g.strokeStyle = PALETTE.iceShadow; g.lineWidth = 1; g.beginPath();
    for (let i = 0; i < 16; i++) { g.moveTo(this.cracks[i * 4], this.cracks[i * 4 + 1]); g.lineTo(this.cracks[i * 4 + 2], this.cracks[i * 4 + 3]); }
    g.stroke();
    const band = Math.min(1, Rs + 0.03);
    g.lineWidth = 4; g.beginPath(); g.ellipse(p.cx, p.cy, p.a * band, p.b * band, 0, 0, TAU); g.stroke();
    for (let i = 0; i < n * 2; i++) {
      const a = i / (n * 2) * TAU;
      const rr = (i & 1) ? Rs - 0.012 - (0.008 + creep * this.fingerSp[i >> 1]) * (0.5 + 0.5 * Math.sin(this.fingerPh[i >> 1] + crawl * this.fingerSp[i >> 1])) : Rs + 0.008;
      poly[i * 2] = p.cx + Math.cos(a) * p.a * rr; poly[i * 2 + 1] = p.cy + Math.sin(a) * p.b * rr;
    }
    g.beginPath(); g.moveTo(poly[0], poly[1]);
    for (let i = 1; i < n * 2; i++) g.lineTo(poly[i * 2], poly[i * 2 + 1]);
    g.closePath();
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.fill();
    g.globalCompositeOperation = 'source-over'; g.strokeStyle = PALETTE.iceEdge; g.lineWidth = 1.5; g.stroke();
    this.Rbaked = Rs;
  };

  // ---------- number atlas (no per-frame strings) ----------
  R.nb = function () { this.bufLen = 0; };
  R.nn = function (n) {
    n = Math.max(0, Math.floor(n));
    const start = this.bufLen, b = this.buf;
    do { b[this.bufLen++] = n % 10; n = (n / 10) | 0; } while (n > 0 && this.bufLen < 16);
    for (let i = start, j = this.bufLen - 1; i < j; i++, j--) { const t = b[i]; b[i] = b[j]; b[j] = t; }
  };
  R.ng = function (g) { if (this.bufLen < 16) this.buf[this.bufLen++] = g; };
  R.nd = function (at, x, y, align) {
    const ctx = this.ctx, b = this.buf;
    let w = 0;
    for (let i = 0; i < this.bufLen; i++) w += at.w[b[i]] + 1;
    let cx = align === 2 ? x - w : align === 1 ? x - w / 2 : x;
    cx = cx | 0;
    for (let i = 0; i < this.bufLen; i++) { const g = b[i]; ctx.drawImage(at.c, at.x[g], 0, at.w[g] + 2, at.h, cx, y | 0, at.w[g] + 2, at.h); cx += at.w[g] + 1; }
    return w;
  };

  function lerp(a, b, t) { return a + (b - a) * t; }

  // ---------- frame ----------
  R.draw = function (alpha) {
    const W = Game.W, ctx = this.ctx, clock = Game.clock, P = PALETTE, f = W.frog;
    const st = Game.state, title = st === 'title';
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(Assets.water, 0, 0);

    // frost tint: the 8-step honest clock
    const step = Math.max(0, Math.min(8, Math.floor((CFG.R0 - W.Rshown) / (CFG.R0 - CFG.Rfloor) * 8)));
    if (step > 0) { ctx.globalAlpha = 0.035 * step; ctx.fillStyle = P.ice; ctx.fillRect(0, 0, CFG.W, CFG.H); ctx.globalAlpha = 1; }

    // reeds on the shore (never shake)
    const reeds = Assets.img.reeds;
    for (let i = 0; i < this.reeds.length; i += 2) {
      const fr = (Math.floor(clock / 0.8) + (i >> 1)) & 1;
      ctx.drawImage(reeds, fr * 24, 0, 24, 40, this.reeds[i], this.reeds[i + 1], 24, 40);
    }

    // play-field shake
    let ox = 0, oy = 0;
    if (W.shake > 0) {
      const m = CFG.shakeMax * W.shake * W.shake;
      ox = Math.round(m * Math.sin(clock * 53 + W.shakePh) * Math.cos(clock * 17)); oy = Math.round(m * Math.sin(clock * 61 + W.shakePh * 2));
    }
    ctx.setTransform(1, 0, 0, 1, ox, oy);

    // ice layer (re-baked only on change)
    if (Math.abs(W.Rshown - this.Rbaked) >= CFG.iceRebakeDR || clock - this.bakedAt >= CFG.iceRebakeSec || clock < this.bakedAt) {
      this.bakeIce(W.Rshown, clock * CFG.iceCrawl * 5, Math.min(CFG.iceCreepMax, W.t * CFG.iceCreepRate)); this.bakedAt = clock;
    }
    ctx.drawImage(this.ice, 0, 0);

    // fireflies' glow on the water: a warm source-over wash (reflection, offset below), then the additive glow
    const ending = W.ending, winFade = ending && W.result === 1 ? Math.max(0, 1 - W.endT / CFG.winSeq) : 1;
    for (let i = 0; i < W.flies.length; i++) {
      const fl = W.flies[i];
      if (!fl.alive) continue;
      const lv = fl.golden ? 1 : fl.level;
      if (lv <= 0) continue;
      ctx.globalAlpha = lv * this.flyAlpha(W, fl, clock) * winFade;
      ctx.drawImage(Assets.wash, lerp(fl.prevX, fl.x, alpha) - 22, lerp(fl.prevY, fl.y, alpha) - 14);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < W.flies.length; i++) {
      const fl = W.flies[i];
      if (!fl.alive) continue;
      const a = this.flyAlpha(W, fl, clock) * winFade;
      const x = lerp(fl.prevX, fl.x, alpha), y = lerp(fl.prevY, fl.y, alpha);
      if (fl.golden) { ctx.globalAlpha = 0.7 * a; const s = 30 + 6 * Math.sin(clock * 8); ctx.drawImage(Assets.goldGlow, x - s / 2, y - s / 2 + 3, s, s); }
      else if (fl.level > 0) { ctx.globalAlpha = 0.55 * fl.level * a; ctx.drawImage(Assets.glow, x - 14, y - 11); }
    }
    if (Fx.flashT > 0) { ctx.globalAlpha = Fx.flashT / 0.08; ctx.drawImage(Assets.glow, Fx.flashX - 14, Fx.flashY - 14); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;

    // title panels sit under pads and fireflies, so they hide no targets
    const ta = title ? 1 : st === 'play' ? Math.max(0, Game.titleFade / 0.3) : 0;
    if (ta > 0) {
      ctx.globalAlpha = ta;
      ctx.drawImage(this.titleTop, (CFG.W - this.titleTop.width) >> 1, 20);
      ctx.drawImage(this.titleBottom, (CFG.W - this.titleBottom.width) >> 1, 252);
      ctx.globalAlpha = 1;
    }

    // ripples
    const Rp = Fx.Rp;
    ctx.strokeStyle = P.ripple; ctx.lineWidth = 1;
    for (let i = 0; i < Rp.alive.length; i++) {
      if (!Rp.alive[i]) continue;
      const u = Rp.t[i] / 0.4, r = 10 + 24 * u;
      ctx.globalAlpha = 1 - u; ctx.beginPath(); ctx.ellipse(Rp.x[i], Rp.y[i] + 4, r, r * 0.55, 0, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // pads
    const padImg = Assets.img.pad;
    for (let i = 0; i < W.pads.length; i++) {
      const pad = W.pads[i];
      let bob = 0;
      if (pad.bobT > 0) { const u = 1 - pad.bobT / 0.3; bob = 2 * Math.sin(u * TAU) * (1 - u); }
      const x = Math.round(lerp(pad.prevX, pad.x, alpha)), y = Math.round(lerp(pad.prevY, pad.y, alpha) + bob);
      const k = pad.orient, fl = pad.flip;
      ctx.setTransform(KC[k] * fl, KS[k] * fl, -KS[k], KC[k], x + ox, y + oy);
      if (pad.state === PAD_FROZEN) ctx.drawImage(padImg, 96, 0, 48, 48, -24, -24, 48, 48);
      else {
        ctx.drawImage(padImg, 0, 0, 48, 48, -24, -24, 48, 48);
        if (pad.state === PAD_FROSTING) { ctx.globalAlpha = Math.min(1, pad.frostT / CFG.frostWarnSec); ctx.drawImage(padImg, 48, 0, 48, 48, -24, -24, 48, 48); ctx.globalAlpha = 1; }
        else if (pad.state === PAD_THAWING) { ctx.globalAlpha = Math.max(0, pad.thawT / CFG.thawAnim); ctx.drawImage(padImg, 96, 0, 48, 48, -24, -24, 48, 48); ctx.globalAlpha = 1; }
      }
    }
    ctx.setTransform(1, 0, 0, 1, ox, oy);
    // frosting rim, batched
    ctx.strokeStyle = P.ice; ctx.lineWidth = 2;
    for (let i = 0; i < W.pads.length; i++) {
      const pad = W.pads[i];
      if (pad.state !== PAD_FROSTING) continue;
      ctx.globalAlpha = Math.min(1, pad.frostT / CFG.frostWarnSec);
      ctx.beginPath(); ctx.arc(lerp(pad.prevX, pad.x, alpha), lerp(pad.prevY, pad.y, alpha), 22, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // inner-pad pulse until the first hop
    if (!W.firstHopDone && (title || st === 'play')) {
      ctx.strokeStyle = P.fireflyGlow; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.45 + 0.3 * Math.sin(clock * 5);
      ctx.beginPath();
      for (let i = 1; i <= 4; i++) { const pad = W.pads[i], r = 26 + 2 * Math.sin(clock * 5); ctx.moveTo(pad.x + r, pad.y); ctx.arc(pad.x, pad.y, r, 0, TAU); }
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    // keyboard chevrons
    if (W.kbMode && st === 'play' && !ending) {
      const ch = Assets.img.chevron;
      for (let d = 0; d < 4; d++) {
        const c = Input.cand[d];
        if (c < 0) continue;
        const pad = W.pads[c];
        ctx.drawImage(ch, d * 8, 0, 8, 8, Math.round(lerp(pad.prevX, pad.x, alpha) + DIRS[d * 2] * 12 - 4), Math.round(lerp(pad.prevY, pad.y, alpha) + DIRS[d * 2 + 1] * 12 - 4), 8, 8);
      }
    }

    // frog
    const fx = lerp(f.prevX, f.x, alpha), fy = lerp(f.prevY, f.y, alpha), gy = lerp(f.prevGroundY, f.groundY, alpha);
    const u = f.state === FROG_AIR ? Math.min(1, f.hopT / CFG.hopTime) : 0, arc = Math.sin(Math.PI * u);
    if (W.rangeShakeT > 0 && !ending) {
      ctx.strokeStyle = P.iceEdge; ctx.lineWidth = 1; ctx.beginPath();
      ctx.arc(fx + (Math.floor(clock * 60) & 1 ? 2 : -2), fy, CFG.hopRange, 0, TAU); ctx.stroke();
    }
    const diveA = f.state === FROG_DIVE ? Math.max(0, 1 - W.endT / 0.5) : 1;
    ctx.globalAlpha = 0.35 * diveA; ctx.fillStyle = P.ink;
    ctx.beginPath(); ctx.ellipse(fx, gy + 9, 10 * (1 - 0.3 * arc), 4 * (1 - 0.3 * arc), 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    const t = W.tongue;
    if (t.state === T_OUT || t.state === T_BACK) {
      const mx = fx, my = fy + 1, tx = fx + t.dirX * t.len * t.ext, ty = fy + 1 + t.dirY * t.len * t.ext;
      ctx.lineCap = 'round';
      ctx.strokeStyle = P.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx, my + 1); ctx.lineTo(tx, ty + 1); ctx.stroke();
      ctx.strokeStyle = P.tongue; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = P.tongue; ctx.beginPath(); ctx.arc(tx, ty, 3, 0, TAU); ctx.fill();
      ctx.lineCap = 'butt';
      if (t.carried >= 0) {
        if (t.carriedGolden) ctx.drawImage(Assets.img.golden, 0, 0, 12, 12, tx - 6, ty - 6, 12, 12);
        else ctx.drawImage(Assets.img.firefly, 0, 0, 8, 8, tx - 4, ty - 4, 8, 8);
      }
    }
    if (t.state === T_READY && !ending && st === 'play') {   // soft halo while the tongue is ready; it goes out during the swallow
      ctx.globalAlpha = 0.8; ctx.drawImage(Assets.frogHalo, fx - 28, fy - 34); ctx.globalAlpha = 1;
    }
    this.drawFrog(W, fx, fy, u, ox, oy, diveA);
    ctx.setTransform(1, 0, 0, 1, ox, oy);
    if (ending && W.result === 2 && W.endT < 0.3) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - W.endT / 0.3;
      ctx.drawImage(Assets.bloom, fx - 64, fy - 64); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }

    // particles, grouped by colour
    const Pp = Fx.P;
    for (let c = 0; c < PCOL.length; c++) {
      ctx.fillStyle = P[PCOL[c]];
      for (let i = 0; i < Pp.n; i++) {
        if (Pp.col[i] !== c) continue;
        ctx.globalAlpha = Math.min(1, Pp.life[i] / Pp.max[i] * 1.5);
        ctx.fillRect(Pp.x[i] | 0, Pp.y[i] | 0, c === 1 ? 3 : 2, 2);
      }
    }
    ctx.globalAlpha = 1;

    // fireflies
    const ffImg = Assets.img.firefly, gImg = Assets.img.golden, air = f.state === FROG_AIR;
    for (let i = 0; i < W.flies.length; i++) {
      const fl = W.flies[i];
      if (!fl.alive) continue;
      const a = this.flyAlpha(W, fl, clock) * winFade;
      if (a <= 0) continue;
      const x = lerp(fl.prevX, fl.x, alpha), y = lerp(fl.prevY, fl.y, alpha);
      if (fl.enterT > 0) {
        ctx.fillStyle = P.fireflyGlow;
        for (let k = 1; k <= 3; k++) { ctx.globalAlpha = a * (0.6 - k * 0.15); ctx.fillRect((x - fl.vx * k * 0.04) | 0, (y - fl.vy * k * 0.04) | 0, 2, 2); }
      }
      const lv = fl.golden ? 1 : fl.level;
      if (lv > 0) {   // halo above the pads, so a fly over a pad still glows
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * lv * 0.85;
        ctx.drawImage(Assets.halo, x - 14, y - 14);
        ctx.globalCompositeOperation = 'source-over';
      }
      if (fl.golden) { ctx.globalAlpha = a; ctx.drawImage(gImg, (Math.floor(clock * 4) & 1) * 12, 0, 12, 12, x - 6, y - 6, 12, 12); }
      else {
        ctx.globalAlpha = a; ctx.drawImage(ffImg, 8, 0, 8, 8, x - 4, y - 4, 8, 8);
        if (fl.level > 0) { ctx.globalAlpha = a * fl.level; ctx.drawImage(ffImg, 0, 0, 8, 8, x - 4, y - 4, 8, 8); }
      }
    }
    ctx.globalAlpha = 1;
    // mid-hop snap window outlines, batched
    if (air && !ending) {
      ctx.strokeStyle = P.fireflyGlow; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i < W.flies.length; i++) {
        const fl = W.flies[i];
        if (!Flies.catchable(fl) || Math.hypot(fl.x - f.x, fl.y - f.y) > CFG.tongueRange) continue;
        ctx.moveTo(fl.x + 7, fl.y); ctx.arc(fl.x, fl.y, 7, 0, TAU);
      }
      ctx.stroke();
    }
    // teaching ring
    if (W.snapFly >= 0 && !W.tongueUsed && W.flies[W.snapFly].alive) {
      const fl = W.flies[W.snapFly];
      ctx.strokeStyle = P.text; ctx.lineWidth = 1; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(clock * 8);
      ctx.beginPath(); ctx.arc(fl.x, fl.y, 9 + Math.sin(clock * 8), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    }

    // float text and labels
    const F = Fx.F;
    for (let i = 0; i < F.label.length; i++) {
      const lab = F.label[i];
      if (!lab) continue;
      const k = F.t[i] / F.life[i], e = 1 - (1 - k) * (1 - k);
      ctx.globalAlpha = F.t[i] > F.life[i] - 0.2 ? Math.max(0, (F.life[i] - F.t[i]) / 0.2) : 1;
      ctx.drawImage(lab, Math.round(F.x[i] - lab.width / 2), Math.round(F.y[i] - lab.height / 2 - F.rise[i] * e));
    }
    ctx.globalAlpha = 1;
    // streak near the frog
    if (st === 'play' && !ending && (W.streak >= 2 || W.streakGreyT > 0)) {
      const grey = W.streak < 2, lab = grey ? Assets.L.streakGrey : Assets.L.streak, at = grey ? Assets.digits13grey : Assets.digits13g;
      ctx.globalAlpha = grey ? W.streakGreyT / 0.6 : 1;
      const sc = W.streakPop > 0 ? 1 + 0.3 * (W.streakPop / 0.12) : 1;
      this.nb(); this.nn(grey ? W.lastStreak : W.streak);
      let nw = 0; for (let i = 0; i < this.bufLen; i++) nw += at.w[this.buf[i]] + 1;
      const tw = lab.width + 3 + nw, sx = Math.round(fx), sy = Math.round(fy - 18 - 22);
      ctx.setTransform(sc, 0, 0, sc, sx + ox, sy + 8 + oy);
      ctx.drawImage(lab, Math.round(-tw / 2), -8);
      this.nd(at, Math.round(-tw / 2) + lab.width + 3, -8, 0);
      ctx.setTransform(1, 0, 0, 1, ox, oy); ctx.globalAlpha = 1;
    }

    // title-screen warm-up of every draw path
    if (this.warm > 0 && title) {
      this.warm--;
      ctx.globalAlpha = 0.01;
      ctx.drawImage(Assets.vignette, 0, 0); ctx.drawImage(padImg, 96, 0, 48, 48, 0, 0, 48, 48); ctx.drawImage(gImg, 0, 0);
      ctx.fillRect(1, 1, 2, 2); ctx.beginPath(); ctx.ellipse(30, 30, 10, 5, 0, 0, TAU); ctx.stroke();
      ctx.drawImage(Assets.bloom, 0, 0); ctx.drawImage(Assets.img.chevron, 0, 0);
      ctx.globalAlpha = 1;
    }

    // ---- fixed layers ----
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (W.vigA > 0) { ctx.globalAlpha = W.vigA; ctx.drawImage(Assets.vignette, 0, 0); ctx.globalAlpha = 1; }
    this.drawHUD(W, clock);
    this.drawOverlay(W, st, clock);
  };

  R.flyAlpha = function (W, fl, clock) {
    let a = fl.enterT > 0 ? Math.min(1, (fl.enterDur - fl.enterT) / CFG.spawnFade) : fl.spawnT > 0 ? 1 - fl.spawnT / CFG.spawnFade : 1;
    if (!fl.golden && fl.life > 0 && fl.life < CFG.swarmFade) a *= fl.life / CFG.swarmFade;   // swarm and regular flies fade as they leave
    if (fl.golden && fl.life < CFG.goldenBlinkLast) a *= (Math.floor(clock * 5) & 1) ? 0.35 : 1;
    return a;
  };

  R.drawFrog = function (W, x, y, u, ox, oy, diveA) {
    const ctx = this.ctx, f = W.frog, img = Assets.img.frog, rm = Game.reducedMotion ? 0.5 : 1;
    let fr = FROG_F.idle, sx = 1, sy = 1, jx = 0, dy = 0;
    if (f.state === FROG_AIR) {
      if (f.crouchT > 0) { fr = FROG_F.crouch; sx = 1.2; sy = 0.8; }
      else { fr = FROG_F.air; const s = Math.sin(Math.PI * u); sx = 1 - 0.15 * s; sy = 1 + 0.15 * s; }
    } else if (f.state === FROG_IDLE) {
      if (f.landT > 0) { const k = f.landT > 0.1 ? 1 : 1 - Math.pow(1 - f.landT / 0.1, 3); sx = 1 + 0.25 * k; sy = 1 - 0.25 * k; }
      const pad = W.pads[f.pad];
      if (pad.bobT > 0) { const v = 1 - pad.bobT / 0.3; dy = 2 * Math.sin(v * Math.PI * 2) * (1 - v); }
    } else if (f.state === FROG_DIVE) { fr = FROG_F.dive; dy = 8 * Math.min(1, W.endT / 0.5); }
    if (f.state !== FROG_DIVE && f.state !== FROG_FROZEN) {
      if (W.tongue.state === T_OUT || W.tongue.state === T_BACK) fr = FROG_F.tongue;
      else if (f.puffT > 0 && f.state === FROG_IDLE) fr = FROG_F.puff;
      if (f.shiver && !Game.reducedMotion && Game.state === 'play') jx = (Math.floor(Game.clock * 24) & 1) ? 1 : -1;
    }
    sx = 1 + (sx - 1) * rm; sy = 1 + (sy - 1) * rm;
    ctx.setTransform(sx, 0, 0, sy, Math.round(x + jx) + ox, Math.round(y + dy) + 10 + oy);
    ctx.globalAlpha = diveA;
    if (f.state === FROG_FROZEN) {
      const h = Math.round(32 * Math.min(1, (Game.state === 'over' ? 1 : W.endT / 0.6)));
      ctx.drawImage(img, FROG_F.idle * 32, 0, 32, 32, -16, -28, 32, 32);
      if (h > 0) ctx.drawImage(img, FROG_F.frozen * 32, 32 - h, 32, h, -16, -28 + 32 - h, 32, h);
    } else ctx.drawImage(img, fr * 32, 0, 32, 32, -16, -28, 32, 32);
    ctx.globalAlpha = 1;
  };

  // HUD at 1.5x (jar sprite 1.5x, 24/18 px digits), inset 12 px from the screen edges; always on the shore.
  const HUD = { s: 1.5, jarX: 12, jarY: 10, numX: 50, countY: 8, scoreY: 36, flakeX: 486, flakeY: 12, barX: 508, barY: 15, barW: 116, barH: 9, pctX: 624, pctY: 30 };
  R.drawHUD = function (W, clock) {
    const ctx = this.ctx, P = PALETTE, jar = Assets.img.jar, H = HUD;
    const fill = Math.round(16 * Math.min(1, W.caught / CFG.jarTarget));
    const sc = H.s * (W.jarPulse > 0 ? 1 + 0.1 * Math.sin(Math.PI * (1 - W.jarPulse / 0.15)) : 1);
    ctx.setTransform(sc, 0, 0, sc, H.jarX + 10 * H.s - 10 * sc, H.jarY + 14 * H.s - 14 * sc);
    if (W.caught > 0) {   // jar light: glows brighter as it fills
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + 0.65 * Math.min(1, W.caught / CFG.jarTarget);
      ctx.drawImage(Assets.halo, -6, -4, 32, 32); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    if (fill > 0) {
      ctx.fillStyle = P.fireflyGlow; ctx.fillRect(4, 9 + 16 - fill, 12, fill);
      ctx.fillStyle = P.firefly; ctx.fillRect(4, 9 + 16 - fill, 12, 1);
    }
    ctx.drawImage(jar, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.nb(); this.nn(Math.min(W.caught, CFG.jarTarget)); this.ng(10); this.nn(CFG.jarTarget);
    this.nd(W.jarHiT > 0 ? Assets.digits24g : Assets.digits24, H.numX, H.countY, 0);
    this.nb(); this.nn(W.score); this.nd(Assets.digits18g, H.numX, H.scoreY, 0);
    // warmth meter
    const danger = W.Rshown < CFG.dangerBelowR;
    ctx.drawImage(Assets.img.snowflake, danger ? 12 : 0, 0, 12, 12, H.flakeX, H.flakeY, 18, 18);
    ctx.fillStyle = P.ink; ctx.fillRect(H.barX - 1, H.barY - 1, H.barW + 2, H.barH + 2);
    ctx.fillStyle = P.iceShadow; ctx.fillRect(H.barX, H.barY, H.barW, H.barH);
    ctx.fillStyle = danger ? P.danger : P.fireflyGlow; ctx.fillRect(H.barX, H.barY, Math.round(Math.min(1, W.Rshown) * H.barW), H.barH);
    this.nb(); this.nn(Math.round(W.Rshown * 100)); this.ng(11); this.nd(danger ? Assets.digits18d : Assets.digits18, H.pctX, H.pctY, 2);
    ctx.drawImage(Assets.img.mute, Fx.muted ? 12 : 0, 0, 12, 12, 612, 334, 12, 12);
  };

  R.drawOverlay = function (W, st, clock) {
    const ctx = this.ctx, L = Assets.L;
    const ta = st === 'title' ? 1 : st === 'play' ? Math.max(0, Game.titleFade / 0.3) : 0;
    if (ta > 0) {   // panels are drawn in the world layer; only the pulsing prompt is here
      ctx.globalAlpha = ta * (0.65 + 0.35 * Math.cos(clock * Math.PI));
      ctx.drawImage(L.press, (CFG.W - L.press.width) >> 1, 314);   // last line of the bottom panel, pulsing
      ctx.globalAlpha = 1;
    }
    if (st === 'pause') {
      ctx.globalAlpha = 0.45; ctx.fillStyle = PALETTE.deepWater; ctx.fillRect(0, 0, CFG.W, CFG.H); ctx.globalAlpha = 1;
      ctx.drawImage(this.pausePanel, (CFG.W - this.pausePanel.width) >> 1, (CFG.H - this.pausePanel.height) >> 1);
    }
    if (st === 'over' && this.over) {
      ctx.globalAlpha = Math.min(0.45, W.overT * 2); ctx.fillStyle = PALETTE.deepWater; ctx.fillRect(0, 0, CFG.W, CFG.H);
      ctx.globalAlpha = Math.min(1, W.overT * 5);
      const px = (CFG.W - this.over.width) >> 1, py = (CFG.H - this.over.height) >> 1;
      ctx.drawImage(this.over, px, py);
      ctx.globalAlpha = W.overT >= CFG.overInputLock ? 1 : 0.5;
      ctx.drawImage(this.button, px + ((this.over.width - this.button.width) >> 1), py + this.over.height - 52);
      ctx.globalAlpha = 1;
    }
  };

  return R;
})();
