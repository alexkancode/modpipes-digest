// Combat: stateless hit resolution for the three verbs against City and Army.
// Every target is hit at most once per action, keyed by the monster's action serial.
const Combat = {
  aimOut: { x: 0, y: 0, found: false },

  stomp(fx, serial) {
    const R = CONFIG.stomp.radius;
    let hit = false;
    const lots = City.lots;
    for (let i = 0; i < lots.length; i++) {
      const b = lots[i];
      if (Math.abs(b.cx - fx) <= R && City.hit(b, serial)) hit = true; // centre inside the ring: what you see is what you hit
    }
    const U = Army.units;
    for (let i = 0; i < U.length; i++) {
      const u = U[i];
      if (u.alive && u.st !== U_DYING && u.type === T_TANK && Math.abs(u.x - fx) <= R) { Army.kill(u, 'stomp'); hit = true; }
    }
    return hit;
  },

  swipe(px, py, ang, serial) {
    const S = CONFIG.swipe, G = CONFIG.GROUND, R = CONFIG.army.unitR;
    let hitAny = false, hitBuilding = false;
    const U = Army.units;
    for (let i = 0; i < U.length; i++) {
      const u = U[i];
      if (!u.alive || u.st === U_DYING || u.lastHit === serial) continue;
      if (inArc(px, py, ang, u.x, Army.centerY(u), S.reach, S.halfArc, R)) {
        u.lastHit = serial; Army.kill(u, 'swipe'); hitAny = true;
        Fx.sparks(u.x, Army.centerY(u), 3, C_YELLOW);
      }
    }
    const lots = City.lots;
    for (let i = 0; i < lots.length; i++) {
      const b = lots[i];
      if (b.state > B_HEAVY || b.lastHit === serial) continue;
      const ex = b.cx - sign(b.cx - px) * b.w / 2;
      if (inArc(px, py, ang, ex, G - 2, S.reach, S.halfArc, 0) || inArc(px, py, ang, ex, G - b.h / 2, S.reach, S.halfArc, 0) ||
          inArc(px, py, ang, ex, G - b.h, S.reach, S.halfArc, 0)) {
        if (City.hit(b, serial)) { hitAny = true; hitBuilding = true; }
      }
    }
    if (hitAny) { Fx.shake(S.shake); Snd.play('swipe_hit'); }
    if (hitBuilding) Fx.hitstop(S.hitstop);
    return hitAny;
  },

  beam(mx, my, ang, serial) {
    const B = CONFIG.beam, G = CONFIG.GROUND, R = CONFIG.army.unitR;
    const ex = mx + Math.cos(ang) * B.length, ey = my + Math.sin(ang) * B.length;
    const U = Army.units;
    for (let i = 0; i < U.length; i++) {
      const u = U[i];
      if (!u.alive || u.st === U_DYING || u.lastHit === serial) continue;
      const cy = Army.centerY(u), rr = B.half + R;
      if (segDist2(u.x, cy, mx, my, ex, ey) <= rr * rr) {
        u.lastHit = serial; Army.kill(u, 'beam');
        Fx.sparks(u.x, cy, 6, C_YELLOW);
      }
    }
    // Buildings stop the beam's damage: only the nearest one it crosses takes the hit (units still pierce).
    const lots = City.lots;
    let hitB = null, hitD = 1e9;
    for (let i = 0; i < lots.length; i++) {
      const b = lots[i];
      if (b.state > B_HEAVY || b.lastHit === serial) continue;
      const d = Math.abs(b.cx - mx) - b.w / 2;
      if (d < hitD && segAabb(mx, my, ex, ey, b.cx - b.w / 2 - B.half, G - b.h - B.half, b.cx + b.w / 2 + B.half, G)) { hitB = b; hitD = d; }
    }
    if (hitB) {
      City.hit(hitB, serial);
      const sx = hitB.cx - sign(hitB.cx - mx) * hitB.w / 2; // spark where the beam enters the building
      const t = Math.abs(Math.cos(ang)) > 1e-3 ? (sx - mx) / Math.cos(ang) : 0;
      Fx.sparks(sx, clamp(my + Math.sin(ang) * t, G - hitB.h, G), 6, C_YELLOW);
    }
  },

  // Nearest live unit (optionally on one side), else the farthest standing building in view.
  autoAim(side) {
    const o = this.aimOut, mx = Monster.x;
    o.found = false;
    let best = 1e9;
    const U = Army.units;
    for (let i = 0; i < U.length; i++) {
      const u = U[i];
      if (!u.alive || u.st === U_DYING) continue;
      const dx = u.x - mx;
      if (side && sign(dx) !== side) continue;
      const cy = Army.centerY(u), d = dx * dx + (cy - 200) * (cy - 200);
      if (d < best) { best = d; o.x = u.x; o.y = cy; o.found = true; }
    }
    if (o.found) return o;
    let far = -1;
    const lots = City.lots;
    for (let i = 0; i < lots.length; i++) {
      const b = lots[i];
      if (b.state > B_HEAVY || b.cx < Cam.x || b.cx > Cam.x + CONFIG.W) continue;
      const dx = b.cx - mx;
      if (side && sign(dx) !== side) continue;
      if (Math.abs(dx) > far) { far = Math.abs(dx); o.x = b.cx; o.y = CONFIG.GROUND - b.h / 2; o.found = true; }
    }
    return o;
  },
};
