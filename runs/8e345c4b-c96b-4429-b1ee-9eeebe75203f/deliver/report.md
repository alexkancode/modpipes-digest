# Last Light Pond: delivery report

## Concept and pitch

Concept: a frog hopping between lily pads to catch fireflies before the pond freezes over.

**Pitch:** A frog hops between drifting lily pads on a night pond, snapping up fireflies whose warmth holds back the ice until dawn.

It is a single-screen, top-down arcade survival game with a score chase. One run is one night of 180 s. Catch fireflies to push back a ring of ice that is closing in. If you are still on an open pad at dawn you win and get a bonus for the open water left. If your pad freezes under you, you lose. It uses plain Canvas 2D with no library, and every sound is synthesised in WebAudio.

## How to play

- **Goal:** survive to dawn (the moon crossing the top strip shows how much night is left), or score as high as you can before you freeze.
- **Hop:** click or tap an open pad within range, or press the arrow keys / WASD to hop to the nearest open pad in that direction. Hops never land in the water. A pad that is out of range or frozen gets a "nope" croak.
- **Snap:** click or tap a firefly, or press Space to snap the nearest firefly in reach. You can snap during a hop.
- **Warmth:** each firefly pushes the ice back (+3 px, a golden firefly +10). Pads thaw again when the ice recedes past them. When your own pad starts to frost and creak, hop inward.
- **Score:** a firefly is worth 10 and a golden one 50. A catch made mid-hop scores double. Catches less than 2 s apart build a combo up to ×5. Reaching dawn adds 500 + 2 × the open-water radius. Your best score is saved in localStorage.
- **Other keys:** P / Esc pauses, M mutes, V toggles reduced motion, and R / Enter / Space or a click restarts from the game-over screen.

## How to host

`game/` is a self-contained static folder (228 kB) with no CDN dependencies and no build step. To host it, copy the folder to any static host (GitHub Pages, Netlify, S3, itch.io as an HTML zip) and open `index.html`. It also runs straight from disk over `file://`. Add `?seed=N` to the URL to replay a fixed layout.

Delivery check: I loaded `game/index.html?seed=1` from `file://` in headless Chrome. It reached `title`, `__game.start()` moved it to `play`, and Space caught firefly #1 (score 10, caught 1). There were no console errors and no failed requests, and it ran at 59.9 fps. The title frame is saved as `screenshots/deliver-check-title.png`.

## The science applied

The brief set the numbers and the fun brief (`stages/fun/outputs/fun-brief.md`) set the principles. The fun brief draws on Flow, MDA, SDT (Ryan, Rigby and Przybylski), Hopson's reward schedules, Swink and Cook on game feel and skill atoms, Juul on failure, and Lazzaro's four keys. Before fixing any numbers, the GDD ran a balance sim over 24 seeds per strategy. That sim drove most of its decisions:

| GDD decision | Principle it serves | Evidence |
|---|---|---|
| The ice ring is the only threat and grows linearly, v(t) = 0.8 + 0.012·t, with no spikes | Flow channel, and MDA's "constant rate tax" fix. Hopson: sudden spikes drive players away | Idle play freezes at 141 s, exactly as predicted |
| Thaw per catch cut from +6 to +3 (golden +10) | Juul: the "fail some, then complete" group rated games highest | At +6 the sim's novice bot won almost every run. At +3 it sits at the fail-then-win edge |
| Fireflies spawn at least 120 px from the frog and are shy within 130 px | Fun brief §0 (camping must fail) and Cook (keep the hop atom in use all game) | Camping on the centre pad freezes at 146–157 s |
| Frozen pads thaw again when R recedes, and catches add the same warmth at any combo | MDA's no-death-spiral rule: subsidise the losing player and reward the leader only with score | Pads were seen re-opening in the bots' probes (`padsOpen` 11 → 9 → up again) |
| Golden firefly at a seeded 15–25 s jitter, worth about 5× in every channel | Hopson: variable-ratio rewards on top of an avoidance schedule, so players don't clock-watch | — |
| Rigid pad rotation, and every pad has a neighbour 70–135 px further in | SDT competence (β = .41 for continued play): a death should never be stranding the player can't control | The sim showed stranding deaths at 51–75 s with differential drift, and none with rigid rotation |
| Hops can't miss, the range ring wobbles on a refused click, and snap hit-testing is lenient | SDT: intuitive controls lead to competence | Every bot hop and snap verb worked in all 4 rounds |
| The first firefly is tame and within reach. Fireflies stay unshy until 3 catches. The hop hint appears only when needed | Cook's skill atoms and teaching within 30 s without a tutorial | Every bot made its first catch by about 15 s |
| Pad frost warning 3 s ahead with a creak, and a death card that names the gap ("27 fireflies short of dawn", "Your pad iced over: hop inward…") | Juul: players who blame themselves come back. Lazzaro: fiero after frustration | Death card verified on screen in round 4 |
| Squash, landing ripple, 40–60 ms hit-pause, a combo chime rising a whole tone per step, no shake on normal catches | Swink: polish sells physicality, with restraint | Audio scored 9 in rounds 2–4 |
| Warm amber fireflies against cool ice; frog is the highest-contrast object | Art brief: warm means reward, cool means danger. Reads as the concept at a glance | Reads-as-concept went from 7 to 9 |

