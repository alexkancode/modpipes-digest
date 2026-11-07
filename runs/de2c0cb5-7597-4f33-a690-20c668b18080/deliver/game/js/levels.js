// LEVELS: five level definitions (tech plan §5.2), written as a left-to-right course.
// Terrain tokens consume columns: flat n · gap n · step n dh · acid n · plates n · arena waves · door.
// Marker tokens sit at (cursor + dx) where cursor is the start of the next terrain token:
// foe dx kind opts · plat dx len row · glyph dx textIndex · gag dx key · item dx kind row · breather.
var LEVELS = (function () {
  var ARENA = 40;

  function build(spec) {
    var L = { segments: [], plats: [], path: [], arenas: [], glyphs: [], gags: [], pickups: [],
      breatherAt: 0, bossDoorAt: 0, boss: spec.boss, slippery: !!spec.slippery, casterElements: spec.casterElements, cols: 0 };
    var c = 0, i, t, o;
    for (i = 0; i < spec.course.length; i++) {
      t = spec.course[i];
      switch (t[0]) {
        case 'flat': case 'gap': case 'acid': case 'plates': L.segments.push(t); c += t[1]; break;
        case 'step': L.segments.push(t); c += t[1]; break;
        case 'arena': L.arenas.push({ at: c, waves: t.slice(1) }); L.segments.push(['flat', ARENA]); c += ARENA; break;
        case 'door': L.bossDoorAt = c; L.segments.push(['flat', ARENA]); c += ARENA; break;
        case 'breather': L.breatherAt = c; break;
        case 'foe': o = t[3] || {}; L.path.push({ at: c + t[1], kind: t[2], row: o.row || 0, first: o.first || 0, wink: o.wink || 0 }); break;
        case 'plat': L.plats.push({ at: c + t[1], len: t[2], row: t[3] }); break;
        case 'glyph': L.glyphs.push({ at: c + t[1], row: 0, text: t[2] }); break;
        case 'gag': L.gags.push({ at: c + t[1], id: t[2] }); break;
        case 'item': L.pickups.push({ at: c + t[1], kind: t[2], row: t[3] || 0 }); break;
      }
    }
    L.cols = c;
    return L;
  }

  return [
    // L1 Twilight Strand. The opening follows GDD §7 beat by beat. Path 4g · W1 2g · W2 3g+1c · W3 3g+1c+1e.
    build({ boss: 'hillock', casterElements: [0], course: [
      ['glyph', 2, 0], ['glyph', 12, 1], ['foe', 17, 'grunt', { first: 1 }], ['glyph', 31, 2],
      ['flat', 37],
      ['gap', 6],
      ['gag', 6, 'dresscode'], ['glyph', 13, 3], ['foe', 20, 'grunt', { wink: 1 }], ['foe', 25, 'grunt'],
      ['flat', 30],
      ['glyph', 3, 4], ['item', 8, 'flask'],
      ['step', 14, -2],
      ['glyph', 2, 5], ['plat', 8, 6, 13], ['foe', 10, 'caster', { row: 13 }],
      ['step', 18, 2],
      ['item', 20, 'tea'],
      ['arena', 'gg', 'gg', 'ggc'],
      ['gag', 4, 'tabula'], ['foe', 9, 'grunt'],
      ['flat', 12],
      ['arena', 'ggcg', 'gcg', 'ggcgg'],
      ['step', 10, -1],
      ['step', 6, 1],
      ['item', 20, 'tea'],
      ['arena', 'ggcge', 'gcgg', 'egcgg', 'gcgcg'],
      ['flat', 6], ['item', 3, 'tea'],
      ['arena', 'gcg', 'ggcg', 'gcgge'],
      ['breather'], ['item', 4, 'tailor'], ['item', 7, 'tea'], ['gag', 11, 'merveil'], ['gag', 16, 'bestel'],
      ['flat', 22],
      ['door']
    ] }),

    // L2 Lower Prison: lightning plates strip layers. Path 4g · W1 3g+1c · W2 3g+2c · W3 3g+2c+1e · W4 3g+1c+2e.
    build({ boss: 'brutus', casterElements: [3], course: [
      ['flat', 14],
      ['foe', 6, 'grunt'], ['plates', 12],
      ['flat', 6],
      ['arena', 'ggcg', 'gcg', 'ggcgg'],
      ['gag', 4, 'signup'], ['flat', 8],
      ['foe', 6, 'grunt'], ['plates', 15],
      ['step', 10, -2],
      ['step', 8, 2],
      ['item', 20, 'tea'],
      ['arena', 'gcggc', 'cggcgg'],
      ['gag', 3, 'protein'], ['flat', 8],
      ['gap', 5],
      ['foe', 8, 'grunt'], ['plates', 15],
      ['arena', 'ggcgce', 'ecgcggg'],
      ['flat', 6],
      ['plat', 2, 6, 15], ['foe', 10, 'grunt'], ['plates', 12],
      ['step', 6, -1], ['step', 6, 1],
      ['item', 20, 'tea'],
      ['arena', 'gcegge', 'eggecgg', 'gcegge'],
      ['breather'], ['item', 4, 'tailor'], ['item', 7, 'tea'], ['gag', 12, 'tally'],
      ['flat', 20],
      ['door']
    ] }),

    // L3 Templar Cathedral: ranged threats, blown kisses. Path 4g+2c · W1 2g+3c · W2/W3 3g+3c+1e · W4 3g+2c+2e.
    build({ boss: 'dominus', casterElements: [1], course: [
      ['flat', 12],
      ['foe', 6, 'grunt'], ['plat', 10, 6, 14], ['foe', 12, 'caster', { row: 14 }], ['flat', 20],
      ['gap', 5],
      ['gag', 6, 'window'], ['flat', 12],
      ['arena', 'gcgcc', 'ccgcgg'],
      ['foe', 6, 'grunt'], ['step', 12, -2],
      ['gap', 4],
      ['step', 12, 2],
      ['item', 20, 'tea'],
      ['arena', 'gcgcgce', 'ecgcgcgg'],
      ['gag', 4, 'booth'], ['flat', 10],
      ['plat', 4, 6, 15], ['foe', 6, 'caster', { row: 15 }], ['foe', 14, 'grunt'], ['flat', 18],
      ['arena', 'gcgcgce', 'ecgcgcgg'],
      ['gap', 6],
      ['foe', 8, 'grunt'], ['flat', 14],
      ['item', 20, 'tea'],
      ['arena', 'gcgcgee', 'eegcgcgg', 'gcgcgee'],
      ['breather'], ['item', 4, 'tailor'], ['item', 7, 'tea'], ['gag', 12, 'einhar'],
      ['flat', 20],
      ['door']
    ] }),

    // L4 Belly of the Beast: slippery floor, acid. Path 4g · W1 3g+2c · W2 4g+2c+1e · W3 4g+2c+2e · W4 4g+3c+2e.
    build({ boss: 'piety', slippery: true, casterElements: [1], course: [
      ['flat', 14],
      ['acid', 6],
      ['foe', 6, 'grunt'], ['gag', 12, 'wetfloor'], ['flat', 16],
      ['arena', 'gcgcg', 'gcgcgg'],
      ['acid', 5],
      ['flat', 3],
      ['foe', 6, 'grunt'], ['step', 12, -2],
      ['acid', 4],
      ['step', 10, 2],
      ['item', 20, 'tea'],
      ['arena', 'gcggcge', 'egcggcgg'],
      ['gag', 4, 'vanity'], ['flat', 10],
      ['gap', 5],
      ['foe', 6, 'grunt'], ['flat', 10],
      ['acid', 6],
      ['flat', 6],
      ['arena', 'gcggcgee', 'eegcggcgg'],
      ['gag', 4, 'menu'], ['foe', 8, 'grunt'], ['flat', 12],
      ['acid', 5],
      ['flat', 3],
      ['step', 8, -1], ['step', 6, 1],
      ['item', 20, 'tea'],
      ['arena', 'gcgcgcgee', 'gcgcgcgg'],
      ['breather'], ['item', 4, 'tailor'], ['item', 7, 'tea'], ['item', 10, 'flask'],
      ['flat', 20],
      ['door']
    ] }),

    // L5 Kitava's Feast: the mix. Path 4g+2c · W1 4g+2c+1e · W2 4g+3c+1e · W3 5g+3c+2e · W4 5g+3c+3e.
    build({ boss: 'kitava', casterElements: [1, 2, 3], course: [
      ['flat', 14],
      ['foe', 6, 'grunt'], ['plates', 12],
      ['gag', 4, 'reservation'], ['flat', 10],
      ['arena', 'gcggcge', 'egcggcgg'],
      ['acid', 5],
      ['plat', 4, 6, 14], ['foe', 6, 'caster', { row: 14 }], ['foe', 12, 'grunt'], ['flat', 16],
      ['gap', 5],
      ['item', 20, 'tea'],
      ['arena', 'gcggcgce', 'ecgcggcgg'],
      ['gag', 4, 'tipjar'], ['flat', 10],
      ['foe', 6, 'grunt'], ['plates', 12],
      ['step', 10, -2],
      ['acid', 4],
      ['step', 10, 2],
      ['arena', 'gcggcgcgee', 'eegcgcggcgg'],
      ['flat', 6],
      ['plat', 4, 6, 15], ['foe', 6, 'caster', { row: 15 }], ['foe', 14, 'grunt'], ['flat', 18],
      ['gap', 5],
      ['item', 20, 'tea'],
      ['arena', 'gcggcgcgeee', 'gcgcggcgg'],
      ['breather'], ['item', 4, 'tailor'], ['item', 7, 'tea'], ['gag', 11, 'dessert'],
      ['flat', 20],
      ['door']
    ] })
  ];
})();
