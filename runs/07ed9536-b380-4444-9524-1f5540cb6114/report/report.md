# Stage splitter report for Game forge, run 8f2a5b1a-40fc-4d2c-ab2d-dde6daefd9fd

Result: no stage is worth splitting. Nothing was saved.

## The run in numbers

| Measure | Value |
|---|---|
| Wall-clock | 6979 s |
| Sum of group wall-clocks | 4232 s |
| Floor (60 s and 15 % of 4232 s) | 634.8 s per split |
| Cold start per added stage | 3.3 s first-call delay + 10 s, and 62,351 cache-creation tokens |

| Group | Wall s | Slowest stage |
|---|---|---|
| Understand | 919 | art |
| Design | 190 | gdd |
| Plan | 433 | tech |
| Build | 1116 | game |
| Integrate | 198 | integrate |
| Polish | 664 | polish |
| Judge | 572 | playtest |
| Deliver | 108 | deliver |
| Play | 32 | play |

The wall-clock of 6979 s is larger than the group sum. The Understand group includes a 10.5 min stop between launches. No split recovers it.

## The ranking

Percent is of the 4232 s group sum. Extra tokens count the added stages times 62,351, times the launches for looped stages. Figures marked ~ assume one added stage and were not stated by the judge.

| Rank | Stage | Verdict | Saving s | % of 4232 | Extra tokens | Reason |
|---|---|---|---|---|---|---|
| 1 | game | keep | 422 | 10.0 | 187,053 | Below 15 %. The 632 s lead caps any split under the 634.8 s floor. The tech-plan seam leaks. |
| 2 | playtest | keep | 222 (3 launches) | 5.2 | 187,053 | Personas already run in parallel in one call. The solo perf window must run alone. |
| 3 | tech | keep | 173 | 4.1 | ~62,351 | Capped at the 173 s lead over artdir. The 189 s think is serial with the 205 s write. |
| 4 | integrate | keep | 130 | 3.1 | ~62,351 | One flow chain from the merge into the smoke runs. Real saving is near 0. |
| 5 | polish | keep | 93 (3 launches) | 2.2 | ~187,053 | Output dependence on config.js, render.js, assets.js and NOTES.md. |
| 6 | art | keep | 84 | 2.0 | ~62,351 | The brief write (138 s) is fed by every other cluster. |
| 7 | deliver | keep | 56 | 1.3 | ~62,351 | Below 60 s. |
| 8 | gdd | keep | 13 | 0.3 | ~62,351 | One 164 s Write call. |
| 9 | play | keep | 0 | 0 | ~62,351 | 31 s stage. |
| – | brief | keep | 0 | 0 | – | Slack 852 s behind art. |
| – | fun | keep | 0 | 0 | – | Slack 707 s behind art. |
| – | perf | keep | 0 | 0 | – | Slack 622 s behind art. |
| – | artdir | keep | 0 | 0 | – | Slack 173 s behind tech. |
| – | assets | keep | 0 | 0 | – | Slack 632 s behind game. |

The best case is game at 422 s, 10.0 %. It misses the 15 % floor.

## Endorsed splits

None. The judge's `splits.json` has an empty `endorsed` list. build-split was skipped, so there is no build-notes.md.

## The saved pipeline

No stage is worth splitting. Nothing was saved.

## The skeptic

Last verdict word: **SKEPTIC-PASS**.

The skeptic accepted every kept stage. The 634.8 s floor exceeds game's 632 s lead cap. No objection is left open. The loop did not reach the cap.

## Closing note

One run is one sample. Timing varies from run to run. To firm a verdict, analyse a second run of the same pipeline. Game's 422 s saving and its 632 s lead are the numbers most likely to move a verdict.
