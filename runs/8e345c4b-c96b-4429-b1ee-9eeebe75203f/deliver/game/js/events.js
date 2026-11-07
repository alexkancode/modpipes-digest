// EVENTS: the single emitter. The only caller of SFX.play and RENDER.event.
var EVENTS = (function () {
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  // Returns the playback rate, or 0 when this event plays no cue.
  function rateFor(type, a, b) {
    switch (type) {
      case 'catch': return Math.pow(2, (b - 1) / 12);
      case 'combo': return Math.pow(2, (a - 3) * 2 / 12);   // every step chimes, a whole tone higher each
      case 'spawn': return a ? 1.26 : b ? 1 : 0;
      case 'expire': return a ? 0.8 : 1;
      case 'creak': return 1 + 0.5 * (1 - clamp01(a / CONFIG.WARN_MARGIN));
      default: return 1;
    }
  }

  return {
    emit: function (type, x, y, a, b) {
      var cue = CONFIG.EVENT_SFX[type];
      if (cue && !WORLD.muted && window.SFX && SFX.play) {
        var rate = rateFor(type, a, b);
        if (rate > 0) { try { SFX.play(cue, rate); } catch (e) {} }
      }
      if (window.RENDER && RENDER.event) RENDER.event(type, x, y, a, b);
    }
  };
})();
