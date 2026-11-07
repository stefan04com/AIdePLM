# COORDINATION

Live task board for the team. Read it before you start, update it when you finish something.
Rules and architecture live in `CLAUDE.md` and `ARCHITECTURE.md`; this file only tracks **who does what next**.

**How to use it**
- Tick a box (`[x]`) in the same commit as the work, or in a one-line `docs:` commit right after. Move finished items to "Done" when the list gets long.
- New task? Add it under the owner, with a short "done when". Blocked? Write `BLOCKED by <who>: <why>`.
- **Feature freeze is on:** only fixes go here; ideas go to "What's next" in the pitch.
- `main` is open: push or merge there as you like (team decision, 2026-11-07). Before you push, `git pull` first and run the tests (`pytest -q`, `npm run build && npm run lint && npm test`) so `main` still runs the demo. Never force-push `main`. Merge `main` back into `develop` after you push.

Last updated: 2026-11-07 14:20 (Stefan)

## Status

| Area | State |
|---|---|
| Flow (fit → draft → reactions → comments → referee → apply → Slack) | **Done.** Backend 128 tests, frontend 20 tests, build and lint pass |
| Real LLM (Bedrock) | Live eval on `main`: 3/3 conflict, 0 fallbacks, **$0.0602 per post** (`qa/results/live_eval_20261107_142630.md`). Use `LLM_MODEL=eu.anthropic.claude-sonnet-4-6`; `anthropic.claude-sonnet-5-5` returns 403 on our account |
| Browser e2e, `VITE_USE_MOCKS=false` | **Done in Chromium** (`qa/e2e_browser.py`): 3/3 clean runs, no console or HTTP errors, risky trend rejected, `needs_human` banner shows and apply still ships. Run in demo mode |
| Slack | **Real** webhook on ship (`Run.slack` = posted / simulated / failed). Image: `SLACK_IMAGE_URL` or `PUBLIC_BASE_URL` (never localhost); a message rejected because of its image is retried once without it |
| Adobe / trends | Local simulations by team decision, no keys needed |
| Backup video | **Done:** `qa/results/moment-backup-demo.mp4` (72 s, no sound, demo mode) |
| Tag `v1.0.0-demo` | **Cut** on `main` (see `git tag -n`); rehearsals on the presentation laptop still open |

## Open

### Everyone
- [ ] 3 clean rehearsals in a row on the **presentation laptop** with `docs/demo-script.md`, including the risky-trend beat. At least one with demo mode **off**, so the referee answers the comments typed live. Before each: `python qa/e2e_browser.py rehearsal` must exit 0.

### Stefan
- [x] Persona conflict now shows up live: the referee prompt compares every persona reaction with the human demands, and `qa/live_eval.py` checks it. Eval 14:26: **human-vs-persona conflict 3/3**, conflicts backed by the persona's own reaction, $0.0602 per post (`qa/results/live_eval_20261107_142630.md`).
- [x] Referee live on stage: set `LIVE_IN_DEMO=referee` (already in Stefan's `.env`; add it to every laptop). Demo mode stays on for the rest and is the automatic fallback if the LLM fails. Typed comments now change the answer (~22 s, ~$0.06). **Still open:** one full rehearsal with it on.
- [x] Tag `v1.0.0-demo` cut on `main`; `frontend/package-lock.json` is clean. (If a rehearsal finds a bug: fix on `main`, tag `v1.0.1-demo`.)
- [ ] Pitch, with Anda: say what is real (LLM, Slack) and what is simulated (Adobe, trends; `adobe.py` is the integration seam). Show `qa/results/live_eval_*.md` as proof the AI is real and measured, since demo mode answers from the cache.

### Andu
- [x] "Accept compromise" removed: the per-conflict buttons did nothing (the backend ships the Referee's full `final_caption`), so cards now say "Applied when you ship" and the button reads **"Apply all & ship"** (`qa/e2e_browser.py` and `docs/demo-script.md` updated).
- [x] Cost panel in demo mode shows the measured **$0.0602 per post** labelled "Measured in live eval". The estimate from live calls is used only when all 4 call types were live (with `LIVE_IN_DEMO=referee` one live call would show a wrong $0.03).
- [ ] One human click-through on the presentation laptop with `VITE_USE_MOCKS=false` in `frontend/.env.local` (the automated run can't judge how it looks on the projector).
- [x] Ship screen shows "37s vs 8 days for a typical review" instead of the multiplier.

### Militaru
- [x] **Replaced the laptop photo** with a CC0 latte on a café table (`frontend/public/visuals/boabe-latte.jpg`, Matt Hoffman, `CREDITS.md`). `ADOBE_MOCK_IMAGE_URL=/visuals/boabe-latte.jpg`; `SLACK_IMAGE_URL` points at the same image on Wikimedia (public https), both defaults in `.env.example`. Tested: post shows it, a demo run posted to Slack with no image retry.
- [ ] Only if there's time and the team agrees (it's after the freeze): one real third integration, a live Reddit/news fetch in `trends.py` (fallback already there) or a Firefly call in `adobe.generate_visual()` if someone gets Adobe Developer credentials. Otherwise leave it in "What's next".
- [ ] Give the team the webhook URL privately (not in git), so every laptop posts to the same channel.
- [x] `SLACK_IMAGE_URL` set to the public Wikimedia copy of the post photo (default in `.env.example`, so every laptop gets it).

### Anda
- [ ] Pitch: say "37 s vs 8 days" rather than the multiplier, and state plainly what is real (LLM, Slack) and what is simulated (Adobe, trends).
- [ ] Cost slide: **$0.0602 per post** (4 LLM calls, ~22 s of model time) next to "a review takes 8 days and 3+ versions" (Filestage, vendor-reported). If you add hours saved × hourly cost, label it as an assumption.

## Not now (put in "What's next" in the pitch)

CI, `MAX_TOKENS` (2048) possibly cutting the referee JSON, file write under the lock in `store.mutate`, `_guarded` not stopping timed-out threads, the retry time budget (up to ~30 s), auth on `/admin/demo-mode`, a real Adobe Express post (open/update in Express).

## Done

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
