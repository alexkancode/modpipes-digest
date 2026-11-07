// Monster: movement, the three verbs as phased actions, health, and pose.
// Drawn from the asset-plan monster_* strips when loaded, else from a code rig with the same poses.
const A_NONE = 0, A_STOMP = 1, A_SWIPE = 2, A_BEAM = 3;
const PHASES = [null, [CONFIG.stomp.windup, CONFIG.stomp.impact, CONFIG.stomp.recover],
  [CONFIG.swipe.windup, CONFIG.swipe.strike, CONFIG.swipe.recover], [CONFIG.beam.charge, CONFIG.beam.fire, CONFIG.beam.recover]];

const Monster = {
  x: 0, px: 0, facing: 1, walkDir: 0, walkPhase: 0, hp: 0, hurtT: 0, lastHurtFlash: -9, lastHurtSnd: -9, healPulseT: 0,
  action: A_NONE, phase: 0, phaseT: 0, serial: 0, swipeAng: 0, beamAng: 0, beamAuto: false, trailT: 0,
  cd: { stomp: 0, swipe: 0, beam: 0 }, queue: { stomp: false, swipe: false, beam: false },
  aim: { swipeX: 0, swipeY: 0, beamX: 0, beamY: 0 },
  mouth: { x: 0, y: 0 }, deadT: 0, landed: false, killedBy: SRC_DRAIN, hbT: 0, blinkT: 0, blinkNext: 3, life: 0,
  lossT: 0, lossFrom: 0, lossTo: 0, beamPair: 1,
  pose: { strip: 'monster_idle', frame: 0, bob: 0, sx: 1, sy: 1, lean: 0, offX: 0,
    legF: 0, legB: 0, liftF: 0, liftB: 0, armF: 0, armB: 0, head: 0, jaw: 0, tail: 0, eyes: 0, chest: 0 },

  reset() {
    const M = CONFIG.monster;
    this.x = this.px = M.startX; this.facing = 1; this.walkDir = 0; this.walkPhase = 0; this.hp = M.hpStart;
    this.hurtT = 0; this.lastHurtFlash = -9; this.lastHurtSnd = -9; this.healPulseT = 0;
    this.action = A_NONE; this.phase = 0; this.phaseT = 0; this.trailT = 0;
    this.cd.stomp = this.cd.swipe = this.cd.beam = 0;
    this.queue.stomp = this.queue.swipe = this.queue.beam = false;
    this.deadT = 0; this.landed = false; this.killedBy = SRC_DRAIN; this.hbT = 0; this.blinkT = 0; this.blinkNext = 3; this.lossT = 0;
  },

  rooted() { return (this.action === A_STOMP && this.phase === 0) || (this.action === A_BEAM && this.phase < 2); },

  drain(dt) {
    if (this.hp <= 0) return;
    this.hp -= CONFIG.monster.drain * dt;
    if (this.hp <= 0) this.killedBy = SRC_DRAIN;
  },

  damage(n, src, fromX) {
    if (this.hp <= 0) return;
    const M = CONFIG.monster, t = Run.t;
    this.lossFrom = this.hp;
    this.hp -= n;
    this.lossTo = Math.max(0, this.hp); this.lossT = 0.1;
    if (t - this.lastHurtFlash >= M.hurtGap) { this.hurtT = M.hurtT; this.lastHurtFlash = t; }
    this.x = clamp(this.x + M.knock * sign(this.x - fromX), M.xMin, M.xMax);
    Run.addDamage(n, src);
    if (t - this.lastHurtSnd >= M.hurtGap) { this.lastHurtSnd = t; Snd.play('hurt'); }
    if (this.hp <= 0) this.killedBy = src;
  },

  heal(n) {
    const M = CONFIG.monster;
    const amt = n * (this.hp < M.lowBonusBelow ? M.lowBonus : 1);
    this.hp = Math.min(M.hpMax, this.hp + amt);
    this.healPulseT = 0.2;
    Snd.play('heal');
    return amt;
  },

  footX() { return this.x + this.facing * CONFIG.stomp.footOff; },
  shoulderX() { return this.x + this.facing * CONFIG.swipe.shoulderOff; },

  start(a) {
    this.action = a; this.phase = 0; this.phaseT = 0; this.serial++;
    if (a === A_STOMP) { this.cd.stomp = CONFIG.stomp.cooldown; this.queue.stomp = false; Signs.used(0); }
    else if (a === A_SWIPE) {
      this.cd.swipe = CONFIG.swipe.cooldown; this.queue.swipe = false;
      const ax = this.aim.swipeX, ay = this.aim.swipeY;
      if (ax !== this.x) this.facing = ax > this.x ? 1 : -1;
      this.swipeAng = Math.atan2(ay - CONFIG.swipe.shoulderY, ax - this.shoulderX());
      Signs.used(1);
    } else {
      this.cd.beam = CONFIG.beam.cooldown; this.queue.beam = false;
      if (this.beamAuto) {
        const o = Combat.autoAim(0);
        this.aim.beamX = o.found ? o.x : this.x + this.facing * 300; this.aim.beamY = o.found ? o.y : CONFIG.beam.mouthY;
      }
      if (this.aim.beamX !== this.x) this.facing = this.aim.beamX > this.x ? 1 : -1;
      this.aimBeam();
      Snd.play('beam_charge');
      Signs.used(2);
    }
  },

  // Beam angle from the mouth to the captured aim point; the pose pair (high/mid/low) follows it.
  aimBeam() {
    this.calcMouth();
    this.beamAng = Math.atan2(this.aim.beamY - this.mouth.y, this.aim.beamX - this.mouth.x);
    const elev = Math.atan2(-Math.sin(this.beamAng), Math.cos(this.beamAng) * this.facing);
    this.beamPair = elev > 15 * DEG ? 0 : elev < -15 * DEG ? 2 : 1;
    this.calcMouth();
  },

  calcMouth() {
    const r = Assets.spr.monster_beam;
    if (r && r.ok && r.data.mouth) {
      const f = this.action === A_BEAM && this.phase === 2 ? 6 : this.beamPair * 2 + (this.action === A_BEAM && this.phase === 1 ? 1 : 0);
      const m = r.data.mouth[f] || r.data.mouth[0];
      this.mouth.x = this.x + this.facing * (m[0] - r.ax);
      this.mouth.y = CONFIG.GROUND - (r.ay - m[1]);
    } else {
      this.mouth.x = this.x + this.facing * CONFIG.beam.mouthOff;
      this.mouth.y = CONFIG.beam.mouthY + (this.beamPair - 1) * 6;
    }
  },

  step(dt) {
    const M = CONFIG.monster;
    this.px = this.x;
    this.life += dt;
    const cd = this.cd;
    cd.stomp = Math.max(0, cd.stomp - dt); cd.swipe = Math.max(0, cd.swipe - dt); cd.beam = Math.max(0, cd.beam - dt);
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.healPulseT > 0) this.healPulseT -= dt;
    if (this.lossT > 0) this.lossT -= dt;
    if (this.trailT > 0) this.trailT -= dt;
    this.stepBlink(dt);

    // firing rule: a queued verb starts once its cooldown is 0 and the current action is idle or recovering
    const free = this.action === A_NONE || this.phase === 2;
    if (free) {
      if (this.queue.stomp && cd.stomp <= 0) this.start(A_STOMP);
      else if (this.queue.swipe && cd.swipe <= 0) this.start(A_SWIPE);
      else if (this.queue.beam && cd.beam <= 0) this.start(A_BEAM);
    }
    if (this.action !== A_NONE) this.stepAction(dt);

    // movement
    if (!this.rooted() && this.walkDir !== 0) {
      this.x = clamp(this.x + this.walkDir * M.speed * dt, M.xMin, M.xMax);
      if (this.action !== A_SWIPE && this.action !== A_BEAM) this.facing = this.walkDir;
      const before = Math.floor(this.walkPhase * 2);
      this.walkPhase += dt / M.stride;
      if (Math.floor(this.walkPhase * 2) !== before) { // footfall on contact frames 0 and 2
        Fx.dust(this.x + this.facing * (before % 2 ? 14 : -10), CONFIG.GROUND, 3, 8);
        Fx.shake(1);
        Snd.play('step');
      }
    }

    if (this.hp > 0 && this.hp < M.heartbeatBelow) {
      this.hbT -= dt;
      if (this.hbT <= 0) { this.hbT = 1; Snd.play('heartbeat'); }
    } else this.hbT = 0;
  },

  stepBlink(dt) {
    if (this.blinkT > 0) this.blinkT -= dt;
    else if ((this.blinkNext -= dt) <= 0) { this.blinkT = 0.12; this.blinkNext = 2 + Math.random() * 2; }
  },

  stepAction(dt) {
    const dur = PHASES[this.action];
    // the first tick of a phase runs its entry effects
    if (this.phaseT === 0) this.enterPhase();
    this.phaseT += dt;
    if (this.action === A_SWIPE && this.phase === 1) Combat.swipe(this.shoulderX(), CONFIG.swipe.shoulderY, this.swipeAng, this.serial);
    if (this.action === A_BEAM && this.phase === 1) {
      this.calcMouth();
      Combat.beam(this.mouth.x, this.mouth.y, this.beamAng, this.serial);
      Fx.shakeHold(CONFIG.beam.rumble);
    }
    if (this.phaseT >= dur[this.phase]) {
      this.phaseT = 0;
      if (++this.phase > 2) { this.action = A_NONE; this.phase = 0; }
    }
  },

  enterPhase() {
    const a = this.action, p = this.phase;
    if (a === A_STOMP && p === 1) {
      const S = CONFIG.stomp, fx = this.footX();
      const hit = Combat.stomp(fx, this.serial);
      Fx.ring(fx, CONFIG.GROUND, S.radius, S.ringDur, C_LIME, true);
      Fx.dust(fx, CONFIG.GROUND, 10, 30);
      Fx.shake(hit ? S.shake : S.whiffShake);
      City.quake(fx, CONFIG.quake.stomp);
      Fx.hitstop(S.hitstop);
      Snd.play('stomp', hit ? null : WHIFF_SND);
    } else if (a === A_SWIPE && p === 1) { Snd.play('swipe'); this.trailT = CONFIG.swipe.strike + 0.12; }
    else if (a === A_BEAM && p === 1) { this.aimBeam(); Snd.play('beam'); }
  },

  // ---------- death ----------
  stepDead(dt) {
    this.deadT += dt;
    if (this.hurtT > 0) this.hurtT -= dt;
    if (!this.landed && this.deadT >= 0.55) {
      this.landed = true;
      Fx.dust(this.x + this.facing * 50, CONFIG.GROUND, 14, 80);
      Fx.shake(CONFIG.fx.deathShake);
      City.quake(this.x + this.facing * 50, CONFIG.quake.death);
      Snd.play('crumble');
    }
  },

  // ---------- pose (numbers only; draw code reads this object) ----------
  computePose() {
    const P = this.pose, t = this.life;
    P.bob = 0; P.sx = 1; P.sy = 1; P.lean = 0; P.offX = 0; P.liftF = 0; P.liftB = 0; P.legF = 0; P.legB = 0;
    P.armF = 0.05 * Math.sin(t * 2.2); P.armB = -0.05 * Math.sin(t * 2.2); P.head = 0; P.jaw = 0;
    P.tail = 0.08 * Math.sin(t * 1.7); P.eyes = this.blinkT > 0 ? 1 : 0; P.chest = 0;
    if (Main.state === 'over') return this.poseDead(P);
    const moving = this.walkDir !== 0 && !this.rooted();
    if (moving) {
      const w = this.walkPhase * 2 * Math.PI;
      P.strip = 'monster_walk'; P.frame = Math.floor(this.walkPhase * 4) & 3;
      P.bob = -3 * Math.abs(Math.cos(w)) + 1.5;
      P.legF = 0.35 * Math.sin(w); P.legB = -P.legF;
      P.liftF = Math.max(0, -Math.cos(w)) * 8; P.liftB = Math.max(0, Math.cos(w)) * 8;
      P.armF = -0.35 * Math.sin(w); P.armB = 0.35 * Math.sin(w);
      P.lean = 0.04; P.tail = -0.12 * Math.sin(w - 0.2);
    } else {
      P.strip = 'monster_idle'; P.frame = this.blinkT > 0 ? 2 : Math.sin(t * 2 * Math.PI / 1.2) > 0 ? 1 : 0;
      P.bob = 2 * Math.sin(t * 2 * Math.PI / 1.2);
    }
    const a = this.action, ph = this.phase, dur = a ? PHASES[a][ph] : 1, u = clamp(this.phaseT / dur, 0, 1);
    if (a === A_STOMP) {
      P.strip = 'monster_stomp'; P.frame = ph;
      if (ph === 0) { const e = easeOut(u); P.bob = 6 * e; P.sx = 0.97; P.sy = 1.04; P.liftF = 26 * e; P.legF = -0.5 * e; P.lean = -0.07; P.armF = -1.2 * e; P.armB = 1.0 * e; }
      else if (ph === 1) { P.sx = 1.06; P.sy = 0.94; P.legF = -0.15; P.armF = -0.4; P.armB = 0.5; P.tail = 0.15; P.jaw = 0.3; }
      else { P.sy = 1 + 0.02 * Math.sin(u * Math.PI); P.armF = -0.2 * (1 - u); P.tail = 0.15 * (1 - u); }
    } else if (a === A_SWIPE) {
      P.strip = 'monster_swipe';
      const phi = Math.atan2(Math.sin(this.swipeAng), Math.cos(this.swipeAng) * this.facing); // aim in facing-local space
      const swing = 50 * DEG;
      let psi;
      if (ph === 0) { P.frame = 0; psi = lerp(Math.PI / 2, phi - 2.1, easeOut(u)); P.lean = -0.04; }
      else if (ph === 1) { P.frame = this.aim.swipeY < CONFIG.swipe.shoulderY ? 1 : 2; psi = phi - swing + 2 * swing * u; P.lean = 0.05; }
      else { P.frame = 3; psi = lerp(phi + swing + 15 * DEG, Math.PI / 2, easeOut(u)); P.lean = 0.05 * (1 - u); }
      P.armF = psi - Math.PI / 2; P.head = 0.1 * clamp(phi, -1, 1);
      P.tail = ph === 1 ? -0.1 : 0.1;
    } else if (a === A_BEAM) {
      P.strip = 'monster_beam';
      const phi = Math.atan2(Math.sin(this.beamAng), Math.cos(this.beamAng) * this.facing);
      P.head = clamp(phi, -0.6, 0.6);
      if (ph === 0) { P.frame = this.beamPair * 2; P.jaw = 0.5 * u; P.chest = u; P.bob = 4 * u - 2; }
      else if (ph === 1) { P.frame = this.beamPair * 2 + 1; P.jaw = 0.55; P.chest = 1; P.lean = -0.10; P.offX = -6; }
      else { P.frame = 6; P.jaw = 0.5 * (1 - u); P.chest = 1 - u; P.offX = -6 * (1 - u); }
      P.armF = 0.3; P.armB = -0.2;
    }
    return P;
  },

  poseDead(P) {
    const d = this.deadT, fall = clamp(d / CONFIG.monster.deathFall, 0, 1);
    P.strip = 'monster_dead'; P.frame = d < 0.25 ? 0 : d < 0.55 ? 1 : 2;
    P.lean = 1.4 * easeIn(fall); P.bob = -6 * fall; P.eyes = 2; P.armF = 0.4; P.armB = 0.3; P.head = 0.4 * fall; P.tail = 0;
    P.liftF = 0; P.legF = -0.3 * fall; P.legB = 0.2 * fall;
    return P;
  },
};
