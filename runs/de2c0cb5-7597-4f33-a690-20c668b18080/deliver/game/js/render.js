// Render: canvas setup, per-level bakes, the frame's draw order (tech plan §8) and the logic→render hooks (§13.4).
// Reads world only; every cosmetic timer lives here or in Fx.
var Render = (function () {
  var W = 640, H = 360, TILE = 16, CHUNK = 1024;
  var canvas, ctx;
  var view = { x: 0, y: 0, scale: 1 }, stats = { barsLive: 0, decoLive: 0 };
  var chunks = [], nChunks = 0, bakedSerial = -1, bakedFor = null;
  var farS = null, midS = null, tileS = null, levelIdx = 0;
  var titleT = 0;
  // hero squash & stretch, cosmetic: detects take-off and landing from world.player
  var hero = { prevGround: 1, prevAnim: '', sq: 0, sqKind: 0 };
  var BOSS_MAP = buildBossMaps();
  var FOE_MAP = {
    grunt: { idle: [0, 2], walk: [2, 4], windup: [6, 2], attack: [8, 2], charm: [14, 2], hitstun: [10, 1], dead: [11, 3], hat: [20, 4] },
    caster: { idle: [0, 2], walk: [2, 4], windup: [6, 2], attack: [8, 2], charm: [10, 2], hitstun: [12, 1], dead: [13, 3], hat: [20, 3] },
    elite: { idle: [0, 2], walk: [2, 4], windup: [6, 2], attack: [8, 2], charm: [10, 2], hitstun: [13, 1], dead: [14, 3], hat: [28, 6], recover: [12, 1] }
  };
  var ELEMENT_ROLE = ['phys', 'fire', 'cold', 'lightning', 'charm'];
  var TIER_ROLE = { chaos: 'loot_chaos', tailor: 'loot_tailor', vaal: 'loot_vaal', exalt: 'loot_exalt', divine: 'loot_divine' };
  var ORB_FRAME = { chaos: 0, tailor: 1, vaal: 2, exalt: 3, divine: 4 };
  var PROJ_SPR = { spark: 'proj_spark', bolt: 'proj_bolt', kiss: 'proj_kiss', censorbar: 'proj_censor', barbell: 'proj_barbell', flasklob: 'proj_flask', shockwave: 'proj_shockwave' };
  // Gag props in the tech plan's index order (TEXT.gags[i].prop may be this index or a sprite name).
  var PROPS = ['prop_sign_dresscode', 'prop_chest_tabula', 'npc_merveil_shell', 'npc_bestel', 'prop_signup', 'prop_protein', 'prop_tally',
    'prop_window', 'prop_booth', 'npc_einhar', 'prop_vanity', 'prop_menu', 'prop_wetfloor', 'prop_reservation', 'prop_tipjar', 'prop_dessert'];
  var boltTints = null;

  // ---------- hooks ----------
  function init(cnv, done) {
    canvas = cnv;
    ctx = canvas.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = false;
    resize();
    window.addEventListener('resize', resize);
    Font.init(Assets.pal);
    Fx.init();
    Hud.init();
    Assets.load(done);
  }

  function resize() {
    var s = Math.max(1, Math.floor(Math.min(window.innerWidth / W, window.innerHeight / H)));
    canvas.style.width = W * s + 'px'; canvas.style.height = H * s + 'px';
    var r = canvas.getBoundingClientRect();
    view.x = r.left; view.y = r.top; view.scale = s;
    if (ctx) ctx.imageSmoothingEnabled = false;
  }

  function warmup() {
    var names = Assets.names();
    ctx.globalAlpha = 0.01;
    for (var i = 0; i < names.length; i++) {
      var e = Assets.sprite(names[i]);
      ctx.drawImage(e.img, 0, 0); if (e.white) ctx.drawImage(e.white, 0, 0); if (e.pink) ctx.drawImage(e.pink, 0, 0);
      if (e.tints) for (var t = 0; t < e.tints.length; t++) ctx.drawImage(e.tints[t], 0, 0);
    }
    for (var k in Font.atlas) ctx.drawImage(Font.atlas[k], 0, 0);
    // Allocate and upload everything a level switch would otherwise create mid-game: tile chunks for the widest level
    // and the muted backdrops. A cutscene then only re-bakes existing canvases.
    var maxCols = 0, li;
    for (li = 0; li < LEVELS.length; li++) maxCols = Math.max(maxCols, LEVELS[li].cols);
    while (chunks.length < Math.ceil(maxCols * TILE / CHUNK)) chunks.push(Assets.canvas(CHUNK, 23 * TILE));
    for (li = 0; li < chunks.length; li++) ctx.drawImage(chunks[li], 0, 0);
    for (li = 0; li < 5; li++) if (BG_MUTE[li]) {
      ctx.drawImage(muted(Assets.sprite('bg_l' + (li + 1) + '_far'), BG_MUTE[li]).img, 0, 0);
      ctx.drawImage(muted(Assets.sprite('bg_l' + (li + 1) + '_mid'), BG_MUTE[li]).img, 0, 0);
    }
    Fx.prewarm(ctx);
    ctx.globalAlpha = 1;
    boltTints || bakeBoltTints();
  }

  function bakeBoltTints() {
    var e = Assets.sprite('proj_bolt'); boltTints = [];
    for (var i = 0; i < 4; i++) {
      var c = Assets.canvas(e.img.width, e.img.height), x = c.getContext('2d');
      x.drawImage(e.img, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = Assets.pal[ELEMENT_ROLE[i]]; x.fillRect(0, 0, c.width, c.height);
      x.globalCompositeOperation = 'destination-in'; x.drawImage(e.img, 0, 0);
      boltTints.push(c);
    }
  }

  // Bakes tile chunks (1024x368 each) for world.level and picks the level's parallax.
  function levelLoaded(world) {
    var lv = world.level; if (!lv) return;
    levelIdx = Math.max(0, Math.min(4, world.levelIndex | 0));
    farS = muted(Assets.sprite('bg_l' + (levelIdx + 1) + '_far'), BG_MUTE[levelIdx]);
    midS = muted(Assets.sprite('bg_l' + (levelIdx + 1) + '_mid'), BG_MUTE[levelIdx]);
    tileS = Assets.sprite('tiles_l' + (levelIdx + 1));
    var cols = lv.cols, rows = lv.rows || 23, need = Math.ceil(cols * TILE / CHUNK);
    while (chunks.length < need) chunks.push(Assets.canvas(CHUNK, rows * TILE));
    nChunks = need;
    for (var c = 0; c < need; c++) {
      var x = chunks[c].getContext('2d');
      x.imageSmoothingEnabled = false;
      x.clearRect(0, 0, CHUNK, rows * TILE);
      var tx0 = c * CHUNK / TILE, tx1 = Math.min(cols, tx0 + CHUNK / TILE);
      for (var ty = 0; ty < rows; ty++) for (var tx = tx0; tx < tx1; tx++) bakeTile(x, lv, tx, ty, (tx - tx0) * TILE, ty * TILE);
    }
    placeDeco(world, lv);
    bakedSerial = world.levelSerial; bakedFor = lv;
    Fx.clear();
  }

  // Busy backdrops (the Prison's bars and fence) get a dark wash, baked once per sprite, so foes and props read in front.
  var BG_MUTE = [0, 0.45, 0, 0, 0], mutedCache = {};
  function muted(e, a) {
    if (!a || !e || !e.img) return e;
    var key = e.name || e.img.src || String(e.fh) + e.fw;
    if (mutedCache[key]) return mutedCache[key];
    var c = Assets.canvas(e.img.width, e.img.height), x = c.getContext('2d');
    x.drawImage(e.img, 0, 0);
    x.globalCompositeOperation = 'source-atop'; x.globalAlpha = a; x.fillStyle = '#14161A'; x.fillRect(0, 0, c.width, c.height);
    return (mutedCache[key] = { img: c, fw: e.fw, fh: e.fh, frames: e.frames, name: key });
  }

  // ---------- censored set dressing (cosmetic): one prop every DECO_GAP px on solid ground, clear of gags ----------
  var LANE_H = 76, DECO_GAP = 600, MAX_DECO = 12, deco = [], decoN = 0;
  for (var di = 0; di < MAX_DECO; di++) deco.push({ x: 0, y: 0, name: '', cap: '', w: 0 });
  function placeDeco(world, lv) {
    var list = window.TEXT && TEXT.deco && TEXT.deco[levelIdx], end = lv.def ? lv.def.bossDoorAt * TILE - 200 : lv.cols * TILE, k = 0;
    decoN = 0;
    if (!list) return;
    for (var x = 420; x < end && decoN < MAX_DECO; x += DECO_GAP) {
      var gy = groundY(lv, x), v = code(lv, (x / TILE) | 0, gy / TILE);
      if (gy >= lv.rows * TILE || v !== 1 && v !== 4 || nearGag(world, x)) continue;
      var d = deco[decoN++], item = list[k++ % list.length];
      d.x = x; d.y = gy; d.name = item[0]; d.cap = item[1]; d.w = Font.width(item[1], 1) + 6;
    }
  }
  function nearGag(world, x) {
    for (var i = 0; i < world.gags.length; i++) if (world.gags[i].alive && Math.abs(world.gags[i].x - x) < 96) return true;
    return false;
  }
  function drawDeco(camX, camY) {
    for (var i = 0, slot = 0; i < decoN; i++) {
      var d = deco[i], sx = d.x - camX;
      if (sx < -100 || sx > 740) continue;
      var e = Assets.sprite(d.name);
      blit(e, e.img, 0, sx, d.y - camY, e.fw >> 1, e.fh, false);
      // the label rides above the hero's lane (feet to hat, 64 px + margin): it covers the prop's top or floats like a sign
      var by = d.y - camY - Math.max(LANE_H, e.fh) - 4, bx = Math.max(2, Math.min(638 - d.w, sx - (d.w >> 1)));
      Fx.decoBar(ctx, canvas, slot++, bx | 0, by | 0, d.w, 12, d.cap);
    }
    stats.decoLive = Math.min(slot, 4);
  }

  function code(lv, tx, ty) { return tx < 0 || tx >= lv.cols || ty < 0 || ty >= lv.rows ? (ty >= lv.rows ? 1 : 0) : lv.tiles[ty * lv.cols + tx]; }
  function solid(v) { return v === 1 || v === 3 || v === 4; }

  function bakeTile(x, lv, tx, ty, px, py) {
    var v = code(lv, tx, ty); if (!v) return;
    var e = tileS, f;
    if (v === 2) {
      var l = code(lv, tx - 1, ty) === 2, r = code(lv, tx + 1, ty) === 2;
      f = l && r ? 7 : !l && r ? 6 : l && !r ? 8 : 7;
    } else {
      var top = !solid(code(lv, tx, ty - 1)), lf = !solid(code(lv, tx - 1, ty)), rt = !solid(code(lv, tx + 1, ty));
      f = top ? (lf ? 0 : rt ? 2 : 1) : (lf ? 3 : rt ? 5 : 4);
    }
    x.drawImage(e.img, f * e.fw, 0, e.fw, e.fh, px, py, TILE, TILE);
    var pal = Assets.pal;
    if (v === 3) { x.fillStyle = pal.acid; x.fillRect(px, py, TILE, 3); x.fillStyle = '#3A5A1A'; x.fillRect(px, py + 3, TILE, 2); }
    if (v === 4 && !solid(code(lv, tx, ty - 1))) { x.fillStyle = 'rgba(200,230,255,0.35)'; x.fillRect(px + ((tx * 5) % 9), py + 3, 5, 1); }
    // sparse decoration on open ground tops, deterministic per tile
    if (v === 1 && !solid(code(lv, tx, ty - 1)) && ty > 0 && ((tx * 7 + ty * 3) % 11) === 0)
      x.drawImage(e.img, (9 + tx % 3) * e.fw, 0, e.fw, e.fh, px, py - TILE, TILE, TILE);
  }

  function frame(world, alpha, dtMs) {
    if (!ctx) return;
    var state = world.state, mode = world.mode;
    Fx.update(state === 'pause' || state === 'title' && !world.level ? 0 : dtMs, world);
    stats.barsLive = Fx.barsLive + (stats.decoLive | 0);
    musicFor(world);
    titleT += dtMs / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    if (state === 'title' || !world.level) {
      drawParallax(Assets.sprite('bg_l1_far'), Assets.sprite('bg_l1_mid'), titleT * 40);
    } else if (mode === 'hideout') {
      ctx.drawImage(Assets.sprite('bg_hideout').img, 0, 0);
    } else {
      drawWorld(world, alpha);
    }
    Hud.draw(ctx, world, dtMs);
    Fx.drawScreen(ctx, canvas);
  }

  // ---------- world layers ----------
  function lerp(a, b, t) { return a + (b - a) * t; }

  function drawParallax(far, mid, camX) {
    var ox = -Math.floor(camX * 0.25) % W;
    ctx.drawImage(far.img, ox, 0); ctx.drawImage(far.img, ox + W, 0);
    ox = -Math.floor(camX * 0.5) % W;
    ctx.drawImage(mid.img, ox, H - mid.fh); ctx.drawImage(mid.img, ox + W, H - mid.fh);
  }

  function drawWorld(w, alpha) {
    if (w.level !== bakedFor || w.levelSerial !== bakedSerial) levelLoaded(w);
    var cam = w.cam, inPlay = w.state === 'play';
    var a = inPlay ? alpha : 1;
    var camX = Math.floor(lerp(cam.px === undefined ? cam.x : cam.px, cam.x, a)) + Fx.shakeX;
    var camY = Math.floor(lerp(cam.py === undefined ? cam.y : cam.py, cam.y, a)) + Fx.shakeY;
    ctx.fillStyle = Assets.pal.bg_far; ctx.fillRect(0, 0, W, H);
    drawParallax(farS, midS, camX);

    var p = w.player, pxs = Math.floor(lerp(p.px === undefined ? p.x : p.px, p.x, a)) - camX, pys = Math.floor(lerp(p.py === undefined ? p.y : p.py, p.y, a)) - camY;
    if (Fx.zoom > 0) ctx.setTransform(1.04, 0, 0, 1.04, -pxs * 0.04, -(pys - 32) * 0.04);

    // 2. tiles
    for (var c = 0; c < nChunks; c++) {
      var cx = c * CHUNK - camX;
      if (cx > W || cx + CHUNK < 0) continue;
      ctx.drawImage(chunks[c], cx, -camY);
    }
    // 3. hazards, checkpoints, gates, gags, glyphs
    drawHazards(w, camX, camY);
    drawFixtures(w, camX, camY);
    // 4. pickups + beams
    drawPickups(w, camX, camY);
    // 5. enemies, 6. boss
    drawEnemies(w, camX, camY);
    drawBoss(w, camX, camY);
    // 7. player
    drawPlayer(w, pxs, pys);
    // 8. projectiles
    drawProjectiles(w, camX, camY);
    // 9. particles
    Fx.draw(ctx, camX, camY);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // 10. censor bars, then Dominus strips
    Fx.drawBars(ctx, camX, camY, canvas);
    Fx.drawStrips(ctx, w, canvas);
    // 11. speech bubbles and float texts
    Hud.drawBubbles(ctx, w, camX, camY, pxs, pys);
    Fx.drawTexts(ctx, camX, camY);
  }

  function frameOf(e, f) { return f < e.frames ? f : 0; }

  // Draws frame f of entry e with its feet-anchor (ax, ay in frame px) at screen (x, y); flips around the anchor.
  function blit(e, img, f, x, y, ax, ay, flip) {
    f = frameOf(e, f);
    var dx = (x - (flip ? e.fw - ax : ax)) | 0, dy = (y - ay) | 0;
    if (!flip) { ctx.drawImage(img, f * e.fw, 0, e.fw, e.fh, dx, dy, e.fw, e.fh); return; }
    ctx.save(); ctx.translate(dx + e.fw, dy); ctx.scale(-1, 1);
    ctx.drawImage(img, f * e.fw, 0, e.fw, e.fh, 0, 0, e.fw, e.fh);
    ctx.restore();
  }

  function groundY(lv, x) {
    var tx = (x / TILE) | 0;
    for (var ty = 0; ty < lv.rows; ty++) { var v = code(lv, tx, ty); if (v === 1 || v === 3 || v === 4) return ty * TILE; }
    return lv.rows * TILE;
  }

  function drawHazards(w, camX, camY) {
    var hz = w.hazards; if (!hz) return;
    var t = w.tick / 60;
    for (var i = 0; i < hz.length; i++) {
      var h = hz[i]; if (!h.alive) continue;
      var x = (h.x - camX) | 0, y = (h.y - camY) | 0, e, f, k;
      switch (h.kind) {
        case 'plate':
          e = Assets.sprite('hz_plate'); f = h.st === 'armed' ? 0 : h.st === 'tell' ? 1 + (Math.floor(t * 10) & 1) : 3;
          for (k = 0; k < h.w; k += e.fw) ctx.drawImage(e.img, f * e.fw, 0, e.fw, e.fh, x + k, y + h.h - e.fh, e.fw, e.fh);
          break;
        case 'acid':
        case 'puddle':
          e = Assets.sprite(h.kind === 'acid' ? 'hz_acid' : 'hz_fire_puddle'); f = Math.floor(t * (h.kind === 'acid' ? 8 : 10)) % e.frames;
          for (k = 0; k < h.w; k += e.fw) ctx.drawImage(e.img, f * e.fw, 0, Math.min(e.fw, h.w - k), e.fh, x + k, y + h.h - e.fh, Math.min(e.fw, h.w - k), e.fh);
          break;
        case 'pillar':
          if (h.st === 'tell') tellDecal(x, y + h.h, h.w, t);
          else { e = Assets.sprite('hz_pillar'); blit(e, e.img, h.st === 'active' ? 1 : 0, x + (h.w >> 1), y + h.h, e.fw >> 1, e.fh, false); }
          break;
        case 'ring':
        case 'nova':
          jaggedRing(x, y, h.r || 0, h.kind === 'ring' ? Assets.pal.charm : Assets.pal.cold, h.st === 'tell');
          break;
      }
    }
  }

  function tellDecal(x, yGround, w, t) {
    var e = Assets.sprite('hz_tell_ground'), f = Math.floor(t * 8) & 1;
    for (var k = 0; k < w; k += e.fw) ctx.drawImage(e.img, f * e.fw, 0, Math.min(e.fw, w - k), e.fh, x + k, yGround - e.fh, Math.min(e.fw, w - k), e.fh);
  }

  // Heart ring / Purity Nova: 16-tooth jagged ring (angular, never round, so it never reads as loot).
  function jaggedRing(cx, cy, r, color, tell) {
    if (r < 2) return;
    ctx.fillStyle = tell ? Assets.pal.telegraph : color;
    var n = Math.max(32, Math.min(160, (r * 0.8) | 0) & ~1);
    for (var i = 0; i < n; i++) { // 16 teeth: radius swings out and in along the ring
      var an = i / n * 6.2832, tooth = (i * 16 / n) % 1, rr = r + (tooth < 0.5 ? tooth * 12 : (1 - tooth) * 12) - 3;
      ctx.fillRect((cx + Math.cos(an) * rr - 2) | 0, (cy + Math.sin(an) * rr - 2) | 0, 4, 4);
    }
  }

  function drawFixtures(w, camX, camY) {
    var lv = w.level, i, e;
    drawDeco(camX, camY);
    if (w.checkpoints) { e = Assets.sprite('checkpoint'); for (i = 0; i < w.checkpoints.length; i++) { var cp = w.checkpoints[i]; if (cp.alive) blit(e, e.img, cp.active ? 1 : 0, cp.x - camX, groundY(lv, cp.x) - camY, 12, e.fh - 1, false); } }
    if (w.gates) { e = Assets.sprite('gate'); for (i = 0; i < w.gates.length; i++) { var g = w.gates[i]; if (!g.alive) continue; var f = g.st === 'locked' ? 0 : g.st === 'open' ? 2 : 2; blit(e, e.img, f, g.x0 - camX, groundY(lv, g.x0) - camY, 12, e.fh, false); blit(e, e.img, f, g.x1 - camX, groundY(lv, g.x1) - camY, 12, e.fh, false); } }
    if (w.gags) for (i = 0; i < w.gags.length; i++) {
      var gg = w.gags[i]; if (!gg.alive) continue;
      var def = window.TEXT && TEXT.gags && TEXT.gags[gg.id], pr = def ? def.prop || def.npc : gg.id;
      var name = typeof pr === 'string' ? pr : PROPS[pr | 0] || PROPS[0];
      e = Assets.sprite(name);
      var fr = gg.triggered ? Math.min(e.frames - 1, 1 + (Math.floor(w.tick / 15) % Math.max(1, e.frames - 1))) : 0;
      blit(e, e.img, fr, gg.x - camX, gg.y - camY, e.fw >> 1, e.fh, false);
      if (gg.near && !gg.triggered) { var al = Assets.sprite('ui_alert'); blit(al, al.img, (w.tick >> 4) & 1, gg.x - camX, gg.y - e.fh - 4 - camY, al.fw >> 1, al.fh, false); }
    }
    // Tutorial: the glyph nearest the hero shows as one screen-space strip under the wave label, fully on screen.
    var best = null, bd = 260;
    if (w.glyphs) for (i = 0; i < w.glyphs.length; i++) { var gl = w.glyphs[i]; if (gl.alive && gl.text && Math.abs(gl.x - w.player.x) < bd) { bd = Math.abs(gl.x - w.player.x); best = gl; } }
    if (best) drawGlyph(best.text, 320, 68);
  }

  function drawPickups(w, camX, camY) {
    var pk = w.pickups; if (!pk) return;
    var pal = Assets.pal, pulse = 0.7 + 0.2 * Math.sin(w.tick / 60 * 6.283);
    for (var i = 0; i < pk.length; i++) {
      var p = pk[i]; if (!p.alive) continue;
      var x = (p.x - camX) | 0, y = (p.y - camY) | 0, e, f = 0, tier = TIER_ROLE[p.kind];
      if (tier) {
        if (p.st === 'resting') { // 2 px beam with a loot_core centre, rises over 0.2 s
          var bh = Math.min(48, ((p.t || 1) / 0.2) * 48) | 0;
          ctx.globalAlpha = pulse; ctx.fillStyle = pal[tier]; ctx.fillRect(x - 2, y - bh, 4, bh);
          ctx.fillStyle = pal.loot_core; ctx.fillRect(x - 1, y - bh, 2, bh); ctx.globalAlpha = 1;
        }
        e = Assets.sprite('orbs'); f = ORB_FRAME[p.kind];
      } else if (p.kind === 'tea') { e = Assets.sprite('pickup_tea'); f = (w.tick >> 4) & 1; }
      else if (p.kind === 'flask') e = Assets.sprite('pickup_flask');
      else e = Assets.sprite('orbs');
      ctx.drawImage(e.img, frameOf(e, f) * e.fw, 0, e.fw, e.fh, x - (e.fw >> 1), y - (e.fh >> 1), e.fw, e.fh);
    }
  }

  function seq(m, t, fps, loop) { var f = Math.floor(t * fps); return loop ? f % m[1] : Math.min(m[1] - 1, f); }

  function drawEnemies(w, camX, camY) {
    var en = w.enemies; if (!en) return;
    var tint = Math.max(0, Math.min(4, w.levelIndex | 0)), hats = Assets.sprite('foe_hats');
    for (var i = 0; i < en.length; i++) {
      var o = en[i]; if (!o.alive) continue;
      var kind = o.kind === 'choir' ? 'caster' : o.kind, m = FOE_MAP[kind] || FOE_MAP.grunt, e = Assets.sprite(kind);
      var st = o.st, t = o.stT || 0, f, charmAtk = o.attack === 'wink' || o.attack === 'kiss' || o.attack === 'line';
      if (st === 'dead') f = m.dead[0] + seq(m.dead, t, 10, false);
      else if (st === 'hitstun') f = m.hitstun[0];
      else if ((st === 'windup' || st === 'attack') && (charmAtk || o.charming)) f = m.charm[0] + seq(m.charm, t, 8, true);
      else if (st === 'windup') f = m.windup[0] + seq(m.windup, t, 8, true);
      else if (st === 'attack') f = m.attack[0] + seq(m.attack, t, 10, false);
      else if (st === 'recover' && m.recover) f = m.recover[0];
      else if (st === 'patrol' || st === 'chase') f = m.walk[0] + seq(m.walk, w.tick / 60, 8, true);
      else f = m.idle[0] + seq(m.idle, w.tick / 60, 3, true);
      var bob = kind === 'caster' ? ((w.tick >> 4) & 1) : 0;
      var ax = e.fw >> 1, ay = e.fh - 1, x = o.x - camX, y = o.y - camY - bob, flip = o.facing < 0;
      var img = o.flash > 0 && e.white ? e.white : o.charming && e.pink ? e.pink : e.tints ? e.tints[tint] : e.img;
      if (st === 'dead') ctx.globalAlpha = Math.max(0.2, 1 - t / 0.6);
      blit(e, img, f, x, y, ax, ay, flip);
      if (st !== 'dead') {
        var ha = m.hat, hy = y - ay + ha[1] + ((f === 3 || f === 5) ? -1 : 0), hx = flip ? x + (ax - ha[0]) : x - (ax - ha[0]);
        blit(hats, hats.img, tint * 3 + (kind === 'grunt' ? 0 : kind === 'caster' ? 1 : 2), hx, hy, hats.fw >> 1, hats.fh, flip);
        // threat accent: a red life sliver at the feet once hurt, so a foe never reads as part of the hero at the screen edge
        if (o.hp < o.hpMax && o.hpMax > 0) {
          var bw = kind === 'elite' ? 28 : 20, bx = (x - (bw >> 1)) | 0, byy = (y + 3) | 0;
          ctx.fillStyle = Assets.pal.ink; ctx.fillRect(bx - 1, byy - 1, bw + 2, 4);
          ctx.fillStyle = Assets.pal.hp; ctx.fillRect(bx, byy, Math.max(1, Math.round(bw * o.hp / o.hpMax)), 2);
        }
      }
      ctx.globalAlpha = 1;
      if (o.charming && st !== 'dead') { var ht = Assets.sprite('ui_heart_tell'); blit(ht, ht.img, (w.tick >> 3) & 1, x, y - e.fh - 4, ht.fw >> 1, ht.fh, false); }
    }
  }

  function buildBossMaps() {
    // per boss: idle, hurt, defeated, and attack id -> [tellStart, tellLen, activeStart, activeLen]
    return {
      hillock: { idle: [0, 4], hurt: 12, dead: [13, 3], atk: { 1: [4, 2, 6, 2], 2: [8, 2, 10, 2], 12: [8, 2, 10, 2] } },
      brutus: { idle: [0, 4], hurt: 15, dead: [16, 3], atk: { 1: [4, 3, 7, 2], 3: [4, 3, 7, 2], 4: [9, 2, 11, 2], 2: [13, 2, 13, 2] } },
      dominus: { idle: [0, 4], hurt: 12, dead: [13, 3], atk: { 5: [4, 3, 4, 3], 6: [7, 2, 7, 2], 7: [9, 3, 9, 3], 2: [9, 3, 9, 3] } },
      piety: { idle: [0, 4], hurt: 10, dead: [11, 3], atk: { 8: [4, 2, 6, 2], 2: [8, 2, 8, 2], 1: [4, 2, 6, 2] } },
      heart: { idle: [0, 4], hurt: 6, dead: [7, 3], atk: { 9: [4, 2, 0, 4], 2: [4, 2, 0, 4] } },
      kitava: { idle: [0, 4], hurt: 20, dead: [21, 3], atk: { 1: [4, 2, 6, 2], 2: [8, 2, 10, 2], 10: [12, 2, 14, 2], 11: [8, 2, 16, 3] } }
    };
  }

  function drawBoss(w, camX, camY) {
    var b = w.boss; if (!b || !b.alive) return;
    var e = Assets.sprite('boss_' + b.id), m = BOSS_MAP[b.id] || BOSS_MAP.hillock, f, t = b.stT || 0, a = m.atk[b.attack];
    if (b.st === 'defeated') f = m.dead[0] + Math.min(m.dead[1] - 1, Math.floor(t * 6));
    else if (b.st === 'windup' && a) f = a[0] + Math.floor(t * 8) % a[1];
    else if (b.st === 'attack' && a) f = a[2] + Math.min(a[3] - 1, Math.floor(t * 10));
    else if (b.flash > 0) f = m.hurt;
    else f = m.idle[0] + Math.floor(w.tick / 60 * 6) % m.idle[1];
    if (b.id === 'kitava' && b.attack === 11 && b.st === 'attack' && Math.floor(t * 4) % 4 === 3) f = 19;
    var x = b.x - camX, y = b.y - camY, flip = b.facing < 0;
    if (b.st === 'windup' && a) tellDecal((x - e.fw / 2) | 0, y | 0, e.fw, w.tick / 60);
    var img = (b.charming || (b.st === 'windup' && b.attack === 2)) && e.pink ? e.pink : e.img;
    blit(e, img, f, x, y, e.fw >> 1, e.fh - 1, flip);
    // A boss is a screen-sized sprite: its hit flash is a half-strength white wash, so the hit reads without a blinding silhouette.
    if (b.flash > 0 && e.white) { ctx.globalAlpha = 0.5; blit(e, e.white, f, x, y, e.fw >> 1, e.fh - 1, flip); ctx.globalAlpha = 1; }
    if ((b.charming || b.attack === 2) && b.st === 'windup') { var ht = Assets.sprite('ui_heart_tell'); blit(ht, ht.img, (w.tick >> 3) & 1, x, y - e.fh - 4, ht.fw >> 1, ht.fh, false); }
  }

  var HERO_ANIM = {
    idle: [0, 4, 6, 1], run: [4, 6, 12, 1], jump: [10, 2, 8, 0], fall: [12, 2, 8, 1], melee1: [14, 3, 18, 0], melee2: [17, 3, 18, 0],
    melee3: [20, 4, 14, 0], cast: [24, 3, 14, 0], roll: [27, 5, 14, 0], hurt: [32, 1, 1, 0], flustered: [33, 2, 8, 1],
    swoon: [35, 2, 8, 1], dead: [37, 4, 7, 0], cutscene: [0, 4, 6, 1]
  };
  var LAYERS = [['hero_leggings', 4], ['hero_tunic', 2], ['hero_cloak', 1]];

  function drawPlayer(w, x, y) {
    var p = w.player, an = HERO_ANIM[p.anim] || HERO_ANIM.idle, t = p.animT || 0;
    var f = an[0] + (an[3] ? Math.floor(t * an[2]) % an[1] : Math.min(an[1] - 1, Math.floor(t * an[2])));
    if (p.anim === 'idle' && t > 5 && (t % 7) < 1.5) f = 41 + Math.min(2, Math.floor((t % 7) * 2)); // fidget
    // squash & stretch (art direction §5): take-off 0.85x1.15, landing 1.2x0.8
    if (p.anim === 'jump' && hero.prevAnim !== 'jump') { hero.sq = 4; hero.sqKind = 1; }
    if (p.onGround && !hero.prevGround) { hero.sq = 10; hero.sqKind = 2; }
    hero.prevAnim = p.anim; hero.prevGround = p.onGround;
    var sx = 1, sy = 1;
    if (hero.sq > 0 && w.state === 'play') {
      var k = hero.sqKind === 2 && hero.sq < 6 ? hero.sq / 6 : 1;
      if (hero.sqKind === 1) { sx = 0.85; sy = 1.15; } else { sx = 1 + 0.2 * k; sy = 1 - 0.2 * k; }
      hero.sq--;
    }
    var flip = p.facing < 0, body = Assets.sprite('hero_body');
    var shimmer = p.iframes > 0 && p.anim !== 'roll' && (Math.floor(w.tick / 4) & 1);
    if (shimmer) ctx.globalAlpha = 0.5;
    if (sx !== 1) { ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy); ctx.translate(-x, -y); }
    var flash = p.flash > 0, pink = p.flustered > 0 && p.anim !== 'flustered';
    blit(body, flash ? body.white : pink && body.pink ? body.pink : body.img, f, x, y, 24, 63, flip);
    for (var i = 0; i < 3; i++) if (p.layerMask & LAYERS[i][1]) { var o = Assets.sprite(LAYERS[i][0]); blit(o, flash ? o.white : o.img, f, x, y, 24, 63, flip); }
    if (p.layers === 0 && !(p.tabulaT > 0)) { var br = Assets.sprite('hero_barrel'); blit(br, flash ? br.white : br.img, f, x, y, 24, 63, flip); }
    if (p.tabulaT > 0) { var tb = Assets.sprite('hero_tabula'); blit(tb, tb.img, 0, x, y - ((w.tick >> 3) & 1), 24, 63, flip); }
    if (p.hat) { var hat = Assets.sprite('hero_hat'); blit(hat, hat.img, f, x, y, 24, 63, flip); }
    if (sx !== 1) ctx.restore();
    ctx.globalAlpha = 1;
    if (p.flaskT > 0) { var fl = Assets.sprite('pickup_flask'); blit(fl, fl.img, 0, x + (flip ? -10 : 10), y - 36, fl.fw >> 1, fl.fh, false); }
    if (p.flustered > 0) { // orbiting hearts + mash glyph
      var hs = Assets.sprite('fx_heart'), tt = w.tick / 60;
      for (var h = 0; h < 3; h++) { var a2 = tt * 4 + h * 2.094; ctx.drawImage(hs.img, (h & 1) * hs.fw, 0, hs.fw, hs.fh, (x + Math.cos(a2) * 16 - 4) | 0, (y - 68 + Math.sin(a2) * 5) | 0, hs.fw, hs.fh); }
      var ms = Assets.sprite('ui_mash'), mf = (w.tick / 6) & 1;
      blit(ms, ms.img, mf, x + (flip ? -28 : 28), y - 56, ms.fw >> 1, ms.fh, false);
      if ((w.tick >> 3) & 1 || w.charmsTaken <= 3) Font.drawO(ctx, w.touchUI ? 'MASH A!' : 'MASH J!', x | 0, (y - 96) | 0, 2, 'censor', 1);
    }
  }

  function drawGlyph(text, x, y) {
    var tw = Font.width(text, 2);
    ctx.globalAlpha = 0.7; ctx.fillStyle = '#080A0C'; ctx.fillRect(x - (tw >> 1) - 6, y - 4, tw + 12, 22); ctx.globalAlpha = 1;
    Font.drawO(ctx, text, x, y, 2, 'text', 1);
  }

  function drawProjectiles(w, camX, camY) {
    var pr = w.projectiles; if (!pr) return;
    for (var i = 0; i < pr.length; i++) {
      var p = pr[i]; if (!p.alive) continue;
      var e = Assets.sprite(PROJ_SPR[p.kind] || 'proj_bolt'), f = Math.floor((p.t || 0) * 12) % e.frames, img = e.img;
      if (p.kind === 'bolt') { if (!boltTints) bakeBoltTints(); img = boltTints[(p.element | 0) % 4]; }
      var x = (p.x - camX) | 0, y = (p.y - camY) | 0;
      if (p.kind === 'shockwave') blit(e, img, f, x, y + (p.h >> 1), e.fw >> 1, e.fh, p.vx < 0);
      else blit(e, img, f, x, y, e.fw >> 1, e.fh >> 1, p.vx < 0 && p.kind !== 'barbell' && p.kind !== 'flasklob');
    }
  }

  // ---------- event hooks ----------
  function fx(kind, x, y, a, b) { Fx.spawn(kind, x, y, a, b); }

  function censor(x, y, w, h, caption, dur, followKind, followIdx) {
    var wd = window.Game && Game.world, target = null;
    if (wd && followKind) {
      if (followKind === 'gag' || followKind === 'npc') target = wd.gags && wd.gags[followIdx];
      else if (followKind === 'enemy') target = wd.enemies && wd.enemies[followIdx];
      else if (followKind === 'boss') target = wd.boss;
    }
    if (target && (followKind === 'gag' || followKind === 'npc')) y = Math.min(y, target.y - LANE_H - h);   // above the hero's lane
    Fx.censor(x, y, w, h, caption, dur, target, target ? x - target.x : 0, target ? y - target.y : 0);
  }

  // Repeated impact cues get a seeded ±8% pitch jitter (fx stream, cosmetic) so a combo does not machine-gun one sample.
  var JITTER = { hit: 1, spark_hit: 1, enemy_die: 1, swing: 1, melee: 1, spark_cast: 1, boss_hit: 1, pickup_chaos: 1, land: 1 };
  // Music follows the screen: the level's bed in play, the hideout loop between levels, silence on menus.
  function musicFor(w) {
    if (!window.SFX || !SFX.music) return;
    var m = w.state === 'pause' ? w.pausedMode : w.mode;
    SFX.music(w.state === 'title' || w.state === 'over' ? 0 : m === 'hideout' ? 6 : m === 'boss' || m === 'death' && w.deathPrevMode === 'boss' ? levelIdx + 11 : m === 'level' || m === 'death' ? levelIdx + 1 : 0);
  }

  function sound(key, rate) {
    if (!window.SFX || !SFX.play) return;
    if (rate === undefined && JITTER[key]) rate = 0.92 + 0.16 * RNG.fx.next();
    try { SFX.play(Assets.SFX_ALIAS[key] || key, rate); } catch (e) { /* audio must never break a frame */ }
  }

  return { init: init, warmup: warmup, levelLoaded: levelLoaded, frame: frame, fx: fx, censor: censor, sound: sound, view: view, stats: stats, resize: resize };
})();
