# Stage splitter report for Credit repair interview, run 02e98ac7-8b9f-4734-a22f-0cc8c970cce7

One stage is worth splitting: `playbook`. The skeptic passed it. A new pipeline was saved.

## The run in numbers

| measure | value |
|---|---|
| Wall-clock | 1433 s |
| Sum of group wall-clocks | 858 s |
| Median cold start | 2.5 s and 47,225 cache-creation tokens |
| Floor | 10 s and 3% of 858 s, so 25.7 s binds |

| group | wall (s) | slowest stage | stages |
|---|---|---|---|
| intake | 364 | playbook | extract, playbook |
| interview | 51 | interviewer | interviewer |
| check | 25 | critic | critic |
| analyze | 207 | building | diagnosis, disputes, negotiation, building |
| compose | 169 | plan | letters, plan |
| deliver | 42 | dossier | dossier |

Wall-clock is larger than the group sum because the person's wait time and gaps sit outside the group figures.

## The ranking

Saving is the judge's figure. The percent is of 858 s.

| rank | stage | verdict | saving (s) | % of 858 | extra tokens | reason |
|---|---|---|---|---|---|---|
| 1 | playbook | **split** | 110 (skeptic: about 55) | 12.8 (skeptic: 6.4) | 94,450 | Independent research topics, no file joins them, and it leads intake by 350 s. |
| 2 | plan | keep | 23.7 | 2.8 | 0 | Saving is below the 25.7 s floor. One 130.8 s generation feeds the month sections. |
| 3 | dossier | keep | 0.5 | 0.1 | 0 | Below the floor. Shared `/tmp/build` path forces a merge. |
| 4 | building | keep | 0 | 0 | 0 | One serial chain, no independent cluster. |
| 5 | interviewer | keep | 0 | 0 | 0 | Serial human wait. One open question per stage. Looped 4 times. |
| 6 | critic | keep | 0 | 0 | 0 | About 17 s of model time per round. No positive saving. Looped 4 times. |
| 7 | extract | keep | 0 | 0 | 0 | Slack: 350 s behind playbook. |
| 7 | diagnosis | keep | 0 | 0 | 0 | Slack: 108 s behind building. |
| 7 | disputes | keep | 0 | 0 | 0 | Slack: 97 s behind building. |
| 7 | negotiation | keep | 0 | 0 | 0 | Slack: 84 s behind building. |
| 7 | letters | keep | 0 | 0 | 0 | Slack: 102 s behind plan. |

## Endorsed split: playbook

Group: intake. The stage ran 363 s. Next slowest sibling is extract at 13 s, so the lead is 350 s.

### New stages

All three use sonnet, take no inputs and write one md output. They run in intake beside extract.

| new stage | output | sections | job |
|---|---|---|---|
| playbook-scoring | playbook-scoring | 1, 9 to 15 | FICO weights, utilization, limit increases, authorized users, secured cards, Boost and rent reporting, inquiries, rapid rescore |
| playbook-disputes | playbook-disputes | 2 to 6, 16 | FCRA 611 and 623 disputes, 605B blocks, seven-year limit and re-aging, FDCPA 809(b) and Reg F, medical debt, bureau addresses |
| playbook-collections | playbook-collections | 7, 8 | State statute-of-limitations table with revival rules, goodwill letters, pay-for-delete |

### Seam

A section list. The original section numbers are kept. Each prompt names the sections it owns and forbids the others. Each file ends with its own "What could not be verified" and "Sources actually read".

### Join

Consumers read the halves in place. No merge stage was added. A merge would bring back about 147 s of serial work.

| consumer | reads |
|---|---|
| interviewer | scoring, disputes, collections |
| diagnosis | scoring, disputes |
| disputes | disputes, collections |
| negotiation | collections, disputes |
| building | scoring |
| letters | disputes, collections |

### Risks

- A consumer prompt may expect a section that now lives in a file it was not given. Inputs were widened to cover this.
- Three voices and three source lists replace one. Cross-references by section number still resolve.
- The halves may fetch the same CFPB and myfico pages twice. That costs tokens, not wall time.
- Extra cache-creation tokens: 94,450 per run, plus the duplicate fetches.
- Shared state: none found.

### Skeptic's findings

- Halves reading each other's files: holds. No cluster reads a path another wrote.
- Shared state: holds. No `/tmp` use in the transcript.
- Consumers, input wiring, new keys and permission mode: all hold.
- The saving survives, but the judge's arithmetic was wrong. It left out c14 (58 s, the 605B and re-aging wave), which belongs to the disputes half. The skeptic puts the longest half near 295 s. That gives about 55 s saved, 6.4% of 858 s. This still clears the floor. The split stops paying only if the longest half passes 325 s.
- Suggested, not a blocker: tell the disputes half to run all its research in one parallel wave.
- The three original `links` were not in the endorsed stages. The build stage copied them to each new stage.
- The merge kind could not be checked by the skeptic. The build stage validated it: `{"ok":true}`.
- The build stage renamed output names from underscores to hyphens, because the validator allows only lowercase letters, digits and hyphens. The seam text in the prompts was updated to match.

## The saved pipeline

- Id: `ca9e8735-86ea-4053-9446-13a8bc560f31`
- Name: Credit repair interview (split)
- Source: pipeline 46bea631-a1da-48d4-8eef-1b2c42e783c9, unchanged.

| split | result |
|---|---|
| playbook | became playbook-scoring, playbook-disputes, playbook-collections in intake. Six consumers rewired. No prompt edits. |

13 lesson rows were copied from the source pipeline's stages.

Start command. The run had one pipeline variable, `reports-dir`.

```
/usr/bin/node --no-warnings=ExperimentalWarning /home/alex/Desktop/dev/modpipes/dist/cli/src/main.js start ca9e8735-86ea-4053-9446-13a8bc560f31 --var reports-dir=/home/alex/.modpipes/runs/845a166c-8c00-47be-ba99-4ec60a2e2665/stages/kt6n75z/work/fixtures/reports-empty
```

The original run used an empty reports folder. Point `reports-dir` at real reports for a real run.

## Skeptic's last verdict

**SKEPTIC-PASS**, in round 1. No objection is left open. The loop did not reach its cap.

## Note

One run is one sample. Timing varies from run to run. To firm a verdict, analyse a second run of the same pipeline.
