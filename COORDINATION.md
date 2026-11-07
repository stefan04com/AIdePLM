# COORDINATION

Live task board for the team. Read it before you start, update it when you finish something.
Rules and architecture live in `CLAUDE.md` and `ARCHITECTURE.md`; this file only tracks **who does what next**.

**How to use it**
- Tick a box (`[x]`) in the same commit as the work, or in a one-line `docs:` commit right after. Move finished items to "Done" when the list gets long.
- New task? Add it under the owner, with a short "done when". Blocked? Write `BLOCKED by <who>: <why>`.
- **Feature freeze is on:** only fixes go here; ideas go to "What's next" in the pitch.
- `main` is open: push or merge there as you like (team decision, 2026-11-07). Before you push, `git pull` first and run the tests (`pytest -q`, `npm run build && npm run lint && npm test`) so `main` still runs the demo. Never force-push `main`. Merge `main` back into `develop` after you push.

Last updated: 2026-11-07 (Andu)

## Status

| Area | State |
|---|---|
| Flow (fit → draft → reactions → comments → referee → apply → Slack) | **Done.** Backend 128 tests, frontend 20 tests, build and lint pass |
| Real LLM (Bedrock) | Live eval on `main`: 3/3 conflict, 0 fallbacks, **$0.0602 per post** (`qa/results/live_eval_20261107_142630.md`). Use `LLM_MODEL=eu.anthropic.claude-sonnet-4-6`; `anthropic.claude-sonnet-5-5` returns 403 on our account |
| Browser e2e, `VITE_USE_MOCKS=false` | **Done in Chromium** (`qa/e2e_browser.py`): 3/3 clean runs, no console or HTTP errors, risky trend rejected, `needs_human` banner shows and apply still ships. Run in demo mode |
| Slack | **Real** webhook on ship (`Run.slack` = posted / simulated / failed). Image: `SLACK_IMAGE_URL` or `PUBLIC_BASE_URL` (never localhost); a message rejected because of its image is retried once without it |
| Adobe / trends | Local simulations by team decision, no keys needed |
| Backup video | **Re-recorded 14:50:** `qa/results/moment-backup-demo.mp4` (72 s, no sound, demo mode): pumpkin latte photo, "Apply all & ship", 3 conflicts incl. **Brand vs Origin Seeker (synthetic customer)**, "37s vs 8 days", Slack, risky trend |
| Tag `v1.0.0-demo` | **Cut** on `main`; re-tag `v1.0.1-demo` after this fix commit if you want the tag to match the video |

## Next: Post / Rules layout, Trend score, regenerate, posting time (proposed 2026-11-07, Andu)

Big feature, after the freeze: work on `feature/<name>-...` branches and merge to `main` only when tests pass. **Keep Adobee (the bee) on every page.**
Read first: `docs/trending-research.md` (data sources and limits) and `docs/what-makes-a-post-popular.md` (rules per platform).

**Decisions needed before we start**
- [ ] Everyone: do we build this before the presentation or after? (`CLAUDE.md` says fixes only after hour 8.)
- [ ] Militaru + Stefan: **Google Trends has no public API** (official alpha is invite-only). Pick: apply for alpha access, or start with saved data behind the same endpoint and swap the source later. Every score must say "saved" or "live".
- [ ] Stefan + Andu: agree the contract first (new **optional** fields and endpoints only), in `ARCHITECTURE.md` §5/§6, before any code.

### Andu (frontend)
- [x] Two menus: **Post** and **Rules** (`?view=rules`, arrow keys, run kept in the URL); Adobee stays in the header on both.
- [ ] **Post** page: the post with its description in the middle; scoring framed on the left (Adobee stays); department reviews on the right.
- [ ] **Trend score** under the scoring: the post's keywords and how trending they are, plus suggestions that raise the "hype". Marked "saved" / "live".
- [ ] **Hashtag suggestions** in Post with an "add to post" button.
- [ ] **Edit + regenerate:** editable post text, a "Regenerate" button and a box to rephrase the prompt ("shorter, more playful"); keep versions so the tester can go back.
- [x] **Rules** page: scoring factors, comment weight, platform rules with their confidence tag, and the AI cost (`lib/rules.ts`). Anda: edit the texts there when the scoring rules are written.
- [ ] **Posting-time planner (UI):** choose the platform (Instagram, TikTok, X, LinkedIn); show the recommended time and why.
- [x] "UI UX Pro Max" skill installed in `.claude/skills/` (local Python search, no network). Still open: design pass on the new Post page, screenshots at 1600 px and below 1100 px.
- [x] **Firefly mock** (done on `feature/andu-firefly-mock`): "Generate with Firefly" shows the steps of a Firefly call, then two photos to pick from; the pick replaces the post visual. Simulated and labelled so. Real call goes in `hooks/useFirefly.ts`.

