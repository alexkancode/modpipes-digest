# Launch Video Script (template)

**Status:** Template. Do not render a final cut until every `[BRACKET]` slot is filled.
Upstream stages ran without a subject: research is blocked and the outline is a skeleton. Every claim below is a slot to fill, not product copy.

**Runtime:** about 60s (the low end of the outline's 60–90s range, because the brief is "short and sharp")
**Rule:** one idea per beat. Cut any line that repeats the core claim.

## Slots

Fill these once. The slot names match the placeholder strings in the asset SVGs, so the copy and the cards change together.

| Slot | Asset placeholder it replaces |
|------|-------------------------------|
| `[PRODUCT NAME]` | "Product Name" (`title-card.svg`, `end-card.svg`) |
| `[TAGLINE]` | "One-line tagline goes here" (`title-card.svg`) |
| `[SPEAKER NAME]` | "Speaker Name" (`lower-third.svg`) |
| `[CALLOUT]` | "Role or feature callout" (`lower-third.svg`) |
| `[CTA URL]` | "Call to action: example.com" (`end-card.svg`) |
| `[LAUNCH DATE]` | "Launch date" (`end-card.svg`) |
| `[PAIN]` | none. The problem, in the viewer's words |
| `[STEP 1–3]` | none. The core flow, three steps at most |
| `[PROOF]` | none. One fact, number or demo taken from the research notes |
| `[OUTCOME]` | none. What the viewer gets, not a list of features |

## Script

| # | Time | Visual | Voiceover / on-screen text |
|---|------|--------|----------------------------|
| 1 | 0–6s | Close-up of the problem moment. **No asset.** Needs footage. | "[PAIN]." |
| 2 | 6–12s | `title-card.svg` | "Meet [PRODUCT NAME]. [TAGLINE]." |
| 3 | 12–40s | Screen recording of the flow, with `lower-third.svg` over it ([SPEAKER NAME], [CALLOUT]) | "[STEP 1]. [STEP 2]. [STEP 3]." On screen: "[PROOF]" |
| 4 | 40–50s | Result shot. **No asset.** Needs footage. | "[OUTCOME]." |
| 5 | 50–60s | `end-card.svg` | "[PRODUCT NAME]. Available [LAUNCH DATE]. [CTA URL]." |

## Notes for the Video stage

- **Blocked:** don't render a final cut while any slot is unfilled. Rendering a rough cut with the placeholders to check timing is fine.
- Beats 1 and 4 have no asset. They need footage or a new card.
- `[PROOF]` must come from the research notes. If the notes don't support a claim, cut the claim; don't soften it.
- Colours and fonts come from `assets/brand.json`, which also holds placeholders until the real brand arrives.
- **Fix at the source:** add a required `{{topic}}` variable to the pipeline and rerun from research.
