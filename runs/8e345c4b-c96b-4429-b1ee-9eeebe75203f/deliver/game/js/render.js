// RENDER (render): the five hooks the logic calls, the per-frame draw order,
// and the render-only animation state (pad cross-fades, dips, hit-stop pose).
var RENDER = (function () {
  var TAU = Math.PI * 2, CX = 480, CY = 290;
  var ctx, world, sx = 0, sy = 0, clock = 0, warm = 0, fishT = 25, trailT = 0, nopeT = 0, frozenT = -1;
  var freezeK = new Float32Array(14), dipT = new Float32Array(14);
  var S = {}, C = {};
  var DOTS = [2, 4], NO_DASH = [], GLOW_FLY = 34, GLOW_GOLD = 44, WARN = CONFIG.WARN_MARGIN;
  var POSES = { sit: 0, crouch: 1, air: 2, land: 3, frozen: 5, dawn: 6 };
  // Frog pose captured on a catch; drawn instead of the live frog during hit-stop.
  var held = { x: 0, y: 0, z: 0, state: 'sit', stateT: 0, facing: 0, frostK: 0, nopeT: 0,
               tonguePhase: 0, tipX: 0, tipY: 0, carryFly: -1, pad: 0 };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function hold(f, x, y) {
    held.x = x; held.y = y; held.z = f.z; held.state = f.state; held.stateT = f.stateT; held.facing = f.facing;
    held.frostK = f.frostK; held.nopeT = f.nopeT; held.tonguePhase = f.tonguePhase;
    held.tipX = f.tipX; held.tipY = f.tipY; held.carryFly = f.carryFly; held.pad = f.pad;
  }
  function blit(s, f, x, y) {
    ctx.drawImage(s.img, f * s.fw, 0, s.fw, s.fh, Math.round(x - s.fw / 2), Math.round(y - s.fh / 2), s.fw, s.fh);
  }
  function glowAt(frame, x, y, r) {
    var G = LAYERS.GLOW_CELL;
    ctx.drawImage(LAYERS.glow, frame * G, 0, G, G, x - r, y - r, r * 2, r * 2);
  }

  // ---- render-only animation state ----------------------------------------
  function animate(dt) {
    clock += dt;
    nopeT = Math.max(0, nopeT - dt);
    if (frozenT >= 0) frozenT += dt;
    for (var i = 0; i < world.padCount; i++) {
      var target = world.pads[i].frozen && !world.won ? 1 : 0;   // dawn thaws every pad with the ice
      freezeK[i] += Math.max(-dt / 0.4, Math.min(dt / 0.4, target - freezeK[i]));
      dipT[i] = Math.max(0, dipT[i] - dt);
    }
    if (world.state !== 'play') return;
    if ((fishT -= dt) <= 0) {                          // J17 fish ripple somewhere in open water
      fishT = 20 + RNG.fx() * 20;
      var a = RNG.fx() * TAU, d = Math.sqrt(RNG.fx()) * Math.max(10, world.ice.R - 30);
      FX.spawn('ripple', CX + Math.cos(a) * d, CY + Math.sin(a) * d, 0, 24);
    }
    if ((trailT -= dt) <= 0) {                         // golden sparkle trail, about 6 alive
      trailT = 0.08;
      for (i = 0; i < world.flies.length; i++) {
        var g = world.flies[i];
        if (g.active && g.golden && g.state !== 'expired') FX.spawn('trail', g.x + (RNG.fx() - 0.5) * 10, g.y + (RNG.fx() - 0.5) * 10);
      }
    }
  }

  // ---- world layers ---------------------------------------------------------
  function padDip(i) { var k = dipT[i] / (10 / 60); return k * k; }

  function drawPads(alpha) {
    for (var i = 0; i < world.padCount; i++) {
      var p = world.pads[i], c = LAYERS.pad(i), s = c.size, h = s / 2, P = LAYERS.PAD_CELL;
      var x = lerp(p.px, p.x, alpha), y = lerp(p.py, p.y, alpha), k = padDip(i);
      ctx.setTransform(1 + 0.08 * k, 0, 0, 1 - 0.08 * k, Math.round(x) + sx, Math.round(y + 3 * k) + sy);
      ctx.rotate(p.angle);
      var fk = freezeK[i];
      if (fk < 1) ctx.drawImage(c, 0, 0, s, s, -h, -h, s, s);
      if (fk < 1 && !p.frozen && p.margin < WARN) {    // J12 cracked wedge grows from the outer side
        var cover = clamp01(1 - p.margin / WARN), w = Math.ceil(s * cover);
        ctx.save(); ctx.beginPath(); ctx.rect(h - w, -h, w, s); ctx.clip();
        ctx.drawImage(c, P, 0, s, s, -h, -h, s, s);
        ctx.restore();
      }
      if (fk > 0) { ctx.globalAlpha = fk; ctx.drawImage(c, 2 * P, 0, s, s, -h, -h, s, s); ctx.globalAlpha = 1; }
    }
    ctx.setTransform(1, 0, 0, 1, sx, sy);
  }

  function drawTargets(fx, fy) {
    var f = world.frog, i, p, wob = nopeT > 0 ? 4 * Math.sin(nopeT / 0.15 * Math.PI * 3) : 0;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.15; ctx.strokeStyle = C.hud_text; ctx.setLineDash(DOTS);     // reach circle
    ctx.beginPath(); ctx.arc(fx, fy, CONFIG.REACH + wob, 0, TAU); ctx.stroke();
    ctx.setLineDash(NO_DASH);
    var warning = f.frostK > 0, ownD = world.pads[f.pad] ? world.pads[f.pad].d : 0;
    ctx.globalAlpha = 0.45; ctx.strokeStyle = C.pad_rim; ctx.beginPath();          // in-range outlines
    for (i = 0; i < world.padCount; i++) {
      p = world.pads[i];
      if (!p.inRange || (warning && p.d < ownD) || p.margin < WARN) continue;
      ctx.moveTo(p.x + p.r + 3 + wob, p.y); ctx.arc(p.x, p.y, p.r + 3 + wob, 0, TAU);
    }
    ctx.stroke();
    ctx.strokeStyle = C.warn; ctx.setLineDash(DOTS); ctx.beginPath();             // risky: about to freeze
    for (i = 0; i < world.padCount; i++) {
      p = world.pads[i];
      if (!p.inRange || p.margin >= WARN) continue;
      ctx.moveTo(p.x + p.r + 3 + wob, p.y); ctx.arc(p.x, p.y, p.r + 3 + wob, 0, TAU);
    }
    ctx.stroke(); ctx.setLineDash(NO_DASH);
    if (warning) {                                                                   // safe inward pads pulse 1 Hz
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(clock * TAU); ctx.lineWidth = 3; ctx.beginPath();
      for (i = 0; i < world.padCount; i++) {
        p = world.pads[i];
        if (p.inRange && p.d < ownD) { ctx.moveTo(p.x + p.r + 4, p.y); ctx.arc(p.x, p.y, p.r + 4, 0, TAU); }
      }
      ctx.stroke();
    }
    var hv = world.hover;
    if (hv && hv.active && hv.pad >= 0 && hv.pad !== f.pad && hv.pad !== world.frog.targetPad && world.pads[hv.pad]) {  // hover ring, never on the frog's pad
      p = world.pads[hv.pad];
      ctx.globalAlpha = 1;
      if (!hv.padValid) { ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 7 + wob, 0, TAU); ctx.stroke(); }
      ctx.strokeStyle = hv.padValid ? C.pad_rim : C.invalid; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 6 + wob, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Fireflies: seeded irregular blink and bob from fly.blink.
  function flyLit(fl) {
    if (fl.golden) return true;
    if (fl.state === 'blinking') return ((clock * 8) | 0) % 2 === 0;
    var b = fl.blink;
    return Math.sin(clock * TAU * (0.5 + 0.5 * b) + b * 40) + 0.6 * Math.sin(clock * 3.7 + b * 90) > -0.4;
  }
  function flyBob(fl) { return 2 * Math.sin(clock * TAU * (0.6 + 0.6 * fl.blink) + fl.blink * TAU); }
  function flyFade(fl) { return fl.state === 'expired' ? clamp01(fl.fadeT / 0.3) : 1; }

  function drawFlies(alpha, carry) {
    var i, fl, x, y, k, list = world.flies;
    ctx.imageSmoothingEnabled = true;
    for (var pass = 0; pass < 2; pass++) {                              // 0 warm wash, 1 additive halo
      ctx.globalCompositeOperation = pass ? 'lighter' : 'source-over';
      for (i = 0; i < list.length; i++) {
        fl = list[i];
        if (!fl.active || i === carry) continue;
        k = flyFade(fl);
        var lit = flyLit(fl) ? 1 : 0.5, gr = (fl.golden ? GLOW_GOLD : GLOW_FLY) * k * k;
        x = lerp(fl.px, fl.x, alpha); y = lerp(fl.py, fl.y, alpha);
        if (pass === 0) {                                               // J16 reflection on the water
          ctx.globalAlpha = 0.35 * k * lit;
          ctx.drawImage(LAYERS.glow, (fl.golden ? 1 : 0) * LAYERS.GLOW_CELL, 0, LAYERS.GLOW_CELL, LAYERS.GLOW_CELL, x - 8, y + 6, 16, 8);
        }
        y += flyBob(fl);
        ctx.globalAlpha = k * lit * (pass ? 0.9 : 0.3);
        glowAt(pass && !fl.golden ? 0 : 1, x, y, pass ? gr : gr * 1.6);
      }
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = false;
    for (i = 0; i < list.length; i++) {
      fl = list[i];
      if (!fl.active || i === carry) continue;
      ctx.globalAlpha = flyFade(fl);
      x = lerp(fl.px, fl.x, alpha); y = lerp(fl.py, fl.y, alpha) + flyBob(fl);
      if (fl.golden) blit(S.golden, ((clock * 20) | 0) % 2, x, y);
      else blit(S.firefly, flyLit(fl) ? 0 : 1, x, y);
    }
    ctx.globalAlpha = 1;
  }

  function drawTitleFlies(fx, fy) {
    for (var i = 0; i < 2; i++) {
      var a = clock * (i ? -0.7 : 0.9) + i * 2.4, r = 58 + 6 * Math.sin(clock * 1.3 + i);
      var x = fx + Math.cos(a) * r, y = fy + Math.sin(a) * r * 0.8 + 2 * Math.sin(clock * 5 + i);
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.3; glowAt(1, x, y, GLOW_FLY * 1.4);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.9; glowAt(0, x, y, GLOW_FLY);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false;
      blit(S.firefly, 0, x, y);
    }
  }

  // ---- frog -----------------------------------------------------------------
  function frogPose(f) {
    if (f.state === 'frozen') return frozenT >= 0 && frozenT < 0.2 ? 4 : 5;
    if (f.frostK > 0.5 && f.state === 'sit') return ((clock * 60 / 8) | 0) % 2 ? 4 : 0;
    return POSES[f.state] || 0;
  }

  function drawFrog(f, x, y, carry) {
    var dir8 = ((Math.round((f.facing + Math.PI / 2) / (Math.PI / 4)) % 8) + 8) % 8;
    var a8 = -Math.PI / 2 + dir8 * Math.PI / 4, lift = f.z;
    if (f.pad >= 0 && f.state !== 'air') y += 3 * padDip(f.pad);
    if (f.state === 'dawn' && ((clock * 60) | 0) % 30 < 6) lift += 2;

    // shadow on the water, shrinking to 60% at the apex
    var fr = S.frog, u = fr.fw / 40, sh = (1 - 0.4 * clamp01(f.z / 18)) * u;
    ctx.globalAlpha = 0.35; ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.ellipse(x, y + 4 * u, 14 * sh, 9 * sh, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;

    var mx = x + Math.cos(a8) * 14 * u, my = y - lift + Math.sin(a8) * 14 * u;
    if (f.tonguePhase === 1 || f.tonguePhase === 2) {                   // J4 tongue with ink edges
      ctx.lineCap = 'round';
      ctx.strokeStyle = C.ink; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(f.tipX, f.tipY); ctx.stroke();
      ctx.strokeStyle = C.tongue; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(f.tipX, f.tipY, 3, 0, TAU); ctx.fill();
      ctx.fillStyle = C.tongue; ctx.beginPath(); ctx.arc(f.tipX, f.tipY, 2, 0, TAU); ctx.fill();
      ctx.lineCap = 'butt';
      var cf = carry >= 0 ? world.flies[carry] : null;
      if (cf) {
        var punch = FX.hitStop() ? (world.reducedMotion ? 1.2 : 1.5) : 1, s = cf.golden ? S.golden : S.firefly;
        var w = s.fw * punch;
        ctx.drawImage(s.img, 0, 0, s.fw, s.fh, f.tipX - w / 2, f.tipY - w / 2, w, w);
      }
    }

    var sxs = 1, sys = 1, k;
    if (f.state === 'crouch') { sxs = 1.15; sys = 0.85; }
    else if (f.state === 'air') sxs = sys = 1 + 0.25 * clamp01(f.z / 18);
    else if (f.state === 'land') { k = clamp01((f.stateT - 0.05) / 0.05); sxs = lerp(1.3, 1, k); sys = lerp(0.75, 1, k); }
    var jx = 0;
    if (f.nopeT > 0) jx = ((clock * 30) | 0) % 2 ? 2 : -2;                  // J10 head shake
    else if (f.frostK > 0 && f.state !== 'air') jx = ((clock * 60) | 0) % 2 ? 1 : 0;  // J12 tremble
    var pose = frogPose(f) + (dir8 & 1 ? 7 : 0);
    ctx.save();
    ctx.translate(Math.round(x + jx), Math.round(y - lift));
    ctx.rotate(((dir8 >> 1) * Math.PI) / 2);
    ctx.scale(sxs, sys);
    if (f.state === 'frozen') {                    // J13: the green frog stays readable under its ice
      var base = dir8 & 1 ? 7 : 0, ice = clamp01(frozenT / 0.4);
      ctx.drawImage(fr.img, base * fr.fw, 0, fr.fw, fr.fh, -fr.fw / 2, -fr.fh / 2, fr.fw, fr.fh);
      ctx.globalAlpha = 0.6 * ice;
    }
    ctx.drawImage(fr.img, pose * fr.fw, 0, fr.fw, fr.fh, -fr.fw / 2, -fr.fh / 2, fr.fw, fr.fh);
    ctx.globalAlpha = 1;
    ctx.restore();
    if (f.state === 'frozen') {                    // frost halo marks the moment of loss
      ctx.globalAlpha = 0.8; ctx.strokeStyle = C.ice_edge; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y - lift, fr.fw * 0.6, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function warmUp() {                                   // first-use GPU stalls land on the title
    ctx.globalAlpha = 0.01;
    for (var n in S) if (S[n] && S[n].img) ctx.drawImage(S[n].img, 0, 0, 1, 1, 0, 0, 1, 1);
    ctx.drawImage(LAYERS.ice(world, world.ice.R), 0, 0, 1, 1, 0, 0, 1, 1);
    ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(LAYERS.glow, 0, 0, 1, 1, 0, 0, 1, 1);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    warm++;
  }

  return {
    init: function (canvas) {
      ctx = canvas.getContext('2d', { alpha: false });
      ctx.imageSmoothingEnabled = false;
      LAYERS.bakeStatic();
      FX.init();
      HUD.init();
      var plan = ASSETS.plan.sprites;
      for (var i = 0; i < plan.length; i++) S[plan[i].name] = LAYERS.sheet(plan[i].name);
      for (var r in ASSETS.plan.palette) C[r] = ASSETS.color(r);
    },

    reset: function (w) {
      world = w;
      LAYERS.bakePads(w);
      FX.init();
      for (var i = 0; i < 14; i++) { freezeK[i] = w.pads[i] && w.pads[i].frozen ? 1 : 0; dipT[i] = 0; }
      frozenT = -1; nopeT = 0; fishT = 20 + RNG.fx() * 20; trailT = 0;
    },

    frame: function (w, alpha, dt) {
      world = w;
      if (!ctx || !w.padCount) return;
      var fxDt = w.state === 'pause' ? 0 : dt;
      animate(fxDt);
      FX.update(fxDt);

      var f = w.frog, live = !FX.hitStop();
      if (live) hold(f, lerp(f.px, f.x, alpha), lerp(f.py, f.y, alpha));
      if (live) held.z = lerp(f.pz, f.z, alpha);
      var sh = w.reducedMotion ? null : FX.shake();
      sx = sh ? sh.x : 0; sy = sh ? sh.y : 0;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = C.deep; ctx.fillRect(0, 0, 960, 540);
      ctx.setTransform(1, 0, 0, 1, sx, sy);
      ctx.drawImage(LAYERS.water, 0, 0);
      FX.drawUnder(ctx);
      var shownR = w.ice.R + FX.shownROffset();
      ctx.drawImage(LAYERS.ice(w, shownR), 0, 0);
      drawPads(alpha);
      if (w.state === 'play') drawTargets(held.x, held.y);
      var carry = held.tonguePhase === 2 || !live ? held.carryFly : -1;
      drawFlies(alpha, carry);
      if (w.state === 'title') drawTitleFlies(held.x, held.y);
      drawFrog(held, held.x, held.y, carry);

      if (w.state === 'play' && w.ice.trend >= 0) {                       // J15 holding shimmer
        ctx.globalAlpha = 0.45 + 0.15 * Math.sin(clock * 3);         // source-over: additive thaw reads grey
        ctx.strokeStyle = C.thaw; ctx.lineWidth = 3;
        var a = clock * 0.8;
        var gr = FX.bandR(shownR);
        ctx.beginPath(); ctx.arc(CX, CY, gr, a, a + 0.6); ctx.stroke();
        ctx.beginPath(); ctx.arc(CX, CY, gr, a + Math.PI, a + Math.PI + 0.6); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      FX.drawOver(ctx);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (w.state === 'title' && warm < 30) warmUp();
      HUD.draw(ctx, w);
    },

    event: function (type, x, y, a, b) {
      try {
        var w = world, rm = w && w.reducedMotion, f = w && w.frog;
        switch (type) {
          case 'land':
            if (a >= 0 && a < 14) dipT[a] = 10 / 60;
            FX.spawn('ripple', x, y, 0, 40); FX.spawn('ripple', x, y, 0.1, 40);
            break;
          case 'catch':
          case 'goldenCatch':
            var gold = type === 'goldenCatch', big = gold || b === 3 || b === 5;
            hold(f, f.x, f.y); held.z = f.z;
            FX.spawn('hitstop', 0, 0, big ? 0.067 : 0.05);
            FX.spawn('burst', x, y, gold ? 1 : 0, gold ? 48 : 24);
            if (gold) {
              FX.spawn('sparkle', x, y, 0, 6);
              FX.spawn('popup', x, y, LAYERS.makeText('+' + a, 16, C.golden, 2));
              if (!rm) FX.spawn('trauma', 0, 0, 0.3);
            }
            break;
          case 'thaw': FX.spawn('wave', x, y, a, b); break;
          case 'midhop': FX.spawn('popup', x, y - 18, LAYERS.text.x2); break;
          case 'combo': if (a === 5 && !rm) FX.spawn('trauma', 0, 0, 0.25); break;
          case 'spawn': FX.spawn('sparkle', x, y, 0, a ? 4 : 2); break;
          case 'nope': nopeT = 0.15; break;
          case 'padFreeze': FX.spawn('sparkle', x, y, 2, 3); break;
          case 'padThaw': FX.spawn('drip', x, y); break;
          case 'frozen':
            frozenT = 0;
            FX.spawn('rush', 0, 0, 8);
            FX.spawn('sparkle', x, y, 2, 6);
            if (!rm) FX.spawn('trauma', 0, 0, 0.7);
            break;
          case 'dawn': FX.spawn('shatter', 0, 0, w ? w.ice.R : 200, 40); break;
        }
      } catch (e) { /* never throw into the logic */ }
    },

    screen: function (state, prev) {
      var w = world || window.WORLD;
      if (w) HUD.screen(state, prev, w);
    }
  };
})();
