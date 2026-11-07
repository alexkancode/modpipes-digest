// Fx: cosmetic-only effects. Particles, sprite bursts, float text, censor bars, screen shake, punches.
// Never writes to world, never touches RNG.game. Every pool is allocated once in init().
var Fx = (function () {
  var NP = 256, NA = 48, NT = 32, NB = 6;
  var parts = [], anims = [], texts = [], bars = [];
  var strips = [], full = null;
  var trauma = 0, frameNo = 0;
  var api = {
    init: init, spawn: spawn, censor: censor, full: startFull, update: update, draw: draw, drawBars: drawBars,
    drawTexts: drawTexts, decoBar: decoBar, prewarm: prewarm, drawScreen: drawScreen, drawStrips: drawStrips, drawFullFrame: drawFullFrame, clear: clear,
    shakeX: 0, shakeY: 0, zoom: 0, barsLive: 0
  };
  var vigT = 0, glowT = 0, vignette = null, fullT = 0, fullDur = 0, fullCap = '';
  var ROLE_BY_ELEMENT = ['phys', 'fire', 'cold', 'lightning', 'charm', 'hero_rim'];
  var TIER_ROLE = ['loot_chaos', 'loot_tailor', 'loot_vaal', 'loot_exalt', 'loot_divine'];
  var S = {}; // sprite entries, resolved lazily once

  function rnd() { return window.RNG && RNG.fx ? RNG.fx.next() : 0.5; }
  function spr(name) { return S[name] || (S[name] = Assets.sprite(name)); }
  function small(w, h) { var c = Assets.canvas(w, h), x = c.getContext('2d'); x.imageSmoothingEnabled = false; return { c: c, x: x }; }

  function init() {
    var i;
    for (i = 0; i < NP; i++) parts.push({ alive: 0, x: 0, y: 0, vx: 0, vy: 0, g: 0, t: 0, life: 0, role: 'text', sz: 2, add: 0 });
    for (i = 0; i < NA; i++) anims.push({ alive: 0, name: '', x: 0, y: 0, vx: 0, vy: 0, g: 0, t: 0, dur: 0, fps: 0, f0: 0, nf: 1, loop: 0, flip: 0, fade: 0 });
    for (i = 0; i < NT; i++) texts.push({ alive: 0, str: '', x: 0, y: 0, t: 0, life: 0, role: 'text', scale: 1 });
    for (i = 0; i < NB; i++) { var m = small(48, 24); bars.push({ alive: 0, x: 0, y: 0, w: 0, h: 0, cap: '', t: 0, dur: 0, follow: null, ox: 0, oy: 0, m: m, fresh: 0 }); }
    for (i = 0; i < 3; i++) strips.push(small(160, 12));
    full = small(80, 45);
    vignette = Assets.canvas(640, 360);
    var v = vignette.getContext('2d'), g = v.createRadialGradient(320, 180, 120, 320, 180, 380);
    g.addColorStop(0, 'rgba(224,56,79,0)'); g.addColorStop(1, 'rgba(224,56,79,0.55)');
    v.fillStyle = g; v.fillRect(0, 0, 640, 360);
  }

  function clear() {
    var i;
    for (i = 0; i < NP; i++) parts[i].alive = 0;
    for (i = 0; i < NA; i++) anims[i].alive = 0;
    for (i = 0; i < NT; i++) texts[i].alive = 0;
    for (i = 0; i < NB; i++) bars[i].alive = 0;
    trauma = 0; vigT = 0; glowT = 0; fullT = 0; api.zoom = 0;
  }

  function free(pool) { for (var i = 0; i < pool.length; i++) if (!pool[i].alive) return pool[i]; return null; }

  function part(x, y, vx, vy, g, life, role, sz, add) {
    var p = free(parts); if (!p) return;
    p.alive = 1; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.g = g; p.t = 0; p.life = life; p.role = role; p.sz = sz; p.add = add;
  }
  function anim(name, x, y, vx, vy, g, dur, fps, f0, nf, loop, fade) {
    var a = free(anims); if (!a) return null;
    a.alive = 1; a.name = name; a.x = x; a.y = y; a.vx = vx; a.vy = vy; a.g = g; a.t = 0; a.dur = dur; a.fps = fps; a.f0 = f0; a.nf = nf; a.loop = loop; a.flip = vx < 0 ? 1 : 0; a.fade = fade;
    return a;
  }
  function burst(x, y, n, role, speed, add) {
    for (var i = 0; i < n; i++) { var an = rnd() * 6.283, sp = speed * (0.5 + rnd() * 0.7); part(x, y, Math.cos(an) * sp, Math.sin(an) * sp - 40, 300, 0.25 + rnd() * 0.2, role, 2, add); }
  }
  function addTrauma(t) { trauma = Math.min(1, Math.max(trauma, t)); }
  function caption(key, fallback) { return (window.TEXT && TEXT.ui && TEXT.ui[key]) || fallback; }

  // Render.fx(kind, x, y, a, b) forwards here.
  function spawn(kind, x, y, a, b) {
    var i, n;
    switch (kind) {
      case 'hit':
        if (a === 5) anim('fx_spark_hit', x - 6, y - 6, 0, 0, 0, 0.15, 20, 0, 3, 0, 0);
        else anim('fx_hit', x - 8, y - 8, 0, 0, 0, 0.2, 20, 0, 4, 0, 0);
        burst(x, y, b || 5, ROLE_BY_ELEMENT[a | 0] || 'text', 160, 1);
        addTrauma(0.58);
        break;
      case 'bossHit':
        anim('fx_hit', x - 8, y - 8, 0, 0, 0, 0.2, 20, 0, 4, 0, 0);
        burst(x, y, 8, 'loot_core', 200, 1);
        addTrauma(0.82);
        break;
      case 'hearts':
        n = b || 8;
        for (i = 0; i < n; i++) { var an = i / n * 6.283; anim('fx_heart', x - 4, y - 4, Math.cos(an) * 90, Math.sin(an) * 90 - 50, 120, 0.6, 0, i & 1, 1, 0, 1); }
        api.zoom = 1;
        break;
      case 'sparkles':
        for (i = 0; i < 6; i++) { var as = i / 6 * 6.283; anim('fx_sparkle', x - 4, y - 4, Math.cos(as) * 70, Math.sin(as) * 70, 0, 0.5, 8, 0, 4, 1, 1); }
        break;
      case 'layerPop':
        var e = (a | 0) - 1; if (e < 0) e = 0;
        var gm = anim('fx_layer', x - 12, y - 12, (rnd() < 0.5 ? -1 : 1) * 110, -260, 700, 0.8, 0, e, 1, 0, 0);
        if (gm) censor(0, 0, 24, 14, caption('removedByMod', '[removed by moderator]'), 0.8, gm, 0, 5);
        burst(x, y, 6, ROLE_BY_ELEMENT[e + 1], 120, 0);
        break;
      case 'beam':
        var r = TIER_ROLE[a | 0] || 'loot_chaos';
        for (i = 0; i < 6; i++) part(x + (rnd() * 8 - 4), y, 0, -60 - rnd() * 80, 0, 0.5, r, 2, 1);
        break;
      case 'text':
        var t = free(texts); if (!t || !a) break;
        t.alive = 1; t.str = a; t.x = x; t.y = y; t.t = 0; t.life = 0.8; t.scale = b || 1;
        t.role = a.charAt(0) === '+' ? 'loot' : a.charAt(0) === '-' ? 'hp' : 'text';
        break;
      case 'dmg':   // damage number: a = amount; strings come from a cache, never built per hit
        if (frameNo - lastDmgFrame < 6) break;   // one number per 6 frames: a crowd hit reads as one hit, not a ticker
        var dn = free(texts); if (!dn) break;
        lastDmgFrame = frameNo;
        dn.alive = 1; dn.str = dmgStr(a); dn.x = x + (rnd() * 12 - 6); dn.y = y; dn.t = 0; dn.life = 0.55; dn.scale = 1; dn.role = b ? 'unique' : 'text';
        break;
      case 'shake': addTrauma(a || 0.58); break;
      case 'zoom': api.zoom = 1; break;
      case 'vignette': vigT = 0.4; break;
      case 'dust': anim('fx_dust', x - 8, y - 8, 0, 0, 0, 0.2, 20, 0, 4, 0, 0); break;
      case 'divineGlow': glowT = 0.3; break;
      case 'chomp': anim('fx_chomp', x - 12, y - 8, 0, -20, 0, 0.5, 6, 0, 3, 0, 1); addTrauma(0.6); break;
      case 'doorSlam': addTrauma(0.75); for (i = 0; i < 4; i++) anim('fx_dust', x - 40 + i * 24, y - 8, (i - 1.5) * 30, 0, 0, 0.3, 14, 0, 4, 0, 0); break;
    }
  }

  // A world-rect censor bar. follow is any object with x,y (an entity or an fx slot); ox,oy offset the bar's top-left from it.
  function censor(x, y, w, h, cap, dur, follow, ox, oy) {
    if (!follow && overlapsLive(x, y, w, h)) return null;   // free-floating gags never pile onto a live bar
    var b = free(bars);
    if (!b) { b = bars[0]; for (var i = 1; i < NB; i++) if (bars[i].t > b.t) b = bars[i]; } // reuse the oldest
    var cw = cap ? Font.width(cap, 1) + 6 : 0;
    var W = Math.min(180, Math.max(w, cw)), H = Math.max(h, 11);
    b.alive = 1; b.cap = cap || ''; b.t = 0; b.dur = dur || 1; b.follow = follow || null;
    b.ox = (ox || 0) - growLeft(follow ? follow.x + (ox || 0) : x, w, W); b.oy = (oy || 0) - ((H - h) >> 1);
    b.x = (follow ? follow.x : x) + b.ox; b.y = (follow ? follow.y : y) + b.oy; b.w = W; b.h = H; b.fresh = 1;
    if (rnd() < 0.2 && window.Render) Render.sound('censor_squeak');
    return b;
  }

  // A caption wider than its subject widens the bar away from the Exile, so it stays on the prop.
  function growLeft(x, w, W) {
    var p = window.Game && Game.world && Game.world.player;
    if (!p || W <= w) return (W - w) >> 1;
    return p.x > x + w / 2 ? W - w : 0;
  }

  // Art rule: a bar never sits on a body. If one overlaps the Exile's sprite, it hops above her hat.
  var HERO_W = 24, HERO_H = 64;
  function liftOffBody(b, p) {
    var top = p.y - HERO_H;
    if (b.x < p.x + HERO_W / 2 && p.x - HERO_W / 2 < b.x + b.w && b.y < p.y && top < b.y + b.h) b.y = top - b.h - 2;
  }

  function overlapsLive(x, y, w, h) {
    for (var i = 0; i < NB; i++) { var o = bars[i]; if (o.alive && x < o.x + o.w + 8 && o.x < x + w + 8 && y < o.y + o.h + 4 && o.y < y + h + 4) return true; }
    return false;
  }
  var DMG = [], lastDmgFrame = -99;
  function dmgStr(n) { n = Math.max(0, Math.min(199, Math.round(n))); if (!DMG.length) for (var i = 0; i < 200; i++) DMG.push(String(i)); return DMG[n]; }

  function startFull(dur, cap) { fullT = 0; fullDur = dur || 0.4; fullCap = cap || caption('rule3', '[Rule 3: No Lewds]'); }

  function update(dtMs, world) {
    var dt = dtMs / 1000, i;
    frameNo++;
    if (api.zoom > 0 && dt > 0) api.zoom--;
    for (i = 0; i < NP; i++) { var p = parts[i]; if (!p.alive) continue; p.t += dt; if (p.t >= p.life) { p.alive = 0; continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    for (i = 0; i < NA; i++) { var a = anims[i]; if (!a.alive) continue; a.t += dt; if (a.t >= a.dur) { a.alive = 0; continue; } a.vy += a.g * dt; a.x += a.vx * dt; a.y += a.vy * dt; if (a.g === 0 && a.fade) { a.vx *= 0.92; a.vy *= 0.92; } }
    for (i = 0; i < NT; i++) { var t = texts[i]; if (!t.alive) continue; t.t += dt; t.y -= 24 * dt; if (t.t >= t.life) t.alive = 0; }
    var live = 0;
    for (i = 0; i < NB; i++) {
      var b = bars[i]; if (!b.alive) continue;
      b.t += dt; if (b.t >= b.dur) { b.alive = 0; continue; }
      if (b.follow && (b.follow.alive === undefined || b.follow.alive)) { b.x = b.follow.x + b.ox; b.y = b.follow.y + b.oy; }
      if (world && world.player) liftOffBody(b, world.player);
      live++;
    }
    if (world && world.obscure) for (i = 0; i < world.obscure.length; i++) if (world.obscure[i].alive) live++;
    api.barsLive = live;
    if (fullT < fullDur) fullT += dt;
    vigT = Math.max(0, vigT - dt); glowT = Math.max(0, glowT - dt);
    trauma = Math.max(0, trauma - 1.6 * dt);
    var k = world && world.settings ? world.settings.shake : 1;
    if (k === undefined) k = 1;
    var amp = trauma * trauma * k;
    api.shakeX = amp > 0.05 ? Math.round((rnd() * 2 - 1) * 6 * amp) : 0;
    api.shakeY = amp > 0.05 ? Math.round((rnd() * 2 - 1) * 4 * amp) : 0;
  }

  // Layer 9: particles and sprite bursts.
  function draw(ctx, camX, camY) {
    var i, role = '', pal = Assets.pal;
    for (i = 0; i < NA; i++) {
      var a = anims[i]; if (!a.alive) continue;
      var e = spr(a.name), f = a.fps ? Math.floor(a.t * a.fps) : 0;
      f = a.loop ? f % a.nf : Math.min(a.nf - 1, f);
      if (a.fade) ctx.globalAlpha = Math.max(0, 1 - a.t / a.dur);
      ctx.drawImage(e.img, (a.f0 + f) * e.fw, 0, e.fw, e.fh, (a.x - camX) | 0, (a.y - camY) | 0, e.fw, e.fh);
      if (a.fade) ctx.globalAlpha = 1;
    }
    for (i = 0; i < NP; i++) { var p = parts[i]; if (!p.alive || p.add) continue; if (p.role !== role) { role = p.role; ctx.fillStyle = pal[role]; } ctx.fillRect((p.x - camX) | 0, (p.y - camY) | 0, p.sz, p.sz); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; role = '';
    for (i = 0; i < NP; i++) { var q = parts[i]; if (!q.alive || !q.add) continue; if (q.role !== role) { role = q.role; ctx.fillStyle = pal[role]; } ctx.fillRect((q.x - camX) | 0, (q.y - camY) | 0, q.sz, q.sz); }
    ctx.restore();
  }

  // One mosaic rect: sample the main canvas into m every 4th frame, draw it back blocky, then a pink caption band.
  function mosaic(ctx, main, m, sx, sy, w, h, block, fresh) {
    var sw = Math.max(1, Math.ceil(w / block)), sh = Math.max(1, Math.ceil(h / block));
    if (fresh || (frameNo & 3) === 0) {
      var cx = Math.max(0, Math.min(640 - w, sx)), cy = Math.max(0, Math.min(360 - h, sy));
      m.x.clearRect(0, 0, sw, sh);
      m.x.drawImage(main, cx, cy, w, h, 0, 0, sw, sh);
    }
    ctx.drawImage(m.c, 0, 0, sw, sh, sx, sy, w, h);
  }

  function band(ctx, x, y, w, h, cap, scale) {
    var pal = Assets.pal, bh = h < 16 ? h : Math.round(h * 0.6), by = y + ((h - bh) >> 1);
    ctx.fillStyle = pal.censor; ctx.fillRect(x, by, w, bh);
    ctx.fillStyle = pal.censor_text; ctx.fillRect(x, by, w, 1); ctx.fillRect(x, by + bh - 1, w, 1);
    if (cap) Font.draw(ctx, cap, x + (w >> 1), by + ((bh - 7 * scale) >> 1), scale, 'censor_text', 1);
  }

  // Set-dressing bars (render's drawDeco): a static mosaic + caption, wobbling at 8 Hz. slot picks one of 4 mosaic buffers.
  var decoM = [];
  function prewarm(ctx) {
    if (!decoM.length) for (var i = 0; i < 4; i++) decoM.push(small(48, 24));
    dmgStr(0);
    if (ctx) for (var j = 0; j < 4; j++) ctx.drawImage(decoM[j].c, 0, 0);
  }
  function decoBar(ctx, main, slot, x, y, w, h, cap) {
    if (slot >= 4) return;
    if (!decoM.length) prewarm(null);
    x += (frameNo >> 3) & 1 ? 1 : 0;
    mosaic(ctx, main, decoM[slot], x, y, Math.min(w, 192), h, 4, false);
    band(ctx, x, y, w, h, cap, 1);
  }

  // Layer 10: world censor bars (slap squash, 8 Hz wobble).
  function drawBars(ctx, camX, camY, main) {
    for (var i = 0; i < NB; i++) {
      var b = bars[i]; if (!b.alive) continue;
      var k = Math.min(1, b.t / 0.133), sx = 1.3 - 0.3 * k, sy = 0.7 + 0.3 * k;
      var w = Math.round(b.w * sx), h = Math.round(b.h * sy);
      var x = Math.round(b.x - camX + (b.w - w) / 2) + ((Math.floor(b.t * 16) & 1) ? 1 : -1), y = Math.round(b.y - camY + (b.h - h) / 2);
      x = Math.max(2, Math.min(638 - w, x));   // a caption is only funny if it is readable
      if (w > 4 * b.m.c.width) w = 4 * b.m.c.width;
      mosaic(ctx, main, b.m, x, y, w, h, 4, b.fresh);
      b.fresh = 0;
      band(ctx, x, y, w, h, b.cap, 1);
    }
  }

  // Dominus strips: world.obscure[i].y is a screen y; 640x48 mosaic at 50% plus caption.
  function drawStrips(ctx, world, main) {
    var o = world.obscure; if (!o) return;
    for (var i = 0; i < o.length && i < 3; i++) {
      if (!o[i].alive) continue;
      var y = o[i].y | 0;
      ctx.globalAlpha = 0.5; mosaic(ctx, main, strips[i], 0, y, 640, 48, 4, 0);
      ctx.globalAlpha = 0.25; ctx.fillStyle = Assets.pal.censor; ctx.fillRect(0, y, 640, 48); ctx.globalAlpha = 1;
      band(ctx, 0, y + 14, 640, 20, caption('obscure', '[content hidden for your purity]'), 1);
    }
  }

  // Full-frame "[Rule 3: No Lewds]": 8 px mosaic of the whole frame plus a slapped-on 640x96 pink band.
  function drawFullFrame(ctx, main, age, cap) {
    mosaic(ctx, main, full, 0, 0, 640, 360, 8, age < 0.02);
    var k = Math.min(1, age / 0.133), h = Math.round(96 * (0.7 + 0.3 * k)), w = Math.round(640 * (1.3 - 0.3 * k));
    band(ctx, (640 - w) >> 1, (360 - h) >> 1, w, h, cap || caption('rule3', '[Rule 3: No Lewds]'), 3);
  }

  // Layer 11: float texts.
  function drawTexts(ctx, camX, camY) {
    for (var i = 0; i < NT; i++) {
      var t = texts[i]; if (!t.alive) continue;
      var sx = t.x - camX, half = (Font.width(t.str, t.scale) >> 1) + 2;
      if (sx >= 0 && sx <= 640) sx = Math.max(half, Math.min(640 - half, sx));   // an on-screen anchor keeps its whole line on screen
      Font.drawO(ctx, t.str, sx | 0, (t.y - camY) | 0, t.scale, t.role, 1);
    }
  }

  // Screen-space: hurt vignette, Divine edge glow, the Fx.full card.
  function drawScreen(ctx, main) {
    if (vigT > 0) { ctx.globalAlpha = vigT > 0.3 ? (0.4 - vigT) / 0.1 : vigT / 0.3; ctx.drawImage(vignette, 0, 0); ctx.globalAlpha = 1; }
    if (glowT > 0) {
      ctx.globalAlpha = 0.35 * (glowT > 0.15 ? (0.3 - glowT) / 0.15 : glowT / 0.15);
      ctx.fillStyle = Assets.pal.loot_divine;
      ctx.fillRect(0, 0, 640, 6); ctx.fillRect(0, 354, 640, 6); ctx.fillRect(0, 6, 6, 348); ctx.fillRect(634, 6, 6, 348);
      ctx.globalAlpha = 1;
    }
    if (fullT < fullDur) drawFullFrame(ctx, main, fullT, fullCap);
  }

  return api;
})();
