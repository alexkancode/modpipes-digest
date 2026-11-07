// City: 10 lots. Each lot cycles standing -> cracked -> heavy -> collapsing -> rubble -> regrowing -> standing.
const B_STAND = 0, B_CRACKED = 1, B_HEAVY = 2, B_COLLAPSE = 3, B_RUBBLE = 4, B_REGROW = 5;

const City = {
  lots: [],

  init() {
    const C = CONFIG.city;
    for (let i = 0; i < C.lots; i++) {
      this.lots.push({ i, cx: C.first + C.pitch * i, w: 80, h: 120, shape: 0, power: false, state: B_STAND,
        hp: C.hp, t: 0, flashT: 0, wobbleT: 0, swayAmp: 0, swayDur: 0.12, lastHit: -1, rubble: 0 });
    }
  },

  reset() {
    for (let i = 0; i < this.lots.length; i++) {
      this.build(this.lots[i], i > 1);
      this.lots[i].state = B_STAND;
    }
  },

  // New random shape. Lots 0-1 (the opening) are never power towers.
  build(b, allowPower) {
    const C = CONFIG.city;
    const power = allowPower && Rng.next() < C.powerChance;
    b.shape = power ? C.shapes + Rng.int(C.powerShapes) : Rng.int(C.shapes);
    b.power = power;
    b.hp = C.hp; b.t = 0; b.flashT = 0; b.wobbleT = 0; b.swayAmp = 0; b.lastHit = -1; b.rubble = Rng.int(3);
    // size comes from the baked shape (shapes are random-size per bake)
    const sh = Assets.shapes[b.shape];
    b.w = sh ? sh.w : 90; b.h = sh ? sh.h : 140;
  },

  standing(b) { return b.state <= B_HEAVY; },

  countStanding() {
    let n = 0;
    for (let i = 0; i < this.lots.length; i++) if (this.lots[i].state <= B_HEAVY) n++;
    return n;
  },

  hit(b, serial) {
    if (b.state > B_HEAVY || b.lastHit === serial) return false;
    b.lastHit = serial;
    b.hp--;
    b.flashT = 0.06; this.jolt(b, CONFIG.quake.hit[1], CONFIG.quake.hit[2]);
    const topY = CONFIG.GROUND - b.h;
    Fx.sparks(b.cx, topY + b.h * 0.4, 4, C_WHITE);
    if (b.hp > 0) { b.state = CONFIG.city.hp - b.hp; Snd.play('crack'); return true; }
    this.collapse(b);
    return true;
  },

  collapse(b) {
    const F = CONFIG.fx, G = CONFIG.GROUND;
    b.state = B_COLLAPSE; b.t = 0;
    Run.onDestroy(b.power ? KIND_POWER : KIND_BUILDING, b.cx, G - b.h / 2);
    const col = b.power ? C_YELLOW : C_CYAN;
    Fx.shards(b.cx, G - b.h * 0.6, b.w, b.h * 0.6, b.power ? 24 : 12 + Rng.int(9), col);
    Fx.shards(b.cx, G - b.h * 0.5, b.w, b.h * 0.5, 4, C_YELLOW);
    Fx.dust(b.cx, G, 12, b.w * 0.5);
    Fx.ring(b.cx, G, b.power ? F.powerRing : F.collapseRing, 0.35, b.power ? C_YELLOW : C_CYAN, true);
    Fx.hitstop(Run.combo >= 3 ? F.collapseHitstopCombo : F.collapseHitstop);
    Fx.shake(F.collapseShake);
    this.quake(b.cx, CONFIG.quake.collapse);
    Snd.play('crumble');
    Army.shardKill(b.cx, b.w / 2 + CONFIG.city.shardKillPad);
  },

  // Sway a lot; a weaker jolt never cuts short a stronger one still ringing.
  jolt(b, amp, dur) {
    if (Fx.reducedMotion) return;
    const left = b.wobbleT > 0 ? b.swayAmp * b.wobbleT / b.swayDur : 0;
    b.swayAmp = Math.max(left, amp); b.swayDur = dur; b.wobbleT = dur;
  },

  // Impact force spreads from x with linear falloff, plus a ground pulse. spec = [radius, amp, dur].
  quake(x, spec) {
    const [radius, amp, dur] = spec;
    for (let i = 0; i < this.lots.length; i++) {
      const b = this.lots[i], d = Math.abs(b.cx - x);
      if ((b.state <= B_HEAVY || b.state === B_REGROW) && d < radius) this.jolt(b, amp * (1 - d / radius), dur);
    }
    Fx.ring(x, CONFIG.GROUND, radius, CONFIG.quake.pulseT, C_CYAN, false);
  },

  step(dt) {
    const C = CONFIG.city, mx = Monster.x;
    let near = 0, pull = null, pullD = 1e9;
    for (let i = 0; i < this.lots.length; i++) {
      const b = this.lots[i];
      b.t += dt;
      if (b.flashT > 0) b.flashT -= dt;
      if (b.wobbleT > 0) b.wobbleT -= dt;
      const d = Math.abs(b.cx - mx);
      if (b.state === B_COLLAPSE && b.t >= C.collapse) { b.state = B_RUBBLE; b.t = 0; }
      else if (b.state === B_RUBBLE) {
        if (b.t >= C.regrowAfter && d > C.regrowDist) this.regrow(b);
        else if (d > b.w / 2 + C.pullClear && d <= C.pullRange && d < pullD) { pull = b; pullD = d; }
      } else if (b.state === B_REGROW && b.t >= C.regrowT) { b.state = B_STAND; b.t = 0; }
      if ((b.state <= B_HEAVY || b.state === B_REGROW) && d <= C.pullRange) near++;
    }
    // Pull-forward: keep >= 3 buildings within one screen of the monster (only lots that will count).
    if (near < C.pullMin && pull && Run.t > 0) this.regrow(pull);
  },

  regrow(b) {
    this.build(b, true);
    b.state = B_REGROW; b.t = 0;
  },
};
