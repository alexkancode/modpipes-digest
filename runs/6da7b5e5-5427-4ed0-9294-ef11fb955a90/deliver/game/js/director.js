// Run clock, gusts and swarms, alive cap, scoring (onCatch / onMiss), win and lose, the end sequences.
const Director = {
  reset(W) {
    W.t = 0; W.gustLeft = 0; W.gustIdx = 0; W.swarmSide = rng.next() < 0.5 ? -1 : 1;
    for (let k = 0; k < W.swarmAt.length; k++) W.swarmAt[k] = -1;
    W.caught = 0; W.score = 0; W.newBest = 0; W.streak = 0; W.streakT = 0; W.streakPop = 0; W.streakGreyT = 0; W.bestStreak = 0;
    W.misses = 0; W.catches = 0; W.midHopCatches = 0; W.goldenCaught = 0; W.jarPulse = 0; W.jarHiT = 0;
    W.result = 0; W.ending = 0; W.endT = 0; W.hitstop = 0; W.shake = 0; W.firstHopDone = 0; W.tongueUsed = 0; W.snapFly = -1;
    W.once.snap = W.once.thaw = W.once.mid = W.once.golden = W.once.ice = 0;
    W.shrink = this.shrinkAt(0, 0); W.cap = this.capAt(0); W.rangeShakeT = 0;
  },

  shrinkAt(t, gust) { return (CFG.shrinkBase + CFG.shrinkPerSec * t) * (gust ? CFG.gustMult : 1); },
  capAt(t) { const c = CFG.capByTime; let v = c[0][1]; for (let i = 0; i < c.length; i++) if (t >= c[i][0]) v = c[i][1]; return v; },

  update(W, dt) {
    W.t += dt;
    if (W.gustIdx < CFG.gustTimes.length && W.t >= CFG.gustTimes[W.gustIdx]) {
      W.gustLeft = CFG.gustLen;
      W.swarmAt[W.gustIdx] = W.t + CFG.gustLen + CFG.swarmDelay;
      W.gustIdx++;
      Fx.shake(W, CFG.shakeGust);
      sfx('gust');
    }
    if (W.gustLeft > 0) W.gustLeft = Math.max(0, W.gustLeft - dt);
    for (let k = 0; k < W.swarmAt.length; k++) if (W.swarmAt[k] >= 0 && W.t >= W.swarmAt[k]) { W.swarmAt[k] = -1; Flies.spawnSwarm(W); }
    W.shrink = this.shrinkAt(W.t, W.gustLeft > 0);
    W.cap = this.capAt(W.t);
    W.streakT += dt;
    if (W.streak > 0 && W.streakT >= CFG.streakTimeout) this.breakStreak(W);
    if (W.streakPop > 0) W.streakPop -= dt;
    if (W.streakGreyT > 0) W.streakGreyT -= dt;
    if (W.jarPulse > 0) W.jarPulse -= dt;
    if (W.jarHiT > 0) W.jarHiT -= dt;
    if (W.rangeShakeT > 0) W.rangeShakeT -= dt;
    if (W.t >= CFG.iceHintAt && !W.once.ice) Fx.once(W, 'ice');
  },

  breakStreak(W) {
    if (W.streak >= 2) W.streakGreyT = 0.6;
    W.lastStreak = W.streak;
    W.streak = 0;
  },

  onCatch(W, fl) {
    const f = W.frog, airborne = f.state === FROG_AIR, golden = fl.golden;
    const before = Math.min(W.streak, CFG.streakCap);
    const pts = (golden ? CFG.baseGolden : CFG.baseFly) * (airborne ? CFG.midHopMult : 1) + CFG.streakStep * before;
    W.score += pts;
    W.streak++; W.streakT = 0; W.streakPop = 0.12; W.streakGreyT = 0;
    if (W.streak > W.bestStreak) W.bestStreak = W.streak;
    W.caught += golden ? CFG.goldenJar : 1;
    W.catches++;
    if (airborne) W.midHopCatches++;
    W.R = Math.min(CFG.Rcap, W.R + (golden ? CFG.meltGolden : CFG.melt));
    const delay = W.R < CFG.subsidyBelowR ? CFG.respawnSubsidy : CFG.respawn;
    if (!golden && !fl.swarm) W.spawnTimer = Math.max(W.spawnTimer, delay);
    fl.alive = 0;
    if (W.snapFly >= 0 && W.flies[W.snapFly] === fl) W.snapFly = -1;

    W.jarPulse = 0.15; W.jarHiT = 0.2; f.puffT = CFG.tongueBack + CFG.swallow;   // throat puff while swallowing
    Fx.flash(fl.x, fl.y);
    Fx.burst(fl.x, fl.y, golden ? 20 : 10, golden ? 3 : 0, golden ? 110 : 80);
    Fx.edgeShards(W.R, fl.x, fl.y, golden ? 14 : 8);
    Fx.plus(fl.x, fl.y - 6, pts);
    if (airborne) Fx.float(fl.x + 16, fl.y - 6, Assets.L.x2, CFG.floatLife, CFG.floatRise);
    Fx.float(f.x + 34, f.y + 6, Assets.L.gulp, CFG.swallow + CFG.tongueBack, 4);   // the tongue is busy for this long
    sfx('catch', Math.min(before, 8));
    // Every catch has weight: a short freeze and a small kick, more for mid-hop, most for golden.
    if (!Game.reducedMotion) {
      W.hitstop = golden ? CFG.hitstopGoldenSteps : airborne ? CFG.hitstopMidHopSteps : CFG.hitstopCatchSteps;
      Fx.shake(W, golden ? CFG.shakeGolden : airborne ? CFG.shakeMidHop : CFG.shakeCatch);
    }
    if (golden) { W.goldenCaught++; sfx('golden'); }
    sfx('thaw', undefined, CFG.thawSfxDelay);   // after the catch ping, so the pitch ladder stays clear
    if (!W.once.thaw) Fx.once(W, 'thaw');
    else if (airborne && !W.once.mid) Fx.once(W, 'mid');
  },

  onMiss(W) {
    this.breakStreak(W);
    W.misses++;
    sfx('miss');
  },

  // Teaching beat: first time a lit fly is in range before any tongue use, ring it and say "snap!".
  teach(W) {
    if (W.once.snap || W.tongueUsed || W.frog.state !== FROG_IDLE) return;
    const f = W.frog;
    let best = -1, bestD = CFG.tongueRange;
    for (let i = 0; i < W.flies.length; i++) {
      const fl = W.flies[i];
      if (!Flies.catchable(fl)) continue;
      const d = Math.hypot(fl.x - f.x, fl.y - f.y);
      if (d <= bestD) { best = i; bestD = d; }
    }
    if (best >= 0) { W.snapFly = best; Fx.once(W, 'snap'); }
  },

  checkEnd(W) {
    if (W.caught >= CFG.jarTarget) { this.end(W, 1); return; }
    const f = W.frog;
    if ((f.state === FROG_IDLE && W.pads[f.pad].state === PAD_FROZEN) || W.R <= CFG.Rfloor) this.end(W, 2);
  },

  end(W, result) {
    W.result = result; W.ending = 1; W.endT = 0; W.hitstop = 0;
    const f = W.frog;
    if (result === 1) {
      W.score += CFG.winBonusBase + CFG.winBonusPerTenth * Math.round(W.R * 10);
      f.state = FROG_DIVE;
      sfx('win');
    } else {
      f.state = FROG_FROZEN;
      Fx.shake(W, CFG.shakeLose);
      sfx('freeze');
    }
    W.tongue.state = T_READY; W.tongue.ext = 0;
    sfxCall('ambient', false);
    W.prevBest = W.best;
    if (W.score > W.best) { W.best = W.score; W.newBest = 1; Game.saveBest(W.best); }
    if (result === 2) W.losses++;
  },

  // Runs instead of the simulation while W.ending; returns 1 when the sequence is done.
  updateEnding(W, dt) {
    W.endT += dt;
    const f = W.frog;
    f.prevX = f.x; f.prevY = f.y; f.prevGroundY = f.groundY;
    for (let i = 0; i < W.pads.length; i++) { W.pads[i].prevX = W.pads[i].x; W.pads[i].prevY = W.pads[i].y; }
    if (W.result === 1) {
      W.Rshown = Math.min(1, W.R + (1 - W.R) * Math.min(1, W.endT / 1.2));
      if (W.endT < 1.2 && fxRng.next() < 0.5) Fx.edgeShards(W.Rshown, fxRng.range(0, 640), fxRng.range(0, 360), 1);
      if (W.endT < 0.5 && fxRng.next() < 0.35) Fx.particle(f.x + fxRng.range(-6, 6), f.y, 0, -10, 0.6, 4);
      Flies.swirl(W, dt);
    }
    return W.endT >= (W.result === 1 ? CFG.winSeq : CFG.loseSeq) ? 1 : 0;
  },
};
