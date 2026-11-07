// POND: pad layout, pad orbit and bob, the shrinking ice ring, pad freeze/thaw and margins.
var POND = (function () {
  var C = CONFIG, TAU = Math.PI * 2;
  var trendRing = new Float32Array(C.TREND_N), trendI = 0, trendN = 0, trendClock = 0;

  function placePad(p, id, r, d0, angle) {
    p.id = id; p.r = r; p.d0 = d0; p.d = d0; p.angle = angle;
    p.x = p.px = C.CX + d0 * Math.cos(angle);
    p.y = p.py = C.CY + d0 * Math.sin(angle);
    p.frozen = false; p.inRange = false; p.margin = 99;
  }

  // Clear of every placed pad, and linked to a more central pad at hop-able distance.
  function fits(pads, n, x, y, r, d0) {
    var linked = false;
    for (var i = 0; i < n; i++) {
      var q = pads[i], dx = q.x - x, dy = q.y - y, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < q.r + r + C.PAD_GAP) return false;
      if (q.d0 < d0 && dist >= C.PAD_LINK_MIN && dist <= C.PAD_LINK_MAX) linked = true;
    }
    return linked;
  }

  function layout(w) {
    var pads = w.pads, n = 1;
    placePad(pads[0], 0, C.PAD0_R, 0, 0);
    pads[0].bobP = 1; pads[0].bobPhase = 0;
    for (var k = 0; k < C.PAD_TRIES && n < C.PAD_COUNT; k++) {
      var r = RNG.range(C.PAD_R_MIN, C.PAD_R_MAX);
      var d0 = RNG.range(C.PAD_D_MIN, C.POND_R - r - C.PAD_EDGE);
      var a = RNG.range(0, TAU);
      var x = C.CX + d0 * Math.cos(a), y = C.CY + d0 * Math.sin(a);
      if (!fits(pads, n, x, y, r, d0)) continue;
      placePad(pads[n], n, r, d0, a);
      pads[n].bobP = RNG.range(C.BOB_P_MIN, C.BOB_P_MAX);
      pads[n].bobPhase = RNG.range(0, TAU);
      n++;
    }
    return n;
  }

  function build(w) {
    var n = layout(w);
    for (var k = 1; n < C.PAD_MIN_COUNT && k < 20; k++) {
      RNG.seed(w.seed + C.PAD_RESEED * k);
      n = layout(w);
    }
    w.padCount = n;
    w.ice.R = C.POND_R; w.ice.v = C.ICE_V0; w.ice.trend = 0;
    trendI = 0; trendN = 0; trendClock = 0;
    update(w, 0, false);
    for (var i = 0; i < n; i++) { w.pads[i].px = w.pads[i].x; w.pads[i].py = w.pads[i].y; }
  }

  function sampleTrend(ice, dt) {
    trendClock += dt;
    if (trendClock < 1 - C.EPS) return;
    trendClock -= 1;
    ice.trend = trendN === 0 ? -ice.v : (ice.R - trendRing[trendI]) / trendN;
    trendRing[trendI] = ice.R;
    trendI = (trendI + 1) % C.TREND_N;
    if (trendN < C.TREND_N) trendN++;
  }

  function update(w, dt, iceOn) {
    var ice = w.ice;
    w.animT += dt;
    if (iceOn) {
      ice.v = C.ICE_V0 + C.ICE_ACC * w.t;
      ice.R = Math.max(0, ice.R - ice.v * dt);
      sampleTrend(ice, dt);
    }
    for (var i = 0; i < w.padCount; i++) {
      var p = w.pads[i];
      if (i > 0) {
        p.angle += C.OMEGA * dt;
        p.d = p.d0 + C.BOB * Math.sin(w.animT * TAU / p.bobP + p.bobPhase);
        p.x = C.CX + p.d * Math.cos(p.angle);
        p.y = C.CY + p.d * Math.sin(p.angle);
      }
      if (!iceOn) continue;
      // Worst-case bob: freezing and the margin depend only on the ice, so a pad never
      // flickers frozen/open with its bob and the warning always gets its full window.
      var open = ice.R - p.r - p.d0 - (i > 0 ? C.BOB : 0);
      var frozen = open < 0;
      if (frozen !== p.frozen) {
        p.frozen = frozen;
        EVENTS.emit(frozen ? 'padFreeze' : 'padThaw', p.x, p.y, i, 0);
      }
      p.margin = open / ice.v;
    }
  }

  // inRange: open, not the frog's (target) pad, centre within hop range of the frog.
  function markRange(w) {
    var f = w.frog, own = f.targetPad >= 0 ? f.targetPad : f.pad, r2 = C.HOP_RANGE * C.HOP_RANGE;
    for (var i = 0; i < w.padCount; i++) {
      var p = w.pads[i], dx = p.x - f.x, dy = p.y - f.y;
      p.inRange = !p.frozen && i !== own && dx * dx + dy * dy <= r2;
    }
  }

  return { build: build, update: update, markRange: markRange };
})();
