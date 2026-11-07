# bookrender ChatGPT ads: run overview

Date: 2026-11-06. Positioning used: "Turn any long PDF into a narrated audiobook you can play offline." Repo: `/home/alex/Desktop/dev/bookrender`.

## What was produced

1. **Guided page: `stages/page/outputs/page/index.html`** (7 steps, with the five creative cards `c1.png` to `c5.png` alongside it). It is a checklist-style guide to the ChatGPT ads test, with copy buttons and sources. It is not an ad and does not spend anything.
2. **Ad plan: `stages/ad-plan/outputs/plan.md`**, with budget, tracking, setup and kill criteria.
3. **Creatives: `stages/copywriter/outputs/creatives.json`** (c1 to c5, with image briefs).

## Fit verdict

- **Do not advertise yet.** The repo is a 3D book-club web app (Lap Book Viewer). It has no PDF, text-to-speech, audio or offline code, and no live URL, so the promise in the positioning is not in the product.
- **Spend nothing until** the feature ships, the site has a public HTTPS URL with a `/listen` route, and tracking fires. Then run the two-ad-group test (A and C) at 25 USD/day for 4 days, capped at 120 USD.

## Creatives

| id | headline | body |
|---|---|---|
| c1 | Your PDF, read aloud | Turn a 300-page PDF into one audiobook file. |
| c2 | Read on your commute | Hear long papers and reports with hands busy. |
| c3 | PDF audio, no wifi | Download narrated PDFs for flights and tunnels. |
| c4 | Rest your eyes, keep up | Listen to your study PDFs as narrated audio. |
| c5 | Long PDFs, as audiobooks | An offline audiobook option for your own PDFs. |

Only c1 (ad group A) and c3 (ad group C) run in the 120 USD test. c2, c4 and c5 are parked with their groups. All five have `targetUrl: null`, so none can be submitted until a live URL exists. Every creative describes the PDF-to-audio feature that the repo does not yet have.

## Check and critic results

**page-check: ok = true.** All checks passed at 390x844 and 1440x900, in both direct and framed modes:
- Steps navigate (next button and arrow keys), reaching all 7 steps.
- 20 copy buttons present.
- Five images at 1024 px.
- Headline and body lengths within the checker's limits.
- No horizontal overflow.
- Zero axe violations.
- Official sources cited for creatives, setup and tracking.
- Checklist state survives reload.
- No page, console or failed-request errors.

Links: 26 checked, 0 dead. 19 returned 200 and 7 returned 403 (walled but alive: openai.com/index/testing-ads-in-chatgpt, searchengineland, alternativeto, mediapost, help.openai.com daily-budgets, openai.com 26-countries, help.openai.com creating-campaigns).

**page-critic: ship = true, score = 86, blockers = none** after round 2. Open notes, none blocking:
- Each step fades in over 0.35 s, so a screenshot taken at load can catch near-invisible text. Honouring `prefers-reduced-motion` or starting at opacity 1 would fix it.
- Step 5 is one long checklist. A visible done-count would help.
- The sandboxed-viewer fallbacks (no localStorage, no clipboard, blocked `target=_blank`) were not separately tested in round 2. Page-check's framed-mode run passed, but that run did not exercise these three fallbacks in isolation.

`ship = true` applies to the page. It does not clear the ad copy, which the plan blocks until the product ships.

## What to do next

1. **Settle the positioning.** Either build and deploy the PDF-to-audio feature (in this repo, or in the repo that holds it), or rerun with a positioning that matches what the repo ships.
2. **Deploy.** Build `web/Dockerfile` and `api/Dockerfile` with Postgres, set the Google OAuth variables to the public domain, and put TLS in front. Confirm `/listen` resolves.
3. **Add tracking.** Install the oaiq Pixel on every page, fire the sign-up event with a shared `event_id`, post the same event from the server, and record UTMs.
4. **Set up ads.openai.com.** Start verification as soon as the domain is live (5 to 15 business days). Fill `targetUrl` for c1 and c3, use the copy as written, and submit for review. Record the approval date as day 0.
5. **Fund the test.** 25 USD/day for 4 days, 120 USD total, cap-pause at 110 USD. Review on day 14 with the kill criteria in plan section 7.

## Rerun with corrected positioning

If the product read is wrong (for example, the PDF feature lives in another repo), run:

```
/usr/bin/node --no-warnings=ExperimentalWarning /home/alex/Desktop/dev/modpipes/dist/cli/src/main.js start b9afa7ec-8375-40a9-bb31-cd7aefffa6cf --var repo-path=/home/alex/Desktop/dev/bookrender --var positioning="<one sentence describing what the product does>"
```

Replace `<one sentence describing what the product does>` with one sentence that matches the shipped feature. Use `--var repo-path=<path>` to point at a different repo.
