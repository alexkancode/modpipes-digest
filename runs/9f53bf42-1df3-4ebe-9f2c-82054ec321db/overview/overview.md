# Overview: Instideck ChatGPT ads run

Date: 2026-11-06 · Run 9f53bf42-1df3-4ebe-9f2c-82054ec321db

## What was produced

- **Guided page:** `stages/page/outputs/page/index.html`, with creative cards `c1.png` to `c5.png` alongside it. Seven steps (`step-1` to `step-7`), copy buttons, source links and a checklist. Open the file directly for the unsandboxed version.
- **Ad plan:** `stages/ad-plan/outputs/plan.md`. One channel (ChatGPT ads), two-week test, $25/day, $350 hard cap, United States, desktop_web only.
- **Creatives:** `stages/copywriter/outputs/creatives.json`, five single-image ads (c1 to c5).

## Fit verdict

Test small: run a capped two-week ChatGPT ads test at $25/day ($350 maximum), and get tracking working before the first dollar is spent.
Expect weak conversion and a loss on the test, so judge it on cost per signup, not profit, and move the money to a public how-to page if the kill rule is hit.

Positioning holds: the repo contains every promise the ads make ("Any Drive folder, instantly a slideshow", HEIC support, Ken Burns, "No AI ever sees your photos", photos streamed from Google to the browser). The positioning variable was empty, so product-read used the repo's own promise.

## Creatives

| id | headline | body |
|---|---|---|
| c1 | Drive folder? Hit play. | Any Drive folder becomes a fullscreen slideshow. |
| c2 | Skip the Slides import | Play photos straight from Drive. No deck needed. |
| c3 | Party photos on the TV | Loop the guests' Drive folder fullscreen. |
| c4 | Lobby screen, one folder | Loop a private Drive folder on any screen. |
| c5 | Photos stay in Drive | They stream to your browser. No AI sees them. |

## Check and critic results

| Gate | Result |
|---|---|
| page-check | ok: true. All 23 checks passed in direct and sandbox modes, plus links-alive (24 of 24 links alive; 403 answers are walled, not dead). |
| page-critic | ship: true, score: 87, blockers: none after round 2. |

Left after the last round (non-blocking, from the critic):
- Step 1 holds the long rerun command in a code block. Collapse it so readers reach the product statement sooner.
- Step 4 keeps the cost table collapsed. Surface the expected cost per signup in one line.
- On mobile (390x844), a blank band sits above the step label because of the sticky header.
- Not tested: the sandboxed-frame fallbacks (localStorage, clipboard, target=_blank).

Gaps the checks do not cover:
- **Two target-URL schemes disagree.** `creatives.json` points each ad at `https://instideck.com/?utm_...&utm_content=cN`. The plan's section 5 says to set `target_url` to `https://instideck.com/chatgpt`, with the UTM template set at campaign level. Pick one before upload.
- **c5 is tagged ad group F** (privacy). The plan folds F into group A, so c5 belongs under A.
- **No tracking exists.** The repo has no OpenAI pixel and no `oaiq` reference. The plan's pixel script URL answered 404 to a bare curl on 2026-11-06, so copy the exact snippet from Ads Manager instead of typing it.
- **`facts.json` was not among the inputs.** The page-check length checks passed against it, but this overview did not read it directly.

## What to do next

1. Choose one target-URL scheme (the plan's `/chatgpt` path is the one that gives a clean count), then rebuild each ad's `targetUrl` to match before upload.
2. Sign up at ads.openai.com and start verification (5 to 15 business days). While it runs, update the privacy copy and footer first, then add the Pixel and fire `registration_completed` on Google sign-in.
3. Build the campaign `instideck-test-2026-11`: US, desktop_web, clicks bidding at a $0.50 max, $25/day. Launch groups A to C with c1 to c5 (c5 under A). Create groups D and E but leave them paused.
4. Submit for review. Day 0 is the approval date. Check tracking on Day 3 and make the decision on Day 14.
5. Test the sandbox fallbacks (localStorage, clipboard, target=_blank) in a real browser, since the critic did not test them.

## How to rerun with a corrected positioning

```
/usr/bin/node --no-warnings=ExperimentalWarning /home/alex/Desktop/dev/modpipes/dist/cli/src/main.js start b9afa7ec-8375-40a9-bb31-cd7aefffa6cf --var repo-path=/home/alex/Desktop/dev/dirslides-correct --var positioning="<one sentence>"
```

Replace `<one sentence>` with your positioning, for example: `A private lobby-screen slideshow for small businesses that runs from a Google Drive folder`.
