// Flow: level progression. Arenas and waves, checkpoints, gags, the boss door, death → post → respawn,
// boss defeat → loot → cutscene → hideout / over, timers, camera and score (tech plan §5.3).
var Flow = (function () {
  var T = CFG.TILE, KIND = { g: 'grunt', c: 'caster', e: 'elite' };
  var VALUE_KEYS = ['chaos', 'exalt', 'vaal', 'divine', 'tailor'];

  function lock(w, x0, x1) { w.cam.lockX0 = x0; w.cam.lockX1 = x1; }
  function unlock(w) { lock(w, 0, w.level.w); }
  function store(key, v) { try { localStorage.setItem(key, String(v)); } catch (e) { /* storage blocked */ } }
  function load(key) { try { return parseInt(localStorage.getItem(key), 10) || 0; } catch (e) { return 0; } }

  function snapCamera(w) {
    var c = w.cam;
    c.x = c.px = Math.max(c.lockX0, Math.min(c.lockX1 - CFG.W, w.player.x - CFG.CAM_OFFSET));
    c.y = c.py = CFG.CAM_Y;
  }
  function camera(w) {
    var c = w.cam, p = w.player;
    var target = Math.max(c.lockX0, Math.min(Math.max(c.lockX0, c.lockX1 - CFG.W), p.x - CFG.CAM_OFFSET + p.facing * CFG.CAM_LEAD));
    c.x += (target - c.x) * CFG.CAM_LERP;
    c.x = Math.max(0, Math.min(w.level.w - CFG.W, c.x));
    c.y = CFG.CAM_Y;
  }

  // Begins play of the loaded level: start() after loadLevel, and hideout Continue (the cutscene preloads it).
  function nextLevel(w) {
    var li = w.levelIndex;
    w.mode = 'level'; w.levelTime = 0; w.levelCharms = 0; w.bossRoom = 0; w.defeatT = 0;
    w.respawnX = CFG.START_X;
    Player.reset(w);
    w.portals = CFG.PORTALS + w.player.mods.portals;
    w.banner.text = TEXT.levels[li].banner; w.banner.sub = TEXT.levels[li].subtitle; w.banner.t = CFG.BANNER_T;
    unlock(w); snapCamera(w);
    Render.sound('level_banner');
  }

  // ---------- timers shared by every play mode ----------
  function bubbleAnchor(w, b) {
    var o = null;
    switch (b.ownerKind) {
      case 'player': o = w.player; break;
      case 'enemy': o = w.enemies[b.ownerIdx]; if (!o.alive) o = null; break;
      case 'boss': o = w.boss.alive ? w.boss : null; break;
      default: o = w.gags[b.ownerIdx]; b.x = o.x; b.y = o.y - 44; return;
    }
    if (o) { b.x = o.x; b.y = o.y - o.h - 8; }
  }
  function timers(w, dt) {
    var i, b, o;
    if (w.banner.t > 0) w.banner.t -= dt;
    if (w.popup.t > 0) w.popup.t -= dt;
    if (w.flashRule3 > 0) w.flashRule3 -= dt;
    if (w.oohT > 0) w.oohT -= dt;
    for (i = 0; i < w.bubbles.length; i++) {
      b = w.bubbles[i];
      if (!b.alive) continue;
      b.t += dt; bubbleAnchor(w, b);
      if (b.t > b.hold + 0.3) b.alive = false;
    }
    for (i = 0; i < w.obscure.length; i++) { o = w.obscure[i]; if (o.alive && (o.t -= dt) <= 0) o.alive = false; }
  }

  // ---------- pickups ----------
  function pickups(w, dt) {
    var p = w.player, L = CFG.LOOT, i, k, dx, dy, d, row, r2 = L.magnetR * L.magnetR;
    for (i = 0; i < w.pickups.length; i++) {
      k = w.pickups[i];
      if (!k.alive) continue;
      k.t += dt;
      dx = p.x - k.x; dy = (p.y - p.h / 2) - k.y; d = dx * dx + dy * dy;
      if (k.st !== 'dropping' && (d < r2 || w.defeatT > 0)) k.st = 'magnet';
      if (k.st === 'magnet') {
        d = Math.sqrt(d) || 1;
        k.x += dx / d * L.magnetSpeed * dt; k.y += dy / d * L.magnetSpeed * dt;
      } else if (k.st === 'dropping') {
        k.vy += L.gravity * dt; k.x += k.vx * dt; k.y += k.vy * dt;
        k.x = Math.max(8, Math.min(w.level.w - 8, k.x));
        row = w.level.ground[Math.max(0, Math.min(w.level.cols - 1, Math.floor(k.x / T)))];
        if (row >= 0 && k.vy > 0 && k.y + k.h / 2 >= row * T && k.y + k.h / 2 <= row * T + 24) { k.y = row * T - k.h / 2; k.vy = 0; k.vx = 0; k.st = 'resting'; }
        if (k.y > w.level.h + 16) { k.alive = false; continue; }
      }
      if (Phys.overlap(p.x - p.w / 2, p.y - p.h, p.w, p.h, k.x - k.w / 2, k.y - k.h / 2, k.w, k.h)) Combat.collect(w, k);
    }
  }

  // ---------- arenas and waves ----------
  function arenaAlive(w, idx) {
    for (var i = 0; i < w.enemies.length; i++) if (w.enemies[i].alive && w.enemies[i].arena === idx) return true;
    return false;
  }
  function enterArena(w, i) {
    var A = w.arena, ar = w.level.def.arenas[i];
    A.index = i; A.wave = 1; A.waves = ar.waves.length; A.locked = 1; A.spawnIdx = 0; A.spawnT = 0.4; A.edge = 1; A.hurt = 0;
    A.x0 = ar.at * T; A.x1 = A.x0 + CFG.ARENA_COLS * T;
    lock(w, A.x0, A.x1);
    w.gates[i].st = 'locked';
    Render.sound('gate_lock');
  }
  function spawnGroup(w) {
    var A = w.arena, str = w.level.def.arenas[A.index].waves[A.wave - 1], n = 0, x, e;
    x = A.edge ? A.x1 - 20 : A.x0 + 20;
    while (n < CFG.WAVE_GROUP && A.spawnIdx < str.length) {
      e = World.spawnEnemy(w, KIND[str.charAt(A.spawnIdx)], x + (A.edge ? -n * 22 : n * 22), 0);
      if (e) { e.y = e.py = World.groundY(w, e.x); e.arena = A.index; e.st = 'chase'; e.cd = 0.8; e.facing = A.edge ? -1 : 1; }
      A.spawnIdx++; n++;
    }
    A.edge ^= 1;
  }
  function arenas(w, dt) {
    var A = w.arena, D = w.level.def, p = w.player, next = A.index + 1;
    if (w.mode !== 'level') return;
    if (!A.locked) {
      if (next < D.arenas.length && !A.done[next] && p.x >= D.arenas[next].at * T + CFG.ARENA_TRIGGER) enterArena(w, next);
      return;
    }
    var str = D.arenas[A.index].waves[A.wave - 1];
    if (A.spawnIdx < str.length) {
      A.spawnT -= dt;
      if (A.spawnT <= 0) { spawnGroup(w); A.spawnT = CFG.WAVE_GAP; }
      return;
    }
    if (arenaAlive(w, A.index)) return;
    if (A.wave < A.waves) { A.wave++; A.spawnIdx = 0; A.spawnT = CFG.WAVE_NEXT; return; }
    A.locked = 0; A.done[A.index] = 1;
    w.gates[A.index].st = 'cleared';
    if (!A.hurt) w.run.flawlessWaves++;
    unlock(w);
    Render.sound('gate_open');
  }

  function checkpoints(w) {
    var p = w.player, i, cp;
    for (i = 0; i < w.checkpoints.length; i++) {
      cp = w.checkpoints[i];
      if (!cp.alive || cp.active || p.x < cp.x) continue;
      for (var j = 0; j < w.checkpoints.length; j++) w.checkpoints[j].active = 0;
      cp.active = 1; w.respawnX = cp.x;
      Render.sound('checkpoint');
    }
  }

  // ---------- gags ----------
  function triggerGag(w, g, i) {
    var G = TEXT.gags[g.id], p = w.player, text = G.text, k;
    g.triggered = 1; g.near = 0;
    switch (G.effect) {
      case 'tabula': p.tabulaT = 10; Render.fx('text', p.x, p.y - 64, TEXT.ui.sixLink, 0); Render.sound('tabula'); break;
      case 'composure': p.composure = Math.min(p.composureMax, p.composure + 5); break;
      case 'popup': w.popup.text = TEXT.ui.modRemoved; w.popup.t = CFG.POPUP_T; break;
      case 'tip': if (w.currency.chaos > 0) w.currency.chaos--; else text = TEXT.ui.tipNone; break;
      case 'tailor': k = World.spawnPickup(w, 'tailor', g.x, g.y - 24); if (k) k.vx = 0; break;
    }
    World.say(w, G.npc ? 'npc' : 'world', i, text, 2.6);
    if (G.reply) World.say(w, 'player', 0, G.reply, 2.6, CFG.REPLY_DELAY);
    if (G.caption && G.bar) Render.censor(g.x + G.bar.ox, g.y + G.bar.oy, G.bar.w, G.bar.h, G.caption, 2.5, 'gag', i);
    Render.sound('gag');
  }
  function gags(w) {
    var p = w.player, pr = Input.pressed, i, g, near;
    for (i = 0; i < w.gags.length; i++) {
      g = w.gags[i];
      if (!g.alive || g.triggered) continue;
      near = Math.abs(p.x - g.x) < CFG.GAG_RANGE && Math.abs(p.y - g.y) < 64;
      g.near = near ? 1 : 0;
      if (near && (TEXT.gags[g.id].auto || pr.confirm || pr.melee)) triggerGag(w, g, i);
    }
  }

  // ---------- boss ----------
  function bossDoor(w) {
    var D = w.level.def, x0 = D.bossDoorAt * T;
    if (w.mode !== 'level' || w.bossRoom || w.player.x < x0 + CFG.BOSS_TRIGGER) return;
    w.mode = 'boss'; w.bossRoom = 1;
    lock(w, x0, w.level.w);
    w.gates[D.arenas.length].st = 'locked';
    Bosses.start(w, D.boss);
    Render.sound('door_slam'); Render.fx('doorSlam', x0, 0, 0, 0);
  }

  function clearTransient(w) {
    var i, h, e;
    for (i = 0; i < w.projectiles.length; i++) w.projectiles[i].alive = false;
    for (i = 0; i < w.hazards.length; i++) { h = w.hazards[i]; if (h.alive && h.kind !== 'plate') h.alive = false; }
    for (i = 0; i < w.obscure.length; i++) w.obscure[i].alive = false;
    for (i = 0; i < w.enemies.length; i++) { e = w.enemies[i]; if (e.alive && e.kind === 'choir') e.alive = false; }
  }

  function bossDefeated(w) {
    var b = w.boss, li = w.levelIndex, r = w.run;
    if (b.st === 'defeated') return;
    b.st = 'defeated'; b.stT = 0; b.vx = 0; b.attack = 0; b.tell = 0; b.charming = 0;
    w.hitstop = CFG.HITSTOP.defeat;
    clearTransient(w);
    Combat.bossLoot(w);
    w.bossesKilled++;
    r.levelTimes[li] = w.levelTime;
    r.timeBonus += Math.max(0, CFG.PAR_SECONDS - w.levelTime) * 5;
    if (TEXT.lines[b.id].end) World.say(w, 'boss', 0, TEXT.lines[b.id].end, 2);
    store('poex.pb', Math.max(load('poex.pb'), li + 1));
    w.defeatT = CFG.DEFEAT_LOOT_T;
    Render.sound('boss_defeat'); Render.fx('beam', b.x, b.y, 4, 0); Render.fx('divineGlow', 0, 0, 0, 0);
  }

  function startCutscene(w) {
    var C = w.cutscene, li = w.levelIndex, i, Q = TEXT.cutscene;
    for (i = 0; i < w.pickups.length; i++) if (w.pickups[i].alive) Combat.collect(w, w.pickups[i]);
    w.mode = 'cutscene'; w.boss.alive = false; w.player.anim = 'cutscene';
    C.t = CFG.CUTSCENE_T; C.final = li === 4 ? 1 : 0; C.loaded = 0; C.slammed = 0;
    C.line1 = C.final ? Q.l5a : Q.friends;
    C.line2 = li === 2 ? Q.l3 : C.final ? Q.l5b : '';
    C.line3 = '';
  }
  function cutscene(w, dt) {
    var C = w.cutscene;
    if (!C.loaded) { C.loaded = 1; if (!C.final) World.loadLevel(w, w.levelIndex + 1); }
    C.t -= dt;
    if (!C.slammed && CFG.CUTSCENE_T - C.t >= CFG.CUTSCENE_SLAM_AT) {
      C.slammed = 1; w.flashRule3 = CFG.CUTSCENE_RULE3;
      w.popup.text = TEXT.ui.modRemoved; w.popup.t = CFG.CUTSCENE_RULE3;
      Render.sound('door_slam'); Render.fx('doorSlam', 0, 0, 0, 0);
    }
    if (C.t > 0) return;
    C.t = 0;
    if (C.final) endRun(w, 'win'); else Hideout.enter(w);
  }

  // ---------- death ----------
  function pickOther(arr, not) { var s; do s = RNG.game.pick(arr); while (s === not && arr.length > 1); return s; }
  function buildPost(w) {
    var D = w.deathPost, src = w.lastDamageSrc, who = w.lastDamageName || TEXT.who[src] || src;
    D.title = RNG.game.pick(TEXT.deathTitles).replace('{who}', who).replace('{L}', String(w.levelIndex + 1));
    D.upvotes = 12 + RNG.game.int(3989);
    D.comment1 = RNG.game.pick(TEXT.comments);
    D.comment2 = pickOther(TEXT.comments, D.comment1);
    D.cause = (TEXT.causes[src] || who).replace('{name}', w.lastDamageName) +
      (w.levelCharms ? TEXT.charmedSuffix.replace('{n}', String(w.levelCharms)) : '');
    D.cause = D.cause.replace(/\ba ([AEIOU])/g, 'an $1');   // "an Inmate Who Lifts" 
    D.tip = RNG.game.pick(TEXT.tips);
    D.line = TEXT.ui.portalsLeft.replace('{n}', String(w.portals));
  }

  function killPlayer(w) {
    var p = w.player, c = w.currency, i, k, lost;
    if (w.mode !== 'level' && w.mode !== 'boss') return;
    w.deaths++;
    p.anim = 'dead'; p.animT = 0; p.vx = 0; p.flustered = 0; p.rollT = 0; p.atkT = 0; p.flaskT = 0;
    if (w.portals <= 0) { buildPost(w); endRun(w, 'lose'); return; }
    w.portals--;
    for (i = 0; i < VALUE_KEYS.length; i++) {
      k = VALUE_KEYS[i]; lost = Math.floor(c[k] * 0.1);
      c[k] -= lost; w.currencyValue -= lost * CFG.VALUE[k];
    }
    w.deathPrevMode = w.mode; w.mode = 'death'; w.deathT = 0; w.deathPosted = 0;
    buildPost(w);
    w.deathPost.t = 0;
    Render.sound('death');
  }

  function death(w, dt) {
    var D = w.deathPost, pr = Input.pressed;
    w.deathT += dt;
    if (w.deathT < CFG.DEATH_ANIM_T) return;
    if (!w.deathPosted) { w.deathPosted = 1; D.t = CFG.DEATH_POST_T; return; }
    D.t -= dt;
    var skip = w.deathT > CFG.DEATH_ANIM_T + 0.3 && (pr.confirm || pr.melee || pr.click || pr.jump || pr.spark || pr.dodge);
    if (D.t <= 0 || skip) respawn(w);
  }

  function respawn(w) {
    var p = w.player, A = w.arena, i, e;
    w.deathPost.t = 0;
    w.mode = w.deathPrevMode;
    clearTransient(w);
    if (w.mode === 'boss') Bosses.start(w, w.level.def.boss);
    else if (A.locked) {
      for (i = 0; i < w.enemies.length; i++) { e = w.enemies[i]; if (e.alive && e.arena === A.index) e.alive = false; }
      w.gates[A.index].st = 'open';
      A.locked = 0; A.index--;
      unlock(w);
    }
    Player.reset(w);
    p.hp = p.hpMax; p.composure = p.composureMax; p.flask = Math.max(p.flask, 1);
    if (p.layers === 0) Combat.restoreLayer(p);   // no death spiral (fun brief P6): never respawn fully uncapped
    p.iframes = CFG.PLAYER.respawnIframes;
    snapCamera(w);
    Render.sound('portal');
  }

  function score(w) { w.score = Math.round(10 * w.currencyValue + 1000 * w.bossesKilled + w.run.timeBonus); }

  // ---------- run end ----------
  function endRun(w, result) {
    var O = w.over, r = w.run, bank = Math.max(0, Math.floor(w.currencyValue * CFG.STASH.bank)), pb;
    w.state = 'over'; w.result = result;
    score(w);
    w.stash += bank; store('poex.stash', w.stash);
    pb = Math.max(load('poex.pb'), r.levelReached); store('poex.pb', pb);
    O.title = result === 'win' ? TEXT.over.winTitle : TEXT.over.loseTitle;
    O.line = TEXT.over.pb.replace('{n}', String(pb));
    O.pbLevel = pb; O.stash = w.stash; O.banked = bank; O.t = 0;
    O.charmsEscaped = w.charmsEscaped; O.flawlessWaves = r.flawlessWaves; O.cappedSeconds = Math.round(r.cappedSeconds);
    O.score = w.score; O.runTime = w.runTime;
    Render.sound(result === 'win' ? 'level_clear' : 'death');
  }

  function update(w, dt) {
    var p = w.player, A = w.arena;
    timers(w, dt);
    score(w);
    if (w.mode === 'death') { death(w, dt); return; }
    if (w.mode === 'cutscene') { cutscene(w, dt); return; }

    w.levelTime += dt; w.secondsSinceExalt += dt;
    if (p.layers === 3) w.run.cappedSeconds += dt;
    pickups(w, dt);
    arenas(w, dt);
    checkpoints(w);
    gags(w);
    bossDoor(w);
    if (w.defeatT > 0 && (w.defeatT -= dt) <= 0) { w.defeatT = 0; startCutscene(w); return; }
    if (A.locked || w.bossRoom) {
      var lo = w.cam.lockX0 + p.w / 2, hi = w.cam.lockX1 - p.w / 2;
      if (p.x < lo) { p.x = lo; if (p.vx < 0) p.vx = 0; } else if (p.x > hi) { p.x = hi; if (p.vx > 0) p.vx = 0; }
    }
    camera(w);
  }

  return { update: update, killPlayer: killPlayer, respawn: respawn, bossDefeated: bossDefeated, nextLevel: nextLevel,
    endRun: endRun, snapCamera: snapCamera, load: load, store: store };
})();
