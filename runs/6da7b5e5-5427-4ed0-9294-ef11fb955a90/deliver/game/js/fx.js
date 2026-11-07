// Juice: pooled particles, ripples, float text, one-time labels, shake trauma, and the guarded SFX wrapper.
const SFX_OPTS = { step: 0, delay: 0 };
// step: pitch-ladder rung (catch); delay: seconds to offset the cue, so stacked cues stay legible.
function sfx(name, step, delay) {
  if (Fx.muted || !window.SFX || typeof SFX.play !== 'function') return;
  try {
    if (step !== undefined || delay) { SFX_OPTS.step = step || 0; SFX_OPTS.delay = delay || 0; SFX.play(SFX_ALIAS[name] || name, SFX_OPTS); }
    else SFX.play(SFX_ALIAS[name] || name);
  } catch (e) {}
}
function sfxCall(method, arg) {
  if (!window.SFX || typeof SFX[method] !== 'function') return;
  try { SFX[method](arg); } catch (e) {}
}

const Fx = (() => {
  const NP = CFG.pools.particles, NR = CFG.pools.ripples, NF = CFG.pools.floats;
  // particle colour index: 0 fireflyGlow, 1 ice, 2 iceShadow, 3 golden, 4 bubble (frogBelly)
  const P = { x: new Float32Array(NP), y: new Float32Array(NP), vx: new Float32Array(NP), vy: new Float32Array(NP),
    life: new Float32Array(NP), max: new Float32Array(NP), col: new Uint8Array(NP), n: 0 };
  const Rp = { x: new Float32Array(NR), y: new Float32Array(NR), t: new Float32Array(NR), alive: new Uint8Array(NR) };
  // float text: label is a canvas reference
  const F = { x: new Float32Array(NF), y: new Float32Array(NF), t: new Float32Array(NF), life: new Float32Array(NF), rise: new Float32Array(NF), label: new Array(NF).fill(null) };

  const fx = {
    P, Rp, F, muted: false, flashT: 0, flashX: 0, flashY: 0,

    reset() {
      P.n = 0;
      for (let i = 0; i < NR; i++) Rp.alive[i] = 0;
      for (let i = 0; i < NF; i++) F.label[i] = null;
      this.flashT = 0;
    },

    particle(x, y, vx, vy, life, col) {
      if (P.n >= NP) return;
      const i = P.n++;
      P.x[i] = x; P.y[i] = y; P.vx[i] = vx; P.vy[i] = vy; P.life[i] = life; P.max[i] = life; P.col[i] = col;
    },

    burst(x, y, n, col, speed) {
      for (let k = 0; k < n; k++) {
        const a = fxRng.range(0, Math.PI * 2), s = fxRng.range(0.4, 1) * speed;
        this.particle(x, y, Math.cos(a) * s, Math.sin(a) * s, fxRng.range(0.3, 0.55), k % 3 === 0 && col === 3 ? 0 : col);
      }
    },

    shards(x, y, n, speed) {
      for (let k = 0; k < n; k++) {
        const a = fxRng.range(0, Math.PI * 2), s = fxRng.range(0.5, 1) * speed;
        this.particle(x, y, Math.cos(a) * s, Math.sin(a) * s, fxRng.range(0.3, 0.6), 1 + (k & 1));
      }
    },

    // Shards flung outward from the ice edge along the ray through (x, y).
    edgeShards(R, x, y, n) {
      const p = CFG.pond;
      let ang = Math.atan2((y - p.cy) / p.b, (x - p.cx) / p.a);
      for (let k = 0; k < n; k++) {
        const a = ang + fxRng.range(-0.5, 0.5);
        const ex = p.cx + Math.cos(a) * p.a * R, ey = p.cy + Math.sin(a) * p.b * R;
        const s = fxRng.range(30, 70);
        this.particle(ex, ey, Math.cos(a) * s, Math.sin(a) * s * 0.6, fxRng.range(0.35, 0.6), 1 + (k & 1));
      }
    },

    ripple(x, y) {
      for (let i = 0; i < NR; i++) if (!Rp.alive[i]) { Rp.alive[i] = 1; Rp.x[i] = x; Rp.y[i] = y; Rp.t[i] = 0; return; }
    },

    float(x, y, label, life, rise) {
      if (!label) return;
      for (let i = 0; i < NF; i++) if (!F.label[i]) { F.label[i] = label; F.x[i] = x; F.y[i] = y; F.t[i] = 0; F.life[i] = life; F.rise[i] = rise; return; }
    },

    plus(x, y, n) { this.float(x, y, Assets.plus[Math.min(30, Math.round(n / 5))], CFG.floatLife, CFG.floatRise); },

    // One-time teaching label 26 px above the frog.
    once(W, key) {
      if (W.once[key]) return;
      W.once[key] = 1;
      this.float(W.frog.x, W.frog.y - 26, Assets.L[key], CFG.labelLife, 4);
    },

    flash(x, y) { this.flashT = 0.08; this.flashX = x; this.flashY = y; },

    update(dt) {
      for (let i = 0; i < P.n; i++) {
        P.life[i] -= dt;
        if (P.life[i] <= 0) {
          const j = --P.n;
          P.x[i] = P.x[j]; P.y[i] = P.y[j]; P.vx[i] = P.vx[j]; P.vy[i] = P.vy[j]; P.life[i] = P.life[j]; P.max[i] = P.max[j]; P.col[i] = P.col[j];
          i--; continue;
        }
        P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt;
        P.vx[i] *= 0.94; P.vy[i] *= 0.94;
        if (P.col[i] === 4) P.vy[i] -= 30 * dt;
      }
      for (let i = 0; i < NR; i++) if (Rp.alive[i] && (Rp.t[i] += dt) >= 0.4) Rp.alive[i] = 0;
      for (let i = 0; i < NF; i++) if (F.label[i] && (F.t[i] += dt) >= F.life[i]) F.label[i] = null;
      if (this.flashT > 0) this.flashT -= dt;
    },

    shake(W, amount) { if (!Game.reducedMotion) W.shake = Math.min(1, W.shake + amount); },
  };
  return fx;
})();
