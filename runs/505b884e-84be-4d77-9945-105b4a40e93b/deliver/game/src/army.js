// Army: spawner, tanks, helicopters and their projectiles. Fixed pools, nothing allocated in play.
const T_TANK = 0, T_HELI = 1;
const U_MOVE = 0, U_HOLD = 1, U_TELE = 2, U_FIRE = 3, U_DYING = 4;

const Army = {
  units: [], shots: [], alive: 0, spawnAcc: 0, spawned: 0, lastBreathP: -1,

  init() {
    const A = CONFIG.army;
    for (let i = 0; i < A.pool; i++) {
      this.units.push({ alive: false, type: 0, st: 0, x: 0, y: 0, px: 0, py: 0, baseY: 0, vy: 0, rot: 0, hp: 0, standoff: 0,
        speed: 0, t: 0, shotT: 0, burstLeft: 0, burstT: 0, rookie: false, lastHit: -1, phase: 0, face: 1, parked: false, flashT: 0 });
    }
    for (let i = 0; i < A.projPool; i++) {
      this.shots.push({ alive: false, kind: 0, x: 0, y: 0, vx: 0, vy: 0, src: 0, dmg: 0, tx0: 0, ty0: 0, tx1: 0, ty1: 0, tx2: 0, ty2: 0 });
    }
  },

  reset() {
    for (let i = 0; i < this.units.length; i++) this.units[i].alive = false;
    for (let i = 0; i < this.shots.length; i++) this.shots[i].alive = false;
    this.alive = 0; this.spawnAcc = 0; this.spawned = 0; this.lastBreathP = -1;
  },

  // Shot damage eases from dmgStart up to dmg over the first dmgRamp seconds (softens the novice cliff).
  rampDmg(spec) { return lerp(spec.dmgStart, spec.dmg, Math.min(1, Run.t / spec.dmgRamp)); },

  centerY(u) { return u.type === T_TANK ? CONFIG.GROUND - 9 : u.y; },

  breathMul(t) {
    const S = CONFIG.spawn;
    if (t < S.breathStart) return 1;
    const p = (t - S.breathStart) % S.breathEvery;
    return p < S.surge ? S.surgeMul : p < S.surge + S.lull ? S.lullMul : 1;
  },

  rate(t) { const S = CONFIG.spawn; return Math.min(S.cap, S.base + S.ramp * t) * this.breathMul(t); },

  step(dt) {
    const S = CONFIG.spawn, t = Run.t;
    if (t >= S.start) {
      this.spawnAcc += this.rate(t) * dt;
      while (this.spawnAcc >= 1) { this.spawnAcc -= 1; this.spawn(); }
      if (t >= S.breathStart) {
        const p = (t - S.breathStart) % S.breathEvery;
        if (p < this.lastBreathP) { Snd.play('siren'); Render.gridFlash = 0.5; }
        if (this.lastBreathP < 0) { Snd.play('siren'); Render.gridFlash = 0.5; }
        this.lastBreathP = p;
      }
    }
    let n = 0;
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      if (!u.alive) continue;
      u.px = u.x; u.py = u.y;
      if (u.type === T_TANK) this.stepTank(u, dt); else this.stepHeli(u, dt);
      if (u.alive) n++;
    }
    this.alive = n;
    this.stepShots(dt);
  },

  spawn() {
    const A = CONFIG.army, S = CONFIG.spawn;
    if (this.alive >= A.cap) return;
    let u = null;
    for (let i = 0; i < this.units.length; i++) if (!this.units[i].alive) { u = this.units[i]; break; }
    if (!u) return;
    const rookie = this.spawned < A.rookies;
    const heli = !rookie && Run.t >= S.heliFrom && Rng.next() < S.heliChance;
    let side = rookie ? 1 : Rng.next() < 0.5 ? -1 : 1;
    let x = side > 0 ? Cam.x + CONFIG.W + S.edge : Cam.x - S.edge;
    if (x < 0 || x > CONFIG.WORLD) { side = -side; x = side > 0 ? Cam.x + CONFIG.W + S.edge : Cam.x - S.edge; }
    this.spawned++;
    u.alive = true; u.type = heli ? T_HELI : T_TANK; u.st = U_MOVE; u.x = u.px = x; u.rot = 0; u.vy = 0;
    u.t = 0; u.burstLeft = 0; u.burstT = 0; u.rookie = rookie; u.lastHit = -1; u.phase = Rng.next() * 6.28;
    u.face = -side; u.parked = false; u.flashT = 0;
    if (heli) {
      const H = A.heli;
      u.hp = H.hp; u.baseY = u.y = u.py = Rng.range(H.y[0], H.y[1]); u.standoff = Rng.range(H.standoff[0], H.standoff[1]);
      u.speed = H.speed; u.shotT = H.firstBurst;
    } else {
      const T = A.tank;
      u.hp = T.hp; u.y = u.py = u.baseY = CONFIG.GROUND;
      u.standoff = this.spawned === A.rookies ? A.rookieFarStandoff : Rng.range(T.standoff[0], T.standoff[1]);
      u.speed = rookie ? T.rookieSpeed : T.speed; u.shotT = rookie ? T.rookieFirst : T.firstShot;
    }
    this.alive++;
  },

  stepTank(u, dt) {
    const T = CONFIG.army.tank;
    u.t += dt;
    if (u.flashT > 0) u.flashT -= dt;
    if (u.st === U_DYING) { if (u.t >= T.dieT) u.alive = false; return; }
    const dx = Monster.x - u.x, adx = Math.abs(dx);
    u.face = dx >= 0 ? 1 : -1;
    if (u.st === U_MOVE) {
      if (adx > u.standoff) u.x += sign(dx) * Math.min(u.speed * dt, adx - u.standoff);
      else { u.st = U_HOLD; if (!u.parked) { u.parked = true; u.shotT = u.rookie ? T.rookieFirst : T.firstShot; } }
      return;
    }
    if (adx > u.standoff + T.reclose && u.st === U_HOLD) { u.st = U_MOVE; return; }
    if (adx < u.standoff - T.reclose) u.x -= sign(dx) * u.speed * 0.5 * dt; // back off a little if the monster closes in
    u.shotT -= dt;
    if (u.st === U_HOLD && u.shotT <= T.telegraph) u.st = U_TELE;
    if (u.st === U_TELE && u.shotT <= 0) {
      this.fireShell(u);
      u.shotT = T.reload; u.st = U_HOLD;
    }
  },

  fireShell(u) {
    const T = CONFIG.army.tank, A = CONFIG.army;
    const s = this.freeShot();
    const mx = u.x + u.face * 14, my = CONFIG.GROUND - 18;
    Fx.sparks(mx, my, 3, C_MAG);
    u.flashT = 0.06;
    Snd.play('tank_shot');
    if (!s) return;
    const dx = Monster.x - mx, dy = A.aimY - my, Tt = T.flight;
    this.initShot(s, 0, mx, my, dx / Tt, (dy - 0.5 * T.g * Tt * Tt) / Tt, SRC_TANK, u.rookie ? T.rookieDmg : this.rampDmg(T));
  },

  stepHeli(u, dt) {
    const H = CONFIG.army.heli;
    u.t += dt;
    if (u.flashT > 0) u.flashT -= dt;
    if (u.st === U_DYING) {
      u.vy += 400 * dt; u.y += u.vy * dt; u.rot += 8 * dt;
      if (u.y >= CONFIG.GROUND - 8 || u.t >= H.dieT) {
        Fx.smoke(u.x, CONFIG.GROUND - 6, 5); Fx.dust(u.x, CONFIG.GROUND, 5, 20);
        u.alive = false;
      }
      return;
    }
    const dx = Monster.x - u.x, adx = Math.abs(dx);
    u.face = dx >= 0 ? 1 : -1;
    const err = adx - u.standoff;
    if (Math.abs(err) > H.band) u.x += sign(dx) * sign(err) * Math.min(u.speed * dt, Math.abs(err));
    u.y = u.baseY + H.bob * Math.sin(u.t * 2 + u.phase);
    if (u.st === U_MOVE) { if (Math.abs(err) <= H.band) { u.st = U_HOLD; u.shotT = H.firstBurst; } return; }
    if (u.burstLeft > 0) {
      u.burstT -= dt;
      if (u.burstT <= 0) { this.fireBullet(u); u.burstLeft--; u.burstT = H.roundGap; }
      if (u.burstLeft === 0) u.st = U_HOLD;
      return;
    }
    u.shotT -= dt;
    if (u.st === U_HOLD && u.shotT <= H.telegraph) u.st = U_TELE;
    if (u.st === U_TELE && u.shotT <= 0) { u.st = U_FIRE; u.burstLeft = H.rounds; u.burstT = 0; u.shotT = H.reload; }
  },

  fireBullet(u) {
    const H = CONFIG.army.heli, A = CONFIG.army;
    const mx = u.x + u.face * 18, my = u.y + 4;
    u.flashT = 0.05;
    Snd.play('heli_shot');
    const s = this.freeShot();
    if (!s) return;
    const dx = Monster.x - mx, dy = A.aimY - my, d = Math.sqrt(dx * dx + dy * dy) || 1;
    this.initShot(s, 1, mx, my, dx / d * H.bulletSpeed, dy / d * H.bulletSpeed, SRC_HELI, this.rampDmg(H));
  },

  freeShot() {
    for (let i = 0; i < this.shots.length; i++) if (!this.shots[i].alive) return this.shots[i];
    return null;
  },

  initShot(s, kind, x, y, vx, vy, src, dmg) {
    s.alive = true; s.kind = kind; s.x = x; s.y = y; s.vx = vx; s.vy = vy; s.src = src; s.dmg = dmg;
    s.tx0 = s.tx1 = s.tx2 = x; s.ty0 = s.ty1 = s.ty2 = y;
  },

  stepShots(dt) {
    const g = CONFIG.army.tank.g, M = CONFIG.monster, G = CONFIG.GROUND;
    for (let i = 0; i < this.shots.length; i++) {
      const s = this.shots[i];
      if (!s.alive) continue;
      s.tx2 = s.tx1; s.ty2 = s.ty1; s.tx1 = s.tx0; s.ty1 = s.ty0; s.tx0 = s.x; s.ty0 = s.y;
      if (s.kind === 0) s.vy += g * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (Monster.hp > 0 && s.x >= Monster.x - M.boxHalfW && s.x <= Monster.x + M.boxHalfW && s.y >= M.boxTop && s.y <= G) {
        Monster.damage(s.dmg, s.src, s.x - s.vx * 0.02);
        Fx.sparks(s.x, s.y, 4, C_MAG);
        s.alive = false;
      } else if (s.y >= G) {
        Fx.dust(s.x, G, 4, 6); Fx.ring(s.x, G, 24, 0.2, C_WHITE, false);
        s.alive = false;
      } else if (s.x < -50 || s.x > CONFIG.WORLD + 50 || s.y < -100) s.alive = false;
    }
  },

  // how: 'swipe' takes 1 hp; 'stomp', 'beam', 'shard' kill outright.
  kill(u, how) {
    if (u.st === U_DYING) return;
    if (how === 'swipe') { u.hp--; u.flashT = 0.06; if (u.hp > 0) { Snd.play('crack'); return; } }
    u.st = U_DYING; u.t = 0; u.vy = u.type === T_HELI ? -40 : 0;
    const cy = this.centerY(u);
    Run.onDestroy(u.type === T_TANK ? KIND_TANK : KIND_HELI, u.x, cy);
    Fx.shards(u.x, cy, 20, 10, 8, C_YELLOW);
    Fx.smoke(u.x, cy, 4);
    Snd.play('unit_die');
  },

  shardKill(cx, reach) {
    for (let i = 0; i < this.units.length; i++) {
      const u = this.units[i];
      if (u.alive && u.type === T_TANK && u.st !== U_DYING && Math.abs(u.x - cx) <= reach) this.kill(u, 'shard');
    }
  },
};
