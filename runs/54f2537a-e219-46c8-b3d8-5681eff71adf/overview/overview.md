# Run dashboard overview

Index URL: http://localhost:4810/api/runs/54f2537a-e219-46c8-b3d8-5681eff71adf/files/stages/build/outputs/dashboard/index.html
Dashboard on disk: /home/alex/.modpipes/runs/54f2537a-e219-46c8-b3d8-5681eff71adf/stages/build/outputs/dashboard/

## The period

- Label: Today
- From: 2026-11-06T06:00:00.000Z
- To: 2026-11-07T06:00:00.000Z
- Runs: 52
- Questions asked: 101
- Tokens: 398.8M

## Runs by status and by kind

By status:

- Done: 33
- Failed: 2
- Cancelled: 1
- Running: 16

By kind:

- Test: 20
- Pipeline builder: 12
- This dashboard: 1
- Everything else: 19 (Topic expert forge, Game forge and Game forge v2)

## Heroes

- Page: 27
- Image: 0
- Video: 0
- Typographic card: 25
- Fallbacks: 0 (hero-report counts 52 rendered, 0 fallbacks, 0 missing)

The 25 typographic cards were chosen by the heroes stage, not forced by an error.
Every hero was rendered by Chrome at 800x500.

## The check

Result: PASS. All 15 checks passed and no check failed.

- Covered: HTTP 200, 52 cards, 52 run pages, 52 heroes, filters, 107 index links, no horizontal scroll at 1280 or 390.
- Covered: both sandboxes, axe (no serious violations), and no console errors.

## What you saw

The dashboard is clean and readable at 1280 and 390 pixels. The stat tiles wrap properly and the filter row works.
The typographic hero cards are the ugly part.
- Titles are cut off at the right edge of the card ("...style toda", "Alzheimer's care resear").
- The "Running" badge overlaps the faded excerpt text.
- One card shows a bare "---" because it quotes a YAML front-matter marker.
The run page (Game forge iterate) is a long but tidy single column. The sandboxes screenshot shows both sandboxed renderings matching the page.
