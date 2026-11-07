// Input: handlers only record state. Once per step, toIntents() hands walk direction and queued verbs to the monster.
const Input = {
  held: { left: false, right: false, stomp: false },
  press: { stomp: false, swipe: false, beam: false, pause: false, any: false, swipeAuto: false, beamAuto: false },
  cursor: { sx: 320, sy: 200, seen: false },
  aim: { swipeX: 0, swipeY: 0, beamX: 0, beamY: 0 },
  touchMode: false,
  touch: { padId: -1, padX: 0, padDir: 0, stompId: -1, beamDown: 0 },
  rect: null,

  init(canvas) {
    this.canvas = canvas;
    const kd = (e) => {
      Snd.unlock();
      const c = e.code;
      if (c === 'KeyA' || c === 'ArrowLeft') this.held.left = true;
      else if (c === 'KeyD' || c === 'ArrowRight') this.held.right = true;
      else if (c === 'Space') { this.held.stomp = true; if (!e.repeat) this.press.stomp = true; e.preventDefault(); }
      else if (c === 'KeyF' || c === 'KeyK') { if (!e.repeat) { this.press.beam = true; this.captureAim(1); } }
      else if (c === 'KeyJ') { if (!e.repeat) { this.press.swipe = true; this.press.swipeAuto = true; } }
      else if (c === 'Escape' || c === 'KeyP') { if (!e.repeat) this.press.pause = true; }
      else if (c === 'KeyM') { if (!e.repeat) Snd.toggleMute(); }
      if (c === 'ArrowLeft' || c === 'ArrowRight' || c === 'ArrowUp' || c === 'ArrowDown') e.preventDefault();
      if (!e.repeat) this.press.any = true;
    };
    const ku = (e) => {
      const c = e.code;
      if (c === 'KeyA' || c === 'ArrowLeft') this.held.left = false;
      else if (c === 'KeyD' || c === 'ArrowRight') this.held.right = false;
      else if (c === 'Space') this.held.stomp = false;
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    canvas.addEventListener('pointermove', (e) => this.move(e));
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointerup', (e) => this.up(e));
    canvas.addEventListener('pointercancel', (e) => this.up(e));
    const noMenu = (e) => e.preventDefault();
    canvas.addEventListener('contextmenu', noMenu);
    window.addEventListener('contextmenu', noMenu);
  },

  toLogical(e) {
    const r = this.rect || this.canvas.getBoundingClientRect();
    this.lx = (e.clientX - r.left) * CONFIG.W / r.width;
    this.ly = (e.clientY - r.top) * CONFIG.H / r.height;
  },

  move(e) {
    this.toLogical(e);
    if (e.pointerType === 'touch') {
      const t = this.touch;
      if (e.pointerId === t.padId) { const d = this.lx - t.padX; t.padDir = d > 12 ? 1 : d < -12 ? -1 : 0; }
      return;
    }
    this.cursor.sx = this.lx; this.cursor.sy = this.ly; this.cursor.seen = true;
  },

  // Aim is captured at press time, in world coordinates, per verb (0 swipe, 1 beam).
  captureAim(verb) {
    const wx = this.cursor.sx + Cam.x, wy = this.cursor.sy;
    if (verb === 0) { this.aim.swipeX = wx; this.aim.swipeY = wy; }
    else { this.aim.beamX = wx; this.aim.beamY = wy; this.press.beamAuto = false; }
  },

  down(e) {
    Snd.unlock();
    this.press.any = true;
    this.toLogical(e);
    if (e.pointerType === 'touch') { this.touchDown(e); return; }
    this.cursor.sx = this.lx; this.cursor.sy = this.ly; this.cursor.seen = true;
    if (e.button === 0) { this.press.swipe = true; this.press.swipeAuto = false; this.captureAim(0); }
    else if (e.button === 2) { this.press.beam = true; this.captureAim(1); }
    e.preventDefault();
  },

  touchDown(e) {
    this.touchMode = true;
    const x = this.lx, y = this.ly, t = this.touch, id = e.pointerId;
    try { this.canvas.setPointerCapture(id); } catch (err) { /* optional */ }
    if (Math.abs(x - 320) <= 12 && Math.abs(y - 46) <= 12) { this.press.pause = true; return; }
    if (Main.state !== 'play') return;
    if (dist2(x, y, 588, 308) <= 34 * 34) { t.stompId = id; this.held.stomp = true; this.press.stomp = true; return; }
    if (dist2(x, y, 588, 236) <= 34 * 34) { this.press.beam = true; this.press.beamAuto = true; t.beamDown = 0.15; return; }
    if (x < CONFIG.W * 0.4) { t.padId = id; t.padX = x; t.padDir = 0; return; }
    this.cursor.sx = x; this.cursor.sy = y;
    this.press.swipe = true; this.press.swipeAuto = false; this.captureAim(0);
  },

  up(e) {
    if (e.pointerType !== 'touch') return;
    const t = this.touch;
    if (e.pointerId === t.padId) { t.padId = -1; t.padDir = 0; }
    if (e.pointerId === t.stompId) { t.stompId = -1; this.held.stomp = false; }
  },

  clearHeld() {
    this.held.left = this.held.right = this.held.stomp = false;
    this.touch.padId = this.touch.stompId = -1; this.touch.padDir = 0;
  },

  clearPress() {
    const p = this.press;
    p.stomp = p.swipe = p.beam = p.pause = p.any = p.swipeAuto = p.beamAuto = false;
  },

  toIntents() {
    const m = Monster, p = this.press;
    m.walkDir = ((this.held.right ? 1 : 0) - (this.held.left ? 1 : 0)) || this.touch.padDir;
    if (p.stomp || this.held.stomp) m.queue.stomp = true;
    if (p.swipe) {
      m.queue.swipe = true;
      if (p.swipeAuto) {
        const a = Combat.autoAim(m.facing);
        m.aim.swipeX = a.found ? a.x : m.x + m.facing * 200; m.aim.swipeY = a.found ? a.y : 200;
      } else { m.aim.swipeX = this.aim.swipeX; m.aim.swipeY = this.aim.swipeY; }
    }
    if (p.beam) {
      m.queue.beam = true;
      m.beamAuto = p.beamAuto;
      m.aim.beamX = this.aim.beamX; m.aim.beamY = this.aim.beamY;
    }
    if (this.touch.beamDown > 0) this.touch.beamDown -= CONFIG.DT;
    p.stomp = p.swipe = p.beam = p.swipeAuto = p.beamAuto = false;
  },
};

function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
