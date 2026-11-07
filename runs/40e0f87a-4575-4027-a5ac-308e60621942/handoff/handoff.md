# Handoff: fleischer-natwick-style

Topic: Max Fleischer and Grim Natwick, what is distinctive about their styles and how to honor them in new art.

**Result: PASSED in round 1 with 100/100** (pass mark 80).

## The agent

- Name: `fleischer-natwick-style`
- File: `/home/alex/.claude/agents/fleischer-natwick-style.md`

### How to use it

- In Claude Code, say: `use the fleischer-natwick-style subagent` followed by your task.
- For a whole session: `claude --agent fleischer-natwick-style`
- On a modpipes stage, set `"agent": "fleischer-natwick-style"`.

## Images

- Folder: `/home/alex/.claude/agents/fleischer-natwick-style-images/`
- Count: 6 (the target was 6)
- Gallery: [index.md](/home/alex/.claude/agents/fleischer-natwick-style-images/index.md), with source page and direct URL for each image.

## Examiner scores

| Area | Score |
|---|---|
| Expert (closed-book quiz) | 40/40 |
| Critique (image 02) | 20/20 |
| Making (drawing) | 20/20 |
| Usable | 20/20 |
| **Total** | **100/100** |

Rounds: 1. Passed: yes.

- Report: [report.md](../../examiner/outputs/report.md)
- Scores: [scores.json](../../examiner/outputs/scores.json)
- Quiz: [quiz.md](../../examiner/outputs/exam/quiz.md)
- **Drawing the agent made during the exam:** [drawing.png](../../examiner/outputs/exam/drawing.png). It is an original cat trumpeter in an alley with jointless rubber-hose limbs, props with faces, cast shadows and music notes.

## What the examiner still wants

The agent passed, so nothing is required. The examiner suggested three optional fixes to the drawing recipes in Method D2:

1. The outline is a uniform weight. Add a recipe that draws each outline as a filled polygon between two offset curves, with the offset varying along the stroke. A single-width `draw.line` can't show thick and thin.
2. The pie-cut eyes did not show; the pupils were plain dots. Add a one-line Pillow recipe: `draw.pieslice` on the pupil, cutting a 40–60° white wedge.
3. Make "at least one object mid-transformation" a required element of Method D, because the drawing had no metamorphosis gag.

Keep the "Contested claims" section and the image-evidence caveats (weak evidence for images 04 and 05) as they are. If you rerun, change only those three recipes.