Polish added one deliberate deviation. The thaw cap falls from 260 to 215 across the night (`CAP_FALL`), so skilled players still feel the ice in Act 2. Their R at 120 s dropped from 200–250 to 200–230. A novice assist (a bright firefly one hop away every 10 s) was tried and then reverted, because over 24 seeds it cut novice dawns from 11/24 to 7/24.

## Play-test scores per round

Each criterion is scored out of 10 and the total out of 100. Ship requires 80 or more with no blockers. Rounds 1–3 come from `stages/verdict/rounds/<n>/scores.json` and round 4 from `stages/verdict/outputs/scores.json`. The polish changelog (12:05) predates the round 4 scores (12:11), and the verdict re-read build `a5e8001b`, so the delivered build is the one that was scored.

| Criterion | R1 | R2 | R3 | R4 (final) |
|---|---|---|---|---|
| Reads as concept | 7 | 8 | 8 | 9 |
| Core loop and flow | 7 | 7 | 7 | 7 |
| Game feel | 7 | 7 | 7 | 8 |
| Onboarding | 6 | 8 | 8 | 8 |
| Performance | 9 | 9 | 9 | 9 |
| Art readability | 6 | 7 | 7 | 8 |
| Audio feedback | 8 | 9 | 9 | 9 |
| Acceptance checklist | 6 | 7 | 7 | 7 |
| **Total** | **70** | **78** | **78** | **81** |
| Blockers | 1 | 0 | 0 | 0 |
| Verdict | ITERATE | ITERATE | ITERATE | **SHIP** |

What moved each round:
- **Round 1 (70):** blocked because the game-over screen never showed in the bots' captures. The frog also blended into the same-green pads.
- **Round 2 (78):** the over card and the frog outline were fixed and the blocker was cleared. Notes: shrink the over panel, dim the pond behind it, and make the fireflies warmer.
- **Round 3 (78):** the frozen frog spotlight, the smaller card, the title plate, the falling thaw cap and the gentler early rim were added. The total held at 78, because fireflies still read cold and there was no death or dawn sample.
- **Round 4 (81):** amber fireflies, a faceted ice sheet, a legible score/best plate and a combo chime on every step. A death card was finally captured (novice-1, frozen at 1:18).

Final round bot results at t = 120 s: skilled bots reached R 228/210 with 3380 and 1870 points (68 and 51 catches), casual bots R 207/203 (1110 and 1140), and novice-2 R 125 with one pad open (210 points). Novice-1 froze at 79.1 s. Performance was 60 fps, worst frame 16.8 ms, 0 long frames and 0 errors.

## Final verdict

**SHIP at 81/100 with no blockers.** The whole loop (title, play, freeze, game over, restart) reads as the concept, runs at a locked 60 fps, and scales by skill in the right order. The weakest areas are core loop and flow (7) and the acceptance checklist (7). In all four rounds the harness stopped at 120 s, so dawn, the win card and the dawn bonus were only verified by the polish stage's own runs. Those runs report greedy bots reaching dawn 24/24, novices 11/24, and a median novice death at 148 s.

## Next iteration

1. **Sample the full night.** Run the bots for at least 185 s so dawn, the bonus and the win card are seen by the harness (checklist items 4, 14 and 15). Also add a device-scale-2 run and a heap-trend run.
2. **Prevent early rim deaths.** The one early loss (79 s, R 187, 9 pads still open) was a novice dying on a single outer pad. When the frog's pad has under 5 s left, pulse a ring on the best inward pad and raise the creak's pitch, so a first-timer can save themselves.
3. **Move the game-over card.** It still overlaps the top of the pond and the score plate. Shrink it or place it clear of both, so the frozen pond stays visible behind it.
4. **Give novices more agency.** Novices end at R about 125 with one pad open. The tried assist made things worse, so look at the pacing of `PAD_EDGE` and the warning instead of adding firefly supply.
5. **Frame the pond.** The pond is a disc in empty black margins. Fill them with reeds or a shore to give late play, which happens in a small dark core, more to look at.

## Contents

- `game/`: the shipped build (index.html, js/, assets/ with sfx.js and manifest.json).
- `screenshots/`: the final round's bot captures (novice, casual and skilled, two seeds each, at title, 5 s, 30 s, 60 s and over), plus `deliver-check-title.png` from the delivery load check.
