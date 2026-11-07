// Fx: pooled particles (typed arrays), shockwave rings, score popups, heal-flies,
// plus the feel timers: shake, hit-stop, slow-mo. Feel timers run in real ms.
const P_SPARK = 0, P_SHARD = 1, P_DUST = 2, P_SMOKE = 3;

const Fx = {
  // particles
  n: 0, px: null, py: null, vx: null, vy: null, life: null, max: null, size: null, kind: null, col: null, cur: 0,
  rings: [], popups: [], flies: [],
  amp: 0, hold: 0, hitstopMs: 0, hsWindowStart: 0, hsUsed: 0, realNow: 0,
  slowmoMs: 0, timeScale: 1, reducedMotion: false, serial: 0,

  init() {
    const F = CONFIG.fx, N = (this.n = F.particles);
    this.px = new Float32Array(N); this.py = new Float32Array(N); this.vx = new Float32Array(N); this.vy = new Float32Array(N);
    this.life = new Float32Array(N); this.max = new Float32Array(N); this.size = new Float32Array(N);
    this.kind = new Uint8Array(N); this.col = new Uint8Array(N);
    for (let i = 0; i < F.rings; i++) this.rings.push({ alive: false, x: 0, y: 0, rMax: 0, t: 0, dur: 0, col: 0, born: 0 });
    for (let i = 0; i < F.popups; i++) this.popups.push({ alive: false, x: 0, y: 0, value: 0, combo: 1, t: 0, born: 0 });
    for (let i = 0; i < F.healFlies; i++) this.flies.push({ alive: false, x: 0, y: 0, value: 0, t: 0, born: 0 });
    const mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (mq) {
      this.reducedMotion = mq.matches;
      const on = () => { this.reducedMotion = mq.matches; };
      if (mq.addEventListener) mq.addEventListener('change', on); else if (mq.addListener) mq.addListener(on);
    }
  },

  reset() {
    this.life.fill(0);
    for (let i = 0; i < this.rings.length; i++) this.rings[i].alive = false;
    for (let i = 0; i < this.popups.length; i++) this.popups[i].alive = false;
    for (let i = 0; i < this.flies.length; i++) this.flies[i].alive = false;
    this.amp = 0; this.hold = 0; this.hitstopMs = 0; this.hsUsed = 0; this.slowmoMs = 0; this.timeScale = 1;
  },

  // ---------- particles ----------
  emit(kind, x, y, vx, vy, life, size, col) {
    const N = this.n;
    for (let j = 0; j < N; j++) {
      const i = (this.cur + j) % N;
      if (this.life[i] <= 0) {
        this.cur = (i + 1) % N;
        this.px[i] = x; this.py[i] = y; this.vx[i] = vx; this.vy[i] = vy;
        this.life[i] = life; this.max[i] = life; this.size[i] = size; this.kind[i] = kind; this.col[i] = col;
        return;
      }
    }
  },
  sparks(x, y, n, col) {
    for (let i = 0; i < n; i++) {
      const a = Rng.next() * Math.PI * 2, s = 60 + Rng.next() * 140;
      this.emit(P_SPARK, x, y, Math.cos(a) * s, Math.sin(a) * s - 40, 0.18 + Rng.next() * 0.2, 2, col);
    }
  },
  shards(x, y, w, h, n, col) {
    for (let i = 0; i < n; i++) {
      const ox = (Rng.next() - 0.5) * w, oy = (Rng.next() - 0.5) * h;
      this.emit(P_SHARD, x + ox, y + oy, ox * 2.2 + (Rng.next() - 0.5) * 80, -60 - Rng.next() * 200, 1.5, 3 + Rng.next() * 5, col);
    }
  },
  dust(x, y, n, spread) {
    const sp = spread || 10;
    for (let i = 0; i < n; i++) {
      const dir = Rng.next() < 0.5 ? -1 : 1;
      this.emit(P_DUST, x + (Rng.next() - 0.5) * sp, y - Rng.next() * 6, dir * (20 + Rng.next() * 60), -10 - Rng.next() * 30,
        0.5 + Rng.next() * 0.6, 3 + Rng.next() * 3, C_DUST);
    }
  },
  smoke(x, y, n) {
    for (let i = 0; i < n; i++)
      this.emit(P_SMOKE, x + (Rng.next() - 0.5) * 16, y + (Rng.next() - 0.5) * 8, (Rng.next() - 0.5) * 30, -20 - Rng.next() * 30,
        0.7 + Rng.next() * 0.5, 5 + Rng.next() * 4, C_DUST);
  },

  // ---------- rings ----------
  // big rings recycle the oldest slot; small ones (shell impacts) only take a free one
  ring(x, y, rMax, dur, col, big) {
    let pick = null, oldest = null;
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (!r.alive) { pick = r; break; }
      if (!oldest || r.born < oldest.born) oldest = r;
    }
    if (!pick) { if (!big) return; pick = oldest; }
    pick.alive = true; pick.x = x; pick.y = y; pick.rMax = rMax; pick.t = 0; pick.dur = dur; pick.col = col; pick.born = ++this.serial;
  },

  // ---------- popups ----------
  popup(x, y, value, combo) {
    const p = this.oldest(this.popups);
    p.alive = false;
    y = Math.max(CONFIG.fx.popupMinY + 20, y);
    // stack above any live popup at the same spot instead of overprinting it
    for (let i = 0; i < this.popups.length; i++) {
      const q = this.popups[i];
      if (q.alive && Math.abs(q.x - x) < 60 && Math.abs(q.y - y) < 16) { y = q.y - 16; i = -1; }
    }
    p.alive = true; p.x = x; p.y = y; p.value = value; p.combo = combo; p.t = 0; p.born = ++this.serial;
  },
  healFly(x, y, value) {
    // heals landing together (one stomp, one beam) share a single number
    for (let i = 0; i < this.flies.length; i++) {
      const q = this.flies[i];
      if (q.alive && q.t < CONFIG.fx.healMergeT) { q.value += Math.round(value); return; }
    }
    const p = this.oldest(this.flies);
    p.alive = true; p.x = x + CONFIG.fx.healFlyDx; p.y = y + CONFIG.fx.healFlyDy; p.value = Math.round(value); p.t = 0; p.born = this.realNow;
  },
  oldest(list) {
    let o = list[0];
    for (let i = 0; i < list.length; i++) { if (!list[i].alive) return list[i]; if (list[i].born < o.born) o = list[i]; }
    return o;
  },

  // ---------- feel ----------
  shake(px) { this.amp = Math.min(CONFIG.fx.shakeCap, Math.max(this.amp, px)); },
  shakeHold(px) { this.hold = Math.max(this.hold, px); },
  hitstop(ms) {
    if (Main.state !== 'play') return;
    if (this.realNow - this.hsWindowStart >= 1000) { this.hsWindowStart = this.realNow; this.hsUsed = 0; }
    const grant = Math.min(ms, CONFIG.fx.hitstopCap - this.hsUsed);
    if (grant <= 0) return;
    if (grant > this.hitstopMs) { this.hsUsed += grant - this.hitstopMs; this.hitstopMs = grant; }
  },
  slowmo(ms) { this.slowmoMs = ms; this.timeScale = CONFIG.fx.slowmoScale; },

  stepReal(ms, now) {
    this.realNow = now;
    this.amp *= Math.pow(CONFIG.fx.shakeDecay, ms / 16.67);
    if (this.amp < 0.05) this.amp = 0;
    if (this.hitstopMs > 0) this.hitstopMs = Math.max(0, this.hitstopMs - ms);
    if (this.slowmoMs > 0) { this.slowmoMs -= ms; if (this.slowmoMs <= 0) this.timeScale = 1; }
  },

  shakeX() { const a = this.reducedMotion ? 0 : Math.max(this.amp, this.hold); return (Math.random() * 2 - 1) * a; },
  shakeY() { const a = this.reducedMotion ? 0 : Math.max(this.amp, this.hold); return (Math.random() * 2 - 1) * a; },

  // During hit-stop only rings and flash timers advance, so the frozen frame shows the impact.
  stepFrozen(dt) {
    this.stepRings(dt);
    for (let i = 0; i < City.lots.length; i++) if (City.lots[i].flashT > 0) City.lots[i].flashT -= dt;
  },

  stepRings(dt) {
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (r.alive && (r.t += dt) >= r.dur) r.alive = false;
    }
  },

  step(dt) {
    this.hold = 0;
    const G = CONFIG.GROUND;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const k = this.kind[i];
      if (k === P_SHARD) {
        this.vy[i] += 600 * dt;
        this.px[i] += this.vx[i] * dt; this.py[i] += this.vy[i] * dt;
        if (this.py[i] > G - 2) { this.py[i] = G - 2; this.vy[i] *= -0.35; this.vx[i] *= 0.6; }
      } else if (k === P_SPARK) {
        this.vy[i] += 300 * dt; this.px[i] += this.vx[i] * dt; this.py[i] += this.vy[i] * dt;
      } else {
        this.vx[i] *= 0.94; this.vy[i] *= 0.94;
        this.px[i] += this.vx[i] * dt; this.py[i] += this.vy[i] * dt;
        this.size[i] += (k === P_DUST ? 14 : 10) * dt;
      }
    }
    this.stepRings(dt);
    const F = CONFIG.fx;
    for (let i = 0; i < this.popups.length; i++) { const p = this.popups[i]; if (p.alive && (p.t += dt) >= F.popupT) p.alive = false; }
    for (let i = 0; i < this.flies.length; i++) { const p = this.flies[i]; if (p.alive && (p.t += dt) >= F.healFlyT + 0.15) p.alive = false; }
  },
};
