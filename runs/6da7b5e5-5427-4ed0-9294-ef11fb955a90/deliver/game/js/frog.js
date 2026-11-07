// The frog's hop (homing arc, landing, buffer) and its tongue (out, back, cooldown, buffer, catch test).
const Frog = {
  make() {
    return {
      frog: { x: 0, y: 0, prevX: 0, prevY: 0, groundY: 0, prevGroundY: 0, pad: 0, state: FROG_IDLE, hopFromX: 0, hopFromY: 0, hopTo: -1, hopT: 0,
        crouchT: 0, landT: 0, puffT: 0, idlePuffT: 2, shiver: 0, bufPad: -1, faceX: 0, faceY: -1 },
      tongue: { state: T_READY, ext: 0, dirX: 0, dirY: -1, len: 0, tipX: 0, tipY: 0, carried: -1, carriedGolden: 0, cooldownT: 0,
        buf: 0, bufX: 0, bufY: 0, bufFly: -1 },
    };
  },

  reset(W) {
    const f = W.frog, pad = W.pads[0], t = W.tongue;
    f.pad = 0; f.state = FROG_IDLE; f.hopTo = -1; f.hopT = 0; f.crouchT = 0; f.landT = 0; f.puffT = 0; f.idlePuffT = 2;
    f.shiver = 0; f.bufPad = -1; f.faceX = 0; f.faceY = -1;
    f.x = f.prevX = pad.x; f.y = f.prevY = f.groundY = f.prevGroundY = pad.y;
    t.state = T_READY; t.ext = 0; t.carried = -1; t.cooldownT = 0; t.buf = 0; t.bufFly = -1;
    t.tipX = f.x; t.tipY = f.y;
  },

  hopLeft(W) { return W.frog.state === FROG_AIR ? Math.max(0, CFG.hopTime - W.frog.hopT) : 0; },

  // A hop request from input: start now, buffer during the last 120 ms of a hop, otherwise drop.
  requestHop(W, i) {
    const f = W.frog;
    if (f.state === FROG_IDLE) this.startHop(W, i);
    else if (f.state === FROG_AIR && this.hopLeft(W) <= CFG.hopBuffer) f.bufPad = i;
  },

  startHop(W, i) {
    const f = W.frog, pad = W.pads[i];
    f.state = FROG_AIR; f.hopFromX = f.x; f.hopFromY = f.y; f.hopTo = i; f.hopT = 0; f.crouchT = 0.05; f.bufPad = -1;
    const dx = pad.x - f.x, dy = pad.y - f.y, d = Math.hypot(dx, dy) || 1;
    f.faceX = dx / d; f.faceY = dy / d;
    W.firstHopDone = 1;
    sfx('hop');
  },

  update(W, dt) {
    const f = W.frog;
    f.prevX = f.x; f.prevY = f.y; f.prevGroundY = f.groundY;
    if (f.crouchT > 0) f.crouchT -= dt;
    if (f.landT > 0) f.landT -= dt;
    if (f.puffT > 0) f.puffT -= dt;
    if (f.state === FROG_AIR) {
      f.hopT += dt;
      const pad = W.pads[f.hopTo], u = Math.min(1, f.hopT / CFG.hopTime);
      f.x = f.hopFromX + (pad.x - f.hopFromX) * u;
      f.groundY = f.hopFromY + (pad.y - f.hopFromY) * u;
      f.y = f.groundY - 4 * CFG.hopApex * u * (1 - u);
      if (u >= 1) this.land(W);
    } else if (f.state === FROG_IDLE) {
      const pad = W.pads[f.pad];
      f.x = pad.x; f.y = f.groundY = pad.y;
      if ((f.idlePuffT -= dt) <= 0) { f.puffT = 0.16; f.idlePuffT = fxRng.range(1.5, 3); }
    }
    const pad = W.pads[f.state === FROG_AIR ? f.hopTo : f.pad];
    f.shiver = (pad.state === PAD_FROSTING || W.R < CFG.shiverBelowR) ? 1 : 0;
  },

  land(W) {
    const f = W.frog, pad = W.pads[f.hopTo];
    f.state = FROG_IDLE; f.pad = f.hopTo; f.hopTo = -1; f.hopT = 0;
    f.x = pad.x; f.y = f.groundY = pad.y; f.landT = 0.18;
    pad.bobT = 0.3;
    Fx.ripple(pad.x, pad.y);
    sfx('land');
    const b = f.bufPad; f.bufPad = -1;
    if (b >= 0 && b !== f.pad && Pond.targetable(W.pads[b]) && Math.hypot(W.pads[b].x - f.x, W.pads[b].y - f.y) <= CFG.hopRange) this.startHop(W, b);
  },

  // ---------- tongue ----------
  tongueReady(W) { return W.tongue.state === T_READY ? 1 : 0; },

  // kind 1 = aimed at a point (or fly index), kind 2 = keyboard auto-aim.
  requestTongue(W, kind, x, y, fly) {
    const t = W.tongue;
    if (t.state === T_READY) { this.fireRequest(W, kind, x, y, fly); return; }
    if (t.state === T_COOL && t.cooldownT <= CFG.tongueBuffer) { t.buf = kind; t.bufX = x; t.bufY = y; t.bufFly = fly; }
  },

  fireRequest(W, kind, x, y, fly) {
    const f = W.frog;
    if (kind === 2) {
      const i = Flies.autoAim(W);
      if (i >= 0) this.fire(W, W.flies[i].x, W.flies[i].y);
      else this.fire(W, f.x + f.faceX * CFG.tongueRange, f.y + f.faceY * CFG.tongueRange);
    } else if (fly >= 0 && W.flies[fly].alive) this.fire(W, W.flies[fly].x, W.flies[fly].y);
    else this.fire(W, x, y);
  },

  fire(W, x, y) {
    const f = W.frog, t = W.tongue;
    let dx = x - f.x, dy = y - f.y, d = Math.hypot(dx, dy);
    if (d < 1) { dx = f.faceX; dy = f.faceY; d = 1; }
    t.dirX = dx / d; t.dirY = dy / d; t.len = Math.min(d, CFG.tongueRange);
    t.state = T_OUT; t.ext = 0; t.carried = -1; t.buf = 0;
    W.tongueUsed = 1;
    sfx('tongue');
  },

  updateTongue(W, dt) {
    const f = W.frog, t = W.tongue;
    if (t.state === T_OUT || t.state === T_BACK) {
      t.ext += (t.state === T_OUT ? dt / CFG.tongueOut : -dt / CFG.tongueBack);
      if (t.state === T_OUT && t.ext >= 1) { t.ext = 1; t.state = T_BACK; }
      t.tipX = f.x + t.dirX * t.len * t.ext; t.tipY = f.y + t.dirY * t.len * t.ext;
      if (t.carried < 0) {
        const i = Flies.catchAt(W, t.tipX, t.tipY, CFG.tongueTip);
        if (i >= 0) {
          t.carried = i; t.carriedGolden = W.flies[i].golden;
          Director.onCatch(W, W.flies[i]);
          t.state = T_BACK;
        }
      }
      if (t.state === T_BACK && t.ext <= 0) {
        t.ext = 0;
        if (t.carried < 0) Director.onMiss(W);
        t.state = T_COOL; t.cooldownT = CFG.tongueCooldown + (t.carried >= 0 ? CFG.swallow : 0);   // a catch is swallowed first
        t.carried = -1;
      }
    } else if (t.state === T_COOL) {
      if ((t.cooldownT -= dt) <= 0) {
        t.state = T_READY; t.cooldownT = 0;
        if (t.buf) { const k = t.buf; t.buf = 0; this.fireRequest(W, k, t.bufX, t.bufY, t.bufFly); }
      }
    }
    if (t.state === T_READY || t.state === T_COOL) { t.tipX = f.x; t.tipY = f.y; }
  },
};
