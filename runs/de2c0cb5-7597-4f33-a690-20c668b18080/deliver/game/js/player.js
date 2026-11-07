// Player: the Exile controller (GDD §2.1-2.4). One update per sim step.
var Player = (function () {
  var P = CFG.PLAYER, M = CFG.MELEE, S = CFG.SPARK, F = CFG.FLASK, C = CFG.COMPOSURE;
  var MOD_KEYS = ['meleeMul', 'sparkMul', 'sparkCdMul', 'hpMax', 'leech', 'flaskMax', 'speed', 'charmReduce',
    'rollCd', 'regen', 'flaskHeal', 'sparkCdAdd', 'mashLess', 'portals', 'dropMul'];
  var MELEE_ANIM = ['melee1', 'melee2', 'melee3'];

  var SAFE_MARGIN = 24;
  function supported(L, x, y) { return Phys.tileAt(L, Math.floor(x / 16), Math.floor(y / 16)) !== 0; }
  function approach(v, target, step) { return v < target ? Math.min(target, v + step) : Math.max(target, v - step); }

  // Patch notes plus weapon affixes → player.mods (flat numbers).
  function computeMods(w) {
    var m = w.player.mods, r = w.run, i, k, a, A, v, src;
    for (i = 0; i < MOD_KEYS.length; i++) m[MOD_KEYS[i]] = 0;
    for (i = 1; i < CFG.PATCH.length; i++) if (r.patches[i - 1]) { src = CFG.PATCH[i]; for (k in src) m[k] += src[k]; }
    for (i = 0; i < r.weapon.count; i++) {
      a = r.weapon.affixes[i]; A = CFG.AFFIX[a.id];
      v = A.v * CFG.TIER_MUL[a.tier];
      m[A.key] += A.int ? Math.floor(v) : v;
    }
  }

  function place(p, x, y) {
    p.x = p.px = x; p.y = p.py = y; p.vx = 0; p.vy = 0; p.onGround = true; p.wasGround = true;
    p.lastSafeX = x; p.lastSafeY = y;
  }

  // Recomputes stats and puts her at w.respawnX with no transient state. Run fields (hp, layers, flask) persist.
  function reset(w) {
    computeMods(w);
    var p = w.player, m = p.mods;
    p.hpMax = P.hpMax + m.hpMax; p.hp = Math.min(p.hp, p.hpMax);
    p.flaskMax = Math.max(1, F.max + m.flaskMax); p.flask = Math.min(p.flask, p.flaskMax);
    p.composureMax = C.max + (w.stash >= CFG.STASH.composure ? C.stashBonus : 0);
    p.composure = Math.min(p.composure, p.composureMax);
    p.hat = w.stash >= CFG.STASH.hat ? 1 : 0;
    place(p, w.respawnX, World.groundY(w, w.respawnX));
    p.facing = 1; p.anim = 'idle'; p.animT = 0; p.flaskT = 0; p.iframes = 0; p.flustered = 0; p.mashes = 0; p.rollT = 0; p.rollCd = 0;
    p.sparkCd = 0; p.flash = 0; p.tabulaT = 0; p.airRoll = false; p.coyote = 0; p.jumpBuf = 0; p.jumpCut = true;
    p.atkT = 0; p.combo = 0; p.queued = false; p.castT = 0; p.hurtT = 0; p.sinceCharm = 99; p.acidT = 0; p.charmSrc = null;
  }

  function startSwing(p, n) {
    p.combo = n; p.atkT = M.dur; p.queued = false; p.swingId++;
    Render.sound('swing');
  }

  function meleeHits(w, p) {
    var hx = p.facing > 0 ? p.x + p.w / 2 : p.x - p.w / 2 - M.w, hy = p.y - 46, i, e, b = w.boss;
    var dmg = M.dmg[p.combo] * (1 + p.mods.meleeMul), heal = 0;
    for (i = 0; i < w.enemies.length; i++) {
      e = w.enemies[i];
      if (!e.alive || e.hitBy === p.swingId) continue;
      if (!Phys.overlap(hx, hy, M.w, M.h, e.x - e.w / 2, e.y - e.h, e.w, e.h)) continue;
      e.hitBy = p.swingId;
      Combat.damageEnemy(w, e, dmg, 'melee');
      if (p.combo === 2 && e.alive) e.vx = p.facing * M.knock;
      heal += dmg * p.mods.leech;
    }
    if (b.alive && b.hitBy !== p.swingId && Phys.overlap(hx, hy, M.w, M.h, b.x - b.w / 2, b.y - b.h, b.w, b.h)) {
      b.hitBy = p.swingId;
      Combat.damageBoss(w, dmg, 'melee');
      heal += dmg * p.mods.leech;
    }
    if (heal > 0) p.hp = Math.min(p.hpMax, p.hp + heal);
  }

  function fireSpark(w, p) {
    var cx = p.x + p.facing * 12, cy = p.y - 30, dx = p.facing, dy = 0, A = Input.aim, len;
    if (A.fresh) {
      dx = A.x + w.cam.x - cx; dy = A.y + w.cam.y - cy;
      len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) { dx = p.facing; dy = 0; } else { dx /= len; dy /= len; if (dx !== 0) p.facing = dx > 0 ? 1 : -1; }
    }
    var s = World.spawnProjectile(w, 'spark', cx, cy, dx * S.speed, dy * S.speed, 0, 1);
    if (s) { s.dmg = S.dmg * (1 + p.mods.sparkMul); s.life = S.life; s.w = S.w; s.h = S.h; }
    p.sparkCd = Math.max(0.1, S.cd * (1 + p.mods.sparkCdMul) + p.mods.sparkCdAdd);
    p.castT = P.castT;
    Render.sound('spark_cast');
  }

  function control(w, p, dt) {
    var held = Input.held, pr = Input.pressed, m = p.mods;
    var dir = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    var attacking = p.atkT > 0;
    if (dir !== 0 && !attacking) p.facing = dir;

    var target = dir * (P.speed + m.speed) * (attacking && p.onGround ? M.moveMul : 1);
    var acc = p.onGround ? P.accel : P.accel * P.airMul;
    var dec = p.onGround ? P.decel * (p.floor === 4 ? P.slipDecel : 1) : P.accel * P.airMul;
    p.vx = approach(p.vx, target, (target !== 0 && p.vx * target >= 0 ? acc : dec) * dt);

    if (p.onGround) { p.coyote = P.coyoteSteps; p.airRoll = false; } else if (p.coyote > 0) p.coyote--;
    if (pr.jump) p.jumpBuf = P.bufferSteps; else if (p.jumpBuf > 0) p.jumpBuf--;
    if (p.jumpBuf > 0 && p.coyote > 0) {
      p.vy = -P.jumpV; p.jumpBuf = 0; p.coyote = 0; p.jumpCut = false; p.onGround = false;
      Render.sound('jump'); Render.fx('dust', p.x, p.y, 0, 0);
    }
    if (!held.jump && p.vy < 0 && !p.jumpCut) { p.vy *= P.cutMul; p.jumpCut = true; }

    if (pr.melee) {
      if (p.atkT <= 0) startSwing(p, 0);
      else if (p.atkT <= M.buffer && p.combo < 2) p.queued = true;
    }
    if (p.atkT > 0) {
      p.atkT -= dt;
      var el = M.dur - p.atkT;
      if (el >= M.activeFrom && el <= M.activeTo) meleeHits(w, p);
      if (p.atkT <= 0) { if (p.queued) startSwing(p, p.combo + 1); else { p.atkT = 0; p.combo = 0; } }
    }

    if (pr.spark && p.sparkCd <= 0) fireSpark(w, p);

    if (pr.dodge && p.rollCd <= 0 && (p.onGround || !p.airRoll)) {
      if (!p.onGround) p.airRoll = true;
      p.rollDir = dir || p.facing; p.facing = p.rollDir;
      p.rollT = P.rollT; p.iframes = Math.max(p.iframes, P.rollIframes); p.rollCd = P.rollCd + m.rollCd;
      p.atkT = 0; p.combo = 0; p.queued = false;
      Render.sound('roll'); Render.fx('dust', p.x, p.y, 0, 0);
    }

    if (pr.flask && p.flask > 0 && p.flaskT <= 0 && p.hp < p.hpMax) {
      p.flask--; p.hp = Math.min(p.hpMax, p.hp + F.first); p.flaskT = F.dur;
      Render.sound('flask');
    }
  }

  function flustered(w, p, dt) {
    var presses = Input.pressed.melee;
    // The first Charms of a run are a teaching window: 3 presses free her (CFG.CHARM.teachCharms).
    var base = w.charmsTaken <= C.teachCharms ? C.pressesTeach : p.composure < C.lowAt ? C.pressesLow : C.presses;
    var need = Math.max(1, base - p.mods.mashLess);
    p.mashes += presses;
    p.vx = approach(p.vx, 0, P.decel * dt);
    p.flustered -= dt + presses * (C.flusterT / need);
    if (p.flustered > 1e-4) return;
    p.flustered = 0;
    p.iframes = Math.max(p.iframes, C.iframes);
    if (p.mashes > 0) {   // any mashing shortened the stun, so she broke free early: count the escape
      p.composure = Math.min(p.composureMax, p.composure + C.escapeBonus);
      w.charmsEscaped++;
      World.say(w, 'player', 0, TEXT.ui.escape, CFG.BUBBLE_HOLD);
      Render.fx('sparkles', p.x, p.y - 30, 0, 6);
      Render.sound('escape');
    }
  }

  function pickAnim(p) {
    var a = p.flustered > 0 ? 'flustered' : p.rollT > 0 ? 'roll' : p.atkT > 0 ? MELEE_ANIM[p.combo] :
      p.hurtT > 0 ? 'hurt' : p.castT > 0 ? 'cast' : !p.onGround ? (p.vy < 0 ? 'jump' : 'fall') :
      Math.abs(p.vx) > 10 ? 'run' : 'idle';
    if (a !== p.anim) { p.anim = a; p.animT = 0; }
  }

  function update(w, dt) {
    var p = w.player, m = p.mods, L = w.level;
    p.animT += dt;
    if (p.iframes > 0) p.iframes = Math.max(0, p.iframes - dt);
    if (p.rollCd > 0) p.rollCd = Math.max(0, p.rollCd - dt);
    if (p.sparkCd > 0) p.sparkCd = Math.max(0, p.sparkCd - dt);
    if (p.flash > 0) p.flash -= dt;
    if (p.tabulaT > 0) p.tabulaT -= dt;
    if (p.castT > 0) p.castT -= dt;
    if (p.hurtT > 0) p.hurtT -= dt;
    p.sinceCharm += dt;

    if (p.flaskT > 0) {
      var rate = (F.heal + m.flaskHeal - F.first) / F.dur;
      p.hp = Math.min(p.hpMax, p.hp + rate * Math.min(dt, p.flaskT));
      p.flaskT -= dt;
    }
    if (p.sinceCharm >= C.regenDelay && p.flustered <= 0)
      p.composure = Math.min(p.composureMax, p.composure + Math.max(0, C.regen + m.regen) * dt);

    if (p.flustered > 0) flustered(w, p, dt);
    else if (p.rollT > 0) { p.rollT -= dt; p.vx = p.rollDir * P.rollSpeed; if (p.rollT <= 0) p.vx *= 0.5; }
    else control(w, p, dt);

    p.vy = Math.min(P.terminal, p.vy + (p.vy < 0 ? P.gUp : P.gDown) * dt);
    Phys.moveBody(L, p, dt);
    if (p.onGround && !p.wasGround) { Render.sound('land'); Render.fx('dust', p.x, p.y, 0, 0); p.jumpCut = true; }
    p.wasGround = p.onGround;

    if (p.y > L.h + 16) {
      p.hp -= P.pitDamage; w.lastDamageSrc = 'pit'; w.lastDamageName = '';
      Render.sound('hurt');
      if (p.hp <= 0) { p.hp = 0; Flow.killPlayer(w); }
      else { place(p, p.lastSafeX, p.lastSafeY); p.iframes = Math.max(p.iframes, 0.5); p.rollT = 0; }
    } else if (p.onGround && p.floor !== 3 && supported(L, p.x - SAFE_MARGIN, p.y) && supported(L, p.x + SAFE_MARGIN, p.y)) {
      p.lastSafeX = p.x; p.lastSafeY = p.y;   // a run-up's worth of floor on both sides, so the retry is fair
    }
    pickAnim(p);
  }

  return { reset: reset, update: update, computeMods: computeMods };
})();
