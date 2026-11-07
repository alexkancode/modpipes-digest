// FLIES: firefly pool, spawn rules (tame #1, teaching #2/#3, normal, golden), wander/shy motion, life.
var FLIES = (function () {
  var C = CONFIG, EPS = C.EPS, TAU = Math.PI * 2;
  var SNAP_RANGE = C.REACH + C.FLY_HIT;
  // Spawn bookkeeping for the current run.
  var S = { started: false, tameDone: false, teachLeft: 0, normalT: 0, goldT: 0, lastCount: 0, nextId: 0 };
  // Result of the last point search.
  var pt = { x: 0, y: 0 };

  function reset(w) {
    for (var i = 0; i < w.flies.length; i++) {
      var fl = w.flies[i];
      fl.active = false; fl.id = -1; fl.state = 'alive';
    }
    S.started = false; S.tameDone = false; S.teachLeft = C.TEACH_N;
    S.normalT = C.SPAWN_T; S.goldT = C.GOLD_FIRST; S.lastCount = 0; S.nextId = 0;
    w.flyCount = 0; w.goldenAlive = 0;
  }

  function freeSlot(w) {
    for (var i = 0; i < w.flies.length; i++) {
      if (!w.flies[i].active && i !== w.frog.carryFly) return i;
    }
    return -1;
  }

  function activate(w, slot, x, y, golden, tame) {
    var fl = w.flies[slot];
    fl.active = true; fl.id = S.nextId++;
    fl.x = fl.px = x; fl.y = fl.py = y;
    fl.heading = RNG.range(0, TAU); fl.blink = RNG.next();
    fl.golden = golden; fl.tame = tame;
    fl.life = tame ? Infinity : golden ? C.GOLD_LIFE : C.FLY_LIFE;
    fl.state = 'alive'; fl.fadeT = 0;
    EVENTS.emit('spawn', x, y, golden ? 1 : 0, tame ? 1 : 0);
  }

  // Open water: inside R - 12, at least 120 from the frog, clear of every pad by r + 4.
  function validPoint(w, x, y) {
    var f = w.frog, dx = x - f.x, dy = y - f.y, lim = w.ice.R - C.SPAWN_EDGE;
    if (dx * dx + dy * dy < C.SPAWN_EXCL * C.SPAWN_EXCL) return false;
    dx = x - C.CX; dy = y - C.CY;
    if (dx * dx + dy * dy > lim * lim) return false;
    for (var i = 0; i < w.padCount; i++) {
      var p = w.pads[i], rr = p.r + C.SPAWN_PAD_CLEAR;
      dx = x - p.x; dy = y - p.y;
      if (dx * dx + dy * dy < rr * rr) return false;
    }
    return true;
  }

  // Uniform disc search. farthest: when every try fails, keep the try farthest from the frog,
  // provided it still clears the 120 px exclusion (GDD acceptance 6 wins over the fallback).
  function findOpenWater(w, farthest) {
    var f = w.frog, rad = Math.max(0, w.ice.R - C.SPAWN_EDGE), bestD = -1;
    for (var k = 0; k < C.SPAWN_TRIES; k++) {
      var rho = rad * Math.sqrt(RNG.next()), th = RNG.range(0, TAU);
      var x = C.CX + rho * Math.cos(th), y = C.CY + rho * Math.sin(th);
      if (validPoint(w, x, y)) { pt.x = x; pt.y = y; return true; }
      var dx = x - f.x, dy = y - f.y, d = dx * dx + dy * dy;
      if (farthest && d > bestD) { bestD = d; pt.x = x; pt.y = y; }
    }
    return farthest && bestD >= C.SPAWN_EXCL * C.SPAWN_EXCL;
  }

  // Teaching spawn: 130-200 px from the frog, within 20 degrees of the bearing to a random in-range pad.
  function findTeachingPoint(w) {
    var f = w.frog, n = 0, i;
    for (i = 0; i < w.padCount; i++) if (w.pads[i].inRange) n++;
    if (n === 0) return false;
    var pick = RNG.int(n), p = null;
    for (i = 0; i < w.padCount; i++) if (w.pads[i].inRange && pick-- === 0) { p = w.pads[i]; break; }
    var bearing = Math.atan2(p.y - f.y, p.x - f.x);
    for (var k = 0; k < C.SPAWN_TRIES; k++) {
      var d = RNG.range(C.TEACH_D_MIN, C.TEACH_D_MAX);
      var a = bearing + RNG.range(-C.TEACH_CONE, C.TEACH_CONE);
      var x = f.x + d * Math.cos(a), y = f.y + d * Math.sin(a);
      if (validPoint(w, x, y)) { pt.x = x; pt.y = y; return true; }
    }
    return false;
  }

  function spawnNormal(w) {
    var slot = freeSlot(w);
    if (slot < 0) return;
    var teach = S.teachLeft > 0;
    if (teach) S.teachLeft--;
    if ((teach && findTeachingPoint(w)) || findOpenWater(w, false)) activate(w, slot, pt.x, pt.y, false, false);
  }

  function spawnGolden(w) {
    var slot = freeSlot(w);
    if (slot >= 0 && findOpenWater(w, true)) activate(w, slot, pt.x, pt.y, true, false);
  }

  function spawnTame(w) {
    var slot = freeSlot(w), p = w.pads[0], a = RNG.range(0, TAU);
    if (slot >= 0) activate(w, slot, p.x + C.TAME_D * Math.cos(a), p.y + C.TAME_D * Math.sin(a), false, true);
  }

  function count(w) {
    var n = 0, g = 0;
    for (var i = 0; i < w.flies.length; i++) {
      var fl = w.flies[i];
      if (!fl.active || fl.state === 'expired') continue;
      if (fl.golden) g++; else n++;
    }
    w.flyCount = n; w.goldenAlive = g;
    return n;
  }

  function moveFly(w, fl, dt) {
    var f = w.frog, sp = fl.golden ? C.GOLD_SPEED : C.FLY_SPEED;
    fl.heading += RNG.range(-C.FLY_TURN, C.FLY_TURN) * dt;
    var vx = Math.cos(fl.heading) * sp, vy = Math.sin(fl.heading) * sp;
    var dx = fl.x - f.x, dy = fl.y - f.y, d2 = dx * dx + dy * dy;
    if (fl.tame) {                       // leashed: it never wanders out of the first snap's reach
      if (d2 > C.TAME_LEASH * C.TAME_LEASH) fl.heading = Math.atan2(-dy, -dx);
    } else if (w.caught >= C.SHY_AFTER) { // first-timers' first catches don't flee
      if (d2 < C.SHY_R * C.SHY_R && d2 > 0) {
        var d = Math.sqrt(d2);
        vx += dx / d * sp; vy += dy / d * sp;
      }
    }
    fl.x += vx * dt; fl.y += vy * dt;
    var ox = fl.x - C.CX, oy = fl.y - C.CY, od = Math.sqrt(ox * ox + oy * oy);
    var lim = Math.max(0, w.ice.R - C.FLY_EDGE);
    if (od > lim && od > 0) {
      var nx = ox / od, ny = oy / od, hx = Math.cos(fl.heading), hy = Math.sin(fl.heading);
      fl.x = C.CX + nx * lim; fl.y = C.CY + ny * lim;
      var dot = hx * nx + hy * ny;
      if (dot > 0) fl.heading = Math.atan2(hy - 2 * dot * ny, hx - 2 * dot * nx);
    }
  }

  function age(fl, dt) {
    fl.life -= dt;
    if (fl.life <= (fl.golden ? C.GOLD_BLINK : C.FLY_BLINK)) fl.state = 'blinking';
    if (fl.life <= EPS) {
      fl.state = 'expired'; fl.fadeT = C.FADE_T;
      EVENTS.emit('expire', fl.x, fl.y, fl.golden ? 1 : 0, 0);
    }
  }

  function update(w, dt) {
    for (var i = 0; i < w.flies.length; i++) {
      var fl = w.flies[i];
      if (!fl.active) continue;
      if (fl.state === 'expired') {
        fl.fadeT -= dt;
        if (fl.fadeT <= EPS) { fl.active = false; fl.id = -1; }
        continue;
      }
      moveFly(w, fl, dt);
      age(fl, dt);
    }

    if (!S.tameDone && w.t >= C.TAME_T - EPS) { S.tameDone = true; spawnTame(w); }

    var n = count(w);
    if (!S.started && (w.caught > 0 || w.t >= C.SPAWN_START - EPS)) { S.started = true; S.lastCount = 1; }
    if (S.started) {
      S.normalT -= dt;
      if (n === 0 && S.lastCount > 0) { spawnNormal(w); S.normalT = C.SPAWN_T; }
      else if (S.normalT <= EPS) { if (n < C.MAX_FLIES) spawnNormal(w); S.normalT = C.SPAWN_T; }
    }

    S.goldT -= dt;
    if (S.goldT <= EPS) {
      if (w.goldenAlive === 0) spawnGolden(w);
      S.goldT = RNG.range(C.GOLD_MIN, C.GOLD_MAX);
    }
    S.lastCount = count(w);
  }

  function kill(w, slot, why) {
    var fl = w.flies[slot];
    if (why === 'expired') { fl.life = 0; fl.state = 'expired'; fl.fadeT = C.FADE_T; }
    else { fl.active = false; fl.id = -1; }
    count(w);
  }

  // Nearest active, non-expired fly in snap reach (golden first), as a slot, or -1.
  function nearestInReach(w) {
    var f = w.frog, best = -1, bestD = SNAP_RANGE * SNAP_RANGE, gold = -1, goldD = bestD;
    for (var i = 0; i < w.flies.length; i++) {
      var fl = w.flies[i];
      if (!fl.active || fl.state === 'expired') continue;
      var dx = fl.x - f.x, dy = fl.y - f.y, d = dx * dx + dy * dy;
      if (d <= bestD) { best = i; bestD = d; }
      if (fl.golden && d <= goldD) { gold = i; goldD = d; }
    }
    return gold >= 0 ? gold : best;
  }

  function slotOf(w, id) {
    if (id < 0) return -1;
    for (var i = 0; i < w.flies.length; i++) if (w.flies[i].active && w.flies[i].id === id) return i;
    return -1;
  }

  return { reset: reset, update: update, kill: kill, nearestInReach: nearestInReach, slotOf: slotOf };
})();
