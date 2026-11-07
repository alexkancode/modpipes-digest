// HUD (render): sky strip and moon, score panel, combo badge, buttons, warning badge,
// hints, and the title / pause / over screens. Text is baked; no fillText per frame.
var HUD = (function () {
  var W = 960, H = 540, CX = 480;
  var DOTS = [2, 6], NO_DASH = [];
  var C = {}, S = {};                       // palette cache, sheets
  var scoreC, bestC, panelC, titleC, promptC, controlsC, pauseC, overC;
  var OVER_W = 600, OVER_H = 172, plateC;
  var shownScore = -1, shownBest = -1, badgeCombo = 1, badgePop = 0;

  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function frame(ctx, s, f, x, y) { ctx.drawImage(s.img, f * s.fw, 0, s.fw, s.fh, x, y, s.fw, s.fh); }
  function blitCentered(ctx, c, x, y) { ctx.drawImage(c, Math.round(x - c.textW / 2), Math.round(y - c.textH / 2)); }

  function panel(w, h, alpha, border) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h; c.textW = w; c.textH = h;
    var g = c.getContext('2d');
    g.globalAlpha = alpha; g.fillStyle = C.ink;
    g.beginPath(); g.roundRect(0, 0, w, h, 2); g.fill();
    if (border) {
      g.globalAlpha = 0.3; g.strokeStyle = C.hud_text; g.lineWidth = 2;
      g.beginPath(); g.roundRect(1, 1, w - 2, h - 2, 2); g.stroke();
    }
    g.globalAlpha = 1;
    return c;
  }

  // Bake lines onto a bordered panel: each line [text, size, color, y, alpha].
  function bakeScreen(w, h, lines) {
    var c = panel(w, h, 0.85, true), g = c.getContext('2d');
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i];
      if (!L) continue;
      var t = LAYERS.makeText(L[0], L[1], L[2], 1);
      g.globalAlpha = L[4] === undefined ? 1 : L[4];
      g.drawImage(t, Math.round((w - t.textW) / 2), Math.round(L[3] - t.textH / 2));
    }
    return c;
  }

  function drawSky(ctx, world) {
    ctx.drawImage(LAYERS.sky, 0, 0);
    var k = world.dawnK || 0;
    if (k > 0) { ctx.globalAlpha = k; ctx.fillStyle = C.sky_dawn; ctx.fillRect(0, 0, W, 30); }
    ctx.globalAlpha = 0.25 + 0.75 * k; ctx.fillStyle = C.dawn; ctx.fillRect(0, 29, W, 1);
    ctx.globalAlpha = 0.25; ctx.strokeStyle = C.hud_text; ctx.lineWidth = 1;
    ctx.setLineDash(DOTS);
    ctx.beginPath(); ctx.moveTo(300, 24); ctx.quadraticCurveTo(480, -4, 660, 24); ctx.stroke();
    ctx.setLineDash(NO_DASH);
    ctx.globalAlpha = 1;
    var s = Math.min(1, (world.t || 0) / 180), u = 1 - s;  // quadratic bezier, apex (480, 10)
    var mx = u * u * 300 + 2 * u * s * 480 + s * s * 660, my = u * u * 24 + 2 * u * s * -4 + s * s * 24;
    frame(ctx, S.moon, 0, Math.round(mx - 12), Math.round(my - 12));
  }

  function drawScore(ctx, world) {
    if (world.score !== shownScore) { shownScore = world.score; LAYERS.makeText(fmt(shownScore), 32, C.hud_text, 2, scoreC); }
    if (world.best !== shownBest) { shownBest = world.best; LAYERS.makeText('Best ' + fmt(shownBest), 20, C.golden, 2, bestC); }
    ctx.drawImage(panelC, 8, 8);
    ctx.drawImage(scoreC, 17, 10);
    ctx.drawImage(bestC, 17, 42);
  }

  function drawCombo(ctx, world) {
    if (world.combo !== badgeCombo) { if (world.combo > badgeCombo) badgePop = 1; badgeCombo = world.combo; }
    if (world.combo < 2) return;
    var s = S.combo_badge, k = 1 + 0.3 * badgePop;
    badgePop = Math.max(0, badgePop - 0.12);
    var w = s.fw * k, h = s.fh * k;
    ctx.drawImage(s.img, (Math.min(5, world.combo) - 2) * s.fw, 0, s.fw, s.fh, 236 - w / 2, 24 - h / 2, w, h);
    var drain = Math.max(0, 1 - world.comboT / 2);
    ctx.fillStyle = C.hud_text;
    ctx.fillRect(216, 39, Math.round(40 * drain), 2);
  }

  function drawWorldTags(ctx, world) {
    var f = world.frog, fx = Math.round(f.x), fy = Math.round(f.y - f.z);
    if (f.frostK > 0 && (f.state === 'sit' || f.state === 'land' || f.state === 'crouch' || f.state === 'air')) {
      var p = 1 + 0.075 * (1 - Math.cos((world.t || 0) * Math.PI * 2)), by = fy - 34;
      ctx.fillStyle = C.ink;
      ctx.beginPath(); ctx.arc(fx, by, 12 * p, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.warn; ctx.lineWidth = 2; ctx.stroke();
      var sf = S.icon_snowflake, w = sf.fw * p;
      ctx.drawImage(sf.img, 0, 0, sf.fw, sf.fh, fx - w / 2, by - w / 2, w, w);
    }
    var hy = fy + 34;
    if (world.hintSnap > 0) { ctx.globalAlpha = Math.min(0.7, world.hintSnap); blitCentered(ctx, LAYERS.text.hintSnap, fx, hy); hy += 20; }
    if (world.hintHop > 0) { ctx.globalAlpha = Math.min(0.7, world.hintHop); blitCentered(ctx, LAYERS.text.hintHop, fx, hy); }
    ctx.globalAlpha = 1;
  }

  function drawOverTint(ctx, world) {
    var e = world.endT || 0, k = Math.min(1, e / 0.4);
    if (world.won) {                                        // warm dawn sweep up from the horizon
      var up = Math.min(1, e / 0.6);
      ctx.globalAlpha = 0.14 * k; ctx.fillStyle = C.dawn;
      ctx.fillRect(0, H * (1 - up), W, H * up);
    } else {                                                // dim the pond, spotlight the frozen frog
      var f = world.frog;
      ctx.globalAlpha = 0.4 * k; ctx.fillStyle = C.ink;
      ctx.beginPath(); ctx.rect(0, 30, W, H - 30); ctx.arc(f.x, f.y, 70, 0, Math.PI * 2);
      ctx.fill('evenodd');
    }
    ctx.globalAlpha = 1;
  }

  // The card is readable from the first over frame (a capture at endT = 0 must show it);
  // it settles 8 px over 0.25 s and sits clear of the frog so the frozen / dawn pose stays in view.
  function drawOverPanel(ctx, world) {
    if (!overC) return;
    var p = Math.min(1, (world.endT || 0) / 0.25), ease = 1 - (1 - p) * (1 - p) * (1 - p);
    var top = world.frog.y < 290 ? H - OVER_H - 14 : 64;
    ctx.drawImage(overC, CX - OVER_W / 2, Math.round(top + 8 * (1 - ease)));
  }
  function clock(t) { var s = Math.floor(t); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }

  return {
    init: function () {
      var roles = ASSETS.plan.palette;
      for (var r in roles) C[r] = ASSETS.color(r);
      var names = ['moon', 'combo_badge', 'btn_pause', 'btn_mute', 'icon_snowflake'];
      for (var i = 0; i < names.length; i++) S[names[i]] = LAYERS.sheet(names[i]);
      panelC = panel(200, 64, 0.35, true);             // light plate; text carries its own ink stroke
      scoreC = LAYERS.makeText('0,000,000', 32, C.hud_text, 0);
      bestC = LAYERS.makeText('Best 0,000,000', 20, C.golden, 2);
      pauseC = bakeScreen(440, 80, [['Paused — P to resume', 32, C.hud_text, 40]]);
      promptC = LAYERS.makeText('Click or press Space to start', 24, C.hud_text, 1);
      controlsC = LAYERS.makeText('Hop: click a pad or arrows · Snap: click a firefly or Space', 16, C.hud_text, 1);
      plateC = panel(640, 64, 0.8, true);              // backing for the start prompt and controls
      shownScore = shownBest = -1;
    },

    screen: function (state, prev, world) {
      badgeCombo = 1; badgePop = 0;
      if (state === 'title') {
        titleC = bakeScreen(600, world.best > 0 ? 148 : 128, [  // top band; the frog and its pad stay visible
          ['Last Light Pond', 56, C.firefly_core, 44],
          ['Catch fireflies. Keep the pond warm.', 24, C.hud_text, 96],
          world.best > 0 ? ['Best ' + fmt(world.best), 16, C.golden, 128] : null
        ]);
      }
      if (state === 'over') {
        var n = world.shortOfDawn, own = world.pads[world.frog.pad];
        var why = own && own.d0 > 90 ? 'Your pad iced over: hop inward when it frosts' : null;
        var tail = 'Best combo ×' + world.bestCombo + ' · Caught ' + world.caught;
        var best = world.newBest ? 'New best!' : 'Best ' + fmt(world.best);
        overC = bakeScreen(OVER_W, OVER_H, world.won ? [   // GDD section 8 cards
          ['Dawn! ' + fmt(world.score), 32, C.dawn, 28],
          ['Open water bonus +' + fmt(world.bonus) + ' · ' + tail, 16, C.hud_text, 62],
          [best, world.newBest ? 24 : 16, world.newBest ? C.golden : C.hud_text, 92],
          ['click, tap or press R to play again · seed ' + world.seed, 16, C.hud_text, 150, 0.85]
        ] : [
          ['Frozen at ' + clock(world.endTime), 32, C.ice_edge, 26],
          [n + (n === 1 ? ' firefly' : ' fireflies') + ' short of dawn', 16, C.ice_edge, 56],
          ['Score ' + fmt(world.score) + ' · ' + tail, 16, C.hud_text, 78],
          why ? [why, 16, C.warn, 100] : null,
          [best, world.newBest ? 24 : 16, world.newBest ? C.golden : C.hud_text, why ? 126 : 108],
          ['click, tap or press R to try again · seed ' + world.seed, 16, C.hud_text, 154, 0.85]
        ]);
      }
    },

    draw: function (ctx, world) {
      var st = world.state, live = st === 'play' || st === 'pause';
      drawSky(ctx, world);
      if (live) drawWorldTags(ctx, world);
      var dim = st === 'title' ? 0.15 : st === 'pause' ? 0.5 : 0;
      if (dim) { ctx.globalAlpha = dim; ctx.fillStyle = C.ink; ctx.fillRect(0, 30, W, H - 30); ctx.globalAlpha = 1; }
      if (st === 'over') drawOverTint(ctx, world);
      if (st !== 'title') drawScore(ctx, world);
      if (live) drawCombo(ctx, world);
      frame(ctx, S.btn_mute, world.muted ? 1 : 0, 864, 8);
      if (live) frame(ctx, S.btn_pause, st === 'pause' ? 1 : 0, 912, 8);

      if (st === 'title') {
        if (titleC) ctx.drawImage(titleC, CX - 300, 40);
        ctx.drawImage(plateC, CX - 320, 376);
        ctx.globalAlpha = 0.8 + 0.2 * Math.sin((world.animT || 0) * Math.PI);   // 0.6..1.0 at 0.5 Hz
        blitCentered(ctx, promptC, CX, 392);
        ctx.globalAlpha = 1;
        blitCentered(ctx, controlsC, CX, 424);
      } else if (st === 'pause') {
        ctx.drawImage(pauseC, CX - 220, 230);
      } else if (st === 'over') {
        drawOverPanel(ctx, world);
      }
    }
  };
})();