### Stefan (backend / AI)
- [ ] `POST /runs/{id}/regenerate` (edited text + new instruction). It is a 6th LLM call: needs the team decision from `CLAUDE.md`.
- [ ] Endpoint for the **Trend score** (words + hashtags in, score + suggestions out), with a saved-data fallback like the other calls.
- [ ] Endpoint for the **recommended posting time** (platform in, time + reason out), from the rules in `docs/what-makes-a-post-popular.md`.
- [ ] New fields in `models.py`: optional only, mirrored in `frontend/src/api/types.ts` and the mocks.

### Militaru (data sources)
- [x] Source for the Trend score: `docs/trend-score-sources.md` (access, cost, limits, risk; 16 sources).
    - Demo: saved data marked "saved". Live later: SerpApi Google Trends (`geo=RO`, free 250 searches/month, key in `.env`) + YouTube `mostPopular` RO.
    - Apply for the official Google Trends alpha. Skip pytrends (archived, scrapes against Google's Terms).
- [x] **Hashtag suggestions:** `data/hashtags.json` (12 topics, 53 tags, each with a source URL; trademarks and health tags excluded).
    - `backend/app/hashtags.py`: `suggest(keywords, platform, limit)` → `.model_dump()` for Stefan's endpoint; Boabe cap 3.
    - Instagram now allows **5 hashtags per post** (since 18 Dec 2025). The 30-per-7-days limit is the Graph API hashtag *search*.
- [x] Posting windows: `data/posting_windows.json` (7 platforms, Sprout/Buffer/Hootsuite/Metricool/Later 2025-26, confidence each; TikTok low).
    - `backend/app/posting_times.py`: `recommend(platform)` for the posting-time endpoint.
    - Differs from `docs/trending-research.md` §3 for Instagram, LinkedIn, Facebook: the JSON follows the verified reports.
- [ ] Replace the simulated Firefly photos in `frontend/public/visuals/` with real Firefly output if someone gets Adobe credentials (update `CREDITS.md`).

### Anda (data, content, QA)
- [ ] Write the **scoring rules** plainly (which factor gives how many points) so the Rules page can show them.
- [ ] Table of **posting times and hashtag limits** per platform, from the research docs, with a confidence tag.
- [ ] **Demo data**: saved keywords and hashtags for the Boabe trend.
- [ ] Update the demo script and pitch for the two menus, the Firefly button and the regenerate step.

## Open

### Everyone
- [ ] 3 clean rehearsals in a row **on Stefan's laptop** (the presentation machine) with `docs/demo-script.md`, including the risky-trend beat and the referee live (`LIVE_IN_DEMO=referee`). Before each: `python qa/e2e_browser.py rehearsal` must exit 0.

### Stefan
- [x] Persona conflict now shows up live: the referee prompt compares every persona reaction with the human demands, and `qa/live_eval.py` checks it. Eval 14:26: **human-vs-persona conflict 3/3**, conflicts backed by the persona's own reaction, $0.0602 per post (`qa/results/live_eval_20261107_142630.md`).
- [x] Referee live on stage: `LIVE_IN_DEMO=referee` in Stefan's `.env`. Demo mode stays on for the rest and is the automatic fallback if the LLM fails. Typed comments now change the answer (~22 s, ~$0.06).
- [x] Tag `v1.0.0-demo` cut on `main`; `frontend/package-lock.json` is clean. (If a rehearsal finds a bug: fix on `main`, tag `v1.0.1-demo`.)
- [ ] Pitch, with Anda: say what is real (LLM, Slack) and what is simulated (Adobe, trends; `adobe.py` is the integration seam). Show `qa/results/live_eval_*.md` as proof the AI is real and measured, since demo mode answers from the cache.

### Andu
- [x] "Accept compromise" removed: the per-conflict buttons did nothing (the backend ships the Referee's full `final_caption`), so cards now say "Applied when you ship" and the button reads **"Apply all & ship"** (`qa/e2e_browser.py` and `docs/demo-script.md` updated).
- [x] Cost panel in demo mode shows the measured **$0.0602 per post** labelled "Measured in live eval". The estimate from live calls is used only when all 4 call types were live (with `LIVE_IN_DEMO=referee` one live call would show a wrong $0.03).
- [ ] One human click-through on Stefan's laptop on the projector (readability, colours, bee, sound). `frontend/.env.local` with `VITE_USE_MOCKS=false` is set there.
- [x] Ship screen shows "37s vs 8 days for a typical review" instead of the multiplier.

### Militaru
- [x] **Replaced the laptop photo** with a pumpkin latte in a pumpkin mug (`frontend/public/visuals/boabe-pumpkin-latte.jpg`; license to confirm, `CREDITS.md`).
    - `ADOBE_MOCK_IMAGE_URL=/visuals/boabe-pumpkin-latte.jpg`, default in `.env.example`.
- [ ] Only if there's time and the team agrees (it's after the freeze): one real third integration, a live Reddit/news fetch in `trends.py` (fallback already there) or a Firefly call in `adobe.generate_visual()` if someone gets Adobe Developer credentials. Otherwise leave it in "What's next".
- [x] Webhook URL: only needed on Stefan's laptop (the demo machine); it is in his `.env`, not in git.
- [x] `SLACK_IMAGE_URL` set to the public GitHub raw copy of the post photo (default in `.env.example`, so every laptop gets it).
- [x] **Visual after review:** on apply, post v2 switches to `boabe-pumpkin-latte-revised.jpg` (`ADOBE_MOCK_REVISED_IMAGE_URL`, `adobe.revised_visual`).
    - The Slack message shows the same image (`SLACK_IMAGE_URL`, public GitHub raw URL).
    - **That photo has a dreamstime.com watermark: replace it with a licensed image before the demo** (`CREDITS.md`).

### Anda
- [ ] Pitch: say "37 s vs 8 days" rather than the multiplier, and state plainly what is real (LLM, Slack) and what is simulated (Adobe, trends).
- [ ] Cost slide: **$0.0602 per post** (4 LLM calls, ~22 s of model time) next to "a review takes 8 days and 3+ versions" (Filestage, vendor-reported). If you add hours saved × hourly cost, label it as an assumption.

## Not now (put in "What's next" in the pitch)

CI, `MAX_TOKENS` (2048) possibly cutting the referee JSON, file write under the lock in `store.mutate`, `_guarded` not stopping timed-out threads, the retry time budget (up to ~30 s), auth on `/admin/demo-mode`, a real Adobe Express post (open/update in Express).

## Done

- [x] Demo fallback tells the same story as live (14:50): the canned referee has a third conflict, **Brand vs the coffee-curious persona**, and the final caption names the house espresso; the Analysis panel shows the measured $0.0602 instead of "not measured yet"; `qa/e2e_browser.py` checks that a synthetic customer is in a conflict (10/10 checks pass).
- [x] Stefan's laptop configured for the demo: `.env` has `DEMO_MODE=1`, `LIVE_IN_DEMO=referee`, the webhook, `ADOBE_MOCK_IMAGE_URL` and `SLACK_IMAGE_URL` (pumpkin latte); `frontend/.env.local` has `VITE_USE_MOCKS=false`.
- [x] Browser e2e with `VITE_USE_MOCKS=false`, `needs_human` banner check, backup video, `qa/e2e_browser.py` (2026-11-07 14:00)
- [x] Slack: time in seconds under a minute ("37s", not "0m") in the message and the preview; `SLACK_IMAGE_URL`; retry without the image on HTTP 400; "Shipped" banner follows the real delivery
- [x] Real Slack integration: webhook post on ship, preview fallback, UI label posted / not posted (tested in `#all-ai-de-plm-marketing-team`); Slack gets the reviewed post and tasks, nothing before apply
- [x] Race fixed: comments are refused (409) while a step runs; canned fallbacks are visible (`Run.fallback_calls`, "CANNED: …")
- [x] Rejected trend: backend and "Try a risky trend" button (key B), brand-safety shield
- [x] Live eval 3/3 and cost per post measured on `main`; `.env` model fixed to one our Bedrock account can use
- [x] `needs_human` can ship; a blank `final_caption` keeps the current caption
- [x] Adobee, the animated red robot bee; presenter mode, intro, ship celebration, sound
- [x] Real CC0 photo for the post; real trends from the web for the live mock (`data/live_trends.json`)
- [x] Boabe canned demo content; comment and review weighting; AI cost panel
- [x] Docs in sync: QA report, demo scenario, "about two hours vs eight days" instead of "1h 50m"
