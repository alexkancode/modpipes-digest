// Enemies: grunt / caster / elite / choir AI (GDD §2.5), projectiles and hazards.
var Enemies = (function () {
  var E = CFG.ENEMY, C = CFG.COMPOSURE, EL = CFG.ELEMENT, TWO_PI = Math.PI * 2;
  var touching = '';      // acid source the player stands in this step ('' none)
  var SAME_FLOOR = 28;    // melee only starts against a target on (about) the same floor

  function playerHit(p, x, y, w, h) { return Phys.overlap(p.x - p.w / 2, p.y - p.h, p.w, p.h, x, y, w, h); }
  function tellOf(e) {
    var K = E[e.kind];
    return e.kind === 'elite' ? (e.attack === 'line' ? K.lineTell : K.chargeTell) : K.tell;
  }
  // True if the floor ends just ahead of the body in direction dir.
  function ledgeAhead(L, e, dir) {
    return Phys.tileAt(L, Math.floor((e.x + dir * (e.w / 2 + 2)) / 16), Math.floor((e.y + 1) / 16)) === 0;
  }
  function casterElement(w) {
    var els = w.level.def.casterElements;
    return els.length === 1 ? els[0] : els[RNG.game.int(els.length)];
  }

  function windup(w, e, attack) {
    e.attack = attack; e.st = 'windup'; e.stT = 0; e.vx = 0; e.didHit = 0;
    e.charming = (attack === 'wink' || attack === 'kiss' || attack === 'line') ? 1 : 0;
    if (attack === 'wink' || attack === 'kiss')   // the pickup line itself is censored, above the foe's head
      Render.censor(e.x - 30, e.y - e.h - 46, 60, 11, RNG.fx.pick(TEXT.charmCaptions), CFG.ENEMY[e.kind].tell + 0.2, 'enemy', w.enemies.indexOf(e));
    Render.sound(e.charming ? 'charm_tell' : 'enemy_windup');
  }

  // Attack tokens: only CFG.ENEMY.maxAttackers[level] foes may wind up at once, so a crowd queues instead of stacking hits.
  function tokenFree(w) {
    var n = 0, cap = E.maxAttackers[w.levelIndex] || 3;
    for (var i = 0; i < w.enemies.length; i++) { var o = w.enemies[i]; if (o.alive && (o.st === 'windup' || o.st === 'attack')) n++; }
    return n < cap;
  }

  function chase(w, e, dx, adx, dy) {
    var K = E[e.kind], p = w.player;
    e.facing = dx > 0 ? 1 : -1;
    if (e.cd <= 0 && !tokenFree(w)) e.cd = 0.25;   // wait a beat and try again
    if (e.kind === 'grunt') {
      e.vx = adx > K.reach - 8 ? e.facing * K.speed : 0;
      if (adx <= K.reach && Math.abs(dy) < SAME_FLOOR && e.cd <= 0) {
        var wink = e.charmCd <= 0 && (e.wink || RNG.game.chance(K.winkChance));
        e.wink = 0;
        windup(w, e, wink ? 'wink' : 'swipe');
      }
    } else if (e.kind === 'elite') {
      e.vx = adx > 30 ? e.facing * K.speed : 0;
      if (e.lineCd <= 0 && e.charmCd <= 0 && adx <= K.lineR + 40 && Math.abs(dy) < 64) {
        windup(w, e, 'line');
        World.say(w, 'enemy', w.enemies.indexOf(e), RNG.game.pick(TEXT.pickupLines), 2.2);
      } else if (e.cd <= 0 && adx <= K.chargeRange && Math.abs(dy) < SAME_FLOOR) windup(w, e, 'charge');
    } else {
      // caster / choir: keep a distance band, shoot from it
      e.vx = adx < K.keepMin ? -e.facing * K.speed : adx > K.keepMax ? e.facing * K.speed : 0;
      if (e.cd <= 0 && adx < 340 && Math.abs(e.x - (w.cam.x + CFG.W / 2)) < CFG.W / 2 + 16) {
        e.shots++;
        var kiss = w.levelIndex + 1 >= K.kissFromLevel && e.shots % K.kissEvery === 0 && e.charmCd <= 0;
        windup(w, e, kiss ? 'kiss' : 'bolt');
      }
    }
    if (e.vx !== 0 && e.onGround && ledgeAhead(w.level, e, e.vx > 0 ? 1 : -1)) e.vx = 0;
  }

  function attack(w, e, adx, dy) {
    var K = E[e.kind], p = w.player, s, vx, vy, len, ox, oy;
    switch (e.attack) {
      case 'swipe':
        if (!e.didHit && e.stT <= K.active && playerHit(p, e.facing > 0 ? e.x : e.x - K.reach, e.y - 40, K.reach, 40)) {
          e.didHit = 1; Combat.damagePlayer(w, K.dmg * e.dmgMul, EL.phys, e.kind, e.name);
        }
        if (e.stT >= K.active) recover(e, K.cd);
        break;
      case 'wink':
        if (adx <= K.winkRange && Math.abs(dy) < SAME_FLOOR) Combat.charmPlayer(w, e, C.drain * e.dmgMul);
        recover(e, K.cd);
        break;
      case 'bolt': case 'kiss':
        ox = e.x + e.facing * 10; oy = e.y - e.h * 0.6;
        vx = p.x - ox; vy = (p.y - p.h / 2) - oy; len = Math.sqrt(vx * vx + vy * vy) || 1;
        var spd = e.attack === 'kiss' ? K.kissSpeed : K.projSpeed;
        s = World.spawnProjectile(w, e.attack, ox, oy, vx / len * spd, vy / len * spd, e.attack === 'kiss' ? EL.charm : casterElement(w), 0);
        if (s) { s.dmg = e.attack === 'kiss' ? C.drain * e.dmgMul : K.dmg * e.dmgMul; s.src = e; s.life = 3; s.w = 10; s.h = 10; s.srcKind = e.kind; s.srcName = e.name; }
        Render.sound(e.attack === 'kiss' ? 'kiss_blow' : 'bolt_fire');
        recover(e, K.cd);
        break;
      case 'charge':
        e.vx = e.facing * K.chargeSpeed;
        if (e.onGround && ledgeAhead(w.level, e, e.facing)) e.vx = 0;
        if (!e.didHit && playerHit(p, e.x - e.w / 2, e.y - e.h, e.w, e.h)) {
          e.didHit = 1; Combat.damagePlayer(w, K.chargeDmg * e.dmgMul, EL.phys, e.kind, e.name);
        }
        if (e.stT >= K.chargeT || e.hitWall) recover(e, K.chargeCd);
        break;
      case 'line':
        if (adx <= K.lineR && Math.abs(dy) < 64) Combat.charmPlayer(w, e, C.drain * e.dmgMul);
        e.lineCd = K.lineCd;
        recover(e, 0.6);
        break;
    }
  }
  function recover(e, cd) { e.st = 'recover'; e.stT = 0; e.cd = cd; e.charming = 0; e.vx = 0; }

  function updateEnemy(w, e, dt) {
    var p = w.player, K = E[e.kind];
    var dx = p.x - e.x, adx = Math.abs(dx), dy = (p.y - p.h / 2) - (e.y - e.h / 2);
    e.px = e.x; e.py = e.y; e.stT += dt;
    if (e.cd > 0) e.cd -= dt;
    if (e.lineCd > 0) e.lineCd -= dt;
    if (e.charmCd > 0) e.charmCd -= dt;
    if (e.hitstunCd > 0) e.hitstunCd -= dt;
    if (e.flash > 0) e.flash -= dt;
    switch (e.st) {
      case 'idle': case 'patrol':
        e.vx = 0;
        if (adx < K.aggro && Math.abs(dy) < 160) { e.st = 'chase'; e.stT = 0; }
        break;
      case 'hitstun':
        e.vx *= 0.85;
        if (e.stT >= E.hitstun) { e.st = 'chase'; e.stT = 0; }
        break;
      case 'chase': chase(w, e, dx, adx, dy); break;
      case 'windup':
        e.vx = 0;
        if (e.stT >= tellOf(e)) { e.st = 'attack'; e.stT = 0; attack(w, e, adx, dy); }
        break;
      case 'attack': attack(w, e, adx, dy); break;
      case 'recover':
        e.vx = 0;
        if (e.stT >= K.recover) { e.st = 'chase'; e.stT = 0; }
        break;
    }
    e.vy = Math.min(CFG.PLAYER.terminal, e.vy + E.gravity * dt);
    Phys.moveBody(w.level, e, dt);
    // Wave and choir enemies stay inside the locked room, or a kiting caster could stall the gate.
    if ((e.arena >= 0 && e.arena === w.arena.index && w.arena.locked) || e.kind === 'choir') {
      var lo = w.cam.lockX0 + e.w / 2, hi = w.cam.lockX1 - e.w / 2;
      if (e.x < lo) e.x = lo; else if (e.x > hi) e.x = hi;
    }
    if (e.y > w.level.h + 32) e.alive = false;
  }

  function updateProjectile(w, s, dt) {
    var p = w.player, L = w.level, i, e, b = w.boss;
    s.t += dt;
    if (s.t >= s.life || s.x < w.cam.x - 96 || s.x > w.cam.x + CFG.W + 96) { s.alive = false; return; }
    if (s.friendly) {
      var spd = Math.sqrt(s.vx * s.vx + s.vy * s.vy) || 1, off = Math.sin(s.t * TWO_PI * CFG.SPARK.wobbleHz) * CFG.SPARK.wobble;
      s.bx += s.vx * dt; s.by += s.vy * dt;
      s.x = s.bx - s.vy / spd * off; s.y = s.by + s.vx / spd * off;
      if (Phys.solidAt(L, s.x, s.y)) { s.alive = false; Render.fx('hit', s.x, s.y, 1, 3); return; }
      for (i = 0; i < w.enemies.length; i++) {
        e = w.enemies[i];
        if (!e.alive || e === s.lastHit) continue;
        if (!Phys.overlap(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, e.x - e.w / 2, e.y - e.h, e.w, e.h)) continue;
        s.lastHit = e; s.hits++;
        Combat.damageEnemy(w, e, s.dmg, 'spark');
        if (s.hits > CFG.SPARK.pierce) { s.alive = false; return; }
      }
      if (b.alive && s.lastHit !== b && Phys.overlap(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, b.x - b.w / 2, b.y - b.h, b.w, b.h)) {
        s.lastHit = b; s.hits++;
        Combat.damageBoss(w, s.dmg, 'spark');
        if (s.hits > CFG.SPARK.pierce) s.alive = false;
      }
      return;
    }

    s.vy += s.grav * dt;
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.kind === 'shockwave') {
      if (s.x < w.cam.lockX0 || s.x > w.cam.lockX1) { s.alive = false; return; }
    } else if (Phys.solidAt(L, s.x, s.y + s.h / 2)) {
      if (s.kind === 'flasklob') puddle(w, s.x);
      s.alive = false; Render.fx('hit', s.x, s.y, 2, 4);
      return;
    }
    if (!playerHit(p, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h)) return;
    s.alive = false;
    if (s.kind === 'kiss') { Combat.charmPlayer(w, s.src, s.dmg); return; }
    var iframed = p.iframes > 0;
    Combat.damagePlayer(w, s.dmg, s.element, s.srcKind, s.srcName);
    if (s.kind === 'censorbar' && !iframed) obscure(w, p.y - p.h / 2 - w.cam.y);
    if (s.kind === 'flasklob') puddle(w, s.x);
  }

  function puddle(w, x) {
    var B = CFG.BOSS.piety.lob, gy = World.groundY(w, x);
    var h = World.spawnHazard(w, 'puddle', x - B.puddleW / 2, gy - 12, B.puddleW, 12);
    if (h) { h.life = B.puddleT; h.st = 'active'; h.src = 'puddle'; }
  }
  // Dominus strip: a 640x48 mosaic band across the screen at screen y, for stripT seconds.
  function obscure(w, sy) {
    var o = null, i;
    for (i = 0; i < w.obscure.length; i++) if (!w.obscure[i].alive) { o = w.obscure[i]; break; }
    if (!o) o = w.obscure[0];
    o.alive = true; o.y = Math.max(0, Math.min(CFG.H - 48, sy - 24)); o.t = CFG.BOSS.dominus.stripT;
    Render.sound('censor_slap');
  }

  function updateHazard(w, h, dt) {
    var p = w.player, P = CFG.PLATE, cycle, ph, st, dx, dy;
    h.t += dt;
    switch (h.kind) {
      case 'plate':
        cycle = P.armed + P.tell + P.active; ph = h.t % cycle;
        st = ph < P.armed ? 'armed' : ph < P.armed + P.tell ? 'tell' : 'active';
        if (st === 'active' && h.st !== 'active' && Math.abs(h.x - p.x) < CFG.W) Render.sound('plate_zap');
        h.st = st;
        if (st !== 'active') h.hitDone = 0;
        else if (!h.hitDone && playerHit(p, h.x, h.y, h.w, h.h)) { h.hitDone = 1; Combat.damagePlayer(w, P.dmg, EL.lightning, 'plate', ''); }
        break;
      case 'acid': case 'puddle':
        if (h.life > 0 && h.t >= h.life) { h.alive = false; break; }
        if (playerHit(p, h.x, h.y, h.w, h.h)) touching = h.kind;
        break;
      case 'ring':
        h.r += CFG.BOSS.heart.ring.speed * dt;
        if (h.r > CFG.BOSS.heart.ring.rMax) { h.alive = false; break; }
        if (!h.hitDone && p.y >= h.y - 20 && Math.abs(Math.abs(p.x - h.x) - h.r) < CFG.BOSS.heart.ring.band) {
          h.hitDone = 1; Combat.damagePlayer(w, h.dmg, EL.phys, 'heart', TEXT.bosses.heart.name);
        }
        break;
      case 'pillar':
        h.st = h.t < h.tell ? 'tell' : 'active';
        if (h.st === 'active' && !h.hitDone && playerHit(p, h.x, h.y, h.w, h.h)) {
          h.hitDone = 1; Combat.damagePlayer(w, h.dmg, EL.fire, 'dominus', TEXT.bosses.dominus.name);
        }
        if (h.t >= h.tell + h.life) h.alive = false;
        break;
      case 'nova':
        h.st = h.t < h.tell ? 'tell' : 'active';
        if (h.st === 'active' && !h.hitDone) {
          h.hitDone = 1;
          dx = p.x - h.x; dy = (p.y - p.h / 2) - h.y;
          if (dx * dx + dy * dy <= h.r * h.r) Combat.damagePlayer(w, h.dmg, h.element, h.src, TEXT.bosses[h.src].name);
        }
        if (h.t >= h.tell + 0.25) h.alive = false;
        break;
    }
  }

  function acidTick(w, dt) {
    var p = w.player, A = CFG.ACID;
    if (!touching && p.onGround && p.floor === 3) touching = 'acid';
    if (!touching) { p.acidT = A.tick; return; }
    p.acidT += dt;
    if (p.acidT >= A.tick) { p.acidT -= A.tick; Combat.damagePlayer(w, A.dmg, EL.fire, touching, ''); Render.sound('acid'); }
  }

  function update(w, dt) {
    var i;
    for (i = 0; i < w.enemies.length; i++) if (w.enemies[i].alive) updateEnemy(w, w.enemies[i], dt);
    for (i = 0; i < w.projectiles.length; i++) if (w.projectiles[i].alive) updateProjectile(w, w.projectiles[i], dt);
    touching = '';
    for (i = 0; i < w.hazards.length; i++) if (w.hazards[i].alive) updateHazard(w, w.hazards[i], dt);
    acidTick(w, dt);
  }

  return { update: update, obscure: obscure };
})();
