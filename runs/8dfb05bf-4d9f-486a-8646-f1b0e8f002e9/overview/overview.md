# Run dashboard overview

* Index URL: http://localhost:4810/api/runs/8dfb05bf-4d9f-486a-8646-f1b0e8f002e9/files/stages/build/outputs/dashboard/index.html
* On disk: /home/alex/.modpipes/runs/8dfb05bf-4d9f-486a-8646-f1b0e8f002e9/stages/build/outputs/dashboard/

## The period

* Label: The last hour
* From: 2026-11-06T22:09:45.867Z
* To: 2026-11-06T23:09:45.867Z
* Runs: 5, with 10.8M tokens in total

## Runs by status and by kind

By status:
* done: 2
* failed: 0
* cancelled: 0
* running: 3

By kind:
* test: 3 (one Run dashboard test, two User bible tests)
* pipeline builder: 0
* this dashboard: 1 (run 8dfb05bf, still running while it built this page)
* everything else: 1 (Topic expert forge, run 79cab3e4)

## Heroes

* Rendered with the chrome engine at 800x500. 5 of 5 rendered, 0 fell back, 0 missing.
* From a page: 2 (both User bible runs, rendered from bible.html)
* From an image: 0
* From a video: 0
* Typographic card: 3 (the two Run dashboard runs, from the pipeline name, and Topic expert forge, from history.history)
* Fallbacks: none. The three typographic cards were chosen by design, not as a fallback.

## The check

* Result: pass (ok: true), checked 2026-11-06T23:10:23Z.
* All 15 checks passed. No check failed.
* Covered: 5 cards, 5 run pages, 5 heroes, no horizontal scroll at 1280 or 390, 13 index links answer, both sandboxes render, axe found nothing serious, no console errors.

## What you saw

* At 1280 wide (index-1280.png), the top of every card is a blank grey gradient and no hero image shows on any of the 5 cards, although the check said every hero decodes. At 390 wide, and inside the sandboxes, the heroes do show.
* In sandboxes.png, the card title and status sit on top of the hero text, so "Topic expert forge" overlaps "History: Fleischer Studios, Betty Boop and the Rubber-Hose Era", and the User bible cards print their title over the hero page text. This is hard to read.
* The run page (run-page.png) and the 390 layout look clean. The running run is shown with "absent" outputs, which is correct for a run that had only built its toolkit.
