// GAME: boot, fixed-timestep loop, state machine, rules (combo, hints, lose, dawn), perf,
// and window.__game (tech plan section 12).
var GAME = (function () {
  var C = CONFIG, DT = C.DT, EPS = C.EPS, W = WORLD;
  var MANUAL = false, urlSeed = -1, bootSeed = 0, runs = 0, booted = false, pendingStart = false;
  var acc = 0, last = 0, skipNext = true;
  var STATE_CODE = { sit: 0, crouch: 1, air: 2, land: 3, frozen: 4, dawn: 5 };

  // ---- perf -------------------------------------------------------------
  var PERF = { frames: 0, fps: 0, worstMs: 0, longFrames: 0 };
  var ring = new Float32Array(120), scratch = new Float32Array(120), ri = 0, rn = 0;

  function perfSample(dt) {
    PERF.frames++;
    ring[ri] = dt; ri = (ri + 1) % 120; if (rn < 120) rn++;
    if ((PERF.frames & 31) === 0) {
      for (var i = 0; i < rn; i++) scratch[i] = ring[i];
      var s = rn === 120 ? scratch : scratch.subarray(0, rn);
      s.sort();
      PERF.fps = Math.round(10000 / s[rn >> 1]) / 10;
    }
    if (W.state === 'play') {
      if (dt > PERF.worstMs) PERF.worstMs = dt;
      if (dt > 50) PERF.longFrames++;
    }
  }

  // ---- loop ---------------------------------------------------------------
  function loop(ts) {
    requestAnimationFrame(loop);
    if (skipNext) { last = ts; skipNext = false; RENDER.frame(W, 1, 0); return; }
    var dtMs = ts - last;
    last = ts;
    perfSample(dtMs);
    if (!MANUAL) {
      acc += Math.min(dtMs / 1000, C.MAX_FRAME_S);
      var n = 0;
      while (acc >= DT && n < C.MAX_STEPS) { step(); acc -= DT; n++; }
      if (n === C.MAX_STEPS && acc > DT) acc = DT;
    }
    RENDER.frame(W, MANUAL ? 1 : acc / DT, Math.min(dtMs / 1000, 0.1));
  }

  function savePrev() {
    var f = W.frog, i;
    f.px = f.x; f.py = f.y; f.pz = f.z;
    for (i = 0; i < W.padCount; i++) { W.pads[i].px = W.pads[i].x; W.pads[i].py = W.pads[i].y; }
    for (i = 0; i < W.flies.length; i++) {
      var fl = W.flies[i];
      if (fl.active) { fl.px = fl.x; fl.py = fl.y; }
    }
  }

  function step() {
    INPUT.consume(W);
    savePrev();
    switch (W.state) {
      case 'title':
        POND.update(W, DT, false);
        break;
      case 'play':
        W.step++; W.t += DT;
        POND.update(W, DT, true);
        FROG.update(W, DT);
        POND.markRange(W);
        FLIES.update(W, DT);
        rules(W, DT);
        break;
      case 'over':
        W.endT += DT;
        POND.update(W, DT, false);
        FROG.update(W, DT);
        break;
    }
  }

  // ---- rules --------------------------------------------------------------
  function approach(v, target, rate) {
    return v < target ? Math.min(target, v + rate) : Math.max(target, v - rate);
  }

  // Catches that would have kept the centre pad open until dawn, given the ring at death.
  function dawnShortfall(t, R) {
    var S = function (x) { return C.ICE_V0 * x + C.ICE_ACC / 2 * x * x; };
    return Math.max(1, Math.ceil((S(C.NIGHT) - S(t) - (R - C.PAD0_R)) / C.THAW));
  }

  function rules(w, dt) {
    var f = w.frog, fade = C.HINT_MAX / C.HINT_FADE * dt;
    w.comboT += dt;
    if (w.comboT > C.COMBO_T) w.combo = 1;
    w.hintSnap = w.caught === 0 ? C.HINT_MAX : approach(w.hintSnap, 0, fade);
    w.hintHop = approach(w.hintHop, w.hops === 0 && w.t >= C.HINT_HOP_T - EPS ? C.HINT_MAX : 0, fade);
    w.dawnK = Math.min(1, Math.max(0, (w.t - (C.NIGHT - C.DAWN_RAMP)) / C.DAWN_RAMP));

    if (f.state !== 'air' && w.pads[FROG.ownPad(f)].frozen && f.frostT >= C.FROST_GRACE - EPS) {
      f.state = 'frozen';
      w.won = false; w.endTime = w.t; w.shortOfDawn = dawnShortfall(w.t, w.ice.R); w.bonus = 0;
      finish(w);
      EVENTS.emit('frozen', f.x, f.y, 0, 0);
    } else if (w.t >= C.NIGHT - EPS) {
      FROG.settle(w);
      f.state = 'dawn';
      w.won = true; w.endTime = C.NIGHT; w.shortOfDawn = 0;
      w.bonus = C.DAWN_BONUS + 2 * Math.round(w.ice.R);
      w.score += w.bonus;
      finish(w);
      EVENTS.emit('dawn', f.x, f.y, w.bonus, 0);
    }
  }

  function finish(w) {
    w.endT = 0;
    w.newBest = w.score > w.best;
    if (w.newBest) {
      w.best = w.score;
      try { localStorage.setItem(C.KEY_BEST, String(w.best)); } catch (e) {}
    }
    setState('over');
  }

  // ---- state machine ------------------------------------------------------
  function setState(s) {
    var prev = W.state;
    if (s === prev) return;
    W.state = s;
    if (s === 'pause') { if (window.SFX && SFX.suspend) try { SFX.suspend(); } catch (e) {} }
    if (prev === 'pause' && s === 'play') {
      if (window.SFX && SFX.resume) try { SFX.resume(); } catch (e) {}
      skipNext = true;
    }
    RENDER.screen(s, prev);
  }

  function newRun(seed) {
    var w = W;
    w.seed = seed >>> 0;
    RNG.seed(w.seed);
    w.step = 0; w.t = 0; w.animT = 0;
    w.score = 0; w.combo = 1; w.bestCombo = 1; w.caught = 0; w.goldenCaught = 0; w.midHopCatches = 0;
    w.comboT = 0; w.won = false; w.endT = 0; w.endTime = 0; w.shortOfDawn = 0; w.bonus = 0;
    w.newBest = false; w.hintSnap = 0; w.hintHop = 0; w.dawnK = 0; w.hops = 0;
    w.hover.active = false; w.hover.pad = -1; w.hover.padValid = false; w.hover.fly = -1;
    POND.build(w);
    FROG.reset(w);
    FLIES.reset(w);
    POND.markRange(w);
    RENDER.reset(w);
  }

  function start() {
    if (!booted) { pendingStart = true; return; }
    var seed = urlSeed >= 0 ? urlSeed : runs === 0 ? bootSeed : (Date.now() ^ (runs * 2654435761)) >>> 0;
    runs++;
    newRun(seed);
    setState('play');
    EVENTS.emit('ui', 0, 0, 0, 0);
    PERF.worstMs = 0; PERF.longFrames = 0;
    skipNext = true; acc = 0;
  }

  // ---- machine interface --------------------------------------------------
  function advance(n) {
    n = Math.max(0, n | 0);
    for (var i = 0; i < n; i++) step();
    return probe();
  }

  function hopTo(id) {
    if (W.state !== 'play') return false;
    INPUT.queueHop(id);
    return FROG.canHop(W, id);
  }

  function snapAt(id) {
    if (W.state !== 'play') return false;
    INPUT.queueSnap(id);
    return true;
  }

  function probe() {
    var w = W, f = w.frog, i, p;
    var ownId = FROG.ownPad(f), own = w.pads[ownId];
    var padsOpen = 0, padsInRange = 0;
    for (i = 0; i < w.padCount; i++) {
      if (!w.pads[i].frozen) padsOpen++;
      if (w.pads[i].inRange) padsInRange++;
    }

    // Nearest active fly; a golden in reach wins.
    var near = -1, nearD = 1e9, gold = -1, goldD = 1e9, reach = C.REACH + C.FLY_HIT;
    for (i = 0; i < w.flies.length; i++) {
      var fl = w.flies[i];
      if (!fl.active || fl.state === 'expired') continue;
      var d = Math.hypot(fl.x - f.x, fl.y - f.y);
      if (d < nearD) { near = i; nearD = d; }
      if (fl.golden && d <= reach && d < goldD) { gold = i; goldD = d; }
    }
    if (gold >= 0) { near = gold; nearD = goldD; }
    var nf = near >= 0 ? w.flies[near] : null;

    // hopPad: in-range pad closest to nearFly, if closer than the frog is now.
    var hop = -1, hopD = nf ? nearD : 0;
    // safePad: in-range pad most central, if more central than the frog's pad.
    var safe = -1, safeD = own.d;
    for (i = 0; i < w.padCount; i++) {
      p = w.pads[i];
      if (!p.inRange) continue;
      if (nf) {
        var dd = Math.hypot(p.x - nf.x, p.y - nf.y);
        if (dd < hopD) { hop = i; hopD = dd; }
      }
      if (p.d < safeD) { safe = i; safeD = p.d; }
    }
    var hp = hop >= 0 ? w.pads[hop] : null, sp = safe >= 0 ? w.pads[safe] : null;

    return {
      state: w.state, seed: w.seed, t: w.t, step: w.step,
      iceR: w.ice.R, iceV: w.ice.v, iceTrend: w.ice.trend,
      frogX: f.x, frogY: f.y, frogPad: ownId, hopping: FROG.hopping(f),
      frogState: STATE_CODE[f.state], frogPadFrozen: own.frozen, frogPadMargin: own.margin,
      frostK: f.frostK,
      pads: w.padCount, padsOpen: padsOpen, padsInRange: padsInRange,
      fireflies: w.flyCount, golden: w.goldenAlive,
      caught: w.caught, goldenCaught: w.goldenCaught, midHopCatches: w.midHopCatches,
      combo: w.combo, comboT: w.comboT, bestCombo: w.bestCombo,
      score: w.score, best: w.best, snapCd: f.snapCd,
      nearFly: nf ? nf.id : -1, nearFlyX: nf ? nf.x : 0, nearFlyY: nf ? nf.y : 0,
      nearFlyDist: nf ? nearD : 9999, nearFlyGolden: nf ? nf.golden : false,
      flyInReach: !!nf && nearD <= reach,
      hopPad: hop, hopPadX: hp ? hp.x : 0, hopPadY: hp ? hp.y : 0, hopPadMargin: hp ? hp.margin : 0,
      safePad: safe, safePadX: sp ? sp.x : 0, safePadY: sp ? sp.y : 0, safePadMargin: sp ? sp.margin : 0,
      won: w.won, endT: w.endT, endTime: w.endTime, shortOfDawn: w.shortOfDawn, bonus: w.bonus,
      muted: w.muted, manual: MANUAL,
      viewX: INPUT.rect.left, viewY: INPUT.rect.top, viewScale: INPUT.viewScale
    };
  }

  // ---- boot ---------------------------------------------------------------
  function readPref(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function boot() {
    var params = new URLSearchParams(location.search);
    var s = parseInt(params.get('seed'), 10);
    if (isFinite(s)) urlSeed = s >>> 0;
    MANUAL = params.get('manual') === '1';
    bootSeed = urlSeed >= 0 ? urlSeed : Date.now() >>> 0;

    W.best = parseInt(readPref(C.KEY_BEST), 10) || 0;
    W.muted = readPref(C.KEY_MUTE) === '1';
    if (window.SFX && SFX.setMuted) SFX.setMuted(W.muted);
    var rm = readPref(C.KEY_RM);
    W.reducedMotion = rm !== null ? rm === '1'
      : !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

    var canvas = document.getElementById('game');
    INPUT.init(canvas);
    RNG.seed(bootSeed);
    ASSETS.load(function () {
      RENDER.init(canvas);
      newRun(bootSeed);
      W.state = '';
      setState('title');
      booted = true;
      requestAnimationFrame(loop);
      if (pendingStart) start();
    });
  }

  function resync() { skipNext = true; }

  window.__game = {
    start: start,
    get state() { return W.state; },
    get score() { return W.score; },
    perf: PERF,
    probe: probe,
    advance: advance,
    hopTo: hopTo,
    snapAt: snapAt,
    world: W
  };

  return {
    boot: boot, start: start, setState: setState, newRun: newRun, step: step, rules: rules,
    advance: advance, probe: probe, hopTo: hopTo, snapAt: snapAt, resync: resync
  };
})();
