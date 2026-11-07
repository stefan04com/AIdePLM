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
| Real LLM (Bedrock) | Live eval on `main`: 3/3 conflict, 0 fallbacks, **$0.0566 per post** (`qa/results/live_eval_20261107_122427.md`). Use `LLM_MODEL=eu.anthropic.claude-sonnet-4-6`; `anthropic.claude-sonnet-5-5` returns 403 on our account |
| Browser e2e, `VITE_USE_MOCKS=false` | **Done in Chromium** (`qa/e2e_browser.py`): 3/3 clean runs, no console or HTTP errors, risky trend rejected, `needs_human` banner shows and apply still ships. Run in demo mode |
| Slack | **Real** webhook on ship (`Run.slack` = posted / simulated / failed). Image: `SLACK_IMAGE_URL` or `PUBLIC_BASE_URL` (never localhost); a message rejected because of its image is retried once without it |
| Adobe / trends | Local simulations by team decision, no keys needed |
| Backup video | **Done:** `qa/results/moment-backup-demo.mp4` (72 s, no sound, demo mode) |
| Tag `v1.0.0-demo` | Not cut yet: after the rehearsals |

## Open

### Everyone
- [ ] 3 clean rehearsals in a row on the **presentation laptop** with `docs/demo-script.md`, including the risky-trend beat. At least one with demo mode **off**, so the referee answers the comments typed live. Before each: `python qa/e2e_browser.py rehearsal` must exit 0.

### Stefan
- [ ] Push the board update: `git push origin main develop`.
- [ ] **Persona conflict never shows up live** (AI 25%): all 6 live runs gave only human-vs-human conflicts, but the README promises customers at the review table. Make one persona clearly push back on a human demand (e.g. Origin Seeker vs Product's "latte as the hero"), add "≥1 human-vs-persona conflict" to `qa/live_eval.py`. Done when: 3/3 live runs show a persona on a conflict card.
- [ ] **Referee live on stage:** in demo mode the referee answer is canned, so comments the judges type don't change it. Run at least the referee step with demo mode off (~$0.06, ~22 s); keep demo mode only as the automatic fallback. Done when: one rehearsal passes live.
- [ ] After the rehearsals: commit or revert the modified `frontend/package-lock.json`, cut `release/1.0.0`, tag `v1.0.0-demo` on `main`, merge back into `develop`.
- [ ] Pitch, with Anda: say what is real (LLM, Slack) and what is simulated (Adobe, trends; `adobe.py` is the integration seam). Show `qa/results/live_eval_*.md` as proof the AI is real and measured, since demo mode answers from the cache.

### Andu
- [ ] **"Accept compromise" doesn't change what ships:** `apply()` checks the `conflict_ids` but never uses them; it always ships the referee's full `final_caption`. Quick fix: rename the button "Apply all & ship" and drop or relabel the per-conflict "Accept" buttons (with Stefan if the backend should use them). Done when: the UI doesn't promise a choice it doesn't make.
- [ ] **Cost panel shows "n/a" in demo mode:** show the measured **$0.0566 per post** (from the live eval) when there are no live calls, labelled "measured in live eval".
- [ ] One human click-through on the presentation laptop with `VITE_USE_MOCKS=false` in `frontend/.env.local` (the automated run can't judge how it looks on the projector).
- [ ] Consider showing only "37s vs 8 days" on the ship screen instead of "18,893× faster": on a run of a few seconds the multiplier looks inflated.

### Militaru
- [x] **Replaced the laptop photo** with a CC0 latte on a café table (`frontend/public/visuals/boabe-latte.jpg`, Matt Hoffman, `CREDITS.md`). `ADOBE_MOCK_IMAGE_URL=/visuals/boabe-latte.jpg`; `SLACK_IMAGE_URL` points at the same image on Wikimedia (public https), both defaults in `.env.example`. Tested: post shows it, a demo run posted to Slack with no image retry.
- [ ] Only if there's time and the team agrees (it's after the freeze): one real third integration, a live Reddit/news fetch in `trends.py` (fallback already there) or a Firefly call in `adobe.generate_visual()` if someone gets Adobe Developer credentials. Otherwise leave it in "What's next".
- [ ] Give the team the webhook URL privately (not in git), so every laptop posts to the same channel.
- [x] `SLACK_IMAGE_URL` set to the public Wikimedia copy of the post photo (default in `.env.example`, so every laptop gets it).

### Anda
- [ ] Pitch: say "37 s vs 8 days" rather than the multiplier, and state plainly what is real (LLM, Slack) and what is simulated (Adobe, trends).
- [ ] Cost slide: **$0.0566 per post** (4 LLM calls, ~22 s of model time) next to "a review takes 8 days and 3+ versions" (Filestage, vendor-reported). If you add hours saved × hourly cost, label it as an assumption.

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
