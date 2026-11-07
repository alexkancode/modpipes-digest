// Bosses: one world.boss, five scripts (GDD §2.6). Shared loop: intro → idle → windup (tell) → attack → recover.
// Each script is { move, choose, act, phase? }: move runs while idle, choose begins the next attack,
// act runs each attack step and returns true when the attack is over, phase checks HP thresholds.
var Bosses = (function () {
  var B = CFG.BOSS, A = CFG.ATK, EL = CFG.ELEMENT;
  var FLOATERS = { dominus: 1, heart: 1 };

  function drain(w) { return CFG.COMPOSURE.drain * CFG.LEVEL_MULT.dmg[w.levelIndex]; }
  function dxOf(w, b) { return w.player.x - b.x; }
  function face(w, b) { b.facing = dxOf(w, b) > 0 ? 1 : -1; }
  function playerIn(w, x, y, wd, ht) { var p = w.player; return Phys.overlap(p.x - p.w / 2, p.y - p.h, p.w, p.h, x, y, wd, ht); }
  function frontHit(w, b, reach, ht) { return playerIn(w, b.facing > 0 ? b.x : b.x - reach, b.y - ht, reach, ht); }
  function touching(w, b) { return playerIn(w, b.x - b.w / 2, b.y - b.h, b.w, b.h); }
  function hurt(w, b, amt, element) { Combat.damagePlayer(w, amt, element, b.id, b.name); }
  function say(w, text) { if (text) World.say(w, 'boss', 0, text, 1.8); }
  function frac(b) { return b.hp / b.hpMax; }

  function setup(w, b, id) {
    var K = B[id];
    b.id = id; b.w = K.w; b.h = K.h; b.hp = b.hpMax = K.hp;
    b.name = TEXT.bosses[id].name; b.title = TEXT.bosses[id].title;
    b.baseY = World.groundY(w, b.x);
    b.y = b.py = b.baseY - (K.hover || 0);
  }

  function begin(b, atk, tell) {
    b.attack = atk; b.tell = tell; b.st = 'windup'; b.stT = 0; b.didHit = 0; b.count = 0; b.vx = 0;
    b.charming = atk === A.charm ? 1 : 0;
    Render.sound(b.charming ? 'charm_tell' : 'enemy_windup');
  }
  function toIdle(b) {
    var K = B[b.id];
    b.st = 'idle'; b.stT = 0; b.attack = 0; b.tell = 0; b.charming = 0;
    b.idleT = RNG.game.range(K.idle[0], K.idle[1]);
  }
  function toPhase(b, dur, atk) { b.st = 'phase'; b.stT = 0; b.vx = 0; b.attack = atk || 0; b.tell = 0; b.charming = 0; b.phaseT = dur; }

  // Arc a projectile so it lands on the player's current feet after `flight` seconds.
  function lob(w, b, kind, flight, g, dmg, element) {
    var p = w.player, ox = b.x + b.facing * b.w / 3, oy = b.y - b.h * 0.8;
    var s = World.spawnProjectile(w, kind, ox, oy, (p.x - ox) / flight, (p.y - 8 - oy) / flight - 0.5 * g * flight, element, 0);
    if (s) { s.grav = g; s.dmg = dmg; s.life = flight + 1; s.w = kind === 'barbell' ? 32 : 12; s.h = kind === 'barbell' ? 16 : 14; s.srcKind = b.id; s.srcName = b.name; }
  }
  // Pillars are rects standing on the ground at x; rings and novas are centred at (x, cy), or on the ground if cy is 0.
  function groundHazard(w, kind, x, cy, tell, life, dmg, element, r) {
    var gy = World.groundY(w, x), H = B.dominus.pillar;
    var h = kind === 'pillar' ? World.spawnHazard(w, kind, x - H.w / 2, gy - H.h, H.w, H.h) : World.spawnHazard(w, kind, x, cy || gy, 0, 0);
    if (!h) return null;
    h.tell = tell; h.life = life; h.dmg = dmg; h.element = element; h.r = r || 0; h.st = 'tell'; h.src = w.boss.id;
    return h;
  }

  var SCRIPTS = {
    hillock: {
      move: function (w, b) { face(w, b); b.vx = Math.abs(dxOf(w, b)) > 80 ? b.facing * B.hillock.speed : 0; },
      choose: function (w, b) {
        var K = B.hillock, near = Math.abs(dxOf(w, b)) < 100;
        face(w, b);
        if (b.charmCd <= 0 && !(near && RNG.game.chance(0.55))) { b.turn = b.phase === 2 ? 2 : 1; begin(b, A.charm, K.hug.tell); say(w, TEXT.lines.hillock.charm); }
        else begin(b, A.slam, K.club.tell);
      },
      act: function (w, b) {
        var K = B.hillock;
        if (b.attack === A.slam) {
          if (!b.didHit && b.stT <= 0.2 && frontHit(w, b, K.club.reach, 60)) { b.didHit = 1; hurt(w, b, K.club.dmg, EL.phys); }
          return b.stT >= K.club.active;
        }
        b.vx = b.facing * K.hug.speed;
        if (!b.didHit && touching(w, b)) { b.didHit = 1; Combat.charmPlayer(w, b, drain(w)); }
        if (b.stT < K.hug.dist / K.hug.speed && !b.hitWall) return false;
        b.vx = 0;
        if (--b.turn > 0) { face(w, b); begin(b, A.charm, K.hug.tell2); return false; }
        return true;
      },
      phase: function (w, b) { if (b.phase === 1 && frac(b) <= B.hillock.phase2At) { b.phase = 2; say(w, TEXT.lines.hillock.phase); } }
    },

    brutus: {
      move: function (w, b) {
        var adx = Math.abs(dxOf(w, b)), K = B.brutus;
        face(w, b);
        b.vx = adx > 160 ? b.facing * K.speed : adx < 90 ? -b.facing * K.speed * 0.6 : 0;
      },
      choose: function (w, b) {
        var K = B.brutus, pick = b.turn++ % 3;
        face(w, b);
        if (pick === 2 && b.charmCd <= 0 && Math.abs(dxOf(w, b)) < 220) { begin(b, A.charm, K.spot.tell); say(w, TEXT.lines.brutus.charm); }
        else if (pick === 1) begin(b, A.barbell, K.barbell.tell);
        else { begin(b, A.shockwave, K.wave.tell); Render.sound('flex'); }
      },
      act: function (w, b) {
        var K = B.brutus;
        if (b.attack === A.shockwave) {
          if (b.count === 0 || (b.count === 1 && b.phase === 2 && b.stT >= K.wave.pairGap)) {
            b.count++;
            var s = World.spawnProjectile(w, 'shockwave', b.x + b.facing * b.w / 2, b.baseY - K.wave.h / 2, b.facing * K.wave.speed, 0, EL.phys, 0);
            if (s) { s.w = K.wave.w; s.h = K.wave.h; s.dmg = K.wave.dmg; s.life = 4; s.srcKind = 'brutus'; s.srcName = b.name; }
            Render.sound('shockwave'); Render.fx('shake', 0, 0, 0.3, 0);
          }
          return b.stT >= (b.phase === 2 ? K.wave.pairGap + 0.2 : 0.3);
        }
        if (b.attack === A.barbell) {
          if (b.count++ === 0) { lob(w, b, 'barbell', K.barbell.flight, K.barbell.gravity, K.barbell.dmg, EL.lightning); Render.sound('barbell'); }
          return b.stT >= 0.3;
        }
        if (b.count++ === 0) {
          var dx = dxOf(w, b), dy = (w.player.y - w.player.h / 2) - (b.y - b.h / 2);
          if (dx * dx + dy * dy <= K.spot.r * K.spot.r) Combat.charmPlayer(w, b, drain(w));
        }
        return b.stT >= 0.4;
      },
      phase: function (w, b) { if (b.phase === 1 && frac(b) <= B.brutus.phase2At) { b.phase = 2; say(w, TEXT.lines.brutus.phase); } }
    },

    dominus: {
      move: function (w, b) {
        var p = w.player, K = B.dominus, side = b.x > p.x ? 1 : -1, tx = p.x + side * K.keep;
        face(w, b);
        b.vx = Math.max(-K.speed, Math.min(K.speed, (tx - b.x) * 2));
      },
      choose: function (w, b) {
        var K = B.dominus, pick = b.turn++ % (b.phase === 2 ? 3 : 2);
        face(w, b);
        if (pick === 1) { begin(b, A.pillar, K.pillar.tell); groundHazard(w, 'pillar', w.player.x, 0, K.pillar.tell, K.pillar.active, K.pillar.dmg, EL.fire); Render.sound('pillar'); }
        else if (pick === 2) { begin(b, A.nova, K.nova.tell); groundHazard(w, 'nova', b.x, b.y - b.h / 2, K.nova.tell, 0.25, K.nova.dmg, EL.cold, K.nova.r); }
        else begin(b, A.volley, K.volley.tell);
      },
      act: function (w, b) {
        var K = B.dominus, p = w.player, i, n, base, a, s, ox, oy;
        if (b.attack === A.volley && b.count++ === 0) {
          n = b.phase === 2 ? K.volley.n2 : K.volley.n;
          ox = b.x; oy = b.y - b.h * 0.6;
          base = Math.atan2((p.y - p.h / 2) - oy, p.x - ox);
          for (i = 0; i < n; i++) {
            a = base + (i - (n - 1) / 2) * K.volley.spread;
            s = World.spawnProjectile(w, 'censorbar', ox, oy, Math.cos(a) * K.volley.speed, Math.sin(a) * K.volley.speed, EL.phys, 0);
            if (s) { s.w = 32; s.h = 12; s.dmg = K.volley.dmg; s.life = 4; s.srcKind = 'dominus'; s.srcName = b.name; }
          }
          Render.sound('censor_slap');
        }
        if (b.attack === A.nova && b.count++ === 0) Render.sound('nova');
        return b.stT >= (b.attack === A.pillar ? K.pillar.active : 0.3);
      },
      phase: function (w, b, dt) {
        var K = B.dominus, i, alive = 0;
        if (b.feasts === 0 && frac(b) <= 0.75) { b.feasts = 1; say(w, TEXT.lines.dominus.mid); }
        if (b.phase === 1 && frac(b) <= K.phase2At) {
          b.phase = 2; toPhase(b, CFG.BOSS.phaseT, 0); say(w, TEXT.lines.dominus.phase); Render.sound('boss_phase');
          for (i = 0; i < K.choir; i++) spawnChoir(w, i);
          b.extraT = 0;
        }
        if (b.phase !== 2) return;
        b.extraT += dt;
        if (b.extraT < K.choirEvery) return;
        b.extraT = 0;
        for (i = 0; i < w.enemies.length; i++) if (w.enemies[i].alive && w.enemies[i].kind === 'choir') alive++;
        if (alive < K.choir) spawnChoir(w, alive);
      }
    },

    piety: {
      move: function (w, b) {
        var adx = Math.abs(dxOf(w, b)), K = B.piety;
        face(w, b);
        b.vx = adx < K.keep - 30 ? -b.facing * K.speed : adx > K.keep + 50 ? b.facing * K.speed : 0;
      },
      choose: function (w, b) {
        var K = B.piety;
        face(w, b);
        if (b.charmCd <= 0 && Math.abs(dxOf(w, b)) < 200 && RNG.game.chance(0.4)) { begin(b, A.charm, K.wink.tell); say(w, TEXT.lines.piety.charm); }
        else begin(b, A.lob, K.lob.tell);
      },
      act: function (w, b) {
        var K = B.piety;
        if (b.count++ === 0) {
          if (b.attack === A.lob) lob(w, b, 'flasklob', K.lob.flight, K.lob.gravity, CFG.ACID.dmg, EL.fire);
          else if (Math.abs(dxOf(w, b)) <= K.wink.r) Combat.charmPlayer(w, b, drain(w));
        }
        return b.stT >= 0.3;
      }
    },

    heart: {
      move: function (w, b) { b.vx = 0; face(w, b); },
      choose: function (w, b) { begin(b, A.ring, B.heart.ring.tell); },
      act: function (w, b) {
        if (b.count++ === 0) {
          var h = groundHazard(w, 'ring', b.x, 0, 0, 0, B.heart.ring.dmg, EL.phys, 0);
          if (h) h.st = 'active';
          Render.sound('heartbeat');
        }
        return b.stT >= 0.2;
      }
    },

    kitava: {
      move: function (w, b) { face(w, b); b.vx = Math.abs(dxOf(w, b)) > 110 ? b.facing * B.kitava.speed : 0; },
      choose: function (w, b) {
        var K = B.kitava;
        face(w, b);
        if (++b.turn % K.belch.every === 0) {
          begin(b, A.belch, K.belch.tell);
          groundHazard(w, 'nova', b.x, b.y - b.h / 2, K.belch.tell, 0.25, K.belch.dmg, EL.fire, 4000);
        } else if (Math.abs(dxOf(w, b)) < 130 || b.charmCd > 0) begin(b, A.slam, K.fork.tell);
        else begin(b, A.charm, K.devour.tell);
      },
      act: function (w, b, dt) {
        var K = B.kitava, p = w.player;
        if (b.attack === A.slam) {
          if (!b.didHit && b.stT <= 0.2 && frontHit(w, b, K.fork.reach, 80)) { b.didHit = 1; hurt(w, b, K.fork.dmg, EL.phys); Render.fx('shake', 0, 0, 0.5, 0); }
          return b.stT >= K.fork.active;
        }
        if (b.attack === A.belch) { if (b.count++ === 0) Render.sound('belch'); return b.stT >= 0.3; }
        // Devour: pull her in; Charm on contact.
        if (p.flustered <= 0) p.x += (b.x > p.x ? 1 : -1) * K.devour.pull * dt;
        if (!b.didHit && Math.abs(p.x - b.x) < b.w / 2 + 16) { b.didHit = 1; Combat.charmPlayer(w, b, drain(w)); return true; }
        return b.stT >= K.devour.dur;
      },
      phase: function (w, b) {
        var K = B.kitava, at = K.feastAt[b.phase - 1];
        if (at === undefined || frac(b) > at) return;
        b.phase++;
        toPhase(b, K.feastT, A.feast);
        var i = Combat.eatLayer(w);
        say(w, i < 0 ? TEXT.lines.kitava.empty : TEXT.lines.kitava.eat[i]);
        Render.fx('zoom', b.x, b.y - b.h / 2, 0, 0);
      }
    }
  };

  function spawnChoir(w, i) {
    var x = i % 2 === 0 ? w.cam.lockX0 + 24 : w.cam.lockX1 - 24;
    var e = World.spawnEnemy(w, 'choir', x, World.groundY(w, x));
    if (e) { e.st = 'chase'; e.cd = 1.2; }
  }

  function start(w, id) {
    var b = w.boss;
    b.alive = true;
    b.x = b.px = w.cam.lockX1 - 140;
    setup(w, b, id);
    b.vx = 0; b.vy = 0; b.facing = -1; b.st = 'intro'; b.stT = 0; b.attack = 0; b.tell = 0; b.phase = 1; b.charming = 0;
    b.flash = 0; b.hitBy = -1; b.charmCd = 0; b.idleT = 0.6; b.didHit = 0; b.count = 0; b.turn = 0; b.extraT = 0; b.feasts = 0; b.phaseT = 0;
    say(w, TEXT.lines[id].intro);
    Render.sound('boss_intro');
  }

  // Piety at 0 HP becomes The Heart (GDD §2.6): same fight, phase 2, acid rises at the room edges.
  function becomeHeart(w, b) {
    var K = B.heart, x0 = w.cam.lockX0, x1 = w.cam.lockX1, gy;
    say(w, TEXT.lines.piety.phase);
    b.x = b.px = (x0 + x1) / 2;
    setup(w, b, 'heart');
    b.phase = 2; b.vx = 0; b.vy = 0;
    toPhase(b, CFG.BOSS.phaseT, 0);
    gy = World.groundY(w, x0 + 8);
    var h = World.spawnHazard(w, 'acid', x0, gy - K.acidH, K.acidW, K.acidH); if (h) h.src = 'acid';
    h = World.spawnHazard(w, 'acid', x1 - K.acidW, gy - K.acidH, K.acidW, K.acidH); if (h) h.src = 'acid';
    Render.sound('boss_phase');
  }

  function update(w, dt) {
    var b = w.boss;
    if (!b.alive) return;
    b.px = b.x; b.py = b.y; b.stT += dt;
    if (b.flash > 0) b.flash -= dt;
    if (b.charmCd > 0) b.charmCd -= dt;
    if (b.st === 'defeated') return;
    var S = SCRIPTS[b.id];

    if (b.hp <= 0 && b.st !== 'intro') {
      if (b.id === 'piety') becomeHeart(w, b);
      else { Flow.bossDefeated(w); return; }
    }
    if (S.phase && b.st !== 'intro' && b.st !== 'phase') S.phase(w, b, dt);

    switch (b.st) {
      case 'intro': b.vx = 0; if (b.stT >= CFG.BOSS.introT) toIdle(b); break;
      case 'phase': b.vx = 0; if (b.stT >= b.phaseT) toIdle(b); break;
      case 'idle': S.move(w, b, dt); if (b.stT >= b.idleT) S.choose(w, b); break;
      case 'windup':
        b.tell = Math.max(0, b.tell - dt);
        if (b.tell <= 0) { b.st = 'attack'; b.stT = 0; }
        break;
      case 'attack':
        if (S.act(w, b, dt) && b.st === 'attack') { b.st = 'recover'; b.stT = 0; b.vx = 0; b.charming = 0; }
        break;
      case 'recover': b.vx = 0; if (b.stT >= 0.35) toIdle(b); break;
    }

    if (FLOATERS[b.id]) b.x += b.vx * dt;
    else {
      b.vy = Math.min(CFG.PLAYER.terminal, b.vy + B.gravity * dt);
      Phys.moveBody(w.level, b, dt);
    }
    var lo = w.cam.lockX0 + b.w / 2, hi = w.cam.lockX1 - b.w / 2;
    if (b.x < lo) { b.x = lo; b.hitWall = -1; } else if (b.x > hi) { b.x = hi; b.hitWall = 1; }
  }

  return { start: start, update: update };
})();
