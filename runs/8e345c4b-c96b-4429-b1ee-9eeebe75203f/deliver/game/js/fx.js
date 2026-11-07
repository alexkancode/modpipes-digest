// FX (render): pooled particles, ripples, glow bursts, thaw waves, popups,
// plus the screen-shake trauma, hit-stop and the drawn-ice offsets.
var FX = (function () {
  var CX = 480, CY = 290, TAU = Math.PI * 2;
  var WAVE_T = 0.25, BAND_T = 0.3, OVERSHOOT = 6, RUSH_T = 0.4, MELT_T = 0.6;

  // Centre of the 12 px warm band on the ice edge, kept inside the pond rim.
  function bandR(R) { return Math.min(R + 12, 260 - 6); }

  function pool(n, make) { var a = []; for (var i = 0; i < n; i++) a.push(make()); return a; }
  var parts, ripples, bursts, waves, popups;
  var trauma = 0, hitT = 0, rushT = -1, rushPx = 0, meltT = -1, meltPx = 0;
  var shakeOut = { x: 0, y: 0 };
  var sheetSpark, sheetShard, glow, colRipple, colThaw;

  function free(list) {
    for (var i = 0; i < list.length; i++) if (!list[i].on) return list[i];
    return null;                                         // full pool skips the spawn
  }
  function clearAll(list) { for (var i = 0; i < list.length; i++) list[i].on = false; }

  function particle(sheet, frame, x, y, vx, vy, life, grav, spin) {
    var p = free(parts);
    if (!p) return;
    p.on = true; p.sheet = sheet; p.frame = frame; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.t = 0; p.life = life; p.grav = grav; p.rot = spin ? RNG.fx() * TAU : 0; p.spin = spin;
  }

  function burstSparkles(x, y, frame, n, speed) {
    for (var i = 0; i < n; i++) {
      var a = RNG.fx() * TAU, s = speed * (0.5 + RNG.fx() * 0.5);
      particle(sheetSpark, frame + (i & 1), x, y, Math.cos(a) * s, Math.sin(a) * s - 10, 0.5 + RNG.fx() * 0.3, 30, 0);
    }
  }

  function shatter(R, n) {
    for (var i = 0; i < n; i++) {
      var a = RNG.fx() * TAU, r = R + RNG.fx() * 20, s = 140 + RNG.fx() * 160;
      particle(sheetShard, i % 3, CX + Math.cos(a) * r, CY + Math.sin(a) * r,
        Math.cos(a) * s, Math.sin(a) * s, 0.6, 0, (RNG.fx() - 0.5) * 12);
    }
  }

  var spawners = {
    ripple: function (x, y, delay, rMax) {               // a = delay s, b = max radius
      var r = free(ripples);
      if (r) { r.on = true; r.x = x; r.y = y; r.t = -(delay || 0); r.rMax = rMax || 40; }
    },
    burst: function (x, y, frame, radius) {              // a = glow frame, b = radius
      var b = free(bursts);
      if (b) { b.on = true; b.x = x; b.y = y; b.t = 0; b.frame = frame; b.r = radius; }
    },
    sparkle: function (x, y, frame, n) { burstSparkles(x, y, frame, n || 3, 40); },
    drip: function (x, y) {
      for (var i = 0; i < 2; i++) particle(sheetSpark, 3, x + (i ? 6 : -6), y, 0, 20, 0.5, 40, 0);
    },
    trail: function (x, y) { particle(sheetSpark, Math.floor(RNG.fx() * 2), x, y, 0, 6, 0.5, 0, 0); },
    shatter: function (x, y, R, n) {                     // J14: shards fly and the drawn ice opens to the rim
      shatter(R, n || 40); meltT = 0; meltPx = 260 + 30 - R;
    },
    wave: function (x, y, amount, R) {                  // a = thaw amount, b = R after the catch
      var w = free(waves);
      if (!w) return;
      var dx = x - CX, dy = y - CY;
      w.on = true; w.x = x; w.y = y; w.t = 0; w.amount = amount; w.R = R;
      w.reach = Math.max(8, R - Math.sqrt(dx * dx + dy * dy));
    },
    popup: function (x, y, canvas) {                    // a = text sprite
      var p = free(popups);
      if (p) { p.on = true; p.x = x; p.y = y; p.t = 0; p.img = canvas; }
    },
    trauma: function (x, y, amount) { trauma = Math.min(1, trauma + amount); },
    hitstop: function (x, y, seconds) { hitT = Math.max(hitT, seconds); },
    rush: function (x, y, px) { rushT = 0; rushPx = px; }
  };

  return {
    init: function () {
      if (!parts) {
        parts = pool(256, function () { return { on: false, sheet: null, frame: 0, x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, grav: 0, rot: 0, spin: 0 }; });
        ripples = pool(32, function () { return { on: false, x: 0, y: 0, t: 0, rMax: 40 }; });
        bursts = pool(16, function () { return { on: false, x: 0, y: 0, t: 0, frame: 0, r: 24 }; });
        waves = pool(8, function () { return { on: false, x: 0, y: 0, t: 0, amount: 0, R: 0, reach: 0 }; });
        popups = pool(16, function () { return { on: false, x: 0, y: 0, t: 0, img: null }; });
      }
      sheetSpark = LAYERS.sheet('sparkle'); sheetShard = LAYERS.sheet('ice_shard'); glow = LAYERS.glow;
      colRipple = ASSETS.color('water_ripple'); colThaw = ASSETS.color('thaw');
      clearAll(parts); clearAll(ripples); clearAll(bursts); clearAll(waves); clearAll(popups);
      trauma = 0; hitT = 0; rushT = -1; rushPx = 0; meltT = -1; meltPx = 0;
    },

    spawn: function (type, x, y, a, b) {
      var fn = spawners[type];
      if (fn) fn(x, y, a, b);
    },

    update: function (dt) {
      var i, p;
      trauma = Math.max(0, trauma - 1.4 * dt);
      hitT = Math.max(0, hitT - dt);
      if (rushT >= 0 && rushT < RUSH_T) rushT = Math.min(RUSH_T, rushT + dt);
      if (meltT >= 0 && meltT < MELT_T) meltT = Math.min(MELT_T, meltT + dt);
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        if (!p.on) continue;
        p.t += dt;
        if (p.t >= p.life) { p.on = false; continue; }
        var drag = p.sheet === sheetShard ? 1 - 3.5 * dt : 1;   // shards ease out
        p.vx *= drag; p.vy = p.vy * drag + p.grav * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
      }
      for (i = 0; i < ripples.length; i++) if (ripples[i].on && (ripples[i].t += dt) >= 0.5) ripples[i].on = false;
      for (i = 0; i < bursts.length; i++) if (bursts[i].on && (bursts[i].t += dt) >= 0.25) bursts[i].on = false;
      for (i = 0; i < waves.length; i++) if (waves[i].on && (waves[i].t += dt) >= WAVE_T + BAND_T) waves[i].on = false;
      for (i = 0; i < popups.length; i++) if (popups[i].on && (popups[i].t += dt) >= 0.6) popups[i].on = false;
    },

    // Under the pads: water ripples.
    drawUnder: function (ctx) {
      ctx.strokeStyle = colRipple; ctx.lineWidth = 2;
      for (var i = 0; i < ripples.length; i++) {
        var r = ripples[i];
        if (!r.on || r.t < 0) continue;
        var k = r.t / 0.5;
        ctx.globalAlpha = 1 - k;
        ctx.beginPath(); ctx.arc(r.x, r.y, 10 + (r.rMax - 10) * (1 - (1 - k) * (1 - k)), 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },

    // Over the ice: thaw waves and bands, glow bursts (lighter), then particles and popups.
    drawOver: function (ctx) {
      var i, k, G = LAYERS.GLOW_CELL;
      ctx.strokeStyle = colThaw;
      for (i = 0; i < waves.length; i++) {
        var w = waves[i];
        if (!w.on) continue;
        ctx.beginPath();
        if (w.t < WAVE_T) {
          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.9 - 0.5 * (w.t / WAVE_T); ctx.lineWidth = 2;
          ctx.arc(w.x, w.y, w.reach * (w.t / WAVE_T), 0, TAU);
          ctx.stroke();
        } else {
          k = 1 - (w.t - WAVE_T) / BAND_T;
          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.75 * k; ctx.lineWidth = 12;
          ctx.arc(CX, CY, bandR(w.R), 0, TAU);
          ctx.stroke();
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * k; ctx.lineWidth = 4;
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.imageSmoothingEnabled = true;
      for (i = 0; i < bursts.length; i++) {
        var b = bursts[i];
        if (!b.on) continue;
        k = b.t / 0.25;
        var r = b.r * (0.4 + 0.6 * k);
        ctx.globalAlpha = 1 - k * k;
        ctx.drawImage(glow, b.frame * G, 0, G, G, b.x - r, b.y - r, r * 2, r * 2);
      }
      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = 'source-over';
      for (i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (!p.on) continue;
        var s = p.sheet;
        ctx.globalAlpha = Math.min(1, 2 * (1 - p.t / p.life));
        if (p.spin) {
          ctx.setTransform(1, 0, 0, 1, p.x, p.y); ctx.rotate(p.rot);
          ctx.drawImage(s.img, p.frame * s.fw, 0, s.fw, s.fh, -s.fw / 2, -s.fh / 2, s.fw, s.fh);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        } else {
          ctx.drawImage(s.img, p.frame * s.fw, 0, s.fw, s.fh, Math.round(p.x - s.fw / 2), Math.round(p.y - s.fh / 2), s.fw, s.fh);
        }
      }
      for (i = 0; i < popups.length; i++) {
        var u = popups[i];
        if (!u.on) continue;
        k = u.t / 0.6;
        ctx.globalAlpha = k < 0.66 ? 1 : (1 - k) * 3;
        ctx.drawImage(u.img, Math.round(u.x - u.img.textW / 2), Math.round(u.y - 30 - 20 * (1 - (1 - k) * (1 - k))));
      }
      ctx.globalAlpha = 1;
    },

    shake: function () {
      var m = 4 * trauma * trauma;
      shakeOut.x = m ? Math.round((RNG.fx() * 2 - 1) * m) : 0;
      shakeOut.y = m ? Math.round((RNG.fx() * 2 - 1) * m) : 0;
      return shakeOut;
    },

    hitStop: function () { return hitT > 0; },
    bandR: bandR,

    // Drawn ice radius = true R minus thaw still travelling, minus the freeze rush, plus the dawn melt.
    shownROffset: function () {
      var off = 0;
      for (var i = 0; i < waves.length; i++) {
        var w = waves[i];
        if (!w.on) continue;
        if (w.t < WAVE_T) off -= w.amount;
        else { var q = 1 - (w.t - WAVE_T) / BAND_T; off += OVERSHOOT * q * q; }
      }
      if (rushT >= 0) { var k = rushT / RUSH_T; off -= rushPx * (1 - (1 - k) * (1 - k)); }
      if (meltT >= 0) { k = meltT / MELT_T; off += meltPx * (1 - (1 - k) * (1 - k)); }
      return off;
    }
  };
})();
