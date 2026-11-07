// Signs: three diegetic glyph signs (SPACE, CLICK, F/RMB), one per verb. Each retires for the
// session after its verb is used twice. Frame index = verb index in the glyph_signs strip.
const S_HIDDEN = 0, S_SHOWN = 1, S_FADING = 2, S_RETIRED = 3;

const Signs = {
  nearSide: 1, // side of the unit that last raised the CLICK sign
  list: [0, 1, 2].map((i) => ({ i, state: S_HIDDEN, uses: 0, alpha: 0, fadeT: 0, x: 0, y: 0, latched: false })),

  reset() {
    for (let i = 0; i < 3; i++) {
      const s = this.list[i];
      if (s.state !== S_RETIRED) { s.state = S_HIDDEN; s.alpha = 0; s.latched = false; }
    }
  },

  used(verb) {
    const s = this.list[verb];
    if (s.state === S_RETIRED || s.state === S_FADING) return;
    if (++s.uses >= 2) { s.state = S_FADING; s.fadeT = 0.5; }
  },

  step(dt) {
    const m = Monster, G = CONFIG.GROUND;
    for (let i = 0; i < 3; i++) {
      const s = this.list[i];
      if (s.state === S_RETIRED) continue;
      if (s.state === S_FADING) {
        s.fadeT -= dt; s.alpha = Math.max(0, s.fadeT / 0.5) * 0.8;
        if (s.fadeT <= 0) { s.state = S_RETIRED; s.alpha = 0; }
        continue;
      }
      let want = false;
      if (i === 0) {
        const b = City.lots[1];
        want = true; s.x = b.cx; s.y = G - (b.state <= B_HEAVY ? b.h : 0) - 30;
      } else if (i === 1) {
        want = this.unitNearSwipe();
        s.x = m.x + this.nearSide * 70; s.y = 128; // above the shoulder, on the unit's side, clear of the target
      } else {
        if (!s.latched) s.latched = this.farParked();
        want = s.latched;
        s.x = m.x + m.facing * 70; s.y = 80;
      }
      s.state = want ? S_SHOWN : S_HIDDEN;
      s.alpha = clamp(s.alpha + (want ? dt : -dt) * 4, 0, 0.8);
    }
  },

  // A unit is out of stomp reach but at (or nearly at) swipe reach from the shoulder.
  unitNearSwipe() {
    const U = Army.units, m = Monster, S = CONFIG.swipe, sx = m.x + m.facing * S.shoulderOff;
    for (let i = 0; i < U.length; i++) {
      const u = U[i];
      if (!u.alive || u.st === U_DYING) continue;
      if (u.type === T_TANK && Math.abs(u.x - m.x) <= CONFIG.stomp.radius) continue;
      if (Math.hypot(u.x - sx, Army.centerY(u) - S.shoulderY) <= S.reach + S.signSlack) { this.nearSide = sign(u.x - m.x) || 1; return true; }
    }
    return false;
  },

  farParked() {
    const U = Army.units;
    for (let i = 0; i < U.length; i++) {
      const u = U[i];
      if (u.alive && u.st !== U_MOVE && u.st !== U_DYING && Math.abs(u.x - Monster.x) > 300) return true;
    }
    return false;
  },
};
