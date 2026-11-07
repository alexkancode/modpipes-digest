// TEXT: every player-visible string (tech plan §15). One file for the PG-13 review.
// Placeholders filled at event time: {who} {L} {n} {name} {orb}.
var TEXT = (function () {
  var T = {
    title: 'PATH OF EX-ILES',
    levels: [
      { name: 'The Twilight Strand', subtitle: 'Your First Time', banner: 'Patch 1.0.1 - The Twilight Strand', teaser: 'Next: Brutus has been doing a lot of cardio.',
        foes: { grunt: 'Thirsty Drowned', caster: 'Sand Spitter', elite: "Hillock's Wingman", choir: 'Choirboy' } },
      { name: 'The Lower Prison', subtitle: 'Lockdown Love', banner: 'Patch 1.0.2 - The Lower Prison', teaser: 'Next: Dominus has strong opinions about your elbows.',
        foes: { grunt: 'Inmate Who Lifts', caster: 'Spark Warden', elite: 'Protein Shaker', choir: 'Choirboy' } },
      { name: 'The Templar Cathedral', subtitle: 'Purity of Elements', banner: 'Patch 1.0.3 - The Templar Cathedral', teaser: "Next: Piety insists she's not like other alchemists.",
        foes: { grunt: 'Templar Chaperone', caster: 'Choirboy (adult, baritone)', elite: 'Inquisitor of Modesty', choir: 'Choirboy (adult, baritone)' } },
      { name: 'The Belly of the Beast', subtitle: "It's What's Inside That Counts", banner: 'Patch 1.0.4 - The Belly of the Beast', teaser: 'Next: Kitava made a reservation. Table for one. You are the one.',
        foes: { grunt: 'Stomach Lining', caster: 'Bile Spitter', elite: "Kitava's Cultist (on a date)", choir: 'Choirboy' } },
      { name: "Kitava's Feast", subtitle: 'Dinner for One', banner: "Patch 1.0.5 - Kitava's Feast", teaser: '',
        foes: { grunt: 'Waiter Thrall', caster: 'Sommelier', elite: "Maitre d'", choir: 'Choirboy' } }
    ],

    bosses: {
      hillock: { name: 'Hillock', title: 'Has Waited 300 Leagues' },
      brutus: { name: 'Brutus', title: 'Warden of Gains' },
      dominus: { name: 'Dominus', title: 'High Templar of Modesty' },
      piety: { name: 'Piety', title: 'Not Like Other Alchemists' },
      heart: { name: 'The Heart', title: 'doki... doki...' },
      kitava: { name: 'Kitava', title: 'The Insatiable Dinner Date' }
    },
    lines: {
      hillock: { intro: "Three hundred leagues I've waited on this beach. Every reset.", charm: 'Come here, you.', phase: 'Getting clingy now.' },
      brutus: { intro: 'SPOT ME, EXILE.', phase: "Two thousand years in lockdown. Do you know what that does to a man's gains?", charm: 'Is it hot in here or is it the lightning traps?' },
      dominus: { intro: 'PURITY. Cover that... elbow.', phase: 'Even my censors need censors.', mid: 'This cathedral has a strict no-fun policy.' },
      piety: { intro: "I'm not like other alchemists.", charm: '*wink*', phase: "You'll have to take my heart." },
      heart: { intro: 'doki... doki...' },
      kitava: { intro: "Table for one. I'll start with your resistances.", eat: ['Mmm, Fire Cloak. A little chewy.', 'Cold Tunic. Refreshing palate cleanser.', 'Lightning Leggings. Zesty.'], empty: 'Nothing left to eat?', end: "I'm stuffed." }
    },

    // L1 ground glyphs, nervous first-date advice (GDD §6, §7).
    glyphs: [
      'Feeling forward? → D',
      'Take it slow. Press J.',
      "Don't be afraid to make the leap. Space.",
      'Things moving too fast? Shift.',
      'Stay hydrated. Q.',
      'Make eye contact. Right click.'
    ],

    // Gag interactables. prop / npc are asset-plan sprite names. bar is a censor rect relative
    // to the prop's feet (x centre, y bottom); it always covers the prop, never a person.
    gags: [
      { key: 'dresscode', level: 1, prop: 'prop_sign_dresscode', npc: '', auto: 1, prompt: '',
        text: "Lioneye's Watch: dress code strictly enforced.", reply: 'They are boots. On a beach.', caption: '[unapproved footwear]',
        bar: { ox: -12, oy: -26, w: 24, h: 12 }, effect: '' },
      { key: 'tabula', level: 1, prop: 'prop_chest_tabula', npc: '', auto: 0, prompt: 'Open',
        text: '6-LINK!', reply: "It's basically nothing. Which is why it's 1c.", caption: '[price fixing removed]',
        bar: { ox: -14, oy: -22, w: 28, h: 10 }, effect: 'tabula' },
      { key: 'merveil', level: 1, prop: '', npc: 'npc_merveil_shell', auto: 0, prompt: 'Listen',
        text: 'La la LAAAA~ ...an autograph, darling?', reply: 'I will pass, thanks.', caption: '', bar: null, effect: '' },
      { key: 'bestel', level: 1, prop: '', npc: 'npc_bestel', auto: 0, prompt: 'Talk',
        text: 'Cap your res before Kitava, lass. Trust me.', reply: '', caption: '', bar: null, effect: '' },

      { key: 'signup', level: 2, prop: 'prop_signup', npc: '', auto: 0, prompt: 'Read',
        text: 'Gym sign-up: Brutus. Brutus. Brutus. Brutus. Brutus.', reply: 'Popular gym.', caption: '', bar: null, effect: '' },
      { key: 'protein', level: 2, prop: 'prop_protein', npc: '', auto: 0, prompt: 'Taste',
        text: 'Whey of the Exile. Tastes like regret. +5 Composure', reply: '', caption: '', bar: null, effect: 'composure' },
      { key: 'tally', level: 2, prop: 'prop_tally', npc: '', auto: 0, prompt: 'Read',
        text: 'Days since leg day: ∞', reply: 'That explains the boss.', caption: '', bar: null, effect: '' },

      { key: 'window', level: 3, prop: 'prop_window', npc: '', auto: 0, prompt: 'Admire',
        text: 'Even the stained glass is censored.', reply: '', caption: '[saint was showing ankle]',
        bar: { ox: -20, oy: -44, w: 40, h: 14 }, effect: '' },
      { key: 'booth', level: 3, prop: 'prop_booth', npc: '', auto: 0, prompt: 'Confess',
        text: 'Forgive me. I bought a Mirror service.', reply: 'Ten Hail Kalandras.', caption: '', bar: null, effect: 'popup' },
      { key: 'einhar', level: 3, prop: '', npc: 'npc_einhar', auto: 0, prompt: 'Talk',
        text: 'Exile! A beast! A GREAT prize!', reply: "That's a pigeon.", caption: '', bar: null, effect: '' },

      { key: 'vanity', level: 4, prop: 'prop_vanity', npc: '', auto: 0, prompt: 'Look',
        text: 'Four reflections. One of them winks.', reply: 'Rude. Accurate, but rude.', caption: '', bar: null, effect: '' },
      { key: 'menu', level: 4, prop: 'prop_menu', npc: '', auto: 0, prompt: 'Read',
        text: "Today's special: Exile. Served with a side of resistances.", reply: 'I am not on the menu.', caption: '', bar: null, effect: '' },
      { key: 'wetfloor', level: 4, prop: 'prop_wetfloor', npc: '', auto: 0, prompt: 'Read',
        text: 'Caution: wet floor.', reply: "It's a stomach. Everything is wet.", caption: '', bar: null, effect: '' },

      { key: 'reservation', level: 5, prop: 'prop_reservation', npc: '', auto: 0, prompt: 'Read',
        text: 'Exile, party of 1. Every league.', reply: 'Ouch.', caption: '', bar: null, effect: '' },
      { key: 'tipjar', level: 5, prop: 'prop_tipjar', npc: '', auto: 0, prompt: 'Tip 1c',
        text: 'ty gl', reply: '', caption: '', bar: null, effect: 'tip' },
      { key: 'dessert', level: 5, prop: 'prop_dessert', npc: '', auto: 0, prompt: 'Lift cloche',
        text: "Dessert: one Tailor's Orb. Chef's kiss.", reply: '', caption: "[chef's kiss redacted]",
        bar: { ox: -12, oy: -30, w: 24, h: 10 }, effect: 'tailor' }
    ],

    // Set dressing with a permanent censor bar, cycled along each level (render side, cosmetic). Every subject is a harmless prop.
    deco: [
      [['prop_chest_tabula', '[6-link, NSFW]'], ['npc_pigeon', '[seagull (unrated)]'], ['npc_merveil_shell', '[siren selfie]']],
      [['prop_protein', '[pre-workout (18+)]'], ['prop_tally', '[days since leg day]'], ['prop_signup', '[spotter wanted ;)]']],
      [['prop_window', '[saint was showing ankle]'], ['prop_booth', '[confession redacted]'], ['npc_pigeon', '[GREAT prize]']],
      [['prop_wetfloor', '[slippery when wet]'], ['prop_vanity', '[reflection too hot]'], ['prop_menu', "[today's special: you]"]],
      [['prop_menu', '[dessert menu (18+)]'], ['prop_tipjar', '[tips appreciated ;)]'], ['prop_dessert', "[chef's kiss]"]]
    ],

    patch: [
      null,
      { title: 'Patch Note #1', buff: 'Spark +30% damage.', nerf: 'Flask charges -1 max.', flavor: 'We feel flasks were overperforming.', hover: '' },
      { title: 'Patch Note #2', buff: 'Melee +25% damage.', nerf: 'Dodge cooldown +0.2 s.', flavor: 'Rolling was never intended as a lifestyle.', hover: '' },
      { title: 'Patch Note #3', buff: '+20 max Life.', nerf: 'Composure regen -2/s.', flavor: 'Exiles were too emotionally stable.', hover: '' },
      { title: 'Patch Note #4', buff: 'Flask heals +15.', nerf: 'Spark cooldown +0.1 s.', flavor: '', hover: '' },
      { title: 'Patch Note #5', buff: 'Charm escape needs 1 fewer press.', nerf: 'Run speed -10.', flavor: 'Working as intended.', hover: '' },
      { title: 'Patch Note #6', buff: '+1 portal per level.', nerf: '-10% currency drops.', flavor: 'Softcore was too soft.', hover: '' },
      { title: 'Patch Note #7', buff: 'Fixed a bug where Hillock felt loved.', nerf: '', flavor: '', hover: '' },
      { title: 'Patch Note #8', buff: 'Reverted a change nobody asked for.', nerf: '', flavor: '', hover: 'Reverted reverting.' },
      { title: 'Patch Note #9', buff: 'Improved performance of the Kitava fight by 0.3%.', nerf: '', flavor: '', hover: '' }
    ],
    affix: ['+{v}% melee damage', '+{v}% Spark damage', '-{v}% Spark cooldown', '+{v} max Life',
      '{v}% life leech on melee', '+{v} flask charge max', '+{v} run speed', '-{v}% Composure drain from Charms'],

    charmCaptions: ['[pickup line]', '[smooth talk]', '[REDACTED BY GGG]', '[flirting detected]', '[wink wink]'],
    captions: ['[removed by moderator]', '[content hidden for your purity]', '[Rule 3: No Lewds]'],
    whispers: ['wtb ur outfit 1c', 'is this still available?', 'ty gl',
      'hi, i would like to buy your Barrel listed for 1 chaos in Standard',
      'u still have the tunic? 2c final offer', 'can u invite me', 'lol cap ur res',
      'wts Hillock hug carry 5c', 'is the barrel corrupted or just vibes'],

    deathTitles: ['RIP my softcore Witch to {who} [L{L}]', 'Died to {who}. Again. AMA', 'PSA: {who} is not balanced [L{L}]',
      'Is it just me or is {who} overtuned?', '{who} got me through 75% res??', 'Witch down. {who} up. [L{L}]'],
    comments: ['cap your res lol', 'skill issue', 'GGG pls', 'this is why I play Witch', 'F',
      'have you tried not getting hit', 'Hillock is still waiting for you', 'unironically just roll',
      'Standard is where dreams go', 'imagine not reading the patch notes'],
    tips: ['Tip: Roll through a ♥ tell. I-frames do not flirt back.', 'Tip: Mash J when Flustered. 5 presses and you are free.',
      "Tip: Tailor's Orbs put a layer back on.", 'Tip: At 0 layers elemental hits do double. Cap your res.',
      'Tip: Jump the shockwave. Leg day matters.', 'Tip: The flask has no animation lock. Drink.',
      'Tip: Belch Nova only respects dodge i-frames.', 'Tip: Arena gates open when the wave is dead.'],
    causes: {
      grunt: 'Swiped by a {name}', caster: 'Bolted by a {name}', elite: 'Shoulder-checked by a {name}', choir: 'Out-sung by a {name}',
      plate: 'Zapped by a floor plate', acid: 'Took a dip in the acid', puddle: "Stood in Piety's flask puddle", pit: 'Fell off the map',
      swoon: 'Swooned. Composure hit 0', hillock: 'Hugged too hard by Hillock', brutus: 'Out-lifted by Brutus',
      dominus: 'Purified by Dominus', piety: 'Out-brewed by Piety', heart: 'Heartbroken by The Heart', kitava: 'Eaten by Kitava'
    },
    who: { pit: 'gravity', swoon: 'my own Composure', plate: 'a floor plate', acid: 'stomach acid', puddle: "Piety's puddle" },
    charmedSuffix: ' (Charmed {n}x this level)',
    pickupLines: ["Are you a Tabula Rasa? Because you're priceless. Well, 1c.",
      'Is your name Exalted? You drop rarely but you are worth it.',
      "Are you a portal? Because I'd TP to town for you.",
      'You must be a Divine. My rolls are perfect around you.',
      'Do you have a map? I keep getting lost in your atlas.'],

    cutscene: {
      door: '*door slams*', rule3: '[Rule 3: No Lewds]', friends: "...and that's how they became friends.",
      l3: 'Dominus is gone. The bars stay. ToS.',
      l5a: "...and that's why you should always cap res.",
      l5b: 'Kitava left a ★☆☆☆☆ review: portions too generous. -30% to all Resistances (to his charms).'
    },
    over: {
      loseTitle: "RIP. Should've played softcore.", winTitle: 'Finally killed Kitava. Still uncapped. AMA.',
      win: { cause: 'Cleared all five acts. Resistances: -30% (Kitava kept them).', comment1: 'grats, now do it in hardcore', comment2: 'post build pls' },
      pb: 'Personal best: L{n}', stash: 'Banked to Standard: {n}c', runItBack: 'Run it back'
    },
    ui: {
      pressStart: 'Press Enter to begin', loading: 'loading...', resume: 'Resume', restart: 'Restart run', shake: 'Screen shake',
      paused: 'Paused', escape: 'Not until I cap my res!', ooh: 'Ooh, another one!', lol: 'lol', taxed: 'Composure taxed',
      skillIssue: 'Cannot modify corrupted items. Skill issue.', divine: 'Too valuable to use.', noCurrency: 'Not enough {orb}.',
      corruptedOk: 'Corrupted ✓', bricked: 'Corrupted', maxed: 'Already perfect. Somehow.', craftedChaos: 'Rerolled. Still mid.',
      craftedExalt: 'Slammed!', portalsLeft: 'You have died. {n} portals left.', uncapped: 'RES UNCAPPED', capped: '75% (capped)',
      resist: '{n}% res', modRemoved: 'This post has been removed by the moderators. Rule 3.',
      hideout: 'Hideout', pickCard: 'Pick one Patch Note', picked: 'Patch applied.', cont: 'Continue', mirror: 'Mirror of Kalandra',
      tipNone: 'You have no Chaos to tip.', sixLink: '6-LINK!', hat: 'Supporter Pack hat: $480', flaskFull: 'Flask refilled.'
    }
  };
  // key → index lookup, built once at load.
  T.gagIndex = {};
  for (var i = 0; i < T.gags.length; i++) { T.gags[i].id = i; T.gagIndex[T.gags[i].key] = i; }
  return T;
})();
