// Input: keyboard / mouse / touch → latched verb state (tech plan §7).
// held[verb] is the live state; pressed[verb] counts presses since the last non-hitstop step.
var Input = (function () {
  var held = {}, pressed = {}, keyHeld = {}, touchHeld = {}, keyDown = {};
  var aim = { x: 0, y: 0, fresh: false };
  var click = { n: 0, x: 0, y: 0 };
  var stick = { id: -1, ox: 0, oy: 0, up: false };
  var pointerVerb = {};          // pointerId → verb for touch buttons
  var canvas = null, worldRef = null;
  var V = CFG.VERBS, i;
  for (i = 0; i < V.length; i++) { held[V[i]] = false; pressed[V[i]] = 0; keyHeld[V[i]] = 0; touchHeld[V[i]] = 0; }

  function syncHeld(v) { held[v] = keyHeld[v] > 0 || touchHeld[v] > 0; }
  function press(v) { pressed[v]++; }

  function verbsOf(code, fn) {
    var m = CFG.KEYS[code];
    if (!m) return false;
    if (typeof m === 'string') fn(m); else for (var k = 0; k < m.length; k++) fn(m[k]);
    return true;
  }

  function onKeyDown(e) {
    if (CFG.PREVENT[e.code]) e.preventDefault();
    if (keyDown[e.code]) return;   // also swallows auto-repeat
    keyDown[e.code] = 1;
    verbsOf(e.code, function (v) { keyHeld[v]++; syncHeld(v); press(v); if (v === 'spark') aim.fresh = false; });
  }
  function onKeyUp(e) {
    if (!keyDown[e.code]) return;
    keyDown[e.code] = 0;
    verbsOf(e.code, function (v) { keyHeld[v] = Math.max(0, keyHeld[v] - 1); syncHeld(v); });
  }
  function logical(e, out) {
    var r = canvas.getBoundingClientRect();
    out.x = (e.clientX - r.left) / (r.width / CFG.W);
    out.y = (e.clientY - r.top) / (r.height / CFG.H);
  }
  var pt = { x: 0, y: 0 };

  function touchButtonAt(x, y) {
    var T = CFG.UI.touch, b, dx, dy, k;
    for (k = 0; k < T.buttons.length; k++) {
      b = T.buttons[k]; dx = x - b.x; dy = y - b.y;
      if (dx * dx + dy * dy <= T.r * T.r) return b.verb;
    }
    var p = T.pause;
    if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) return 'pause';
    return '';
  }

  function onPointerDown(e) {
    logical(e, pt);
    if (e.pointerType === 'touch') {
      if (worldRef) worldRef.touchUI = 1;
      e.preventDefault();
      click.n++; click.x = pt.x; click.y = pt.y; press('click');
      var v = touchButtonAt(pt.x, pt.y);
      if (v) { pointerVerb[e.pointerId] = v; touchHeld[v]++; syncHeld(v); press(v); return; }
      if (pt.x < CFG.W / 2 && stick.id < 0) { stick.id = e.pointerId; stick.ox = pt.x; stick.oy = pt.y; stick.up = false; }
      return;
    }
    if (e.button === 0) { press('melee'); press('click'); click.n++; click.x = pt.x; click.y = pt.y; }
    else if (e.button === 2) { press('spark'); aim.x = pt.x; aim.y = pt.y; aim.fresh = true; }
  }
  function onPointerMove(e) {
    if (e.pointerType === 'touch') {
      if (e.pointerId !== stick.id) return;
      logical(e, pt);
      var dx = pt.x - stick.ox, dy = pt.y - stick.oy, dz = CFG.UI.touch.deadzone;
      setTouch('left', dx < -dz); setTouch('right', dx > dz);
      var up = dy < -CFG.UI.touch.upAt;
      if (up && !stick.up) { touchHeld.jump++; syncHeld('jump'); press('jump'); }
      if (!up && stick.up) { touchHeld.jump = Math.max(0, touchHeld.jump - 1); syncHeld('jump'); }
      stick.up = up;
      return;
    }
    logical(e, pt);
    aim.x = pt.x; aim.y = pt.y;
  }
  function setTouch(v, on) { touchHeld[v] = on ? 1 : 0; syncHeld(v); }
  function onPointerUp(e) {
    if (e.pointerType !== 'touch') return;
    var v = pointerVerb[e.pointerId];
    if (v) { touchHeld[v] = Math.max(0, touchHeld[v] - 1); syncHeld(v); pointerVerb[e.pointerId] = ''; }
    if (e.pointerId === stick.id) {
      stick.id = -1;
      setTouch('left', false); setTouch('right', false);
      if (stick.up) { touchHeld.jump = Math.max(0, touchHeld.jump - 1); syncHeld('jump'); stick.up = false; }
    }
  }

  function releaseAll() {
    for (var k = 0; k < V.length; k++) { keyHeld[V[k]] = 0; touchHeld[V[k]] = 0; held[V[k]] = false; }
    for (var c in keyDown) keyDown[c] = 0;
    stick.id = -1; stick.up = false;
  }

  function attach(cv, world) {
    canvas = cv; worldRef = world || null;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', releaseAll);
    cv.addEventListener('pointerdown', onPointerDown);
    cv.addEventListener('pointermove', onPointerMove);
    cv.addEventListener('pointerup', onPointerUp);
    cv.addEventListener('pointercancel', onPointerUp);
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  function endStep() { for (var k = 0; k < V.length; k++) pressed[V[k]] = 0; }

  return { attach: attach, held: held, pressed: pressed, aim: aim, click: click, endStep: endStep, releaseAll: releaseAll };
})();
