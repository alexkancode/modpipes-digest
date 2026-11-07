// WORLD: the one shared world object (tech plan 11.3), allocated once. Logic writes it, render reads it.
// Fields past the 11.3 shape (marked "logic") are internal bookkeeping; render may ignore them.
var WORLD = (function () {
  var pads = [], flies = [];
  for (var i = 0; i < CONFIG.PAD_COUNT; i++) {
    pads.push({
      id: i, x: 0, y: 0, px: 0, py: 0, r: 0, d: 0, angle: 0,
      frozen: false, margin: 0, inRange: false,
      d0: 0, bobP: 1, bobPhase: 0 // logic: orbit rest distance and bob
    });
  }
  for (var j = 0; j < CONFIG.FLY_POOL; j++) {
    flies.push({
      active: false, id: -1, x: 0, y: 0, px: 0, py: 0, heading: 0,
      golden: false, tame: false, life: 0, state: 'alive', fadeT: 0, blink: 0
    });
  }
  return {
    state: 'title', seed: 0, step: 0, t: 0, animT: 0,
    cx: CONFIG.CX, cy: CONFIG.CY, pondR: CONFIG.POND_R,
    ice: { R: CONFIG.POND_R, v: CONFIG.ICE_V0, trend: 0 },
    pads: pads, padCount: 0,
    frog: {
      x: 0, y: 0, px: 0, py: 0, z: 0, pz: 0, pad: 0, targetPad: -1,
      state: 'sit', stateT: 0, hopT: 0, facing: -Math.PI / 2, frostK: 0, nopeT: 0,
      tonguePhase: 0, tongueExt: 0, tipX: 0, tipY: 0, carryFly: -1, snapCd: 0,
      // logic: hop origin, buffered hop, snap target, tongue aim, frost timers
      fromX: 0, fromY: 0, bufPad: -1, snapSlot: -1, snapFly: -1, phaseT: 0,
      aimX: 0, aimY: -1, aimLen: 0, frostT: 0, creakT: 0
    },
    flies: flies, flyCount: 0, goldenAlive: 0,
    score: 0, combo: 1, bestCombo: 1, caught: 0, goldenCaught: 0, midHopCatches: 0, comboT: 0,
    won: false, endT: 0, endTime: 0, shortOfDawn: 0, bonus: 0, best: 0, newBest: false,
    hintSnap: 0, hintHop: 0,
    hover: { active: false, x: 0, y: 0, pad: -1, padValid: false, fly: -1 },
    dawnK: 0, muted: false, reducedMotion: false,
    hops: 0 // logic: hops started this run (drives the hop hint)
  };
})();
