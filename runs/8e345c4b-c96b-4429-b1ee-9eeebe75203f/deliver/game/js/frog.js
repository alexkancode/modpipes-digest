// FROG: hop (crouch -> air -> land, one buffered hop), tongue snap, catch resolution and scoring,
// and the frost warning on the frog's pad.
var FROG = (function () {
  var C = CONFIG, EPS = C.EPS, emit = EVENTS.emit;
  var SNAP_RANGE = C.REACH + C.FLY_HIT;

  function ownPad(f) { return f.targetPad >= 0 ? f.targetPad : f.pad; }
  function busy(f) { return f.state === 'frozen' || f.state === 'dawn'; }
  function hopping(f) { return f.state === 'crouch' || f.state === 'air'; }

  // A hop to pad id is valid if it is open, not the frog's own pad and within range right now.
  function canHop(w, id) {
    if (id < 0 || id >= w.padCount) return false;
    var p = w.pads[id], f = w.frog;
    if (p.frozen || id === ownPad(f)) return false;
    var dx = p.x - f.x, dy = p.y - f.y;
    return dx * dx + dy * dy <= C.HOP_RANGE * C.HOP_RANGE;
  }

  function nope(w, x, y) {
    w.frog.nopeT = C.NOPE_T;
    emit('nope', x, y, 0, 0);
  }

  function startHop(w, id) {
    var f = w.frog, p = w.pads[id];
    f.state = 'crouch'; f.stateT = 0; f.targetPad = id; f.bufPad = -1;
    f.facing = Math.atan2(p.y - f.y, p.x - f.x);
    w.hops++;
    emit('hop', f.x, f.y, id, 0);
  }

  function requestHop(w, id, fromClick) {
    var f = w.frog;
    if (busy(f)) return false;
    if (!canHop(w, id)) {
      var at = fromClick && id >= 0 && id < w.padCount ? w.pads[id] : f;
      nope(w, at.x, at.y);
      return false;
    }
    if (f.state === 'sit') startHop(w, id);
    else f.bufPad = id;
    return true;
  }

  // Nearest valid pad whose bearing is within the cone around (ux, uy), or -1.
  function padInCone(w, ux, uy, cone) {
    var f = w.frog, best = -1, bestD = 1e9, cosCone = Math.cos(cone);
    for (var i = 0; i < w.padCount; i++) {
      if (!canHop(w, i)) continue;
      var p = w.pads[i], dx = p.x - f.x, dy = p.y - f.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0 && (dx * ux + dy * uy) / d >= cosCone && d < bestD) { best = i; bestD = d; }
    }
    return best;
  }

  function hopDir(w, dx, dy) {
    var f = w.frog, len = Math.sqrt(dx * dx + dy * dy);
    if (busy(f)) return false;
    var id = -1;
    if (len > 0) {
      id = padInCone(w, dx / len, dy / len, C.CONE_NARROW);
      if (id < 0) id = padInCone(w, dx / len, dy / len, C.CONE_WIDE);
    }
    if (id < 0) { nope(w, f.x, f.y); return false; }
    return requestHop(w, id, false);
  }

  function requestSnap(w, flyId) {
    var f = w.frog;
    if (busy(f) || f.tonguePhase !== 0 || f.snapCd > 0) return false;
    var slot = flyId === -1 ? FLIES.nearestInReach(w) : FLIES.slotOf(w, flyId);
    f.snapSlot = slot;
    f.snapFly = slot >= 0 ? w.flies[slot].id : -1;
    f.aimX = Math.cos(f.facing); f.aimY = Math.sin(f.facing); f.aimLen = C.REACH;
    if (slot >= 0) {
      var fl = w.flies[slot];
      f.facing = Math.atan2(fl.y - f.y, fl.x - f.x);
    }
    f.tonguePhase = 1; f.phaseT = 0; f.tongueExt = 0;
    f.snapCd = C.TONGUE_OUT + C.TONGUE_BACK + C.SNAP_CD;
    emit('snap', f.x, f.y, f.snapFly, 0);
    return true;
  }

  function reset(w) {
    var f = w.frog, p = w.pads[0];
    f.x = f.px = p.x; f.y = f.py = p.y; f.z = f.pz = 0;
    f.pad = 0; f.targetPad = -1; f.bufPad = -1;
    f.state = 'sit'; f.stateT = 0; f.hopT = 0; f.facing = -Math.PI / 2;
    f.frostK = 0; f.frostT = 0; f.creakT = 0; f.nopeT = 0;
    f.tonguePhase = 0; f.tongueExt = 0; f.tipX = p.x; f.tipY = p.y; f.carryFly = -1; f.snapCd = 0;
    f.snapSlot = -1; f.snapFly = -1; f.phaseT = 0; f.aimX = 0; f.aimY = -1; f.aimLen = 0;
    f.fromX = p.x; f.fromY = p.y;
  }

  function followPad(w, f) {
    var p = w.pads[f.pad];
    f.x = p.x; f.y = p.y;
  }

  function move(w, f, dt) {
    f.stateT += dt;
    switch (f.state) {
      case 'crouch':
        followPad(w, f);
        if (f.stateT >= C.CROUCH_STEPS * C.DT - EPS) {
          f.state = 'air'; f.stateT = 0; f.hopT = 0; f.fromX = f.x; f.fromY = f.y;
        }
        break;
      case 'air':
        var p = w.pads[f.targetPad];
        f.facing = Math.atan2(p.y - f.y, p.x - f.x);
        f.hopT += dt;
        var s = Math.min(1, f.hopT / C.HOP_T);
        f.x = f.fromX + (p.x - f.fromX) * s;
        f.y = f.fromY + (p.y - f.fromY) * s;
        f.z = C.HOP_PEAK * 4 * s * (1 - s);
        if (f.hopT >= C.HOP_T - EPS) {
          f.pad = f.targetPad; f.targetPad = -1; f.state = 'land'; f.stateT = 0; f.z = 0;
          emit('land', p.x, p.y, f.pad, 0);
        }
        break;
      case 'land':
        followPad(w, f);
        if (f.stateT >= C.LAND_T - EPS) {
          f.state = 'sit'; f.stateT = 0;
          var id = f.bufPad;
          f.bufPad = -1;
          if (id >= 0 && canHop(w, id)) startHop(w, id);
        }
        break;
      default: // sit, frozen, dawn
        followPad(w, f);
    }
  }

  function snapTarget(w, f) {
    if (f.snapSlot < 0) return null;
    var fl = w.flies[f.snapSlot];
    return fl.active && fl.id === f.snapFly && fl.state !== 'expired' ? fl : null;
  }

  function aim(w, f) {
    var fl = snapTarget(w, f);
    if (fl) {
      var dx = fl.x - f.x, dy = fl.y - f.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0) { f.aimX = dx / d; f.aimY = dy / d; }
      f.aimLen = Math.min(d, C.REACH);
    }
    f.tipX = f.x + f.aimX * f.aimLen * f.tongueExt;
    f.tipY = f.y + f.aimY * f.aimLen * f.tongueExt;
  }

  function tongue(w, f, dt, live) {
    if (f.tonguePhase === 0) return;
    f.snapCd -= dt;
    if (f.snapCd < EPS) f.snapCd = 0;
    f.phaseT += dt;
    if (f.tonguePhase === 1) {
      f.tongueExt = Math.min(1, f.phaseT / C.TONGUE_OUT);
      aim(w, f);
      if (f.phaseT >= C.TONGUE_OUT - EPS) {
        if (live) resolveCatch(w, f);
        f.tonguePhase = 2; f.phaseT = 0;
      }
    } else if (f.tonguePhase === 2) {
      f.tongueExt = 1 - Math.min(1, f.phaseT / C.TONGUE_BACK);
      aim(w, f);
      if (f.phaseT >= C.TONGUE_BACK - EPS) {
        f.tonguePhase = 3; f.phaseT = 0; f.tongueExt = 0; f.carryFly = -1;
      }
    } else if (f.snapCd <= 0) {
      f.tonguePhase = 0;
    }
  }

  function resolveCatch(w, f) {
    var fl = snapTarget(w, f);
    if (!fl) return;
    var dx = fl.x - f.x, dy = fl.y - f.y;
    if (dx * dx + dy * dy <= SNAP_RANGE * SNAP_RANGE) catchFly(w, f, f.snapSlot);
  }

  function catchFly(w, f, slot) {
    var fl = w.flies[slot], golden = fl.golden, x = fl.x, y = fl.y;
    var rose = w.comboT <= C.COMBO_T && w.caught > 0 && w.combo < C.COMBO_MAX;
    if (rose) w.combo++;
    var mid = hopping(f);
    var pts = (golden ? C.PTS_GOLD : C.PTS) * w.combo * (mid ? C.MIDHOP_MULT : 1);
    w.score += pts; w.caught++; w.comboT = 0;
    if (golden) w.goldenCaught++;
    if (mid) w.midHopCatches++;
    if (w.combo > w.bestCombo) w.bestCombo = w.combo;
    var amount = golden ? C.THAW_GOLD : C.THAW;
    w.ice.R = Math.max(w.ice.R, Math.min(C.POND_R - C.CAP_FALL * w.t, w.ice.R + amount));  // warmth cap falls over the night
    FLIES.kill(w, slot, 'caught');
    f.carryFly = slot;
    emit(golden ? 'goldenCatch' : 'catch', x, y, pts, w.combo);
    emit('thaw', x, y, amount, w.ice.R);
    if (mid) emit('midhop', x, y, pts, 0);
    if (w.combo >= 2 && (rose || w.combo === C.COMBO_MAX)) emit('combo', f.x, f.y, w.combo, 0);  // x5 streaks keep chiming
  }

  function frost(w, f, dt) {
    var m = w.pads[ownPad(f)].margin, k = m / C.WARN_MARGIN;
    k = k < 0 ? 0 : k > 1 ? 1 : k;
    if (m > C.WARN_MARGIN) { f.frostT = 0; f.frostK = 0; f.creakT = 0; return; }
    f.frostT += dt;
    f.frostK = 1 - k;
    f.creakT -= dt;
    if (f.creakT <= EPS) {
      emit('creak', f.x, f.y, m, 0);
      f.creakT = C.CREAK_MIN + C.CREAK_SPAN * k;
    }
  }

  function update(w, dt) {
    var f = w.frog, live = w.state === 'play';
    if (f.nopeT > 0) f.nopeT = Math.max(0, f.nopeT - dt);
    move(w, f, dt);
    tongue(w, f, dt, live);
    if (live) frost(w, f, dt);
  }

  // Ends a hop in place (used when dawn arrives mid-hop).
  function settle(w) {
    var f = w.frog;
    if (f.targetPad >= 0) { f.pad = f.targetPad; f.targetPad = -1; }
    f.z = 0; f.bufPad = -1;
    followPad(w, f);
  }

  return {
    reset: reset, requestHop: requestHop, hopDir: hopDir, requestSnap: requestSnap, update: update,
    canHop: canHop, ownPad: ownPad, hopping: hopping, settle: settle
  };
})();
