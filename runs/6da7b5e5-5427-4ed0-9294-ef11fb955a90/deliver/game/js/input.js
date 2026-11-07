// Pointer and key handlers record intents into a 4-slot ring; the fixed step consumes them (click resolution, §9).
const I_POINT = 1, I_DIR = 2, I_TONGUE = 3, I_START = 4, I_PAUSE = 5;
const DIRS = [0, -1, 1, 0, 0, 1, -1, 0];   // up, right, down, left (chevron frame order)

const Input = {
  kind: new Uint8Array(4), x: new Float32Array(4), y: new Float32Array(4), head: 0, count: 0,
  px: 0, py: 0,
  cand: new Int8Array(4).fill(-1),

  push(kind, x, y) {
    if (this.count === 4) { this.head = (this.head + 1) & 3; this.count--; }
    const i = (this.head + this.count) & 3;
    this.kind[i] = kind; this.x[i] = x; this.y[i] = y; this.count++;
  },
  pop() {
    if (!this.count) return 0;
    const i = this.head;
    this.head = (i + 1) & 3; this.count--;
    this.px = this.x[i]; this.py = this.y[i];
    return this.kind[i];
  },
  clear() { this.head = 0; this.count = 0; },

  // Play-state resolution of every queued intent.
  consume(W) {
    let k;
    while ((k = this.pop())) {
      const x = this.px, y = this.py;
      if (k === I_POINT) {
        const fly = Flies.clickedFly(W, x, y);
        if (fly >= 0) { Frog.requestTongue(W, 1, x, y, fly); continue; }
        const pad = Pond.padAt(W, x, y);
        if (pad >= 0) { Frog.requestHop(W, pad); continue; }
        Frog.requestTongue(W, 1, x, y, -1);
      } else if (k === I_DIR) {
        const pad = Pond.padInDir(W, x, y);
        if (pad >= 0) Frog.requestHop(W, pad);
        else if (W.frog.state === FROG_IDLE) { W.rangeShakeT = 0.15; sfx('ui'); Fx.float(W.frog.x, W.frog.y - 26, Assets.L.tooFar, 0.6, 4); }
      } else if (k === I_TONGUE) Frog.requestTongue(W, 2, 0, 0, -1);
      else if (k === I_PAUSE) { Game.pause(); return; }
    }
  },

  // Chevron candidates for the four arrows, recomputed every play step.
  updateCandidates(W) {
    for (let d = 0; d < 4; d++) this.cand[d] = Pond.padInDir(W, DIRS[d * 2], DIRS[d * 2 + 1]);
  },

  boot(canvas) {
    const unlock = () => { sfxCall('unlock'); sfxCall('resume'); };
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault(); canvas.focus(); unlock();
      const r = Game.rect, lx = (e.clientX - r.left) * CFG.W / r.width, ly = (e.clientY - r.top) * CFG.H / r.height;
      if (lx >= 610 && ly >= 332) { Game.toggleMute(); return; }   // mute icon, bottom-right shore
      Game.W.kbMode = 0;
      this.push(I_POINT, lx, ly);
    });
    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      const c = e.code;
      if (c === 'Space' || c.startsWith('Arrow')) e.preventDefault();
      unlock();
      let k = 0, dx = 0, dy = 0;
      if (c === 'ArrowUp' || c === 'KeyW') { k = I_DIR; dy = -1; }
      else if (c === 'ArrowDown' || c === 'KeyS') { k = I_DIR; dy = 1; }
      else if (c === 'ArrowLeft' || c === 'KeyA') { k = I_DIR; dx = -1; }
      else if (c === 'ArrowRight' || c === 'KeyD') { k = I_DIR; dx = 1; }
      else if (c === 'KeyJ' || c === 'KeyX' || c === 'KeyK') k = I_TONGUE;
      else if (c === 'Space') k = Game.state === 'play' ? I_TONGUE : I_START;
      else if (c === 'Enter') k = I_START;
      else if (c === 'KeyP' || c === 'Escape') k = I_PAUSE;
      else if (c === 'KeyM') { Game.toggleMute(); return; }
      if (!k) return;
      Game.W.kbMode = 1;
      this.push(k, dx, dy);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) Game.pause(); else Game.skipNext = true;
    });
    window.addEventListener('blur', () => Game.pause());
  },
};
