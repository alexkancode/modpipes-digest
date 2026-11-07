// Combat: the one place damage, Charm, loot and pickups resolve (tech plan §5.4).
// Elements are CFG.ELEMENT ints; layer bit = 1 << (element - 1): fire 1, cold 2, lightning 4.
var Combat = (function () {
  var C = CFG.COMPOSURE, LOOT = CFG.LOOT;
  var PICKUP_SOUND = { chaos: 'pickup_chaos', exalt: 'pickup_exalted', vaal: 'pickup_vaal', divine: 'pickup_divine',
    tailor: 'pickup_tailor', tea: 'pickup_tea', flask: 'pickup_flask', tabula: 'tabula' };

  function live(w) { return w.mode === 'level' || w.mode === 'boss'; }

  function damagePlayer(w, amt, element, srcKind, srcName) {
    var p = w.player;
    if (!live(w) || p.iframes > 0) return;
    w.lastDamageSrc = srcKind; w.lastDamageName = srcName || '';
    if (element >= 1 && element <= 3) {
      var bit = 1 << (element - 1);
      if (p.layerMask & bit) {
        p.layerMask &= ~bit; p.layers--;
        Render.fx('layerPop', p.x, p.y - 34, element, 0);
        Render.sound('layer_pop');
        if (p.layers === 0) Render.sound('uncapped');
        return;
      }
      if (p.layers === 0) amt *= 2;
    }
    p.hp -= amt; p.hurtT = CFG.PLAYER.hurtT; p.flash = CFG.ENEMY.flash; w.arena.hurt = 1;
    Render.sound('hurt'); Render.fx('vignette', 0, 0, 0, 0); Render.fx('shake', 0, 0, 0.35, 0);
    if (p.hp <= 0) { p.hp = 0; Flow.killPlayer(w); }
  }

  // Returns true if the Charm landed. src is the attacker object (enemy or boss), for escape-mercy.
  function charmPlayer(w, src, drain) {
    var p = w.player;
    if (!live(w) || p.iframes > 0 || p.flustered > 0 || (src && src.charmCd > 0)) return false;
    p.composure -= drain * (1 - p.mods.charmReduce);
    p.flustered = C.flusterT; p.mashes = 0; p.charmSrc = src; p.sinceCharm = 0;
    p.vx = 0; p.rollT = 0; p.atkT = 0; p.queued = false;
    w.charmsTaken++; w.levelCharms++;
    if (src) src.charmCd = C.flusterT + C.mercy;
    Render.sound('charm_hit'); Render.fx('hearts', p.x, p.y - 40, 0, 8); Render.fx('zoom', p.x, p.y - 26, 0, 0);
    if (p.composure <= 0) swoon(w);
    return true;
  }

  function swoon(w) {
    var p = w.player;
    p.composure = C.swoonReset;
    w.flashRule3 = C.swoonFlash;
    w.lastDamageSrc = 'swoon'; w.lastDamageName = '';
    p.hp -= C.swoonDmg;
    Render.sound('swoon');
    if (p.hp <= 0) { p.hp = 0; Flow.killPlayer(w); }
  }

  function damageEnemy(w, e, amt, kind) {
    var spark = kind === 'spark';
    e.hp -= amt; e.flash = CFG.ENEMY.flash;
    if (e.hitstunCd <= 0) { e.st = 'hitstun'; e.stT = 0; e.charming = 0; e.attack = ''; e.hitstunCd = CFG.ENEMY.hitstunCd; }
    w.hitstop = Math.max(w.hitstop, spark ? CFG.HITSTOP.spark : CFG.HITSTOP.melee);
    Render.fx('hit', e.x, e.y - e.h / 2, spark ? 1 : 0, spark ? 4 : 6);
    Render.fx('shake', 0, 0, spark ? 0.15 : 0.25, 0);
    Render.sound(spark ? 'spark_hit' : 'hit');
    Render.fx('dmg', e.x, e.y - e.h - 6, amt, 0);
    if (e.hp <= 0) killEnemy(w, e);
  }

  function killEnemy(w, e) {
    var p = w.player;
    dropLoot(w, e);
    if (++p.flaskKills >= CFG.FLASK.killsPerCharge) { p.flaskKills = 0; if (p.flask < p.flaskMax) p.flask++; }
    e.alive = false;
    Render.fx('dust', e.x, e.y, 0, 0);
    if (RNG.fx.next() < 0.15) Render.censor(e.x - 40, e.y - 104, 80, 11, TEXT.captions[0], 0.9);   // the mods got there first
    Render.sound('enemy_die');
  }

  function damageBoss(w, amt, kind) {
    var b = w.boss;
    if (!b.alive || b.st === 'intro' || b.st === 'phase' || b.st === 'defeated') return;
    b.hp = Math.max(0, b.hp - amt); b.flash = CFG.ENEMY.flash;
    w.hitstop = Math.max(w.hitstop, CFG.HITSTOP.boss);
    Render.fx('bossHit', b.x, b.y - b.h / 2, kind === 'spark' ? 1 : 0, 8);
    Render.fx('dmg', b.x, b.y - b.h - 8, amt, 1);
    Render.fx('shake', 0, 0, 0.4, 0);
    Render.sound('hit_heavy');
  }

  function drop(w, kind, x, y) {
    var pk = World.spawnPickup(w, kind, x, y);
    if (!pk) return;
    pk.vx = RNG.game.range(-LOOT.dropVx, LOOT.dropVx);
    Render.fx('beam', x, y, CFG.TIER[kind], 0);
    if (kind === 'divine') { Render.sound('divine_ding'); Render.fx('divineGlow', 0, 0, 0, 0); }
    else Render.sound('loot_drop');
    if (kind === 'exalt') w.secondsSinceExalt = 0;
  }

  // GDD §2.7. Fixed roll order: chaos, exalt, vaal, tailor, divine, then pity.
  function dropLoot(w, e) {
    var G = RNG.game, mul = 1 + w.player.mods.dropMul, x = e.x, y = e.y - e.h / 2, elite = e.kind === 'elite', gotEx = false;
    var t = elite ? LOOT.elite : LOOT.common;
    if (G.chance(t.chaos * mul) || e.first) drop(w, 'chaos', x, y);
    if (elite && G.chance(t.exalt * mul)) { drop(w, 'exalt', x, y); gotEx = true; }
    if (elite && G.chance(t.vaal * mul)) drop(w, 'vaal', x, y);
    if (elite && G.chance(t.tailor * mul)) drop(w, 'tailor', x, y);
    if (G.chance(LOOT.divine * mul)) drop(w, 'divine', x, y);
    if (!gotEx && w.secondsSinceExalt >= LOOT.pityS) drop(w, 'exalt', x, y);
  }

  function bossLoot(w) {
    var b = w.boss, B = LOOT.boss, i, x = b.x, y = b.y - b.h / 2;
    for (i = 0; i < B.chaos; i++) drop(w, 'chaos', x, y);
    for (i = 0; i < B.exalt; i++) drop(w, 'exalt', x, y);
    for (i = 0; i < B.vaal; i++) drop(w, 'vaal', x, y);
  }

  // Tailor's Orb order: Lightning, then Cold, then Fire.
  function restoreLayer(p) {
    var bit = !(p.layerMask & 4) ? 4 : !(p.layerMask & 2) ? 2 : !(p.layerMask & 1) ? 1 : 0;
    if (!bit) return false;
    p.layerMask |= bit; p.layers++;
    return true;
  }

  function collect(w, pk) {
    var p = w.player, k = pk.kind, cur = w.currency;
    pk.alive = false;
    Render.sound(PICKUP_SOUND[k]);
    if (k === 'tea') {
      if (p.composure >= p.composureMax) {
        cur.chaos++; w.currencyValue += CFG.VALUE.chaos;
        Render.fx('text', pk.x, pk.y - 12, TEXT.ui.taxed, 0);
      } else p.composure = Math.min(p.composureMax, p.composure + C.tea);
      return;
    }
    if (k === 'flask') { p.flask = p.flaskMax; Render.fx('text', pk.x, pk.y - 12, TEXT.ui.flaskFull, 0); return; }
    if (k === 'tabula') return;
    if (!(k === 'tailor' && restoreLayer(p))) cur[k]++;
    w.currencyValue += CFG.VALUE[k];
    if (w.oohT <= 0) { Render.fx('text', pk.x, pk.y - 12, TEXT.ui.ooh, 0); w.oohT = LOOT.oohCd; }
    Render.fx('sparkles', pk.x, pk.y, 0, 0);
  }

  // Kitava's Feast: eats the top remaining layer (Fire, then Cold, then Lightning). Returns 0-2, or -1.
  function eatLayer(w) {
    var p = w.player, i;
    for (i = 0; i < 3; i++) {
      if (p.layerMask & (1 << i)) {
        p.layerMask &= ~(1 << i); p.layers--;
        Render.sound('chomp'); Render.fx('chomp', p.x, p.y - 34, i + 1, 0);
        if (p.layers === 0) Render.sound('uncapped');
        return i;
      }
    }
    return -1;
  }

  return { damagePlayer: damagePlayer, charmPlayer: charmPlayer, damageEnemy: damageEnemy, damageBoss: damageBoss,
    dropLoot: dropLoot, bossLoot: bossLoot, collect: collect, eatLayer: eatLayer, swoon: swoon, restoreLayer: restoreLayer };
})();
