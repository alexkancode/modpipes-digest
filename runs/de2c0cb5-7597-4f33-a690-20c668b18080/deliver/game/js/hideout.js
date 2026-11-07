// Hideout: patch-note pick, crafting and trade whispers between levels (GDD §2.8).
// Focus indices: 0-2 cards, 3-7 craft orbs (CFG.UI.craftOrbs order), 8 Continue.
var Hideout = (function () {
  var UI = CFG.UI, FOCUS_N = 9, CONTINUE = CFG.HIDEOUT_FOCUS_CONTINUE;
  var ORB_NAME = { chaos: 'Chaos', exalt: 'Exalted', vaal: 'Vaal' };

  function setMsg(w, text) { w.hideout.msg = text; w.hideout.msgT = CFG.MSG_T; }
  function inRect(x, y, r) { return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; }
  function refreshStats(w) { Player.reset(w); w.player.hp = w.player.hpMax; }

  function enter(w) {
    var H = w.hideout, p = w.player, offer = [], i;
    w.mode = 'hideout';
    p.layers = 3; p.layerMask = 7; p.composure = p.composureMax; p.flustered = 0; p.anim = 'idle';
    for (i = 1; i <= 9; i++) if (!w.run.patches[i - 1]) offer.push(i);
    for (i = 0; i < 3; i++) H.cards[i] = offer.length ? offer.splice(RNG.game.int(offer.length), 1)[0] : 0;
    H.picked = 0; H.focus = CONTINUE; H.msg = ''; H.msgT = 0; H.whisper = ''; H.whisperT = 0; H.lastCraft = 0;
    H.nextWhisper = RNG.game.range(2, 4);
    refreshStats(w);
    Render.sound('level_clear');
  }

  function pickCard(w, i) {
    var H = w.hideout, id = H.cards[i];
    if (H.picked || !id) return;
    H.picked = id; w.run.patches[id - 1] = 1;
    refreshStats(w);
    setMsg(w, TEXT.ui.picked);
    Render.sound('card_pick');
  }

  function distinctAffix(wp, upTo) {
    var id, k, taken;
    do {
      id = RNG.game.int(CFG.AFFIX.length); taken = false;
      for (k = 0; k < upTo; k++) if (wp.affixes[k].id === id) taken = true;
    } while (taken);
    return id;
  }

  // Applies one orb. lastCraft: 1 applied, 2 bricked, 3 blocked.
  function craft(w, orb) {
    var H = w.hideout, wp = w.run.weapon, cur = w.currency, i, low;
    if (orb === 'mirror') { H.mirrorClicks++; H.lastCraft = 3; setMsg(w, TEXT.ui.lol); Render.sound('mirror_lol'); return; }
    if (orb === 'divine') { H.lastCraft = 3; setMsg(w, TEXT.ui.divine); Render.sound('ui_back'); return; }
    if (wp.corrupted) { H.lastCraft = 3; setMsg(w, TEXT.ui.skillIssue); Render.sound('ui_back'); return; }
    if (cur[orb] < 1) { H.lastCraft = 3; setMsg(w, TEXT.ui.noCurrency.replace('{orb}', ORB_NAME[orb])); Render.sound('ui_back'); return; }

    if (orb === 'chaos') {
      wp.count = Math.max(1, wp.count);
      for (i = 0; i < 3; i++) wp.affixes[i].id = -1;
      for (i = 0; i < wp.count; i++) { wp.affixes[i].id = distinctAffix(wp, i); wp.affixes[i].tier = 1; }
      H.lastCraft = 1; setMsg(w, TEXT.ui.craftedChaos); Render.sound('craft_chaos');
    } else if (orb === 'exalt') {
      if (wp.count < 3) {
        wp.affixes[wp.count].id = distinctAffix(wp, wp.count); wp.affixes[wp.count].tier = 1; wp.count++;
      } else {
        low = 0;
        for (i = 1; i < 3; i++) if (wp.affixes[i].tier < wp.affixes[low].tier) low = i;
        if (wp.affixes[low].tier >= 3) { H.lastCraft = 3; setMsg(w, TEXT.ui.maxed); Render.sound('ui_back'); return; }
        wp.affixes[low].tier++;
      }
      H.lastCraft = 1; setMsg(w, TEXT.ui.craftedExalt); Render.sound('craft_exalt');
    } else if (orb === 'vaal') {
      if (RNG.game.chance(0.5)) {
        for (i = 0; i < wp.count; i++) wp.affixes[i].tier = Math.min(3, wp.affixes[i].tier + 1);
        wp.corrupted = 1; H.lastCraft = 1; setMsg(w, TEXT.ui.corruptedOk); Render.sound('vaal_success');
      } else {
        wp.corrupted = 2; H.lastCraft = 2; setMsg(w, TEXT.ui.bricked); Render.sound('vaal_brick');
      }
    }
    cur[orb]--;
    refreshStats(w);
  }

  function activate(w, f) {
    if (f < 3) pickCard(w, f);
    else if (f < CONTINUE) craft(w, UI.craftOrbs[f - 3]);
    else { Render.sound('ui_confirm'); Flow.nextLevel(w); }
  }

  function update(w, dt) {
    var H = w.hideout, pr = Input.pressed, c = Input.click, i;
    if (H.msgT > 0) H.msgT -= dt;
    if (H.whisperT > 0) H.whisperT -= dt;
    H.nextWhisper -= dt;
    if (H.nextWhisper <= 0) {
      H.whisper = RNG.game.pick(TEXT.whispers); H.whisperT = CFG.WHISPER_T;
      H.nextWhisper = RNG.game.range(CFG.WHISPER_MIN, CFG.WHISPER_MAX);
      Render.sound('whisper');
    }
    if (pr.card1) pickCard(w, 0);
    if (pr.card2) pickCard(w, 1);
    if (pr.card3) pickCard(w, 2);
    if (pr.craftChaos) craft(w, 'chaos');
    if (pr.craftExalt) craft(w, 'exalt');
    if (pr.craftVaal) craft(w, 'vaal');
    if (pr.craftDivine) craft(w, 'divine');
    if (pr.craftMirror) craft(w, 'mirror');
    if (pr.left) { H.focus = (H.focus + FOCUS_N - 1) % FOCUS_N; Render.sound('ui_select'); }
    if (pr.right) { H.focus = (H.focus + 1) % FOCUS_N; Render.sound('ui_select'); }
    if (pr.click) {
      for (i = 0; i < 3; i++) if (inRect(c.x, c.y, UI.cards[i])) { H.focus = i; activate(w, i); return; }
      for (i = 0; i < 5; i++) if (inRect(c.x, c.y, UI.craft[i])) { H.focus = 3 + i; activate(w, 3 + i); return; }
      if (inRect(c.x, c.y, UI.cont)) { H.focus = CONTINUE; activate(w, CONTINUE); return; }
    }
    if (pr.confirm) activate(w, H.focus);
  }

  return { enter: enter, update: update, pickCard: pickCard, craft: craft };
})();
