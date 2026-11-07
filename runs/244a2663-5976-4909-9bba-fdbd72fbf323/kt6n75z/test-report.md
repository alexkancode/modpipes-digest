# Pinterest board capture: test report

Date: 2026-11-06, 11:42 to 12:02 CST. Pipeline `fb507aed-2822-46a2-ad81-0a4d2be7df05`, tested on v0. The real pipeline now stands at v3.

## What ran

The test copy was "Pinterest board capture (test)" (`e56c362a-439d-4829-b0b9-9391ceb200c7`). It is now deleted, and its runs stay in history. The pipeline has no loops, so there were no caps to cut.

| Run | Path | Inputs | Wall time | Result |
|---|---|---|---|---|
| `0b0b529d-c8bc-4b0e-beee-ed212ceb5ff0` | happy | `pinterest-username=alexandrakancewick`, defaults (2 boards, 3 pins) | 13 min 41 s, of which 10 min waited for the ClamAV install | done, every stage ran |
| `1286b6e0-a445-4069-b04a-4018e3063de7` | stress | same user, `max-boards=0`, `max-pins-per-board=1` | 1 min 43 s | done, stopped at preflight |

ClamAV was not installed when the runs started. I sent a push notification, and the user installed ClamAV with the signatures at about 11:53. Only after that did I answer the happy preflight with "Done, check again". To test the three-round cap, I answered "Done, check again" on the stress run three times while ClamAV was still missing.

The username came from Firefox history. The built-pipeline note's example `alexandrab` is not the real profile.

## What worked (counted from transcripts and files)

- Toolkit: 17 unit tests ran and passed in 1 s (`stages/toolkit/transcript.jsonl`).
- Preflight, stress: 4 checks and 3 AskUserQuestion calls, one call per round and none in parallel. Preflight then stopped as designed, and `status.json` kept `ok: false`. It never ran `--relaunch-firefox`. The driver, fetch-clean, describe and catalogue stages were skipped, and the report said "Stopped at preflight" with both fixes.
- Preflight, happy: the check found Firefox on the AT-SPI bus without a relaunch, and `ok` turned true once ClamAV landed.
- Driver: 7 tool calls, 2 min 41 s. The accessibility tree exposed board and pin URIs on the first try (`via: tree`), so the view-source fallback for board pages was not needed. The run listed about 120 boards and resolved 5 of 6 pins through Firefox view-source. One pin fell back to requests and was skipped with a note.
- Fetch-clean: 20 s. It ran a clamscan file list over 5 `.part` files. It re-encoded 4 images and checked 1 mp4 with 3 frames. It published `~/Documents/Pinterest/clay/` (3 files) and `diy-gift/` (2 files), and `file` confirms each one as real PNG, JPEG or MP4. `deletions.csv` holds 4 rows, all `.incoming/*.part` paths inside the Pinterest folder. No `.part` files are left.
- Describe: 31 s. It made 8 Read calls: clean.json, 4 images and 3 video frames. It opened nothing else.
- Catalogue: 5 rows in `lessons__pinterest_media`, ids 1 to 5. `lessons find lessons__pinterest_media ceramic buttons` returns them. A regex for `http|pinimg|pinterest.com` over every phrase and blurb finds 0 hits, and a grep over the stage outputs and the Pinterest folder finds no links.
- These 5 files and 5 rows are real product, so I left them in place.

## Defects and fixes

1. The report scrubbed its own Limits line. The line read "No Pinterest or [removed] link", because `scrub()` matched the word pinimg.
   - Evidence: `~/.modpipes/runs/1286b6e0-a445-4069-b04a-4018e3063de7/stages/report/outputs/report.md` and `~/.modpipes/runs/0b0b529d-c8bc-4b0e-beee-ed212ceb5ff0/stages/report/outputs/report.md`.
   - Fix (v1): the line now names "its image host" instead of the domain word, and a unit test asserts the clean line.
   - Status: unconfirmed in a run. A replay of v1 and v3 `report.py` on both runs' inputs prints the clean line (`work/replay-v3-report.md`).
2. Nothing stopped two runs from driving one Firefox. `drive.py` had no lock, and my two parallel runs would have interleaved keystrokes if both had passed preflight.
   - Evidence: no lock or flock appears in v0 `drive.py`.
   - Fix (v2): `claim()` writes `~/.modpipes/pinterest-driver.owner` with the run id under flock before every keystroke. A claim from another run is honoured for 10 minutes. The driver prompt now says to stop with an empty manifest on that refusal and never to bypass it with xdotool.
   - Status: unconfirmed. Only a unit test covers it.
3. Helper labels carried profile chrome. `drive.py boards` returned names such as "Edit Clay , 38 Pins , 3h" and "Private board icon Edit Gardigan , 80 Pins , 3d". Pin titles ended in "pin page". The driver model cleaned these by hand this time, so the manifest was right, but only through judgment.
   - Evidence: the first `drive.py boards` and `board` results in `~/.modpipes/runs/0b0b529d-c8bc-4b0e-beee-ed212ceb5ff0/stages/driver/transcript.jsonl`.
   - Fix (v3): `board_name()` and `pins_in()` strip that chrome. A replay over all 120 real labels gives clean names, and 2 unit tests cover it.
   - Status: unconfirmed in a run.
4. A skipped pin was not replaced. diy-gift yielded 2 pins against a cap of 3, although the board helper had returned 16.
   - Evidence: the notes in `stages/driver/outputs/manifest.json` of the happy run. Do not copy that file anywhere, because it holds the links.
   - Fix (v3): driver step 4 now says to resolve the next unknown pin from the same board.
   - Status: unconfirmed.
5. The report summary said "Deleted: 4", while its Deleted section said "(none)". All 4 rows were staging copies.
   - Evidence: the happy report.
   - Fix (v3): the summary now reads "Rejected and deleted" and counts only rejected files.
   - Status: confirmed offline by replay, unconfirmed in a run.

Every version passed the voice audit (0 sentences over 25 words), `pipeline validate`, and the toolkit tests (19 pass at v3). Each was re-read with `pipeline show` after its update. The versions are in `pipeline-versions/v1.json` to `v3.json`, each with a `versionNote`.

For transparency: I cleared a `__pycache__` directory in my own work copy (`kt6n75z/work/build/toolkit`) with `rm -rf`. Nothing under `~/Documents/Pinterest` was touched by anything except the pipeline's own guard.

## What the next tester should look at first

- Run v3 with `max-boards=3`. Check that the board names in the `drive.py boards` output in the driver transcript are clean before the model touches them.
- Start the same inputs a second time. Pins already in the table must be skipped, and no sha256 duplicate may be published.
- Start a second run while the first driver is going. Expect "another run drives Firefox" and an empty manifest.
- Still untested:
  - `max-boards=0`, which means about 120 boards and hours of driving
  - the login wall, captcha and Stop paths
  - a file rejected by ClamAV, Pillow or GStreamer, which is the only path that deletes a published-candidate file
- The builder todo row "pinterest board capture v2 v3 unconfirmed" in `lessons__pipeline_builder_todos` holds this list.
