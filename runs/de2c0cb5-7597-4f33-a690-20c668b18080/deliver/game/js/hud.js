// Hud: cached HUD canvas (globes, pips, flasks, currency, portals) plus every overlay by state and mode:
// banner, mod popup, RES UNCAPPED, boss bar, death post, cutscene, hideout, pause, title, over, touch buttons.
// Player-visible labels come from TEXT.ui[key]; the defaults below are only used when a key is missing.
var Hud = (function () {
  var W = 640, H = 360;
  var DEF = {
    pressStart: 'Press Enter or click to begin', loading: 'loading…', tagline: 'An awkward rom-com in five acts. Cap your res.',
    controls: 'A/D move  Space jump  J melee  K/RMB Spark  Shift roll  Q flask  Esc pause',
    controls2: 'Charmed? Mash J to keep it professional. Roll through a ♥ tell.',
    paused: 'PAUSED', resume: 'Resume', restart: 'Restart run', shake: 'Screen shake', on: 'on', half: 'half', off: 'off',
    uncapped: 'RES UNCAPPED', wave: 'Wave', subreddit: 'r/PathOfExiles  ·  posted by u/Exile',
    runItBack: 'Run it back', winTitle: 'Finally killed Kitava. Still uncapped. AMA.', loseTitle: 'RIP. Should\'ve played softcore.',
    charmsEscaped: 'Charms escaped', flawlessWaves: 'Flawless waves', cappedSeconds: 'Seconds res-capped', bossesKilled: 'Bosses killed',
    currencyValue: 'Currency earned (c)', score: 'Score', pb: 'Personal best: L', stash: 'Standard stash',
    hideout: 'HIDEOUT', patchPick: 'Pick one patch note', continueLbl: 'Continue', craftChaos: 'Chaos', craftExalt: 'Exalt',
    craftVaal: 'Vaal', craftDivine: 'Divine', craftMirror: 'Mirror', weapon: 'Wand of Mild Inconvenience', corrupted: 'Corrupted',
    tier: 'T', modRemoved: 'This post has been removed by the moderators. Rule 3.', comments: 'comments', next: 'Next:'
  };
  function L(k) { var u = window.TEXT && TEXT.ui; return (u && u[k]) || DEF[k]; }
  function pal() { return Assets.pal; }
  function S(name) { return Assets.sprite(name); }

  var cache, cx, sig = new Float64Array(16), crack = [0, 0, 0], lastMask = 7, hpD = -1, compD = -1;
  var bannerAge = 0, bannerText = null, popupAge = 0, deathAge = 0, cutAge = 0, rule3Age = 0, overAge = 0;

  function init() {
    cache = Assets.canvas(W, H); cx = cache.getContext('2d'); cx.imageSmoothingEnabled = false;
  }

  // ---------- primitives ----------
  function nine(ctx, e, x, y, w, h, c) {
    var img = e.img, s = e.fw, m = s - c * 2;
    x |= 0; y |= 0; w |= 0; h |= 0;
    ctx.drawImage(img, 0, 0, c, c, x, y, c, c); ctx.drawImage(img, c, 0, m, c, x + c, y, w - c * 2, c); ctx.drawImage(img, s - c, 0, c, c, x + w - c, y, c, c);
    ctx.drawImage(img, 0, c, c, m, x, y + c, c, h - c * 2); ctx.drawImage(img, c, c, m, m, x + c, y + c, w - c * 2, h - c * 2); ctx.drawImage(img, s - c, c, c, m, x + w - c, y + c, c, h - c * 2);
    ctx.drawImage(img, 0, s - c, c, c, x, y + h - c, c, c); ctx.drawImage(img, c, s - c, m, c, x + c, y + h - c, w - c * 2, c); ctx.drawImage(img, s - c, s - c, c, c, x + w - c, y + h - c, c, c);
  }
  function panel(ctx, x, y, w, h) { nine(ctx, S('ui_panel'), x, y, w, h, 8); }
  function focusPanel(ctx, x, y, w, h, focus) {
    panel(ctx, x, y, w, h);
    if (focus) { ctx.fillStyle = pal().text; ctx.fillRect(x + 2, y, w - 4, 1); ctx.fillRect(x + 2, y + h - 1, w - 4, 1); ctx.fillRect(x, y + 2, 1, h - 4); ctx.fillRect(x + w - 1, y + 2, 1, h - 4); }
  }
  function spr(ctx, name, f, x, y) { var e = S(name); f = f < e.frames ? f : 0; ctx.drawImage(e.img, f * e.fw, 0, e.fw, e.fh, x | 0, y | 0, e.fw, e.fh); }
  function plate(ctx, x, y, w, h) { ctx.globalAlpha = 0.6; ctx.fillStyle = '#080A0C'; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1; }
  function dim(ctx, a) { ctx.globalAlpha = a; ctx.fillStyle = '#080A0C'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  var EMPTY = {};
  function ease(t) { t = Math.max(0, Math.min(1, t)); return 1 - (1 - t) * (1 - t) * (1 - t); }
  function rect(name, i, dx, dy, dw, dh) {
    var u = window.CFG && CFG.UI && CFG.UI[name];
    var r = u && (i === undefined ? u : u[i]);
    if (r && r.w !== undefined) return r;
    TMP.x = dx; TMP.y = dy; TMP.w = dw; TMP.h = dh; return TMP;
  }
  var TMP = { x: 0, y: 0, w: 0, h: 0 };
  var CARD_X = [40, 232, 424], CRAFT_X = [40, 144, 248, 352, 456], PAUSE_Y = [150, 182, 214];
  // label + number + optional suffix, left-aligned at x, no string building
  function labelNum(ctx, label, n, x, y, s, role, numRole) {
    Font.draw(ctx, label, x, y, s, role, 0);
    var nx = x + Font.width(label, s) + 6 * s;
    Font.num(ctx, n, nx, y, s, numRole || role, 0);
  }

  // ---------- main ----------
  function draw(ctx, w, dtMs) {
    var dt = dtMs / 1000, st = w.state, mode = w.mode;
    if (st === 'title' || !w.level) { drawTitle(ctx, w); return; }
    var live = st === 'play';
    if (live) { bannerAge = w.banner && w.banner.t > 0 ? bannerAge + dt : 0; popupAge = w.popup && w.popup.t > 0 ? popupAge + dt : 0; }
    deathAge = mode === 'death' && w.deathPost && w.deathPost.t > 0 ? deathAge + (live ? dt : 0) : 0;
    cutAge = mode === 'cutscene' ? cutAge + (live ? dt : 0) : 0;
    rule3Age = w.flashRule3 > 0 ? rule3Age + (live ? dt : 0) : 0;
    overAge = st === 'over' ? overAge + dt : 0;

    if (mode === 'cutscene' && st !== 'over') drawCutscene(ctx, w);
    else if (mode === 'hideout') drawHideout(ctx, w);
    if (mode !== 'cutscene') {
      refreshCache(w, dt);
      ctx.drawImage(cache, 0, 0);
      drawLive(ctx, w);
    }
    if (bannerAge > 0) drawBanner(ctx, w);
    if (popupAge > 0) drawPopup(ctx, w);
    if (deathAge > 0) drawDeathPost(ctx, w, w.deathPost, false);
    if (rule3Age > 0) Fx.drawFullFrame(ctx, ctx.canvas, rule3Age, null);
    if (live && (mode === 'level' || mode === 'boss')) playWhisper(ctx, dt);
    if (st === 'pause') drawPause(ctx, w);
    if (st === 'over') drawOver(ctx, w);
    if (w.touchUI) drawTouch(ctx);
    else if (st === 'play' && (mode === 'level' || mode === 'boss')) drawReticle(ctx, w);
  }

  // ---------- cached HUD ----------
  function refreshCache(w, dt) {
    var p = w.player, c = w.currency || EMPTY;
    var k = Math.min(1, dt / 0.5 * 2.2);
    hpD = hpD < 0 ? p.hp : hpD + (p.hp - hpD) * k; if (Math.abs(hpD - p.hp) < 0.5) hpD = p.hp;
    compD = compD < 0 ? p.composure : compD + (p.composure - compD) * k; if (Math.abs(compD - p.composure) < 0.5) compD = p.composure;
    var lost = lastMask & ~p.layerMask;
    for (var i = 0; i < 3; i++) { if (lost & (1 << i)) crack[i] = 0.4; if (crack[i] > 0) crack[i] = Math.max(0, crack[i] - dt); }
    lastMask = p.layerMask;
    sigN = 0; sigChanged = false;
    chk(Math.round(hpD * 4)); chk(p.hpMax); chk(Math.round(compD * 4)); chk(p.composureMax); chk(p.layerMask); chk(p.flask); chk(p.flaskMax);
    chk(w.portals); chk(c.chaos | 0); chk(c.exalt | 0); chk(c.vaal | 0); chk(c.divine | 0); chk(c.tailor | 0); chk(p.layers === 0 ? 1 : 0);
    chk(crack[0] + crack[1] * 7 + crack[2] * 49); chk(w.mode === 'hideout' ? 1 : 0);
    if (sigChanged) paintCache(w);
  }
  var sigN = 0, sigChanged = false;
  function chk(v) { if (sig[sigN] !== v) { sig[sigN] = v; sigChanged = true; } sigN++; }

  function globe(x, y, frac, liquid, frame, iconF, value) {
    var e = S('ui_globe');
    cx.save(); cx.beginPath(); cx.arc(x + 24, y + 24, 20, 0, 6.2832); cx.clip();
    cx.fillStyle = 'rgba(10,8,9,0.85)'; cx.fillRect(x + 4, y + 4, 40, 40);
    var h = Math.round(40 * Math.max(0, Math.min(1, frac)));
    cx.fillStyle = liquid; cx.fillRect(x + 4, y + 44 - h, 40, h);
    cx.fillStyle = 'rgba(255,255,255,0.18)'; cx.fillRect(x + 4, y + 44 - h, 40, 1);
    cx.restore();
    cx.drawImage(e.img, frame * e.fw, 0, e.fw, e.fh, x, y, e.fw, e.fh);
    cx.drawImage(e.img, 3 * e.fw, 0, e.fw, e.fh, x, y, e.fw, e.fh);
    Font.numO(cx, value, x + 24, y + 13, 2, 'text', 1);
    spr(cx, 'ui_globe_icon', iconF, x + 19, y + 31);
  }

  function paintCache(w) {
    var p = w.player, c = w.currency || EMPTY, P = pal(), i, x;
    cx.clearRect(0, 0, W, H);
    if (w.mode !== 'hideout') {
      globe(16, 296, p.hp / Math.max(1, p.hpMax), P.hp, p.layers === 0 ? 1 : 0, 0, Math.ceil(hpD));
      globe(576, 296, p.composure / Math.max(1, p.composureMax), P.composure, 2, 1, Math.ceil(compD));
      for (i = 0; i < 3; i++) {
        var has = p.layerMask & (1 << i);
        spr(cx, 'ui_pips', has ? i : crack[i] > 0 ? 4 + Math.min(5, Math.floor((0.4 - crack[i]) / 0.4 * 6)) : 3, 68 + i * 14, 300);
      }
      for (i = 0; i < p.flaskMax; i++) spr(cx, 'ui_flask', i < p.flask ? 0 : 1, 68 + i * 10, 326);
    }
    // dark plate behind the currency, portal and score column so the small pixel text reads on any background
    cx.globalAlpha = 0.6; cx.fillStyle = '#080A0C'; cx.fillRect(448, 10, 184, w.mode !== 'hideout' ? 50 : 20); cx.globalAlpha = 1;
    // currency, right-aligned at x=624, y=16: chaos tailor vaal exalt divine
    var counts = [c.chaos | 0, c.tailor | 0, c.vaal | 0, c.exalt | 0, c.divine | 0];
    x = 624;
    for (i = 4; i >= 0; i--) {
      var wN = Font.width(counts[i] > 999 ? '0000' : counts[i] > 99 ? '000' : counts[i] > 9 ? '00' : '0', 1);
      Font.numO(cx, counts[i], x, 19, 1, counts[i] ? 'text' : 'text_dim', 2);
      x -= wN + 14; spr(cx, 'icon_currency', i, x, 16); x -= 6;
    }
    if (w.mode !== 'hideout') for (i = 0; i < 3; i++) spr(cx, 'icon_portal', i < w.portals ? 0 : 1, 594 + i * 11, 32);
  }

  // ---------- live HUD (changes every frame; cheap draws) ----------
  function drawLive(ctx, w) {
    var P = pal(), b = w.boss, p = w.player;
    if (w.mode === 'hideout') return;
    Font.numO(ctx, w.score | 0, 624, 50, 1, 'text_dim', 2);
    if (bannerAge <= 0 && w.level && w.level.name) { plate(ctx, 12, 12, Font.width(w.level.name, 1) + 8, 15); Font.drawO(ctx, w.level.name, 16, 16, 1, 'text', 0); }
    if (b && b.alive && b.st !== 'defeated') {
      Font.drawO(ctx, b.name || b.id, 320, 9, 1, 'unique', 1);
      var e = S('ui_bossbar'); ctx.drawImage(e.img, 190, 20);
      ctx.fillStyle = P.foe; ctx.fillRect(192, 22, Math.round(256 * Math.max(0, b.hp / Math.max(1, b.hpMax))), 10);
      if (b.title) Font.draw(ctx, b.title, 320, 36, 1, 'text_dim', 1);
    }
    var y = b && b.alive ? 46 : 38;
    if (p.layers === 0) {
      ctx.globalAlpha = 0.85 + 0.15 * (0.5 + 0.5 * Math.sin(w.tick / 60 * 6.2832 * 2));
      ctx.fillStyle = P.banner_red; ctx.fillRect(240, y, 160, 16);
      ctx.fillStyle = P.hp; ctx.fillRect(240, y, 160, 1); ctx.fillRect(240, y + 15, 160, 1);
      Font.draw(ctx, L('uncapped'), 320, y + 4, 1, 'text', 1);
      ctx.globalAlpha = 1; y += 20;
    }
    var ar = w.arena;
    if (ar && ar.locked && !(b && b.alive) && ar.wave > 0) {
      var lw = Font.width(L('wave'), 1);
      Font.drawO(ctx, L('wave'), 300 - (lw >> 1), y + 2, 1, 'text', 0);
      Font.numO(ctx, ar.wave, 306 + (lw >> 1), y + 2, 1, 'text', 0);
      Font.drawO(ctx, '/', 314 + (lw >> 1), y + 2, 1, 'text_dim', 0);
      Font.numO(ctx, ar.waves, 322 + (lw >> 1), y + 2, 1, 'text', 0);
    }
  }

  function drawBanner(ctx, w) {
    var bn = w.banner, k = Math.min(ease(bannerAge / 0.18), bn.t < 0.18 ? bn.t / 0.18 : 1);
    var tw = Math.max(Font.width(bn.text, 2), Font.width(bn.sub, 2)) + 20, h = bn.sub ? 44 : 26;
    var x = Math.round(16 - (1 - k) * (tw + 24));
    panel(ctx, x, 16, tw, h);
    Font.draw(ctx, bn.text, x + 10, 22, 2, 'text', 0);
    if (bn.sub) Font.draw(ctx, bn.sub, x + 10, 40, 2, 'censor', 0);
  }

  function drawPopup(ctx, w) {
    var pp = w.popup, k = ease(popupAge / 0.18), y = Math.round(110 - (1 - k) * 20);
    ctx.globalAlpha = k;
    panel(ctx, 140, y, 360, 80);
    spr(ctx, 'ui_modshield', 0, 152, y + 10);
    Font.wrap(ctx, pp.text || L('modRemoved'), 176, y + 12, 310, 1, 'text', 3, 0);
    var st = S('ui_stamp'); ctx.drawImage(st.img, st.fw, 0, st.fw, st.fh, 420, y + 48, st.fw, st.fh);
    ctx.globalAlpha = 1;
  }

  // Fake forum post: used for the death post (mode death) and the run-end post (over).
  function drawDeathPost(ctx, w, dp, big) {
    var x = 110, y = big ? 40 : 60, pw = 420, ph = big ? 220 : 200;
    var k = ease((big ? overAge : deathAge) / 0.18);
    y += Math.round((1 - k) * 30);
    dim(ctx, 0.45 * k);
    panel(ctx, x, y, pw, ph);
    Font.draw(ctx, L('subreddit'), x + 40, y + 10, 1, 'text_dim', 0);
    spr(ctx, 'ui_upvote', 0, x + 14, y + 22); Font.num(ctx, dp.upvotes | 0, x + 19, y + 36, 1, 'unique', 1); spr(ctx, 'ui_upvote', 1, x + 14, y + 47);
    var hy = y + 24 + Font.wrap(ctx, dp.title, x + 40, y + 24, pw - 56, 2, 'text', 3, 0) + 8;
    if (dp.cause) hy += Font.wrap(ctx, dp.cause, x + 40, hy, pw - 56, 1, 'text_dim', 2, 0) + 8;
    if (!big && dp.line) hy += Font.wrap(ctx, dp.line, x + 40, hy, pw - 56, 2, 'hero_rim', 3, 0) + 8;
    if (dp.comment1) { ctx.fillStyle = pal().ground_rim; ctx.fillRect(x + 40, hy, 2, 9); Font.wrap(ctx, dp.comment1, x + 48, hy + 1, pw - 64, 1, 'text', 2, 0); hy += 16; }
    if (dp.comment2) { ctx.fillStyle = pal().ground_rim; ctx.fillRect(x + 40, hy, 2, 9); Font.wrap(ctx, dp.comment2, x + 48, hy + 1, pw - 64, 1, 'text', 2, 0); hy += 16; }
    if (dp.tip) Font.wrap(ctx, dp.tip, x + 40, Math.max(hy + 4, y + ph - 22), pw - 56, 1, 'loot', 2, 0);
    return hy;
  }

  var POST = { title: '', upvotes: 0, cause: '', comment1: '', comment2: '', tip: '' };
  function drawOver(ctx, w) {
    var o = w.over || EMPTY, win = w.result === 'win', dp = w.deathPost;
    POST.title = o.title || (win ? L('winTitle') : L('loseTitle'));
    // A loss reuses the fatal death post (cause and comments); a win gets its own thread. The PB sits by the score.
    var src = win ? (TEXT.over.win || EMPTY) : (dp || EMPTY);
    POST.cause = src.cause || ''; POST.upvotes = win ? w.score | 0 : dp && dp.upvotes ? dp.upvotes : 0;   // a win is upvoted by its score
    POST.comment1 = src.comment1 || ''; POST.comment2 = src.comment2 || ''; POST.tip = '';
    var y0 = drawDeathPost(ctx, w, POST, true) + 4, x = 150, run = w.run || EMPTY;
    row(ctx, L('charmsEscaped'), w.charmsEscaped, x, y0); row(ctx, L('flawlessWaves'), run.flawlessWaves, x, y0 + 12);
    row(ctx, L('cappedSeconds'), Math.round(run.cappedSeconds || 0), x, y0 + 24); row(ctx, L('bossesKilled'), w.bossesKilled, x, y0 + 36);
    row(ctx, L('currencyValue'), w.currencyValue, x, y0 + 48); row(ctx, L('stash'), o.stash !== undefined ? o.stash : w.stash, x, y0 + 60);
    labelNum(ctx, L('score'), w.score | 0, 340, y0, 2, 'unique', 'text');
    if (o.pbLevel) { labelNum(ctx, L('pb'), o.pbLevel, 340, y0 + 22, 1, 'text_dim', 'text'); Font.draw(ctx, '★', 340 + Font.width(L('pb'), 1) + 20, y0 + 22, 1, 'loot_divine', 0); }
    var r = rect('over', undefined, 248, 284, 144, 28);
    focusPanel(ctx, r.x, r.y, r.w, r.h, overAge % 1 < 0.6);
    Font.draw(ctx, L('runItBack'), r.x + (r.w >> 1), r.y + 7, 2, 'text', 1);
  }
  function row(ctx, label, n, x, y) { Font.draw(ctx, label, x, y, 1, 'text_dim', 0); Font.num(ctx, n | 0, x + 170, y, 1, 'text', 2); }

  function drawPause(ctx, w) {
    dim(ctx, 0.6);
    Font.drawO(ctx, L('paused'), 320, 112, 3, 'text', 1);
    var labels = ['resume', 'restart', 'shake'];
    for (var i = 0; i < 3; i++) {
      var r = rect('pause', i, 248, PAUSE_Y[i], 144, 24), f = (w.pauseFocus | 0) === i;
      focusPanel(ctx, r.x, r.y, r.w, r.h, f);
      if (i < 2) Font.draw(ctx, L(labels[i]), r.x + (r.w >> 1), r.y + 5, 2, f ? 'text' : 'text_dim', 1);
      else {
        var sh = w.settings ? w.settings.shake : 1;
        Font.draw(ctx, L('shake'), r.x + 8, r.y + 9, 1, f ? 'text' : 'text_dim', 0);
        Font.draw(ctx, L(sh >= 1 ? 'on' : sh > 0 ? 'half' : 'off'), r.x + r.w - 8, r.y + 9, 1, 'unique', 2);
      }
    }
  }

  // ---------- title ----------
  var titleT = 0;
  function drawTitle(ctx, w) {
    titleT += 1 / 60;
    var P = pal();
    ctx.fillStyle = 'rgba(14,23,25,0.35)'; ctx.fillRect(0, 0, W, H);
    var lg = S('ui_logo'); ctx.drawImage(lg.img, 160, 36);
    var tgw = Font.width(L('tagline'), 2);
    plate(ctx, 320 - (tgw >> 1) - 8, 120, tgw + 16, 24); plate(ctx, 320 - (tgw >> 1) - 8, 120, tgw + 16, 24);
    Font.drawO(ctx, L('tagline'), 320, 125, 2, 'text', 1);
    // a little stage: the Exile at full res, a grunt winking at her
    ctx.fillStyle = P.ground; ctx.fillRect(0, 300, W, 60); ctx.fillStyle = P.ground_rim; ctx.fillRect(0, 300, W, 2);
    var t = titleT, f = Math.floor(t * 6) % 4, b = S('hero_body');
    ctx.drawImage(b.img, f * b.fw, 0, b.fw, b.fh, 296, 300 - b.fh, b.fw, b.fh);
    var ov = ['hero_leggings', 'hero_tunic', 'hero_cloak'];
    for (var i = 0; i < 3; i++) { var o = S(ov[i]); ctx.drawImage(o.img, f * o.fw, 0, o.fw, o.fh, 296, 300 - o.fh, o.fw, o.fh); }
    var g = S('grunt'), gf = 14 + (Math.floor(t * 4) & 1);
    ctx.save(); ctx.translate(424 + g.fw, 300 - g.fh); ctx.scale(-1, 1); ctx.drawImage(g.img, gf * g.fw, 0, g.fw, g.fh, 0, 0, g.fw, g.fh); ctx.restore();
    var ht = S('ui_heart_tell'); ctx.drawImage(ht.img, (Math.floor(t * 8) & 1) * ht.fw, 0, ht.fw, ht.fh, 438, 300 - g.fh - 16, ht.fw, ht.fh);
    ctx.globalAlpha = Assets.ready ? 0.65 + 0.35 * Math.sin(t * 5) : 1;
    Font.drawO(ctx, Assets.ready ? L('pressStart') : L('loading'), 320, 184, 2, Assets.ready ? 'text' : 'text_dim', 1);
    ctx.globalAlpha = 1;
    plate(ctx, 0, 330, W, 30); plate(ctx, 0, 330, W, 30);   // doubled: ~85% black
    Font.drawO(ctx, L('controls'), 320, 335, 1, 'text', 1);
    Font.drawO(ctx, L('controls2'), 320, 347, 1, 'censor', 1);
    if (w.stash) { Font.draw(ctx, L('stash'), 16, 16, 1, 'text_dim', 0); Font.num(ctx, w.stash, 16 + Font.width(L('stash'), 1) + 6, 16, 1, 'loot', 0); }
  }

  // ---------- cutscene: pair, door slam, Rule 3 band, friendship line ----------
  function drawCutscene(ctx, w) {
    var cs = w.cutscene || EMPTY, t = cutAge;
    ctx.fillStyle = '#0A0809'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = pal().bg_far; ctx.fillRect(0, 40, W, 240);
    var door = t < 1.0 ? 0 : t < 1.4 ? 1 : 2, pair = t < 2.0 ? 0 : 1;
    var d = S('cut_door'); ctx.drawImage(d.img, door * d.fw, 0, d.fw, d.fh, 400, 280 - d.fh, d.fw, d.fh);
    var pr = S('cut_pair'); if (t < 1.0 || t >= 2.0) ctx.drawImage(pr.img, pair * pr.fw, 0, pr.fw, pr.fh, 160, 280 - pr.fh, pr.fw, pr.fh);
    ctx.fillStyle = pal().ground_rim; ctx.fillRect(0, 280, W, 2);
    if (cs.line1) Font.wrap(ctx, cs.line1, 320, 296, 600, 2, 'text', 4, 1);
    if (t >= 1.4 && t < 2.0) { var k = Math.min(1, (t - 1.4) / 0.133), h = Math.round(96 * (0.7 + 0.3 * k)), bw = Math.round(640 * (1.3 - 0.3 * k));
      ctx.fillStyle = pal().censor; ctx.fillRect((W - bw) >> 1, (H - h) >> 1, bw, h);
      Font.draw(ctx, (window.TEXT && TEXT.cutscene && TEXT.cutscene.rule3) || '[Rule 3: No Lewds]', 320, 168, 3, 'censor_text', 1); }
    if (t >= 1.4 && cs.line2) Font.wrap(ctx, cs.line2, 320, 16, 600, 2, 'censor', 4, 1);
    if (t >= 2.0 && cs.line3) Font.wrap(ctx, cs.line3, 320, 320, 600, 2, 'loot', 4, 1);
  }

  // ---------- hideout ----------
  var CRAFT_KEYS = ['craftChaos', 'craftExalt', 'craftVaal', 'craftDivine', 'craftMirror'], CRAFT_HOT = ['C', 'E', 'V', 'X', 'M'];
  var CRAFT_ICON = [0, 3, 2, 4, 5], CRAFT_CUR = ['chaos', 'exalt', 'vaal', 'divine', 'mirror'];
  function drawHideout(ctx, w) {
    var hd = w.hideout || EMPTY, cur = w.currency || EMPTY, T = window.TEXT || EMPTY, i, r;
    Font.drawO(ctx, L('hideout'), 16, 16, 2, 'unique', 0);
    Font.drawO(ctx, L('patchPick'), 16, 38, 1, 'text_dim', 0);
    for (i = 0; i < 3; i++) {
      r = rect('cards', i, CARD_X[i], 56, 176, 128);
      var id = hd.cards ? hd.cards[i] | 0 : 0, pn = T.patch && id ? T.patch[id] : null, focus = (hd.focus | 0) === i, picked = hd.picked && hd.picked === id;
      if (hd.picked && !picked) ctx.globalAlpha = 0.45;
      var cy = r.y + ((r.h - 104) >> 1);
      spr(ctx, 'ui_card', focus || picked ? 1 : 0, r.x, cy - (focus ? 1 : 0));
      Font.num(ctx, i + 1, r.x + 8, cy + 6, 1, 'text_dim', 0);
      if (pn) {
        Font.draw(ctx, pn.title || '', r.x + (r.w >> 1), cy + 6, 1, 'unique', 1);
        var yy = cy + 27;
        yy += Font.wrap(ctx, pn.buff || '', r.x + 8, yy, r.w - 16, 1, 'cold', 2, 0) + 5;
        if (pn.nerf) yy += Font.wrap(ctx, pn.nerf, r.x + 8, yy, r.w - 16, 1, 'hp', 2, 0) + 5;
        if (pn.flavor) Font.wrap(ctx, pn.flavor, r.x + 8, yy, r.w - 16, 1, 'text_dim', 2, 0);
      }
      if (picked) Font.draw(ctx, '✓', r.x + r.w - 14, cy + 6, 1, 'loot', 0);
      ctx.globalAlpha = 1;
    }
    for (i = 0; i < 5; i++) {
      r = rect('craft', i, CRAFT_X[i], 216, 96, 28);
      var fc = (hd.focus | 0) === 3 + i;
      focusPanel(ctx, r.x, r.y, r.w, r.h, fc);
      spr(ctx, 'icon_currency', CRAFT_ICON[i], r.x + 6, r.y + 8);
      Font.draw(ctx, L(CRAFT_KEYS[i]), r.x + 22, r.y + 6, 1, fc ? 'text' : 'text_dim', 0);
      Font.num(ctx, i === 4 ? 0 : cur[CRAFT_CUR[i]] | 0, r.x + 22, r.y + 16, 1, 'text', 0);
      Font.draw(ctx, CRAFT_HOT[i], r.x + r.w - 8, r.y + 11, 1, 'text_dim', 2);
    }
    if (hd.msg && hd.msgT > 0) Font.drawO(ctx, hd.msg, 320, 250, 1, 'unique', 1);
    // weapon panel
    var wp = w.run && w.run.weapon;
    panel(ctx, 40, 262, 300, 50);
    spr(ctx, 'ui_weapon', wp && wp.corrupted ? 1 : 0, 48, 271);
    Font.draw(ctx, L('weapon'), 88, 268, 1, wp && wp.corrupted === 2 ? 'hp' : 'unique', 0);
    if (wp) for (i = 0; i < (wp.count | 0) && i < 3; i++) {
      var af = wp.affixes[i], txt = T.affix ? T.affix[af.id] : null;
      Font.draw(ctx, txt && txt.text !== undefined ? txt.text : txt || '', 88, 279 + i * 9, 1, 'cold', 0);
      Font.draw(ctx, L('tier'), 330, 279 + i * 9, 1, 'text_dim', 2); Font.num(ctx, af.tier | 0, 336, 279 + i * 9, 1, 'text', 2);
    }
    if (wp && wp.corrupted) { var st = S('ui_stamp'); ctx.drawImage(st.img, 0, 0, st.fw, st.fh, 250, 283, st.fw, st.fh); }
    // teaser + continue
    var nx = T.levels && T.levels[(w.levelIndex | 0) - 1];   // levelIndex already points at the next level here
    if (nx && nx.teaser) Font.wrap(ctx, nx.teaser, 40, 320, 400, 1, 'text_dim', 2, 0);
    r = rect('cont', undefined, 488, 316, 112, 28);
    focusPanel(ctx, r.x, r.y, r.w, r.h, (hd.focus | 0) === 8 || hd.focus === undefined);
    Font.draw(ctx, L('continueLbl'), r.x + (r.w >> 1), r.y + 7, 2, 'text', 1);
    if (hd.whisper && hd.whisperT > 0) drawWhisper(ctx, hd.whisper, 400, 256);
  }

  // Trade whispers keep arriving mid-fight, like they do in town. Cosmetic: timed in render time, picked from the fx stream.
  var pwT = 14, pwShow = 0, pwText = '';
  function playWhisper(ctx, dt) {
    var T = window.TEXT;
    if (!T || !T.whispers) return;
    pwT -= dt;
    if (pwT <= 0) { pwText = RNG.fx.pick(T.whispers); pwShow = 3.5; pwT = 22 + RNG.fx.next() * 14; Render.sound('whisper'); }
    if (pwShow > 0) { pwShow -= dt; drawWhisper(ctx, pwText, 8, 30); }
  }

  function drawWhisper(ctx, text, x, y) {
    panel(ctx, x, y, 220, 50);
    Font.wrap(ctx, text, x + 8, y + 8, 204, 1, 'censor', 3, 0);
  }

  // ---------- speech bubbles (world-anchored; layer 11) ----------
  // Bubbles that would overlap an earlier one this frame move up above it, so a line and its reply both read.
  var MAX_PLACED = 12, placed = new Float32Array(MAX_PLACED * 4), placedN = 0;
  function stackAbove(x, y, w, h, n) {
    for (var moved = true, guard = 0; moved && guard < n; guard++) {
      moved = false;
      for (var j = 0; j < n; j++) {
        var px = placed[j * 4], py = placed[j * 4 + 1], pw = placed[j * 4 + 2], ph = placed[j * 4 + 3];
        if (x < px + pw && px < x + w && y < py + ph + 2 && py < y + h + 2) { y = py - h - 2; moved = true; }
      }
    }
    return y;
  }
  function drawBubbles(ctx, w, camX, camY, pxs, pys) {
    var bs = w.bubbles; placedN = 0;
    if (!bs || w.state === 'over') return;
    var bub = S('ui_bubble'), tail = S('ui_bubble_tail');
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i]; if (!b.alive || !b.text || b.t < 0) continue;
      var ax, ay;
      if (b.ownerKind === 'player') { ax = pxs; ay = pys - 66; }
      else if (b.ownerKind === 'enemy' && w.enemies && w.enemies[b.ownerIdx]) { var e = w.enemies[b.ownerIdx]; ax = e.x - camX; ay = e.y - e.h - 8 - camY; }
      else if (b.ownerKind === 'boss' && w.boss && w.boss.alive) { ax = w.boss.x - camX; ay = w.boss.y - S('boss_' + w.boss.id).fh - camY; }
      else if ((b.ownerKind === 'npc' || b.ownerKind === 'world') && w.gags && w.gags[b.ownerIdx]) { var g = w.gags[b.ownerIdx], gd = TEXT.gags[g.id]; ax = g.x - camX; ay = g.y - (gd.bar ? 94 : S(gd.prop || gd.npc).fh + 4) - camY; }   // above the gag's bar
      else { ax = b.x - camX; ay = b.y - camY; }
      // Boss lines are 1x text on a translucent bubble above the sprite's head, so the boss and the hero stay visible.
      var boss = b.ownerKind === 'boss', fs = boss ? 1 : 2, mw = boss ? 180 : 200;
      var tw = Font.wrapWidth(b.text, mw, fs), th = Font.wrap(null, b.text, 0, 0, mw, fs, 'ink', 3, 0);
      var bw = tw + 14, bh = th + 12, bx = Math.max(4, Math.min(W - bw - 4, (ax - 12) | 0)), by = Math.max(boss ? 46 : 4, (ay - bh - 6) | 0);   // boss lines stay under the boss bar
      by = stackAbove(bx, by, bw, bh, placedN);
      placed[placedN * 4] = bx; placed[placedN * 4 + 1] = by; placed[placedN * 4 + 2] = bw; placed[placedN * 4 + 3] = bh;
      if (placedN < MAX_PLACED - 1) placedN++;
      if (boss) ctx.globalAlpha = 0.85;
      nine(ctx, bub, bx, by, bw, bh, 8);
      ctx.drawImage(tail.img, Math.max(bx + 4, Math.min(bx + bw - 12, (ax - 2) | 0)), by + bh - 1);
      Font.wrap(ctx, b.text, bx + 7, by + 6, mw, fs, 'ink', 3, 0);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- touch + reticle ----------
  var TOUCH = [[2, 580, 316], [3, 520, 324], [4, 580, 252], [5, 520, 264], [6, 460, 324]];
  function drawTouch(ctx) {
    var e = S('ui_touch');
    ctx.globalAlpha = 0.4;
    for (var i = 0; i < TOUCH.length; i++) ctx.drawImage(e.img, TOUCH[i][0] * e.fw, 0, e.fw, e.fh, TOUCH[i][1] - 28, TOUCH[i][2] - 28, e.fw, e.fh);
    ctx.drawImage(e.img, 0, 0, e.fw, e.fh, 62, 262, e.fw, e.fh);
    ctx.globalAlpha = 1;
    spr(ctx, 'ui_pause', 0, 606, 10);
  }
  function drawReticle(ctx, w) {
    var a = window.Input && Input.aim; if (!a || !a.x) return;
    spr(ctx, 'ui_reticle', w.player.sparkCd > 0 ? 1 : 0, a.x - 8, a.y - 8);
  }

  return { init: init, draw: draw, drawBubbles: drawBubbles };
})();
