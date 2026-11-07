// Font: built-in 5x7 bitmap font (X11 misc-fixed 5x7, public domain) baked into one atlas per palette role.
// Glyph cell is 6x8 at scale 1 (5x7 glyph + 1 px gap). Draws walk charCodeAt; nothing allocates per call.
var Font = (function () {
  var DATA = '00000004444040aaa00000avava00eke5e0gi48i2008k8ka04440000488884084444800a4e4a0044v4400000648000u0000000cc00248g004aaaa404c444e0ci248u0u2c2ic04cku440ugs2ic0cgsiic0u244880ciciic0ciie2c00cc0cc00cc0c8g024842000u0u0008424804a24040cimmgc0ciiuii0sisiis0ciggic0siiiis0ugsggu0ugsggg0cigmie0iiuiii0e4444e02222ic0ikooki0gggggu0iuuiii0iqqmmi0ciiiic0siisgg0ciiiqc2siiski0ci84ic0e444440iiiiic0iiiicc0iiiuui0iiccii0aaa4440u248gu0e8888e00g84200e2222e04a0000000000u0840000000eima0ggsiis000cggc022eiie000cmoc04a8s88000eicgeggsiii040c44e020222a4ggkoki0c4444e000kuii000siii000ciic000siisg00eiie200sigg000eo6s088s886000iiie000aaa4000iiuu000icci000iia4800u48u024c442044444408464480ak000000avve4044veah04ahaar0012k800042v240048v84000000l0000v00000ala0000icci04el44404ac44e048cmoc00004000';
  var EXTRA = [9829,9733,9734,10003,8594,8592,8230,8212,8734,215,8593,238,233,183]; // ♥ ★ ☆ ✓ → ← … — ∞ × ↑ î é ·, after ASCII 32..126
  var N = 95 + EXTRA.length, CW = 6, CH = 8;
  var ROLES = ['text', 'text_dim', 'censor_text', 'censor', 'hp', 'loot', 'ink', 'telegraph', 'unique', 'hero_rim', 'loot_divine', 'composure', 'foe', 'cold', 'lightning', 'fire'];
  var atlas = {};
  var extraIdx = {};
  var Q = 31; // '?'

  function init(pal) {
    for (var e = 0; e < EXTRA.length; e++) extraIdx[EXTRA[e]] = 95 + e;
    extraIdx[8217] = 7; extraIdx[8216] = 7; extraIdx[8220] = 2; extraIdx[8221] = 2; // curly quotes
    extraIdx[8211] = 95 + 7; extraIdx[160] = 0;
    var mask = document.createElement('canvas');
    mask.width = N * CW; mask.height = CH;
    var m = mask.getContext('2d');
    m.fillStyle = '#fff';
    for (var g = 0; g < N; g++) for (var r = 0; r < 7; r++) {
      var bits = parseInt(DATA.charAt(g * 7 + r), 32);
      for (var x = 0; x < 5; x++) if (bits & (16 >> x)) m.fillRect(g * CW + x, r, 1, 1);
    }
    for (var i = 0; i < ROLES.length; i++) {
      var c = document.createElement('canvas');
      c.width = mask.width; c.height = CH;
      var cx = c.getContext('2d');
      cx.drawImage(mask, 0, 0);
      cx.globalCompositeOperation = 'source-in';
      cx.fillStyle = pal[ROLES[i]] || (ROLES[i] === 'loot' ? pal.loot_core : '#fff');
      cx.fillRect(0, 0, c.width, CH);
      atlas[ROLES[i]] = c;
    }
  }

  function index(code) {
    if (code >= 32 && code < 127) return code - 32;
    var i = extraIdx[code];
    return i === undefined ? Q : i;
  }

  function width(str, scale) {
    return str ? (str.length * CW - 1) * (scale || 1) : 0;
  }

  function startX(w, x, align) { return align === 1 ? x - (w >> 1) : align === 2 ? x - w : x; }

  // Draws str[i0, i1) with its left edge at x; no substring allocation.
  function range(ctx, str, i0, i1, x, y, s, img) {
    for (var i = i0; i < i1; i++) {
      var code = str.charCodeAt(i);
      if (code !== 32) ctx.drawImage(img, index(code) * CW, 0, CW, CH, x, y, CW * s, CH * s);
      x += CW * s;
    }
  }

  function draw(ctx, str, x, y, scale, color, align) {
    if (!str) return;
    var s = scale || 1, img = atlas[color] || atlas.text;
    range(ctx, str, 0, str.length, startX(width(str, s), x | 0, align), y | 0, s, img);
  }

  // Same as draw with a 1 px ink outline (4 offset copies), for text drawn over the world.
  function drawO(ctx, str, x, y, scale, color, align) {
    draw(ctx, str, x - 1, y, scale, 'ink', align); draw(ctx, str, x + 1, y, scale, 'ink', align);
    draw(ctx, str, x, y - 1, scale, 'ink', align); draw(ctx, str, x, y + 1, scale, 'ink', align);
    draw(ctx, str, x, y, scale, color, align);
  }

  function num(ctx, n, x, y, scale, color, align) {
    var s = scale || 1, img = atlas[color] || atlas.text;
    n = Math.round(n);
    var neg = n < 0, v = neg ? -n : n, digits = 1;
    for (var t = v; t >= 10; t = (t / 10) | 0) digits++;
    var len = digits + (neg ? 1 : 0), w = (len * CW - 1) * s;
    var px = startX(w, x | 0, align) + (len - 1) * CW * s;
    for (var d = 0; d < digits; d++) {
      ctx.drawImage(img, (16 + v % 10) * CW, 0, CW, CH, px, y | 0, CW * s, CH * s);
      v = (v / 10) | 0; px -= CW * s;
    }
    if (neg) ctx.drawImage(img, 13 * CW, 0, CW, CH, px, y | 0, CW * s, CH * s);
  }

  function numO(ctx, n, x, y, scale, color, align) {
    num(ctx, n, x - 1, y, scale, 'ink', align); num(ctx, n, x + 1, y, scale, 'ink', align);
    num(ctx, n, x, y - 1, scale, 'ink', align); num(ctx, n, x, y + 1, scale, 'ink', align);
    num(ctx, n, x, y, scale, color, align);
  }

  // Word-wraps str into maxW px. ctx null measures only. Returns the height in px.
  // align 0 left (x is the left edge) or 1 centre (x is the centre).
  function wrap(ctx, str, x, y, maxW, scale, color, lineGap, align) {
    if (!str) return 0;
    var s = scale || 1, img = atlas[color] || atlas.text, adv = CW * s;
    var lh = CH * s + (lineGap === undefined ? 2 : lineGap), maxC = Math.max(1, ((maxW + s) / adv) | 0);
    var n = str.length, ls = 0, lines = 0;
    while (ls < n) {
      var le = ls, brk = -1;
      while (le < n && le - ls < maxC && str.charCodeAt(le) !== 10) { if (str.charCodeAt(le) === 32) brk = le; le++; }
      var end = le;
      if (le < n && str.charCodeAt(le) !== 10 && str.charCodeAt(le) !== 32 && brk > ls) end = brk;
      if (ctx) {
        var w = (end - ls) * adv - s;
        range(ctx, str, ls, end, align === 1 ? (x | 0) - (w >> 1) : x | 0, (y | 0) + lines * lh, s, img);
      }
      lines++;
      ls = end;
      while (ls < n && (str.charCodeAt(ls) === 32 || str.charCodeAt(ls) === 10)) { if (str.charCodeAt(ls) === 10) { ls++; break; } ls++; }
    }
    return lines * lh - (lineGap === undefined ? 2 : lineGap);
  }

  // Widest wrapped line in px (for sizing bubbles); measure-only.
  function wrapWidth(str, maxW, scale) {
    if (!str) return 0;
    var s = scale || 1, adv = CW * s, maxC = Math.max(1, ((maxW + s) / adv) | 0);
    var n = str.length, ls = 0, best = 0;
    while (ls < n) {
      var le = ls, brk = -1;
      while (le < n && le - ls < maxC && str.charCodeAt(le) !== 10) { if (str.charCodeAt(le) === 32) brk = le; le++; }
      var end = le;
      if (le < n && str.charCodeAt(le) !== 10 && str.charCodeAt(le) !== 32 && brk > ls) end = brk;
      if (end - ls > best) best = end - ls;
      ls = end;
      while (ls < n && (str.charCodeAt(ls) === 32 || str.charCodeAt(ls) === 10)) { if (str.charCodeAt(ls) === 10) { ls++; break; } ls++; }
    }
    return best * adv - s;
  }

  return { init: init, draw: draw, drawO: drawO, num: num, numO: numO, width: width, wrap: wrap, wrapWidth: wrapWidth, CW: CW, CH: CH, atlas: atlas };
})();
