// INPUT: DOM listeners write into one preallocated queue; consume(w) applies it at the top of each step.
// Also owns the letterbox, the cached canvas rect and mouse hover.
var INPUT = (function () {
  var C = CONFIG;
  var DIR_BITS = {
    ArrowUp: 1, KeyW: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 4, KeyA: 4, ArrowRight: 8, KeyD: 8
  };
  var NO_SNAP = -2;
  var q = {
    any: false, snap: false, restart: false, pause: false, mute: false, rm: false,
    dirBits: 0, dirSteps: 0,
    click: false, cx: 0, cy: 0, touch: false,
    hover: false, mx: 0, my: 0,
    hopPad: -1, snapFly: NO_SNAP
  };
  var canvas = null;
  var INPUT = { rect: { left: 0, top: 0, width: C.W, height: C.H }, viewScale: 1, q: q,
    init: init, consume: consume, queueHop: queueHop, queueSnap: queueSnap };

  function store(key, on) { try { localStorage.setItem(key, on ? '1' : '0'); } catch (e) {} }

  function letterbox() {
    var s = Math.min(innerWidth / C.W, innerHeight / C.H);
    var cw = Math.round(C.W * s), ch = Math.round(C.H * s);
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    canvas.style.left = Math.round((innerWidth - cw) / 2) + 'px';
    canvas.style.top = Math.round((innerHeight - ch) / 2) + 'px';
    var r = canvas.getBoundingClientRect();
    INPUT.rect = { left: r.left, top: r.top, width: r.width, height: r.height };
    INPUT.viewScale = r.width / C.W || 1;
  }

  function toLogicalX(e) { return (e.clientX - INPUT.rect.left) / INPUT.viewScale; }
  function toLogicalY(e) { return (e.clientY - INPUT.rect.top) / INPUT.viewScale; }

  function onKeyDown(e) {
    var code = e.code;
    if (code === 'Space' || code === 'Enter' || code.indexOf('Arrow') === 0) e.preventDefault();
    if (e.repeat) return;
    if (code === 'KeyM') { q.mute = true; return; }
    if (code === 'KeyV') { q.rm = true; return; }
    q.any = true;
    if (code === 'Space') { q.snap = true; q.restart = true; }
    else if (code === 'Enter' || code === 'KeyR') q.restart = true;
    else if (code === 'KeyP' || code === 'Escape') q.pause = true;
    var bit = DIR_BITS[code];
    if (bit && WORLD.state === 'play') {
      if (q.dirSteps === 0) q.dirSteps = C.CHORD_STEPS;
      q.dirBits |= bit;
    }
  }

  function onPointerDown(e) {
    var touch = e.pointerType === 'touch';
    if (!touch && e.button !== 0) return;
    if (touch) e.preventDefault();
    q.click = true; q.touch = touch; q.cx = toLogicalX(e); q.cy = toLogicalY(e);
  }

  function onPointerMove(e) {
    if (e.pointerType !== 'mouse') return;
    q.hover = true; q.mx = toLogicalX(e); q.my = toLogicalY(e);
  }

  function onPointerLeave() { q.hover = false; }

  function onBlur() { if (WORLD.state === 'play') GAME.setState('pause'); }

  function onVisibility() {
    if (document.hidden) {
      if (WORLD.state === 'play') GAME.setState('pause');
      if (window.SFX && SFX.suspend) try { SFX.suspend(); } catch (e) {}
    } else {
      if (WORLD.state !== 'pause' && window.SFX && SFX.resume) try { SFX.resume(); } catch (e) {}
      GAME.resync();
    }
  }

  function init(c) {
    canvas = c;
    window.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', letterbox);
    letterbox();
  }

  function queueHop(id) { q.hopPad = id; }
  function queueSnap(id) { q.snapFly = id; }

  function clear() {
    q.any = q.snap = q.restart = q.pause = q.mute = q.rm = q.click = false;
    q.dirBits = 0; q.dirSteps = 0; q.hopPad = -1; q.snapFly = NO_SNAP;
  }

  function inRect(b, x, y) { return x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h; }

  // Nearest fly to (x, y) within radius that is also in snap reach of the frog, as a slot, or -1.
  function flyAt(w, x, y, radius) {
    var f = w.frog, best = -1, bestD = radius * radius, reach = C.REACH + C.FLY_HIT;
    for (var i = 0; i < w.flies.length; i++) {
      var fl = w.flies[i];
      if (!fl.active || fl.state === 'expired') continue;
      var dx = fl.x - x, dy = fl.y - y, d = dx * dx + dy * dy;
      var fx = fl.x - f.x, fy = fl.y - f.y;
      if (d <= bestD && fx * fx + fy * fy <= reach * reach) { best = i; bestD = d; }
    }
    return best;
  }

  // Pad whose hit circle (r + pad) contains (x, y), nearest centre first, or -1.
  function padAt(w, x, y, pad) {
    var best = -1, bestD = 1e12;
    for (var i = 0; i < w.padCount; i++) {
      var p = w.pads[i], dx = p.x - x, dy = p.y - y, d = dx * dx + dy * dy, rr = p.r + pad;
      if (d <= rr * rr && d < bestD) { best = i; bestD = d; }
    }
    return best;
  }

  function toggleMute(w) {
    w.muted = !w.muted; store(C.KEY_MUTE, w.muted);
    if (window.SFX && SFX.setMuted) SFX.setMuted(w.muted);   // cut in-flight cues too
    EVENTS.emit('ui', 0, 0, 0, 0);
  }

  function togglePause(w) {
    GAME.setState(w.state === 'play' ? 'pause' : 'play');
    EVENTS.emit('ui', 0, 0, 0, 0);
  }

  function playClick(w) {
    var x = q.cx, y = q.cy, slot = flyAt(w, x, y, q.touch ? C.TOUCH_FLY : C.CLICK_FLY);
    if (slot >= 0) { FROG.requestSnap(w, w.flies[slot].id); return; }
    var id = padAt(w, x, y, q.touch ? C.TOUCH_PAD : C.CLICK_PAD);
    if (id >= 0) { if (id !== FROG.ownPad(w.frog)) FROG.requestHop(w, id, true); return; }
    EVENTS.emit('nope', x, y, 0, 0);
  }

  function updateHover(w) {
    var h = w.hover;
    h.active = q.hover && w.state === 'play';
    h.x = q.mx; h.y = q.my;
    if (!h.active) { h.pad = -1; h.padValid = false; h.fly = -1; return; }
    h.fly = flyAt(w, q.mx, q.my, C.CLICK_FLY);
    h.pad = padAt(w, q.mx, q.my, C.CLICK_PAD);
    h.padValid = h.pad >= 0 && FROG.canHop(w, h.pad);
  }

  function consume(w) {
    if (q.mute) toggleMute(w);
    if (q.rm) { w.reducedMotion = !w.reducedMotion; store(C.KEY_RM, w.reducedMotion); }

    var s = w.state;
    if (q.click && inRect(C.BTN_MUTE, q.cx, q.cy)) { q.click = false; toggleMute(w); }
    if (q.click && (s === 'play' || s === 'pause') && inRect(C.BTN_PAUSE, q.cx, q.cy)) {
      q.click = false; togglePause(w); clear(); return;
    }

    if (s === 'title') {
      if (q.any || q.click) { clear(); GAME.start(); return; }
    } else if (s === 'over') {
      if ((q.restart || q.click) && w.endT >= C.RESTART_T - C.EPS) { clear(); GAME.start(); return; }
    } else if (s === 'pause') {
      if (q.pause) togglePause(w);
    } else if (s === 'play') {
      if (q.pause) { togglePause(w); clear(); return; }
      if (q.snap) FROG.requestSnap(w, -1);
      if (q.snapFly !== NO_SNAP) FROG.requestSnap(w, q.snapFly);
      if (q.hopPad >= 0) FROG.requestHop(w, q.hopPad, false);
      if (q.click) playClick(w);
      if (q.dirSteps > 0 && --q.dirSteps === 0) {
        var b = q.dirBits;
        FROG.hopDir(w, ((b & 8) ? 1 : 0) - ((b & 4) ? 1 : 0), ((b & 2) ? 1 : 0) - ((b & 1) ? 1 : 0));
        q.dirBits = 0;
      }
      updateHover(w);
      var steps = q.dirSteps, bits = q.dirBits;
      clear();
      q.dirSteps = steps; q.dirBits = bits;
      return;
    }
    updateHover(w);
    clear();
  }

  return INPUT;
})();
