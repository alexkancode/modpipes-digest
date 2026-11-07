# Handoff: cmos-hyphenation-vs-ap

Topic: Chicago Manual of Style hyphenation (CMOS 17th/18th ed., §7.89 table) and where CMOS and AP disagree.

## The agent

- Name: `cmos-hyphenation-vs-ap`
- File: `/home/alex/.claude/agents/cmos-hyphenation-vs-ap.md` (installed 2026-11-06T11:30:20)

## How to use it

- In Claude Code, inside a session: `use the cmos-hyphenation-vs-ap subagent to check this paragraph`
- For a whole session: `claude --agent cmos-hyphenation-vs-ap`
- On a modpipes stage: set `"agent": "cmos-hyphenation-vs-ap"` in the stage definition.

## Images

None. The plan set `needs_images: false` and `image_target: 0`, so there is no image folder and no gallery. The topic is a rule set, not something to look at.

## Examiner result

Passed in round 1 of 1, with 100/100 (pass mark 95).

| Area | Score |
|---|---|
| Expert (quiz, 6/6 correct) | 40/40 |
| Critique (12 planted errors, all caught) | 20/20 |
| Making (copyeditor brief) | 20/20 |
| Usable (lint, loading, paths, tools) | 20/20 |

- Full report: [report.md](../../examiner/outputs/report.md)
- Quiz: [quiz.md](../../examiner/outputs/exam/quiz.md), probe: [probe-1.json](../../examiner/outputs/exam/probe-1.json)
- Critique probe: [probe-2.json](../../examiner/outputs/exam/probe-2.json)
- Making probe (probe-3): [probe-3.json](../../examiner/outputs/exam/probe-3.json), the brief it produced: [brief.md](../../examiner/outputs/exam/brief.md)

## The drawing

The agent made no drawing during the exam. The topic is textual, and the "making" task was a written copyeditor brief, linked above. The exam folder holds no image file.

## What the examiner still wants

Nothing blocks the pass. The examiner listed two optional fixes for the agent file, if you edit it by hand or rerun:

1. **Inconsistent ¶7.92 claim.** Section 2.2 says the 18th edition's ¶7.92 "names more always-hyphenated after-noun compounds". Section 2.5 says how many the 17th listed is unverified. Pick one status: if no source compares the two lists, mark the §2.2 statement [unverified] too. The agent had already turned this into a flat "the 18th widened the list".
2. **Overstated AP vs. CMOS philosophy.** The brief says "Don't drop hyphens just because the meaning seems clear". Both guides leave familiar open compounds open. Add one line in §2.12 or §4.2 saying the difference is pattern-first (CMOS) versus judgment-first (AP).

Keep as is: the edition-by-edition paragraph table (§2.2), the 5-step decision procedure (§2.4), the [unverified]/CONTESTED markers, the "never cite 7.89 for the 18th" rule, and the per-item report format (§4.1).
