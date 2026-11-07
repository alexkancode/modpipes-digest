// RNG: mulberry32. next/range/int are the gameplay stream (only inside step()); fx() is a
// separate cosmetic stream so visual randomness never shifts gameplay.
var RNG = (function () {
  var st = new Int32Array(2); // [gameplay, fx]

  function draw(i) {
    var t = (st[i] = (st[i] + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  var RNG = {
    value: 0,
    seed: function (n) {
      n = n >>> 0;
      RNG.value = n; st[0] = n; st[1] = (n ^ 0x9E3779B9) >>> 0;
    },
    next: function () { return draw(0); },
    range: function (a, b) { return a + (b - a) * draw(0); },
    int: function (n) { return Math.floor(draw(0) * n); },
    fx: function () { return draw(1); }
  };
  return RNG;
})();
