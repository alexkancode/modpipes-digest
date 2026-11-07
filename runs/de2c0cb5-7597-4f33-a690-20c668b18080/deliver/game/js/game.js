// Game: boot, fixed-timestep loop, state machine, menus, perf and window.__game (tech plan §3, §4, §9.1, §12).
var Game = (function () {
  var DT = CFG.DT, UI = CFG.UI;
  var world = null, canvas = null, manual = false, startLevel = 1, acc = 0, last = null, ready = false;
  var perf = { frames: 0, fps: 0, worstMs: 0, warmupMs: 0, loaf: 0 };
  var ring = new Float32Array(120), scratch = new Float32Array(120), ringI = 0, perfOn = false, loafCount = 0, loafBase = 0;

  function param(name) {
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }
  function inRect(x, y, r) { return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; }
  function sfx(fn) { var S = window.SFX; if (S && typeof S[fn] === 'function') { try { S[fn](); } catch (e) { /* audio is optional */ } } }

  function initialShake() {
    var v = null;
    try { v = localStorage.getItem('poex.shake'); } catch (e) { /* storage blocked */ }
    if (v === '0' || v === '0.5' || v === '1') return parseFloat(v);
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1;
  }

  function boot() {
    var s = param('seed'), lv = parseInt(param('level'), 10);
    manual = param('manual') === '1';
    startLevel = lv >= 1 && lv <= 5 ? lv : 1;
    RNG.seed(s !== null && s !== '' && isFinite(+s) ? +s : (Date.now() & 0x7fffffff));
    world = World.create();
    world.stash = Flow.load('poex.stash');
    world.settings.shake = initialShake();
    canvas = document.getElementById('game');
    Input.attach(canvas, world);
    Render.init(canvas, onReady);
    setTimeout(onReady, 3500);   // the render loader has its own 3 s timeout; this is a backstop
    document.addEventListener('visibilitychange', function () { if (document.hidden) autoPause(); });
    window.addEventListener('blur', function () { if (!manual) autoPause(); });
    try {
      new PerformanceObserver(function (list) { loafCount += list.getEntries().length; })
        .observe({ type: 'long-animation-frame', buffered: true });
    } catch (e) { /* unsupported */ }
    requestAnimationFrame(tick);
  }

  function onReady() {
    if (ready) return;
    ready = true;
    world.loading = 0;
    Render.warmup();
  }

  // ---------- loop ----------
  function tick(ts) {
    var frameMs = last === null ? DT * 1000 : ts - last, steps = 0;
    last = ts;
    if (!manual) {
      acc += Math.min(frameMs / 1000, 0.25);
      while (acc >= DT && steps < 5) { step(); acc -= DT; steps++; }
      if (steps === 5) acc = 0;
    }
    Render.frame(world, manual ? 1 : acc / DT, frameMs);
    if (perfOn) recordFrame(frameMs);
    requestAnimationFrame(tick);
  }

  function recordFrame(ms) {
    var i, n;
    perf.frames++;
    ring[ringI] = ms; ringI = (ringI + 1) % ring.length;
    if (perf.frames > 30) { if (ms > perf.worstMs) perf.worstMs = ms; }
    else if (ms > perf.warmupMs) perf.warmupMs = ms;
    if (perf.frames % 30 === 0) {
      n = Math.min(perf.frames, ring.length);
      for (i = 0; i < ring.length; i++) scratch[i] = i < n ? ring[i] : 1e9;
      scratch.sort();
      perf.fps = Math.round(10000 / scratch[(n - 1) >> 1]) / 10;
    }
    perf.loaf = loafCount - loafBase;
  }

  function step() {
    var w = world, p = w.player, pr = Input.pressed;
    p.px = p.x; p.py = p.y; w.cam.px = w.cam.x; w.cam.py = w.cam.y;
    if (w.state !== 'play') { menus(w); Input.endStep(); return; }
    if (pr.pause) { pause(w); Input.endStep(); return; }
    if (w.hitstop > 0) { w.hitstop--; return; }   // latches survive hitstop
    w.tick++; w.runTime += DT;
    switch (w.mode) {
      case 'level': case 'boss':
        Player.update(w, DT);
        Enemies.update(w, DT);
        Bosses.update(w, DT);
        if (w.state === 'play') Flow.update(w, DT);
        break;
      case 'hideout': Hideout.update(w, DT); break;
      case 'cutscene': case 'death': Flow.update(w, DT); break;
    }
    Input.endStep();
  }

  // ---------- state machine ----------
  function pause(w) {
    w.pausedMode = w.mode; w.state = 'pause'; w.pauseFocus = 0;
    Render.sound('ui_select');
  }
  function resume(w) { w.state = 'play'; last = null; sfx('resume'); Render.sound('ui_back'); }
  function autoPause() { if (world && world.state === 'play') pause(world); last = null; sfx('suspend'); }

  function pauseItem(w, i) {
    if (i === 0) resume(w);
    else if (i === 1) start(1);
    else {
      w.settings.shake = w.settings.shake === 1 ? 0.5 : w.settings.shake === 0.5 ? 0 : 1;
      Flow.store('poex.shake', w.settings.shake);
      Render.sound('ui_select');
    }
  }

  function menus(w) {
    var pr = Input.pressed, c = Input.click, i;
    if (w.state === 'title') {
      if (!w.loading && (pr.confirm || pr.click)) { Render.sound('ui_confirm'); start(); }
    } else if (w.state === 'pause') {
      if (pr.pause) { resume(w); return; }
      if (pr.up) w.pauseFocus = (w.pauseFocus + 2) % 3;
      if (pr.down) w.pauseFocus = (w.pauseFocus + 1) % 3;
      if (pr.click) for (i = 0; i < 3; i++) if (inRect(c.x, c.y, UI.pause[i])) { w.pauseFocus = i; pauseItem(w, i); return; }
      if (pr.confirm) pauseItem(w, w.pauseFocus);
    } else if (w.state === 'over') {
      w.over.t += DT;
      if (w.over.t >= CFG.OVER_INPUT_DELAY && (pr.confirm || pr.click)) { Render.sound('ui_confirm'); start(1); }
    }
  }

  // Fresh run at `level` (1-5; default ?level= or 1). Usable from any state.
  function start(level) {
    var w = world, lv = level >= 1 && level <= 5 ? level | 0 : startLevel;
    World.newRun(w, lv);
    World.loadLevel(w, lv - 1);
    w.state = 'play';
    Flow.nextLevel(w);
    Input.endStep();
    perf.frames = 0; perf.fps = 0; perf.worstMs = 0; perf.warmupMs = 0; perf.loaf = 0;
    loafBase = loafCount; ringI = 0; perfOn = true;
    for (var i = 0; i < ring.length; i++) ring[i] = 0;
  }

  function advance(n) {
    n = n | 0;
    for (var i = 0; i < n; i++) step();
  }

  // ---------- probe (tech plan §12.2) ----------
  var MODE_ID = { level: 0, boss: 1, hideout: 2, cutscene: 3, death: 4 };
  var RESULT_ID = { '': 0, win: 1, lose: 2 };

  function meleeBox(p, out) {
    out.x = p.facing > 0 ? p.x + p.w / 2 : p.x - p.w / 2 - CFG.MELEE.w; out.y = p.y - 46; out.w = CFG.MELEE.w; out.h = CFG.MELEE.h;
    return out;
  }

  // The most urgent incoming threat: smallest eta wins.
  function threat(w) {
    var p = w.player, cx = p.x, cy = p.y - p.h / 2, best = { kind: 0, dx: 0, dy: 0, eta: 0 }, bestEta = 1e9, i, s, e, h, b = w.boss;
    function consider(kind, dx, dy, eta) { if (eta < bestEta) { bestEta = eta; best.kind = kind; best.dx = dx; best.dy = dy; best.eta = eta; } }
    for (i = 0; i < w.projectiles.length; i++) {
      s = w.projectiles[i];
      if (!s.alive || s.friendly) continue;
      var dx = s.x - cx, dy = s.y - cy, d = Math.sqrt(dx * dx + dy * dy), sp = Math.sqrt(s.vx * s.vx + s.vy * s.vy) || 1;
      if (d > 360 || dx * s.vx + dy * s.vy >= 0) continue;
      consider(s.kind === 'shockwave' ? 5 : s.kind === 'kiss' ? 3 : 1, dx, dy, d / sp);
    }
    for (i = 0; i < w.enemies.length; i++) {
      e = w.enemies[i];
      if (!e.alive || e.st !== 'windup') continue;
      var edx = e.x - cx, edy = (e.y - e.h / 2) - cy, left = Math.max(0, (e.kind === 'elite' ? (e.attack === 'line' ? CFG.ENEMY.elite.lineTell : CFG.ENEMY.elite.chargeTell) : CFG.ENEMY[e.kind].tell) - e.stT);
      if (e.charming && Math.abs(edx) < 220) consider(3, edx, edy, left);
      else if ((e.attack === 'swipe' && Math.abs(edx) < 64) || (e.attack === 'charge' && Math.abs(edx) < 240)) consider(2, edx, edy, left);
    }
    if (b.alive && b.st === 'windup') {
      var bdx = b.x - cx, bdy = (b.y - b.h / 2) - cy, A = CFG.ATK;
      if (b.attack === A.charm) consider(3, bdx, bdy, b.tell);
      else if (b.attack === A.belch) consider(4, bdx, bdy, b.tell);
      else if (b.attack === A.shockwave) consider(5, bdx, bdy, b.tell + Math.max(0, Math.abs(bdx) - b.w / 2) / CFG.BOSS.brutus.wave.speed);
      else if (b.attack === A.slam) { if (Math.abs(bdx) < b.w / 2 + 110) consider(2, bdx, bdy, b.tell); }
      else consider(1, bdx, bdy, b.tell);
    }
    for (i = 0; i < w.hazards.length; i++) {
      h = w.hazards[i];
      if (!h.alive) continue;
      if (h.kind === 'ring' && !h.hitDone) {
        var gap = Math.abs(p.x - h.x) - h.r;
        if (gap >= 0 && gap < 48) consider(4, h.x - cx, h.y - cy, gap / CFG.BOSS.heart.ring.speed);
      } else if (h.kind === 'nova' && h.st === 'tell') {
        var ndx = p.x - h.x, ndy = cy - h.y;
        if (ndx * ndx + ndy * ndy <= h.r * h.r) consider(4, h.x - cx, h.y - cy, h.tell - h.t);
      } else if (h.kind === 'pillar' && h.st === 'tell' && p.x > h.x - 12 && p.x < h.x + h.w + 12) consider(1, h.x + h.w / 2 - cx, 0, h.tell - h.t);
      else if (h.kind === 'plate' && h.st === 'tell' && p.x > h.x - 8 && p.x < h.x + h.w + 8) consider(1, h.x + h.w / 2 - cx, h.y - cy, CFG.PLATE.armed + CFG.PLATE.tell - (h.t % (CFG.PLATE.armed + CFG.PLATE.tell + CFG.PLATE.active)));
    }
    return best;
  }

  function probe() {
    var w = world, p = w.player, b = w.boss, A = w.arena, L = w.level, D = L.def, i, e, c = w.currency;
    var cx = p.x, cy = p.y - p.h / 2, nd = 1e18, ndx = 9999, ndy = 9999, inMelee = 0, mb = meleeBox(p, {}), alive = 0;
    for (i = 0; i < w.enemies.length; i++) {
      e = w.enemies[i];
      if (!e.alive) continue;
      alive++;
      var dx = e.x - cx, dy = (e.y - e.h / 2) - cy;
      if (dx * dx + dy * dy < nd) { nd = dx * dx + dy * dy; ndx = dx; ndy = dy; }
      if (Phys.overlap(mb.x, mb.y, mb.w, mb.h, e.x - e.w / 2, e.y - e.h, e.w, e.h)) inMelee = 1;
    }
    if (b.alive && b.st !== 'defeated' && Phys.overlap(mb.x, mb.y, mb.w, mb.h, b.x - b.w / 2, b.y - b.h, b.w, b.h)) inMelee = 1;
    var t = threat(w), cp = 0;
    for (i = 0; i < w.checkpoints.length; i++) if (w.checkpoints[i].alive && w.checkpoints[i].active) cp = w.checkpoints[i].x;
    var mode = w.state === 'pause' ? w.pausedMode : w.mode, H = w.hideout, wp = w.run.weapon, tierSum = 0;
    for (i = 0; i < wp.count; i++) tierSum += wp.affixes[i].tier;
    var inHideout = w.state !== 'title' && mode === 'hideout';
    var bossLive = b.alive && b.st !== 'defeated';
    var V = Render.view || { x: 0, y: 0, scale: 1 }, S = Render.stats || { barsLive: 0 };
    return {
      state: w.state, mode: mode, modeId: MODE_ID[mode], result: RESULT_ID[w.result] || 0, paused: w.state === 'pause' ? 1 : 0,
      tick: w.tick, level: w.levelIndex + 1,
      hp: Math.round(p.hp * 10) / 10, hpMax: p.hpMax, composure: Math.round(p.composure * 10) / 10, composureMax: p.composureMax,
      flustered: p.flustered > 0 ? 1 : 0, flusteredT: Math.max(0, p.flustered), charmsTaken: w.charmsTaken, charmsEscaped: w.charmsEscaped,
      layers: p.layers, layerMask: p.layerMask, resist: 25 * p.layers, uncapped: p.layers === 0 ? 1 : 0,
      flaskCharges: p.flask, flaskMax: p.flaskMax, iframes: Math.max(0, p.iframes),
      x: p.x, y: p.y, vx: p.vx, vy: p.vy, onGround: p.onGround ? 1 : 0, facing: p.facing, rollCd: p.rollCd, sparkCd: p.sparkCd,
      camX: Math.floor(w.cam.x), camY: Math.floor(w.cam.y),
      arena: A.index + 1, arenaLocked: A.locked || w.bossRoom ? 1 : 0, arenaX0: w.cam.lockX0, arenaX1: w.cam.lockX1,
      wave: A.locked ? A.wave : 0, wavesInArena: A.index >= 0 ? A.waves : 0, enemiesAlive: alive,
      nearestEnemyDx: Math.round(ndx), nearestEnemyDy: Math.round(ndy), nearestEnemyInMelee: inMelee,
      threatKind: t.kind, threatDx: Math.round(t.dx), threatDy: Math.round(t.dy), threatEta: Math.round(t.eta * 1000) / 1000,
      pitAheadDx: Math.round(Phys.pitAhead(L, p.x, p.y, p.facing)), stepAheadDx: Math.round(Phys.stepAhead(L, p.x, p.y, p.facing)),
      checkpointX: cp || w.respawnX, bossDoorX: D ? D.bossDoorAt * CFG.TILE : 0, levelWidth: L.w,
      bossAlive: bossLive ? 1 : 0, bossHp: bossLive ? b.hp : 0, bossHpMax: bossLive ? b.hpMax : 0, bossPhase: bossLive ? b.phase : 0,
      bossAttack: bossLive ? b.attack : 0, bossTell: bossLive && b.st === 'windup' ? b.tell : 0, bossDx: bossLive ? Math.round(b.x - cx) : 0,
      currency: c.chaos * CFG.VALUE.chaos + c.exalt * CFG.VALUE.exalt + c.vaal * CFG.VALUE.vaal + c.divine * CFG.VALUE.divine + c.tailor * CFG.VALUE.tailor,
      chaos: c.chaos, exalt: c.exalt, vaal: c.vaal, divine: c.divine, tailor: c.tailor, mirror: 0,
      currencyValue: w.currencyValue, secondsSinceExalt: Math.round(w.secondsSinceExalt * 10) / 10,
      portals: w.portals, deaths: w.deaths, bossesKilled: w.bossesKilled,
      levelTime: Math.round(w.levelTime * 100) / 100, runTime: Math.round(w.runTime * 100) / 100, score: w.score,
      cardsOffered: inHideout ? 3 : 0, card1: inHideout ? H.cards[0] : 0, card2: inHideout ? H.cards[1] : 0, card3: inHideout ? H.cards[2] : 0,
      cardPicked: inHideout ? H.picked : 0,
      weaponAffixes: wp.count, weaponTierSum: tierSum, weaponCorrupted: wp.corrupted, lastCraft: H.lastCraft, mirrorClicks: H.mirrorClicks,
      barsLive: S.barsLive || 0, viewX: V.x, viewY: V.y, viewScale: V.scale,
      combo: p.atkT > 0 ? p.combo + 1 : 0,
      fps: perf.fps, worstMs: Math.round(perf.worstMs * 10) / 10
    };
  }

  var api = {
    start: function (level) { start(level); },
    get state() { return world ? world.state : 'title'; },
    get score() { return world ? world.score : 0; },
    perf: perf,
    probe: probe,
    advance: advance,
    get seed() { return RNG.seedValue; }
  };
  window.__game = api;

  return { boot: boot, step: step, probe: probe, get world() { return world; } };
})();

Game.boot();
