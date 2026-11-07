# Handoff: ADHD and Todo-App UX Expert

**Topic:** ADHD and todo UX, and what often stops ADHD people from sticking with a todo app.
**Result: PASSED, 94/100 (pass mark 80), in 1 round.**

## The agent

- Name: `adhd-todo-ux`
- File: `/home/alex/.claude/agents/adhd-todo-ux.md` (installed 2026-11-06)

### How to use it

- In Claude Code, one task: say `use the adhd-todo-ux subagent to ...`
- A whole session: `claude --agent adhd-todo-ux`
- On a modpipes stage: set `"agent": "adhd-todo-ux"` in the stage config.

## Reference images

- 13 images (target was 10, cap 16) in `/home/alex/.claude/agents/adhd-todo-ux-images/`
- Gallery: [index.html](file:///home/alex/.claude/agents/adhd-todo-ux-images/index.html) (captions and source URLs are in `index.md` beside it)

## Examiner scores (round 1)

| Area | Score |
|---|---|
| Expert | 38 / 40 |
| Critique | 19 / 20 |
| Making | 18 / 20 |
| Usable | 19 / 20 |
| **Total** | **94 / 100** |

- The agent got 6/6 on the closed-book quiz, with contested claims hedged. Bare Sonnet scored about 1.75/6.
- Full report: [report.md](../../examiner/outputs/report.md)
- Scores: [scores.json](../../examiner/outputs/scores.json)
- Exam files: [exam/](../../examiner/outputs/exam/)

### The drawing from the exam

[drawing.png](../../examiner/outputs/exam/drawing.png): a "welcome back after two weeks" Today screen that the agent drew with Pillow.

## What the examiner still wants

The agent passed. These fixes are minor and optional. To apply them, edit `/home/alex/.claude/agents/adhd-todo-ux.md` by hand or rerun the forge.

1. Name the authors, year and journal for the delay-aversion meta-analysis (PMID 29806533), the two reviews in §7 (32424511, 34383674) and the 2025 review (40011386). Fetch each PubMed page first.
2. Method 1 (critique): list the visible items by name before giving any count. The agent miscounted tasks in the probe (said about five, there were four).
3. Method 4 (drawing):
   - The cap line must read "Showing 3 of N" with N above the number shown, or "That's all for today". The drawing said "3 of 3 shown. The rest can wait", which contradicts itself.
   - The timer ring should show the estimate (full ring, Start button) until the user starts the task. Icons must match the task.
4. Replace the fixed `/tmp/adhd-wire/` and `/tmp/adhd-ref-NN.jpg` paths with `D=$(mktemp -d /tmp/adhd-wire.XXXX)` so sessions do not collide.
5. Optional: add non-Wikipedia depth. This means a Barkley primary source for the unverified "time blindness / point of performance" attribution, a Dodson page for "interest-based nervous system", and CHADD or ADDitude guidance pages.
