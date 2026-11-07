// Ellipse math, the ice radius R, and the 11 orbiting lily pads with their freeze states.
const Pond = {
  rho(x, y) {
    const p = CFG.pond, dx = (x - p.cx) / p.a, dy = (y - p.cy) / p.b;
    return Math.sqrt(dx * dx + dy * dy);
  },
  // Ellipse unit radius (px) along the ray from the pond centre through (x, y).
  unitLen(x, y) {
    const p = CFG.pond, dx = x - p.cx, dy = y - p.cy, d = Math.hypot(dx, dy);
    if (d < 1e-6) return p.b;
    const c = dx / d / p.a, s = dy / d / p.b;
    return 1 / Math.sqrt(c * c + s * s);
  },
  hitR(W) { return Math.max(CFG.padR, CFG.padHitMinScreen / W.cssScale); },
  targetable(pad) { return pad.state !== PAD_FROZEN; },

  makePads() {
    const pads = [];
    for (let i = 0; i < CFG.padAnchors.length; i++) {
      pads.push({ i, ax: CFG.padAnchors[i][0], ay: CFG.padAnchors[i][1], orbitR: 0, omega: 0, dir: 1, theta: 0,
        x: 0, y: 0, prevX: 0, prevY: 0, rho: 0, state: PAD_OPEN, frostT: 0, thawT: 0, bobT: 0, orient: 0, flip: 1 });
    }
    return pads;
  },

  reset(W) {
    W.R = CFG.R0; W.Rshown = CFG.R0;
    const p = CFG.pond;
    for (let i = 0; i < W.pads.length; i++) {
      const pad = W.pads[i], centre = i === 0;
      pad.orbitR = centre ? CFG.centreOrbit : rng.range(CFG.padOrbit[0], CFG.padOrbit[1]);
      const speed = centre ? CFG.centreSpeed : rng.range(CFG.padSpeed[0], CFG.padSpeed[1]);
      pad.omega = speed / pad.orbitR;
      pad.theta = rng.range(0, Math.PI * 2);
      pad.dir = rng.next() < 0.5 ? -1 : 1;
      pad.orient = fxRng.int(4); pad.flip = fxRng.next() < 0.5 ? -1 : 1;
      pad.state = PAD_OPEN; pad.frostT = 0; pad.thawT = 0; pad.bobT = 0;
      pad.x = pad.prevX = p.cx + pad.ax + pad.orbitR * Math.cos(pad.theta);
      pad.y = pad.prevY = p.cy + pad.ay + pad.orbitR * Math.sin(pad.theta);
      pad.rho = this.rho(pad.x, pad.y);
    }
  },

  orbit(pad, dt) {
    pad.prevX = pad.x; pad.prevY = pad.y;
    if (pad.state === PAD_FROZEN) return;
    const p = CFG.pond;
    pad.theta += pad.omega * pad.dir * dt;
    pad.x = p.cx + pad.ax + pad.orbitR * Math.cos(pad.theta);
    pad.y = p.cy + pad.ay + pad.orbitR * Math.sin(pad.theta);
    pad.rho = this.rho(pad.x, pad.y);
  },

  update(W, dt) {
    W.R = Math.max(CFG.Rfloor, W.R - W.shrink * dt);
    if (W.R > W.Rshown) W.Rshown += (W.R - W.Rshown) * 0.2; else W.Rshown = W.R;
    const warn = CFG.frostWarnSec * W.shrink;
    for (let i = 0; i < W.pads.length; i++) {
      const pad = W.pads[i];
      this.orbit(pad, dt);
      if (pad.bobT > 0) pad.bobT -= dt;
      const margin = W.R - pad.rho;
      switch (pad.state) {
        case PAD_OPEN:
        case PAD_THAWING:
          if (pad.state === PAD_THAWING && (pad.thawT -= dt) <= 0) pad.state = PAD_OPEN;
          if (margin < warn) { pad.state = PAD_FROSTING; pad.frostT = 0; sfx('crack'); }
          break;
        case PAD_FROSTING:
          pad.frostT += dt;
          if (margin >= warn) pad.state = PAD_OPEN;
          else if (margin <= 0 && pad.frostT >= CFG.frostMinDwell) pad.state = PAD_FROZEN;
          break;
        case PAD_FROZEN:
          if (margin > CFG.thawHyst) { pad.state = PAD_THAWING; pad.thawT = CFG.thawAnim; Fx.shards(pad.x, pad.y, 4, 30); }
          break;
      }
    }
  },

  // Nearest targetable pad (not the frog's) whose hit circle contains (x, y) and whose centre is in hop range.
  padAt(W, x, y) {
    const r = this.hitR(W), f = W.frog;
    let best = -1, bestD = 1e9;
    for (let i = 0; i < W.pads.length; i++) {
      const pad = W.pads[i];
      if (!this.targetable(pad) || (i === f.pad && f.state !== FROG_AIR)) continue;
      if (f.state === FROG_AIR && i === f.hopTo) continue;
      const d = Math.hypot(pad.x - x, pad.y - y);
      if (d > r || d >= bestD) continue;
      if (Math.hypot(pad.x - f.x, pad.y - f.y) > CFG.hopRange) continue;
      best = i; bestD = d;
    }
    return best;
  },

  // Nearest targetable pad within range and within ±45° of direction (dx, dy).
  padInDir(W, dx, dy) {
    const f = W.frog, cosCone = Math.cos(CFG.keyCone);
    let best = -1, bestD = 1e9;
    for (let i = 0; i < W.pads.length; i++) {
      const pad = W.pads[i];
      if (!this.targetable(pad)) continue;
      if (f.state === FROG_AIR ? i === f.hopTo : i === f.pad) continue;
      const vx = pad.x - f.x, vy = pad.y - f.y, d = Math.hypot(vx, vy);
      if (d > CFG.hopRange || d < 1e-6 || d >= bestD) continue;
      if ((vx * dx + vy * dy) / d < cosCone - 1e-9) continue;
      best = i; bestD = d;
    }
    return best;
  },
};
