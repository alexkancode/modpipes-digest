// Run: time, score, combo, stats, session bests and the cause of death.
// onDestroy() is the single entry point for every building collapse and unit kill.
const KIND_BUILDING = 0, KIND_POWER = 1, KIND_TANK = 2, KIND_HELI = 3;
const SRC_DRAIN = 0, SRC_TANK = 1, SRC_HELI = 2;

const Run = {
  t: 0, destructionPts: 0, combo: 1, lastDestroyT: -99, lastHealT: 0, lastRoarT: -99, comboBumpT: 0,
  comboSnd: { step: 0 }, // reused SFX opts: the blip climbs a semitone per step
  stats: { buildings: 0, units: 0, bestCombo: 1 },
  best: { score: 0, time: 0, combo: 0, has: false },
  cityBest: {}, // best score per city number, memory only
  last: { score: 0, time: 0, newBest: false, short: 0 },
  cause: SRC_DRAIN, dmg: new Float32Array(10), dmgSec: -1, overT: 0,

  get score() { return CONFIG.score.perSec * Math.floor(this.t) + this.destructionPts; },

  reset() {
    this.t = 0; this.destructionPts = 0; this.combo = 1; this.lastDestroyT = -99; this.lastHealT = 0;
    this.lastRoarT = -99; this.comboBumpT = 0; this.overT = 0; this.cause = SRC_DRAIN;
    this.stats.buildings = 0; this.stats.units = 0; this.stats.bestCombo = 1;
    this.dmg.fill(0); this.dmgSec = -1;
  },

  // The chain window shrinks per step (2.0 s at x1 down to 1.2 s at x5), so x5 has to be earned.
  window() { const S = CONFIG.score; return S.comboWindow - S.comboShrink * (this.combo - 1); },

  onDestroy(kind, x, y) {
    const S = CONFIG.score;
    const prev = this.combo;
    this.combo = this.t - this.lastDestroyT <= this.window() ? Math.min(S.comboMax, this.combo + 1) : 1;
    this.lastDestroyT = this.t;
    const pts = S.points[kind];
    this.destructionPts += pts * this.combo;
    const healed = Monster.heal(CONFIG.heal[kind]);
    this.lastHealT = this.t;
    Fx.popup(x, y, pts, this.combo);
    Fx.healFly(x, y, healed);
    if (kind <= KIND_POWER) this.stats.buildings++; else this.stats.units++;
    if (this.combo > this.stats.bestCombo) this.stats.bestCombo = this.combo;
    if (this.combo > prev) {
      this.comboBumpT = CONFIG.fx.comboBumpT;
      this.comboSnd.step = this.combo - 1;
      Snd.play('combo', this.comboSnd);
      if (this.combo === S.comboMax && this.t - this.lastRoarT >= S.roarGap) {
        this.lastRoarT = this.t;
        Snd.play('roar');
        Fx.shake(CONFIG.fx.deathShake);
        Fx.hitstop(120);
      }
    }
  },

  // 5 one-second buckets x 2 sources (tanks, helis); a bucket is zeroed when its second begins.
  addDamage(n, src) {
    this.rollBuckets();
    this.dmg[(Math.floor(this.t) % 5) * 2 + (src - 1)] += n;
  },
  rollBuckets() {
    const s = Math.floor(this.t);
    if (s === this.dmgSec) return;
    this.dmgSec = s;
    const b = (s % 5) * 2;
    this.dmg[b] = 0; this.dmg[b + 1] = 0;
  },

  step(dt) {
    this.rollBuckets();
    if (this.combo > 1 && this.t - this.lastDestroyT > this.window()) this.combo = 1;
    if (this.comboBumpT > 0) this.comboBumpT -= dt;
  },

  // Called on the hp-zero tick.
  finish(fromDrain) {
    if (fromDrain) this.cause = SRC_DRAIN;
    else {
      let tk = 0, hl = 0;
      for (let i = 0; i < 5; i++) { tk += this.dmg[i * 2]; hl += this.dmg[i * 2 + 1]; }
      this.cause = hl > tk ? SRC_HELI : SRC_TANK;
    }
    const sc = this.score, b = this.best, L = this.last;
    L.score = sc; L.time = this.t;
    L.newBest = !b.has || sc > b.score;
    L.short = b.has ? Math.max(0, Math.round(b.time - this.t)) : 0;
    L.prevBestTime = b.time;
    if (L.newBest) b.score = sc;
    if (this.t > b.time) b.time = this.t;
    if (this.stats.bestCombo > b.combo) b.combo = this.stats.bestCombo;
    b.has = true;
    if (sc > (this.cityBest[Rng.city] || 0)) this.cityBest[Rng.city] = sc;
  },
};
