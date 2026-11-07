# Handoff: toddler-milestones-play

Topic: an expert in development milestones and fun activities for toddlers younger than 2.
Title: Toddler Development Milestones and Play (Birth to 24 Months).

## The agent

- Name: `toddler-milestones-play`
- File: `/home/alex/.claude/agents/toddler-milestones-play.md`
- Installed: 2026-11-06T23:24:44

## How to use it

- In Claude Code, for one task: `use the toddler-milestones-play subagent to <task>`
- For a whole session: `claude --agent toddler-milestones-play`
- On a modpipes stage: set `"agent": "toddler-milestones-play"` in the stage definition.

It covers milestone ranges (CDC, WHO), the four developmental domains, the motor and language sequences, age-matched play, safety, red flags and screening, and screen and sleep guidance. It can also critique a play plan (Method A) and write practitioner briefs (Method B).

## Images

None. Triage set `needs_images: false`, so there is no image folder and no gallery. The `install.json` entry has `images_path: null` and `image_count: 0`.

## Examiner result

**Passed.** 90/100 (pass mark 80) after 1 round.

| Area | Score |
|---|---|
| Expert | 35/40 |
| Critique | 17/20 |
| Making | 18/20 |
| Usable | 20/20 |
| **Total** | **90/100** |

The agent got 6/6 on the quiz. The bare-Sonnet control got about 4/6, a margin of exactly 2. Lint was ok and the agent loaded on the first try.

- Full report: [report.md](../../examiner/outputs/report.md)
- Scores: [scores.json](../../examiner/outputs/scores.json)
- Exam files: [quiz.md](../../examiner/outputs/exam/quiz.md), [probe-1.json](../../examiner/outputs/exam/probe-1.json), [probe-2.json](../../examiner/outputs/exam/probe-2.json), [probe-3.json](../../examiner/outputs/exam/probe-3.json), [control.json](../../examiner/outputs/exam/control.json)

## Drawing

There is no drawing. The topic has no images, so the make probe was a written practitioner brief: a one-page play plan for 15-month-olds, including one child born at 32 weeks. See [brief.md](../../examiner/outputs/exam/brief.md).

## Optional polish

The agent passed, so none of this is required. The examiner listed these fixes for anyone who wants a higher score:

1. Add more non-Wikipedia depth to the history and screening sections. The ASQ-3 psychometrics, M-CHAT-R/F follow-up scoring, the AAP 2020 screening clinical report itself, and page update dates would all help. The margin over the control was only 2.
2. Rephrase "I found / I didn't find" in the screen-guidance section (2.9) to "the November 2026 research pass did not find…". Extend the ground rule to ban "I found" about pages.
3. In Method A step 1, add: if the text is pasted, Write it to `/tmp/milestones/input.txt` first, then run steps 2–3 on that file.
4. In Method A step 7, merge duplicate fixes and mark unsourced safety points as general guidance.
5. Add Method B step 8: run Method A steps 2 and 4 on your own brief file before reporting.
6. In Method B step 4, require each "builds" cell to give the checklist age in brackets.
