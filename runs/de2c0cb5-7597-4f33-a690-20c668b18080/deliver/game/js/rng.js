// RNG: two mulberry32 streams. `game` drives every gameplay roll; `fx` is render-only.
var RNG = (function () {
  function stream() {
    var s = 1;
    var api = {
      reseed: function (n) { s = n >>> 0; },
      next: function () {
        s = (s + 0x6D2B79F5) | 0;
        var t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      int: function (n) { return Math.floor(api.next() * n); },
      chance: function (p) { return api.next() < p; },
      range: function (a, b) { return a + (b - a) * api.next(); },
      pick: function (arr) { return arr[api.int(arr.length)]; }
    };
    return api;
  }
  var R = {
    game: stream(), fx: stream(), seedValue: 0,
    seed: function (n) {
      R.seedValue = n >>> 0;
      R.game.reseed(R.seedValue);
      R.fx.reseed((R.seedValue ^ 0x9e3779b9) >>> 0);
    }
  };
  return R;
})();
