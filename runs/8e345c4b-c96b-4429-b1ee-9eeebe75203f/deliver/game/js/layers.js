// LAYERS (render): everything baked once or on rare change. Water, sky, glow,
// 2x sprite sheets, per-pad bakes, text sprites, and the cached ice layer.
var LAYERS = (function () {
  var W = 960, H = 540, CX = 480, CY = 290, POND_R = 260;
  var PAD_CELL = 68, GLOW_CELL = 96, CRYSTALS = 96, FACETS = 140;
  var FONT = 'px "Courier New", ui-monospace, Menlo, Consolas, monospace';

  var sheets = {}, padCanvases = [], text = {};
  var iceCanvas, iceCtx, iceKey = -1;
  var fAng = new Float32Array(FACETS), fRad = new Float32Array(FACETS), fTilt = new Float32Array(FACETS), fLen = new Float32Array(FACETS);
  var cAng = new Float32Array(CRYSTALS), cLen = new Float32Array(CRYSTALS), cVar = new Uint8Array(CRYSTALS);
  var scratch = canvas2d(4, 4);

  function canvas2d(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.ctx = c.getContext('2d');
    c.ctx.imageSmoothingEnabled = false;
    return c;
  }
  function col(role) { return ASSETS.color(role); }
  function disc(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

  // Sprites at 2x, frame strip left to right. Pads and glow keep their raw record.
  function prescale(name) {
    var rec = ASSETS.get(name);
    if (name === 'pad' || name === 'glow') return rec;
    var k = (CONFIG.SPRITE_SCALES || {})[name] || CONFIG.SPRITE_SCALE || 2, fw = rec.fw * k, fh = rec.fh * k;
    var c = canvas2d(fw * rec.frames, fh);
    c.ctx.drawImage(rec.img, 0, 0, rec.fw * rec.frames, rec.fh, 0, 0, c.width, fh);
    return { img: c, fw: fw, fh: fh, frames: rec.frames };
  }

  function bakeWater() {
    var c = canvas2d(W, H), g = c.ctx;
    g.fillStyle = col('deep'); g.fillRect(0, 0, W, H);
    g.fillStyle = col('reed');                     // mossy bank so the pond sits in a landscape
    for (var b = 0; b < 3; b++) { g.globalAlpha = 0.5 - b * 0.15; disc(g, CX, CY, POND_R + 18 + b * 26); }
    g.globalAlpha = 1;
    g.fillStyle = col('water'); disc(g, CX, CY, POND_R);
    g.fillStyle = col('water_ripple');
    for (var i = 0; i < 70; i++) {                 // static wave marks, 2 px tall dashes
      var a = RNG.fx() * Math.PI * 2, d = Math.sqrt(RNG.fx()) * (POND_R - 16);
      var w = 6 + Math.round(RNG.fx() * 4) * 2;
      g.globalAlpha = 0.35 + RNG.fx() * 0.35;
      g.fillRect(Math.round(CX + Math.cos(a) * d - w / 2), Math.round(CY + Math.sin(a) * d), w, 2);
    }
    g.globalAlpha = 1;
    var reeds = sheets.reeds, n = 30 + Math.floor(RNG.fx() * 8);
    for (i = 0; i < n; i++) {                      // reeds stand outside the rim, below the sky strip
      a = RNG.fx() * Math.PI * 2;
      var rr = POND_R + 10 + RNG.fx() * RNG.fx() * 150;
      var x = Math.round(CX + Math.cos(a) * rr - reeds.fw / 2);
      var y = Math.round(CY + Math.sin(a) * rr - reeds.fh + 8);
      if (y < 34) continue;
      g.drawImage(reeds.img, (i % reeds.frames) * reeds.fw, 0, reeds.fw, reeds.fh, x, y, reeds.fw, reeds.fh);
    }
    return c;
  }

  function bakeSky() {
    var h = CONFIG.SKY_H || 30, c = canvas2d(W, h), g = c.ctx;
    g.fillStyle = col('sky'); g.fillRect(0, 0, W, h);
    g.fillStyle = col('hud_text');
    for (var i = 0; i < 36; i++) {
      g.globalAlpha = 0.15 + RNG.fx() * 0.35;
      g.fillRect(Math.round(RNG.fx() * W), Math.round(2 + RNG.fx() * (h - 8)), 2, 2);
    }
    return c;
  }

  // Three glow tints, smoothed at 96 px; drawn scaled with 'lighter'.
  function bakeGlow() {
    var rec = ASSETS.get('glow'), c = canvas2d(GLOW_CELL * 3, GLOW_CELL), g = c.ctx;
    var roles = ['firefly', 'golden', 'thaw'], half = GLOW_CELL / 2;
    g.imageSmoothingEnabled = true;
    for (var f = 0; f < 3; f++) {
      if (!rec.missing) {
        g.drawImage(rec.img, f * rec.fw, 0, rec.fw, rec.fh, f * GLOW_CELL, 0, GLOW_CELL, GLOW_CELL);
        continue;
      }
      var grad = g.createRadialGradient(f * GLOW_CELL + half, half, 0, f * GLOW_CELL + half, half, half);
      grad.addColorStop(0, col(roles[f])); grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad; g.fillRect(f * GLOW_CELL, 0, GLOW_CELL, GLOW_CELL);
    }
    return c;
  }

  // Text sprite: edge 0 none, 1 ink drop shadow, 2 ink stroke 2 px. Reuses `into` when given.
  function makeText(str, size, color, edge, into) {
    var font = 'bold ' + size + FONT, g = scratch.ctx;
    g.font = font;
    var w = Math.ceil(g.measureText(str).width) + 6, h = Math.ceil(size * 1.25) + 4;
    var c = into && into.width >= w && into.height >= h ? into : canvas2d(w, h);
    g = c.ctx;
    g.clearRect(0, 0, c.width, c.height);
    g.font = font; g.textBaseline = 'middle'; g.lineJoin = 'round';
    c.textW = w; c.textH = h;
    var y = h / 2;
    if (edge === 2) { g.strokeStyle = col('ink'); g.lineWidth = 4; g.strokeText(str, 3, y); }
    if (edge === 1) { g.fillStyle = col('ink'); g.fillText(str, 4, y + 1); }
    g.fillStyle = color; g.fillText(str, 3, y);
    return c;
  }

  function bakeIce(R, longSpikes) {
    var g = iceCtx, spike = sheets.ice_crystal, edgeR = R + 6;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H);
    g.fillStyle = col('ice'); disc(g, CX, CY, POND_R);
    // Sheet texture: fixed facet lines (straight, angular) and a shaded band behind the lip.
    g.lineWidth = 2; g.strokeStyle = col('ice_edge'); g.globalAlpha = 0.55; g.beginPath();
    for (var j = 0; j < FACETS; j++) {
      var fr = fRad[j], fa = fAng[j], t = fa + Math.PI / 2 + fTilt[j];
      if (fr < edgeR + 10) continue;
      var px = CX + Math.cos(fa) * fr, py = CY + Math.sin(fa) * fr, hx = Math.cos(t) * fLen[j], hy = Math.sin(t) * fLen[j];
      g.moveTo(px - hx, py - hy); g.lineTo(px + hx, py + hy);
    }
    g.stroke();
    g.strokeStyle = col('frozen_pad'); g.globalAlpha = 0.45; g.lineWidth = 6;
    g.beginPath(); g.arc(CX, CY, edgeR + 6, 0, Math.PI * 2); g.stroke();
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'destination-out';
    disc(g, CX, CY, edgeR);
    g.globalCompositeOperation = 'source-over';
    // Spikes: base on the lip, tips reach the true collision radius R.
    for (var i = 0; i < CRYSTALS; i++) {
      var a = cAng[i], h = cLen[i] + (longSpikes ? 2 : 0);
      g.setTransform(1, 0, 0, 1, CX + Math.cos(a) * (edgeR + 2), CY + Math.sin(a) * (edgeR + 2));
      g.rotate(a - Math.PI / 2);
      g.drawImage(spike.img, cVar[i] * spike.fw, 0, spike.fw, spike.fh, -spike.fw / 2, -h - 2, spike.fw, h + 2);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.strokeStyle = col('ice_edge'); g.lineWidth = 2;
    g.beginPath(); g.arc(CX, CY, edgeR, 0, Math.PI * 2); g.stroke();
    if (edgeR > POND_R - 20) {                     // near the rim (cap, dawn melt): keep the ice inside the pond
      g.globalCompositeOperation = 'destination-in'; disc(g, CX, CY, POND_R);
      g.globalCompositeOperation = 'source-over';
    }
  }

  return {
    W: W, H: H, PAD_CELL: PAD_CELL, GLOW_CELL: GLOW_CELL,
    water: null, sky: null, glow: null, text: text,

    bakeStatic: function () {
      var plan = ASSETS.plan.sprites;
      for (var i = 0; i < plan.length; i++) sheets[plan[i].name] = prescale(plan[i].name);
      this.water = bakeWater();
      this.sky = bakeSky();
      this.glow = bakeGlow();
      iceCanvas = canvas2d(W, H); iceCtx = iceCanvas.ctx; iceKey = -1;
      for (i = 0; i < CRYSTALS; i++) {
        cAng[i] = (i + (RNG.fx() - 0.5) * 0.5) * Math.PI * 2 / CRYSTALS;
        cLen[i] = 10 + RNG.fx() * 6;
        cVar[i] = Math.floor(RNG.fx() * 3);
      }
      for (i = 0; i < FACETS; i++) {
        fAng[i] = RNG.fx() * Math.PI * 2; fRad[i] = 20 + Math.sqrt(RNG.fx()) * (POND_R - 24);
        fTilt[i] = (RNG.fx() < 0.5 ? -1 : 1) * Math.PI / 6; fLen[i] = 4 + RNG.fx() * 8;
      }
      for (i = 0; i < 14; i++) padCanvases[i] = canvas2d(PAD_CELL * 3, PAD_CELL);
      var gold = col('golden'), hud = col('hud_text');
      text.x2 = makeText('×2', 16, gold, 2);
      text.hintSnap = makeText('click / space', 16, hud, 1);
      text.hintHop = makeText('click a pad / arrows', 16, hud, 1);
    },

    bakePads: function (world) {
      var rec = ASSETS.get('pad');
      for (var i = 0; i < world.padCount; i++) {
        var c = padCanvases[i], s = Math.round(world.pads[i].r * 2);
        c.ctx.clearRect(0, 0, c.width, c.height);
        for (var f = 0; f < 3; f++) c.ctx.drawImage(rec.img, f * rec.fw, 0, rec.fw, rec.fh, f * PAD_CELL, 0, s, s);
        c.size = s;
      }
    },

    pad: function (i) { return padCanvases[i]; },

    ice: function (world, shownR) {
      var drawnR = 2 * Math.round(shownR / 2), long = world.ice.trend < -1.5;
      var key = drawnR + (long ? 10000 : 0);
      if (key !== iceKey) { bakeIce(drawnR, long); iceKey = key; }
      return iceCanvas;
    },

    sheet: function (name) { return sheets[name]; },
    makeText: makeText
  };
})();
