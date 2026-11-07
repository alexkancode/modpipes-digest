// Firefly pool: spawner (regular, golden, swarm), steering wander with ice avoidance, blink, lifetimes.
const Flies = {
  make() {
    const flies = [];
    for (let i = 0; i < CFG.flyPool; i++) {
      flies.push({ alive: 0, x: 0, y: 0, prevX: 0, prevY: 0, bx: 0, by: 0, vx: 0, vy: 0, wx: 0, wy: 0, retarget: 0,
        period: 1.6, phase: 0, lit: 0, level: 0, golden: 0, swarm: 0, life: 0, spawnT: 0, bobPh: 0, enterT: 0, enterDur: 0 });
    }
    return flies;
  },

  reset(W) {
    for (let i = 0; i < W.flies.length; i++) W.flies[i].alive = 0;
    W.spawnTimer = 0; W.lastWasGolden = 0; W.goldenForced = 0;
    // Initial six: ≥95 px from the frog, the first two within 40 px of one inner pad.
    const inner = 1 + rng.int(4);
    for (let k = 0; k < CFG.capByTime[0][1]; k++) {
      const near = k < CFG.spawnInitialNearInner;
      this.trySpawn(W, 0, 0, near ? inner : -1, near ? CFG.spawnInitialNearDist : CFG.spawnNearPad, CFG.spawnMinFrogInitial);
    }
    for (let i = 0; i < W.flies.length; i++) W.flies[i].spawnT = 0;
  },

  free(W) {
    for (let i = 0; i < W.flies.length; i++) if (!W.flies[i].alive) return i;
    return -1;
  },

  // Finds a point over open water near an open pad; returns 1 and writes W.spawnX/Y on success.
  findPoint(W, padIdx, nearDist, minFrog) {
    const m = W.R - CFG.spawnRhoMargin, f = W.frog;
    for (let a = 0; a < CFG.spawnAttempts; a++) {
      let pad;
      if (padIdx >= 0) pad = W.pads[padIdx];
      else {
        let n = 0;
        for (let i = 0; i < W.pads.length; i++) { const p = W.pads[i]; if ((p.state === PAD_OPEN || p.state === PAD_THAWING) && p.rho < m) n++; }
        if (!n) return 0;
        let pick = rng.int(n);
        for (let i = 0; i < W.pads.length; i++) { const p = W.pads[i]; if ((p.state === PAD_OPEN || p.state === PAD_THAWING) && p.rho < m && pick-- === 0) { pad = p; break; } }
      }
      const r = nearDist * Math.sqrt(rng.next()), ang = rng.range(0, Math.PI * 2);
      const x = pad.x + Math.cos(ang) * r, y = pad.y + Math.sin(ang) * r;
      if (Pond.rho(x, y) >= m) continue;
      if (Math.hypot(x - f.x, y - f.y) < minFrog) continue;
      W.spawnX = x; W.spawnY = y;
      return 1;
    }
    return 0;
  },

  trySpawn(W, golden, swarm, padIdx, nearDist, minFrog) {
    const i = this.free(W);
    if (i < 0) return -1;
    if (!this.findPoint(W, padIdx, nearDist, minFrog)) return -1;
    const fl = W.flies[i];
    fl.alive = 1; fl.golden = golden; fl.swarm = swarm;
    fl.bx = fl.x = fl.prevX = W.spawnX; fl.by = fl.y = fl.prevY = W.spawnY;
    fl.vx = fl.vy = 0; fl.wx = fl.bx; fl.wy = fl.by; fl.retarget = 0; fl.enterT = fl.enterDur = 0;
    fl.period = rng.range(CFG.blinkPeriod[0], CFG.blinkPeriod[1]); fl.phase = rng.range(0, fl.period);
    fl.bobPh = rng.range(0, Math.PI * 2);
    fl.spawnT = CFG.spawnFade;
    fl.life = golden ? CFG.goldenLife : swarm ? CFG.swarmLife : CFG.flyLife;
    fl.lit = golden ? 1 : 0;
    return i;
  },

  spawnRegular(W) {
    let minFrog = CFG.spawnMinFrog;
    let golden = 0;
    if (W.goldenForced && !W.lastWasGolden && !this.goldenAlive(W) && rng.next() < 1 / CFG.goldenOdds) golden = 1;
    let i = this.trySpawn(W, golden, 0, -1, CFG.spawnNearPad, minFrog);
    if (i < 0 && W.R < CFG.subsidyBelowR) i = this.trySpawn(W, golden, 0, -1, CFG.spawnNearPad, CFG.spawnMinFrogSubsidy);
    if (i >= 0) {
      W.lastWasGolden = golden;
      // Regular flies drift in from the reeds along the ray through their spawn point: visible, not yet catchable.
      const fl = W.flies[i], p = CFG.pond, r = Pond.rho(fl.bx, fl.by) || 1, k = CFG.flyEnterRho / r;
      if (!golden) { this.enterFrom(fl, p.cx + (fl.bx - p.cx) * k, p.cy + (fl.by - p.cy) * k, CFG.flyEnter); fl.life += CFG.flyEnter; }
    }
    return i;
  },

  spawnSwarm(W) {
    const p = CFG.pond, side = W.swarmSide;
    for (let k = 0; k < CFG.swarmCount; k++) {
      const i = this.trySpawn(W, 0, 1, -1, CFG.spawnNearPad, 0);
      if (i < 0) continue;
      const fl = W.flies[i];
      // Enter from the open-water edge on one side and stream to the spawn point over 1 s.
      const ang = (side > 0 ? 0 : Math.PI) + rng.range(-0.5, 0.5), rr = W.R - 0.04;
      this.enterFrom(W.flies[i], p.cx + Math.cos(ang) * p.a * rr, p.cy + Math.sin(ang) * p.b * rr, CFG.swarmEnter);
      W.flies[i].spawnT = 0.15;
    }
    W.swarmSide = -side;
  },

  // Fly in a straight line from (sx, sy) to the fly's spawn point over dur seconds; uncatchable until it arrives.
  enterFrom(fl, sx, sy, dur) {
    fl.vx = (fl.bx - sx) / dur; fl.vy = (fl.by - sy) / dur;
    fl.bx = fl.x = fl.prevX = sx; fl.by = fl.y = fl.prevY = sy;
    fl.enterT = fl.enterDur = dur; fl.spawnT = dur;
  },

  goldenAlive(W) {
    for (let i = 0; i < W.flies.length; i++) if (W.flies[i].alive && W.flies[i].golden) return 1;
    return 0;
  },

  regularAlive(W) {
    let n = 0;
    for (let i = 0; i < W.flies.length; i++) { const f = W.flies[i]; if (f.alive && !f.golden && !f.swarm) n++; }
    return n;
  },

  catchable(fl) { return fl.alive && fl.lit && fl.spawnT <= 0; },

  catchAt(W, x, y, r) {
    let best = -1, bestD = r;
    for (let i = 0; i < W.flies.length; i++) {
      const fl = W.flies[i];
      if (!this.catchable(fl)) continue;
      const d = Math.hypot(fl.x - x, fl.y - y);
      if (d <= bestD) { best = i; bestD = d; }
    }
    return best;
  },

  // Keyboard tongue: catchable golden in range first, else nearest catchable in range.
  autoAim(W) {
    const f = W.frog;
    let best = -1, bestD = 1e9;
    for (let i = 0; i < W.flies.length; i++) {
      const fl = W.flies[i];
      if (!this.catchable(fl)) continue;
      const d = Math.hypot(fl.x - f.x, fl.y - f.y);
      if (d > CFG.tongueRange) continue;
      const score = fl.golden ? d - 1e6 : d;
      if (score < bestD) { best = i; bestD = score; }
    }
    return best;
  },

  // Click rule 1: an alive, non-spawning fly (lit or dim) within 20 px of the point and 90 px of the frog.
  clickedFly(W, x, y) {
    const f = W.frog;
    let best = -1, bestD = CFG.clickFlyR;
    for (let i = 0; i < W.flies.length; i++) {
      const fl = W.flies[i];
      if (!fl.alive || fl.spawnT > 0) continue;
      const d = Math.hypot(fl.x - x, fl.y - y);
      if (d > bestD || Math.hypot(fl.x - f.x, fl.y - f.y) > CFG.tongueRange) continue;
      best = i; bestD = d;
    }
    return best;
  },

  wanderSpeed(t) {
    const w = CFG.wander;
    for (let i = 1; i < w.length; i++) if (t < w[i][0]) { const a = w[i - 1], b = w[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); }
    return w[w.length - 1][1];
  },

  // Blink: gameplay lit flag plus a 0.1 s faded visual level.
  blink(fl, clock) {
    if (fl.golden) { fl.lit = 1; fl.level = 1; return; }
    const p = (clock + fl.phase) % fl.period, litEnd = fl.period * CFG.blinkLit, fd = CFG.blinkFade;
    fl.lit = p < litEnd ? 1 : 0;
    fl.level = p < fd ? p / fd : p < litEnd ? 1 : p < litEnd + fd ? 1 - (p - litEnd) / fd : 0;
  },

  // Title screen: blink and bob in place.
  idle(W, clock) {
    for (let i = 0; i < W.flies.length; i++) {
      const fl = W.flies[i];
      if (!fl.alive) continue;
      fl.prevX = fl.x; fl.prevY = fl.y;
      this.blink(fl, clock);
      fl.y = fl.by + CFG.bobAmp * Math.sin(Math.PI * 2 * CFG.bobHz * clock + fl.bobPh);
    }
  },

  update(W, dt) {
    // spawner
    if (W.t >= CFG.goldenAfter && !W.goldenForced) {
      if (this.trySpawn(W, 1, 0, -1, CFG.spawnNearPad, CFG.spawnMinFrog) >= 0 || this.trySpawn(W, 1, 0, -1, CFG.spawnNearPad, 0) >= 0) {
        W.goldenForced = 1; W.lastWasGolden = 1; sfx('golden'); Fx.once(W, 'golden');
      }
    }
    W.spawnTimer -= dt;
    if (W.spawnTimer <= 0 && this.regularAlive(W) < W.cap) {
      if (this.spawnRegular(W) >= 0) W.spawnTimer = W.R < CFG.subsidyBelowR ? CFG.respawnSubsidy : CFG.respawn;
    }

    const speed = this.wanderSpeed(W.t), m = W.R - CFG.iceAvoid, p = CFG.pond;
    for (let i = 0; i < W.flies.length; i++) {
      const fl = W.flies[i];
      if (!fl.alive) continue;
      fl.prevX = fl.x; fl.prevY = fl.y;
      if (fl.spawnT > 0) fl.spawnT -= dt;
      if (fl.life > 0 && (fl.life -= dt) <= 0) { fl.alive = 0; continue; }
      this.blink(fl, W.t);

      if (fl.enterT > 0) {
        fl.enterT -= dt; fl.bx += fl.vx * dt; fl.by += fl.vy * dt;
        if (fl.enterT <= 0) { fl.vx *= 0.1; fl.vy *= 0.1; fl.wx = fl.bx; fl.wy = fl.by; }
      } else {
        const sp = fl.golden ? speed * CFG.goldenSpeed : speed;
        if ((fl.retarget -= dt) <= 0 || Math.hypot(fl.wx - fl.bx, fl.wy - fl.by) < 4) this.pickTarget(W, fl);
        let tx = fl.wx - fl.bx, ty = fl.wy - fl.by;
        if (Pond.rho(fl.bx, fl.by) > m) { tx = p.cx - fl.bx; ty = p.cy - fl.by; }
        const d = Math.hypot(tx, ty) || 1, k = Math.min(1, 3 * dt);
        fl.vx += (tx / d * sp - fl.vx) * k; fl.vy += (ty / d * sp - fl.vy) * k;
        fl.bx += fl.vx * dt; fl.by += fl.vy * dt;
      }
      // Hard guarantee: never over ice once it has arrived.
      const r = Pond.rho(fl.bx, fl.by), lim = W.R - 0.015;
      if (fl.enterT <= 0 && r > lim && r > 0) { const s = lim / r; fl.bx = p.cx + (fl.bx - p.cx) * s; fl.by = p.cy + (fl.by - p.cy) * s; }
      fl.x = fl.bx; fl.y = fl.by + CFG.bobAmp * Math.sin(Math.PI * 2 * CFG.bobHz * W.t + fl.bobPh);
    }
  },

  pickTarget(W, fl) {
    const p = CFG.pond;
    fl.retarget = rng.range(CFG.wanderRetarget[0], CFG.wanderRetarget[1]);
    if (fl.golden) {
      // Drift toward the ice edge and hold at rho ≈ R − 0.06.
      const ang = Math.atan2((fl.by - p.cy) / p.b, (fl.bx - p.cx) / p.a) + rng.range(-0.6, 0.6), rr = Math.max(0.02, W.R - CFG.goldenHoldRho);
      fl.wx = p.cx + Math.cos(ang) * p.a * rr; fl.wy = p.cy + Math.sin(ang) * p.b * rr;
      return;
    }
    const m = W.R - CFG.spawnRhoMargin;
    for (let a = 0; a < 6; a++) {
      const r = CFG.wanderReach * Math.sqrt(rng.next()), ang = rng.range(0, Math.PI * 2);
      const x = fl.bx + Math.cos(ang) * r, y = fl.by + Math.sin(ang) * r;
      if (Pond.rho(x, y) < m) { fl.wx = x; fl.wy = y; return; }
    }
    fl.wx = p.cx; fl.wy = p.cy;
  },

  // Win sequence: fireflies swirl upward and fade.
  swirl(W, dt) {
    for (let i = 0; i < W.flies.length; i++) {
      const fl = W.flies[i];
      if (!fl.alive) continue;
      fl.prevX = fl.x; fl.prevY = fl.y;
      fl.bobPh += dt * 6;
      fl.x += Math.cos(fl.bobPh) * 30 * dt; fl.y -= 50 * dt;
      fl.level = 1;
    }
  },
};
