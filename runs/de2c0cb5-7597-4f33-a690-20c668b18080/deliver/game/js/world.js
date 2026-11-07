// World: the shared world object (tech plan §13.3), its pools, spawners and the level build.
// Every pooled object is allocated once in create(); spawners reuse the first dead slot.
// Anchors: player, enemies, boss, gags and checkpoints are feet (x centre, y bottom); projectiles and
// pickups are centres; hazards are top-left rects, except ring and nova whose x, y is the centre on the ground.
var World = (function () {
  var T = CFG.TILE;

  function pool(n, make) { var a = new Array(n); for (var i = 0; i < n; i++) a[i] = make(); return a; }
  function firstDead(a) { for (var i = 0; i < a.length; i++) if (!a[i].alive) return a[i]; return null; }
  function killAll(a) { for (var i = 0; i < a.length; i++) a[i].alive = false; }

  function mkEnemy() {
    return { alive: false, kind: 'grunt', x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, w: 20, h: 40, facing: -1, hp: 0, hpMax: 0,
      st: 'idle', stT: 0, attack: '', charming: 0, flash: 0, name: '', onGround: false, hitWall: 0, floor: 0,
      cd: 0, lineCd: 0, charmCd: 0, hitstunCd: 0, hitBy: -1, arena: -1, first: 0, wink: 0, shots: 0, didHit: 0, dmgMul: 1 };
  }
  function mkProjectile() {
    return { alive: false, kind: 'spark', x: 0, y: 0, vx: 0, vy: 0, w: 8, h: 8, t: 0, element: 0, friendly: 0,
      dmg: 0, life: 0, bx: 0, by: 0, grav: 0, hits: 0, lastHit: null, src: null, srcKind: '', srcName: '' };
  }
  function mkPickup() { return { alive: false, kind: 'chaos', x: 0, y: 0, vx: 0, vy: 0, w: 12, h: 12, st: 'dropping', t: 0, onGround: false, hitWall: 0, floor: 0 }; }
  function mkHazard() { return { alive: false, kind: 'plate', x: 0, y: 0, w: 32, h: 8, st: 'armed', t: 0, r: 0, dmg: 0, life: 0, tell: 0, hitDone: 0, element: 0, src: '' }; }

  function create() {
    var P = CFG.POOL;
    return {
      state: 'title', mode: 'level', pausedMode: 'level', result: '', tick: 0, loading: 1,
      levelIndex: 0, levelSerial: 0, hitstop: 0,
      level: { cols: 1, rows: CFG.ROWS, w: T, h: CFG.ROWS * T, tiles: new Uint8Array(CFG.ROWS), ground: new Int8Array(1),
        slippery: false, tint: 0, name: '', subtitle: '', def: null },
      cam: { x: 0, y: CFG.CAM_Y, px: 0, py: CFG.CAM_Y, lockX0: 0, lockX1: CFG.W },
      player: {
        x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, w: CFG.PLAYER.w, h: CFG.PLAYER.h, facing: 1, onGround: false, hitWall: 0, floor: 0,
        anim: 'idle', animT: 0, hp: 80, hpMax: 100, composure: 100, composureMax: 100, layers: 3, layerMask: 7,
        flask: 2, flaskMax: 3, flaskT: 0, iframes: 0, flustered: 0, rollT: 0, rollCd: 0, sparkCd: 0, flash: 0, tabulaT: 0, hat: 0,
        // logic-only
        rollDir: 1, airRoll: false, coyote: 0, jumpBuf: 0, jumpCut: false, atkT: 0, combo: 0, queued: false, swingId: 0,
        castT: 0, hurtT: 0, sinceCharm: 99, acidT: 0, lastSafeX: 0, lastSafeY: 0, flaskKills: 0, wasGround: false,
        charmSrc: null, mods: {}
      },
      enemies: pool(P.enemies, mkEnemy),
      boss: { alive: false, id: 'hillock', x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, w: 64, h: 88, facing: -1, hp: 0, hpMax: 0,
        st: 'intro', stT: 0, attack: 0, tell: 0, phase: 1, charming: 0, flash: 0, name: '', title: '',
        onGround: false, hitWall: 0, floor: 0, hitBy: -1, charmCd: 0, idleT: 1, didHit: 0, count: 0, turn: 0, extraT: 0, baseY: 0, feasts: 0, phaseT: 0 },
      projectiles: pool(P.projectiles, mkProjectile),
      pickups: pool(P.pickups, mkPickup),
      hazards: pool(P.hazards, mkHazard),
      gags: pool(P.gags, function () { return { alive: false, id: 0, x: 0, y: 0, triggered: 0, near: 0 }; }),
      glyphs: pool(P.glyphs, function () { return { alive: false, x: 0, y: 0, text: '' }; }),
      checkpoints: pool(P.checkpoints, function () { return { alive: false, x: 0, active: 0 }; }),
      gates: pool(P.gates, function () { return { alive: false, x0: 0, x1: 0, st: 'open' }; }),
      bubbles: pool(P.bubbles, function () { return { alive: false, text: '', ownerKind: 'world', ownerIdx: 0, x: 0, y: 0, t: 0, hold: 0 }; }),
      obscure: pool(P.obscure, function () { return { alive: false, y: 0, t: 0 }; }),
      banner: { text: '', sub: '', t: 0 },
      popup: { text: '', t: 0 },
      flashRule3: 0,
      currency: { chaos: 0, exalt: 0, vaal: 0, divine: 0, tailor: 0, mirror: 0 },
      currencyValue: 0, score: 0, bossesKilled: 0, portals: CFG.PORTALS, deaths: 0, charmsTaken: 0, charmsEscaped: 0,
      levelTime: 0, runTime: 0, secondsSinceExalt: 0, levelCharms: 0, oohT: 0, lastDamageSrc: '', lastDamageName: '',
      run: { levelTimes: [0, 0, 0, 0, 0], timeBonus: 0, flawlessWaves: 0, cappedSeconds: 0, levelReached: 1,
        weapon: { affixes: [{ id: 0, tier: 0 }, { id: 0, tier: 0 }, { id: 0, tier: 0 }], count: 0, corrupted: 0 },
        patches: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
      hideout: { cards: [0, 0, 0], picked: 0, focus: CFG.HIDEOUT_FOCUS_CONTINUE, msg: '', msgT: 0, whisper: '', whisperT: 0,
        nextWhisper: 0, lastCraft: 0, mirrorClicks: 0 },
      deathPost: { t: 0, title: '', upvotes: 0, comment1: '', comment2: '', cause: '', tip: '', line: '' },
      deathT: 0, deathPosted: 0, deathPrevMode: 'level', defeatT: 0,
      cutscene: { t: 0, line1: '', line2: '', line3: '', final: 0, loaded: 0, slammed: 0 },
      over: { title: '', line: '', pbLevel: 0, stash: 0, banked: 0, t: 0, charmsEscaped: 0, flawlessWaves: 0, cappedSeconds: 0, score: 0, runTime: 0 },
      arena: { index: -1, wave: 0, waves: 0, locked: 0, spawnIdx: 0, spawnT: 0, edge: 0, nextT: 0, hurt: 0, done: new Uint8Array(8), x0: 0, x1: 0 },
      bossRoom: 0,
      stash: 0,
      settings: { shake: 1 },
      pauseFocus: 0,
      touchUI: 0,
      respawnX: CFG.START_X
    };
  }

  // Fresh run at `level` (1-5): default stats, reseeded gameplay stream.
  function newRun(w, level) {
    RNG.seed(RNG.seedValue);
    var p = w.player, c = w.currency, r = w.run, k;
    p.hp = CFG.PLAYER.hpStart; p.hpMax = CFG.PLAYER.hpMax; p.layers = 3; p.layerMask = 7;
    p.flask = CFG.FLASK.start; p.flaskMax = CFG.FLASK.max; p.flaskKills = 0;
    p.composureMax = CFG.COMPOSURE.max + (w.stash >= CFG.STASH.composure ? CFG.COMPOSURE.stashBonus : 0);
    p.composure = p.composureMax;
    c.chaos = c.exalt = c.vaal = c.divine = c.tailor = c.mirror = 0;
    w.currencyValue = 0; w.score = 0; w.bossesKilled = 0; w.deaths = 0; w.charmsTaken = 0; w.charmsEscaped = 0;
    w.levelTime = 0; w.runTime = 0; w.secondsSinceExalt = 0; w.tick = 0; w.result = ''; w.hitstop = 0; w.oohT = 0;
    for (k = 0; k < 5; k++) r.levelTimes[k] = 0;
    r.timeBonus = 0; r.flawlessWaves = 0; r.cappedSeconds = 0; r.levelReached = level;
    r.weapon.count = 0; r.weapon.corrupted = 0;
    for (k = 0; k < 3; k++) { r.weapon.affixes[k].id = 0; r.weapon.affixes[k].tier = 0; }
    for (k = 0; k < 9; k++) r.patches[k] = 0;
    w.hideout.mirrorClicks = 0; w.hideout.lastCraft = 0;
    w.deathPost.t = 0; w.cutscene.t = 0; w.flashRule3 = 0; w.popup.t = 0; w.banner.t = 0;
  }

  function groundRowAt(w, col) {
    var L = w.level;
    if (col < 0) col = 0;
    if (col >= L.cols) col = L.cols - 1;
    return L.ground[col];
  }
  // Feet y of the walkable surface at world x (the default ground if over a pit).
  function groundY(w, x) {
    var r = groundRowAt(w, Math.floor(x / T));
    return (r < 0 ? CFG.GROUND_ROW : r) * T;
  }

  function loadLevel(w, idx) {
    var D = LEVELS[idx], cols = D.cols, rows = CFG.ROWS, L = w.level;
    var tiles = new Uint8Array(cols * rows), ground = new Int8Array(cols);
    var g = CFG.GROUND_ROW, c = 0, i, j, n, s, ty, code = D.slippery ? 4 : 1;
    var plates = [];

    function fill(col, top, k) { for (ty = top; ty < rows; ty++) tiles[ty * cols + col] = k; }
    for (i = 0; i < D.segments.length; i++) {
      s = D.segments[i]; n = s[1];
      if (s[0] === 'step') g += s[2];
      for (j = 0; j < n; j++, c++) {
        switch (s[0]) {
          case 'gap': ground[c] = -1; break;
          case 'acid': ground[c] = g + 1; fill(c, g + 2, 1); tiles[(g + 1) * cols + c] = 3; break;
          default: ground[c] = g; fill(c, g, code);
        }
        if (s[0] === 'plates' && j % 3 === 1 && j + 1 < n) plates.push(c);
      }
    }
    for (i = 0; i < D.plats.length; i++) {
      s = D.plats[i];
      for (j = 0; j < s.len; j++) tiles[s.row * cols + s.at + j] = 2;
    }

    L.cols = cols; L.rows = rows; L.w = cols * T; L.h = rows * T; L.tiles = tiles; L.ground = ground;
    L.slippery = D.slippery; L.tint = idx; L.name = TEXT.levels[idx].name; L.subtitle = TEXT.levels[idx].subtitle; L.def = D;
    w.levelIndex = idx;
    w.run.levelReached = Math.max(w.run.levelReached, idx + 1);

    killAll(w.enemies); killAll(w.projectiles); killAll(w.pickups); killAll(w.hazards); killAll(w.gags);
    killAll(w.glyphs); killAll(w.checkpoints); killAll(w.gates); killAll(w.bubbles); killAll(w.obscure);
    w.boss.alive = false; w.bossRoom = 0; w.defeatT = 0;

    for (i = 0; i < plates.length; i++) {
      var hz = spawnHazard(w, 'plate', plates[i] * T, ground[plates[i]] * T - CFG.PLATE.h, CFG.PLATE.w, CFG.PLATE.h);
      if (hz) hz.t = (i * 0.5) % (CFG.PLATE.armed + CFG.PLATE.tell + CFG.PLATE.active);
    }
    for (i = 0; i < D.path.length; i++) {
      s = D.path[i];
      var e = spawnEnemy(w, s.kind, s.at * T + T / 2, s.row ? s.row * T : groundY(w, s.at * T));
      if (e) { e.first = s.first; e.wink = s.wink; }
    }
    for (i = 0; i < D.gags.length; i++) {
      var gg = firstDead(w.gags);
      if (!gg) break;
      gg.alive = true; gg.id = TEXT.gagIndex[D.gags[i].id]; gg.x = D.gags[i].at * T + T / 2; gg.y = groundY(w, gg.x);
      gg.triggered = 0; gg.near = 0;
    }
    for (i = 0; i < D.glyphs.length && i < w.glyphs.length; i++) {
      var gl = w.glyphs[i];
      gl.alive = true; gl.x = D.glyphs[i].at * T; gl.y = groundY(w, gl.x) - 4; gl.text = TEXT.glyphs[D.glyphs[i].text];
    }
    for (i = 0; i < D.pickups.length; i++) {
      s = D.pickups[i];
      var px = s.at * T + T / 2, pk = spawnPickup(w, s.kind, px, (s.row ? s.row * T : groundY(w, px)) - CFG.LOOT.h / 2);
      if (pk) { pk.st = 'resting'; pk.vx = 0; pk.vy = 0; }
    }
    var cps = 0;
    for (i = 0; i < D.arenas.length; i++) {
      w.checkpoints[cps].alive = true; w.checkpoints[cps].x = D.arenas[i].at * T + 24; w.checkpoints[cps].active = 0; cps++;
      var gt = w.gates[i];
      gt.alive = true; gt.x0 = D.arenas[i].at * T; gt.x1 = gt.x0 + CFG.ARENA_COLS * T; gt.st = 'open';
    }
    w.checkpoints[cps].alive = true; w.checkpoints[cps].x = D.bossDoorAt * T + 24; w.checkpoints[cps].active = 0;
    var bg = w.gates[D.arenas.length];
    bg.alive = true; bg.x0 = D.bossDoorAt * T; bg.x1 = L.w; bg.st = 'open';

    var A = w.arena;
    A.index = -1; A.wave = 0; A.waves = 0; A.locked = 0; A.spawnIdx = 0; A.spawnT = 0; A.nextT = 0; A.hurt = 0;
    for (i = 0; i < A.done.length; i++) A.done[i] = 0;

    w.respawnX = CFG.START_X;
    w.cam.lockX0 = 0; w.cam.lockX1 = L.w;
    w.cam.x = w.cam.px = 0; w.cam.y = w.cam.py = CFG.CAM_Y;
    w.levelSerial++;
    Render.levelLoaded(w);
  }

  function spawnEnemy(w, kind, x, y) {
    var e = firstDead(w.enemies), E = CFG.ENEMY[kind], li = w.levelIndex;
    if (!e) return null;
    e.alive = true; e.kind = kind; e.x = e.px = x; e.y = e.py = y; e.vx = 0; e.vy = 0; e.w = E.w; e.h = E.h;
    e.hp = e.hpMax = Math.round(E.hp * CFG.LEVEL_MULT.hp[li]); e.dmgMul = CFG.LEVEL_MULT.dmg[li];
    e.facing = -1; e.st = 'idle'; e.stT = 0; e.attack = ''; e.charming = 0; e.flash = 0;
    e.name = TEXT.levels[li].foes[kind]; e.cd = 0.6; e.lineCd = 1.5; e.charmCd = 0; e.hitstunCd = 0; e.hitBy = -1;
    e.arena = -1; e.first = 0; e.wink = 0; e.shots = 0; e.didHit = 0; e.onGround = false;
    return e;
  }

  function spawnProjectile(w, kind, x, y, vx, vy, element, friendly) {
    var p = firstDead(w.projectiles);
    if (!p) return null;
    p.alive = true; p.kind = kind; p.x = p.bx = x; p.y = p.by = y; p.vx = vx; p.vy = vy; p.t = 0;
    p.element = element; p.friendly = friendly ? 1 : 0; p.dmg = 0; p.life = 3; p.grav = 0; p.hits = 0; p.lastHit = null; p.src = null; p.srcKind = ''; p.srcName = '';
    p.w = 10; p.h = 10;
    return p;
  }

  function spawnPickup(w, kind, x, y) {
    var p = firstDead(w.pickups), L = CFG.LOOT;
    if (!p) return null;
    p.alive = true; p.kind = kind; p.x = x; p.y = y; p.vx = 0; p.vy = L.dropVy; p.st = 'dropping'; p.t = 0;
    p.w = L.w; p.h = L.h; p.onGround = false;
    return p;
  }

  function spawnHazard(w, kind, x, y, wPx, hPx) {
    var h = firstDead(w.hazards);
    if (!h) return null;
    h.alive = true; h.kind = kind; h.x = x; h.y = y; h.w = wPx; h.h = hPx; h.st = kind === 'acid' ? 'active' : 'armed';
    h.t = 0; h.r = 0; h.dmg = 0; h.life = 0; h.tell = 0; h.hitDone = 0; h.element = 0; h.src = '';
    return h;
  }

  // Speech bubble. A new line from the same owner replaces the old one.
  // delay (s) holds the bubble back: t starts negative and the HUD shows it from t = 0.
  function say(w, ownerKind, ownerIdx, text, hold, delay) {
    var b = null, i, B = w.bubbles;
    for (i = 0; i < B.length; i++) if (B[i].alive && B[i].ownerKind === ownerKind && B[i].ownerIdx === ownerIdx) { b = B[i]; break; }
    if (!b) b = firstDead(B);
    if (!b) { b = B[0]; for (i = 1; i < B.length; i++) if (B[i].t > b.t) b = B[i]; }
    b.alive = true; b.text = text; b.ownerKind = ownerKind; b.ownerIdx = ownerIdx; b.t = -(delay || 0);
    b.hold = hold || CFG.BUBBLE_HOLD;
    b.x = 0; b.y = 0;
    Render.sound('speech');
  }

  return { create: create, newRun: newRun, loadLevel: loadLevel, spawnEnemy: spawnEnemy, spawnProjectile: spawnProjectile,
    spawnPickup: spawnPickup, spawnHazard: spawnHazard, say: say, groundY: groundY, killAll: killAll };
})();
