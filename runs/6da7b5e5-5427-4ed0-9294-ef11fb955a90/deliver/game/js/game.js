// State machine, run reset, fixed-step loop, perf counters, canvas sizing, and window.__game.
const Game = (() => {
  const DT = 1 / 60;
  const fr = Frog.make();
  const W = {
    t: 0, titleT: 0, overT: 0, seed: 0, R: CFG.R0, Rshown: CFG.R0, shrink: 0, gustLeft: 0, gustIdx: 0,
    swarmAt: new Float32Array(CFG.gustTimes.length), swarmSide: 1, vigA: 0, shakePh: 0,
    caught: 0, score: 0, best: 0, prevBest: 0, losses: 0, newBest: 0, streak: 0, streakT: 0, bestStreak: 0, lastStreak: 0, misses: 0, goldenCaught: 0,
    catches: 0, midHopCatches: 0, spawnTimer: 0, lastWasGolden: 0, goldenForced: 0, cap: 6, spawnX: 0, spawnY: 0,
    result: 0, ending: 0, endT: 0, hitstop: 0, shake: 0, firstHopDone: 0, tongueUsed: 0, snapFly: -1, kbMode: 0,
    streakPop: 0, streakGreyT: 0, jarPulse: 0, jarHiT: 0, rangeShakeT: 0, cssScale: 1,
    once: { snap: 0, thaw: 0, mid: 0, golden: 0, ice: 0 },
    frog: fr.frog, tongue: fr.tongue, pads: Pond.makePads(), flies: Flies.make(),
  };
  const perf = { frames: 0, fps: 0, worstMs: 0, longFrames: 0 };
  const ring = new Float32Array(120), scratch = new Float32Array(120);
  let ringN = 0;

  const G = {
    W, perf, state: 'title', skipNext: false, manual: Rng.manual, clock: 0, titleFade: 0, rect: { left: 0, top: 0, width: 640, height: 360 },
    reducedMotion: !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches),
  };

  function readStore(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function writeStore(key, v) { try { localStorage.setItem(key, String(v)); } catch (e) {} }
  G.saveBest = v => writeStore(CFG.bestKey, v);

  function resetRun() {
    W.seed = Rng.nextSeed();
    Rng.reseed(W.seed);
    W.titleT = 0; W.overT = 0; W.vigA = 0; W.shakePh = fxRng.range(0, 6.28);
    Director.reset(W);
    Pond.reset(W);
    Frog.reset(W);
    Flies.reset(W);
    Fx.reset();
    Input.cand.fill(-1);
  }

  G.start = function () {
    resetRun();
    Input.clear();
    G.titleFade = G.state === 'title' ? 0.3 : 0;
    G.state = 'play';
    G.skipNext = true;
    perf.worstMs = 0;
    sfx('ui');
    sfxCall('ambient', true);
  };

  G.pause = function () {
    if (G.state !== 'play') return;
    G.state = 'pause';
    sfxCall('suspend');
  };
  G.resume = function () {
    G.state = 'play'; G.skipNext = true;
    sfxCall('resume'); sfx('ui');
  };
  G.toggleMute = function () {
    Fx.muted = !Fx.muted;
    writeStore(CFG.muteKey, Fx.muted ? 1 : 0);
    if (window.SFX && typeof SFX.setMuted === 'function') { try { SFX.setMuted(Fx.muted); } catch (e) {} }
    if (!Fx.muted) sfx('ui');
  };

  G.step = function (dt) {
    G.clock += dt;
    let k;
    switch (G.state) {
      case 'title':
        W.titleT += dt;
        Flies.idle(W, W.titleT);
        while ((k = Input.pop())) {
          if (k === I_POINT || k === I_START) {
            const x = Input.px, y = Input.py;
            G.start();
            if (k === I_POINT && Pond.padAt(W, x, y) >= 0) Input.push(I_POINT, x, y);
            break;
          }
        }
        return;
      case 'pause':
        while ((k = Input.pop())) if (k === I_POINT || k === I_PAUSE || k === I_START) { G.resume(); Input.clear(); break; }
        return;
      case 'over':
        W.overT += dt;
        Fx.update(dt);
        while ((k = Input.pop())) if ((k === I_POINT || k === I_START) && W.overT >= CFG.overInputLock) { G.start(); break; }
        return;
    }
    // play
    if (G.titleFade > 0) G.titleFade -= dt;
    if (W.shake > 0) W.shake = Math.max(0, W.shake - CFG.shakeDecay * dt);
    if (W.ending) {
      Input.clear();
      Fx.update(dt);
      if (Director.updateEnding(W, dt)) { G.state = 'over'; W.overT = 0; Render.bakeOver(W); }
      return;
    }
    if (W.hitstop > 0) { W.hitstop--; return; }
    Input.consume(W);
    if (G.state !== 'play') return;
    Director.update(W, dt);
    W.vigA = W.gustLeft > 0 ? Math.min(1, W.vigA + dt / 0.5) : Math.max(0, W.vigA - dt / 0.5);
    Pond.update(W, dt);
    Frog.update(W, dt);
    Frog.updateTongue(W, dt);
    Flies.update(W, dt);
    Director.teach(W);
    Director.checkEnd(W);
    Fx.update(dt);
    Input.updateCandidates(W);
  };

  // ---------- loop ----------
  let last = -1, acc = 0;
  function sample(ms) {
    perf.frames++;
    ring[ringN % 120] = ms; ringN++;
    if (ringN % 30 === 0) {
      const n = Math.min(ringN, 120);
      scratch.fill(1e9); for (let i = 0; i < n; i++) scratch[i] = ring[i];
      scratch.sort();
      perf.fps = 1000 / scratch[n >> 1];
    }
    if (G.state === 'play' && !G.manual && !W.ending) perf.worstMs = Math.max(perf.worstMs, ms);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (last < 0 || G.skipNext) { last = now; G.skipNext = false; perf.frames++; Render.draw(1); return; }
    const ms = now - last; last = now;
    sample(ms);
    if (!G.manual) {
      acc += Math.min(ms / 1000, 0.25);
      let steps = 0;
      while (acc >= DT && steps < 5) { G.step(DT); acc -= DT; steps++; }
      if (steps === 5) acc = 0;
    }
    Render.draw(G.manual ? 1 : acc / DT);
  }

  // ---------- sizing ----------
  function resize() {
    const canvas = G.canvas;
    let s = Math.min(innerWidth / CFG.W, innerHeight / CFG.H);
    s = s >= 1 ? Math.floor(s) : s;
    canvas.style.width = (CFG.W * s) + 'px'; canvas.style.height = (CFG.H * s) + 'px';
    G.rect = canvas.getBoundingClientRect();
    W.cssScale = G.rect.width / CFG.W || 1;
  }

  // ---------- machine interface ----------
  function probe() {
    const f = W.frog, t = W.tongue;
    let alive = 0, swarm = 0, golden = 0, lit = 0, nearest = -1, open = 0, frost = 0, frozen = 0;
    for (let i = 0; i < W.flies.length; i++) {
      const fl = W.flies[i];
      if (!fl.alive) continue;
      alive++; if (fl.swarm) swarm++; if (fl.golden) golden = 1;
      if (Flies.catchable(fl)) {
        const d = Math.hypot(fl.x - f.x, fl.y - f.y);
        if (d <= CFG.tongueRange) lit++;
        if (nearest < 0 || d < nearest) nearest = d;
      }
    }
    for (let i = 0; i < W.pads.length; i++) {
      const s = W.pads[i].state;
      if (s === PAD_FROSTING) frost++; else if (s === PAD_FROZEN) frozen++; else open++;
    }
    const fp = f.state === FROG_AIR ? f.hopTo : f.pad, fps = W.pads[fp].state;
    const stateCode = { title: 0, play: 1, pause: 2, over: 3 }[G.state];
    return {
      t: W.t, seed: W.seed, stateCode, R: W.R, Rshown: W.Rshown, freeze: (1 - W.R) / 0.9 * 100,
      shrinkRate: Director.shrinkAt(W.t, W.gustLeft > 0), gust: W.gustLeft > 0 ? 1 : 0, gustsDone: W.gustIdx, swarmAlive: swarm,
      caught: W.caught, jarTarget: CFG.jarTarget, toGo: Math.max(0, CFG.jarTarget - W.caught), score: W.score, best: W.best,
      streak: W.streak, bestStreak: W.bestStreak, catches: W.catches, midHopCatches: W.midHopCatches, misses: W.misses,
      firefliesAlive: alive, cap: W.cap, litInRange: lit, nearestLitDist: nearest, goldenAlive: golden, goldenCaught: W.goldenCaught,
      padsOpen: open, padsFrosting: frost, padsFrozen: frozen, frogPad: fp, frogPadState: fps, frogPadFrosting: fps === PAD_FROSTING ? 1 : 0,
      iceDistToFrog: (W.R - Pond.rho(f.x, f.y)) * Pond.unitLen(f.x, f.y),
      airborne: f.state === FROG_AIR ? 1 : 0, hopLeft: Frog.hopLeft(W), tongueReady: Frog.tongueReady(W), tongueState: t.state,
      frogX: f.x, frogY: f.y, hopRange: CFG.hopRange, tongueRange: CFG.tongueRange,
      result: W.result, ending: W.ending, overT: G.state === 'over' ? W.overT : 0, hitstop: W.hitstop,
    };
  }
  function scene() {
    const f = W.frog, r = Pond.hitR(W), pads = [], flies = [];
    for (let i = 0; i < W.pads.length; i++) { const p = W.pads[i]; pads.push({ i, x: p.x, y: p.y, r, state: PAD_STATE_NAMES[p.state] }); }
    for (let i = 0; i < W.flies.length; i++) {
      const fl = W.flies[i];
      if (fl.alive) flies.push({ x: fl.x, y: fl.y, lit: fl.lit, golden: fl.golden, swarm: fl.swarm, catchable: Flies.catchable(fl) ? 1 : 0 });
    }
    return { frog: { x: f.x, y: f.y, pad: f.state === FROG_AIR ? f.hopTo : f.pad, airborne: f.state === FROG_AIR ? 1 : 0 }, pads, fireflies: flies };
  }

  G.boot = function () {
    G.canvas = document.getElementById('game');
    Assets.boot();
    Render.init(G.canvas);
    Input.boot(G.canvas);
    W.best = +(readStore(CFG.bestKey) || 0) || 0;
    Fx.muted = readStore(CFG.muteKey) === '1';
    if (Fx.muted && window.SFX && typeof SFX.setMuted === 'function') { try { SFX.setMuted(true); } catch (e) {} }
    resize();
    window.addEventListener('resize', resize);
    resetRun();
    if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes && PerformanceObserver.supportedEntryTypes.indexOf('long-animation-frame') >= 0) {
      try { new PerformanceObserver(list => { if (G.state !== 'play') return; const e = list.getEntries(); for (let i = 0; i < e.length; i++) if (e[i].duration > 50) perf.longFrames++; }).observe({ type: 'long-animation-frame', buffered: false }); } catch (e) {}
    }
    requestAnimationFrame(frame);
  };

  window.__game = {
    start: () => G.start(),
    get state() { return G.state; },
    get score() { return W.score; },
    perf,
    get ready() { return Assets.ready; },
    get seed() { return W.seed; },
    probe,
    scene,
    advance(n) { for (let i = 0; i < (n | 0); i++) G.step(DT); Render.draw(1); return probe(); },
    toClient(x, y) { const r = G.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / CFG.W, y: r.top + y * r.height / CFG.H }; },
    view() { const r = G.canvas.getBoundingClientRect(); return { left: r.left, top: r.top, scale: r.width / CFG.W }; },
  };
  return G;
})();
Game.boot();
