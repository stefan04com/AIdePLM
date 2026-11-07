# COORDINATION

Live task board for the team. Read it before you start, update it when you finish something.
Rules and architecture live in `CLAUDE.md` and `ARCHITECTURE.md`; this file only tracks **who does what next**.

**How to use it**
- Tick a box (`[x]`) in the same PR as the work, or in a one-line `docs:` PR right after.
- New task? Add it under the owner, with a short "done when". Blocked? Write `BLOCKED by <who>: <why>`.
- After the feature freeze (hour 8) only fixes go here; ideas go to "What's next" in the pitch.
- `main` is open: push or merge there as you like (team decision, 2026-11-07). Before you push, `git pull` first, and run the tests (`pytest -q`, `npm run build && npm run lint`) so `main` still runs the demo. Never force-push `main`.

Last updated: 2026-11-07 (Stefan)

## Status

| Area | State |
|---|---|
| Backend flow (fit → draft → reactions → referee → apply) | Done in demo mode; 123 tests pass; API flow (draft, reactions, comments, referee, apply, rejected trend) checked through the Vite proxy |
| Real LLM (Bedrock) | Live eval on final `main`: 3/3 conflict, 0 fallbacks, **$0.0566/run** (`qa/results/live_eval_20261107_122427.md`). Use `LLM_MODEL=eu.anthropic.claude-sonnet-4-6`; `anthropic.claude-sonnet-5-5` returns 403 on our Bedrock account |
| Rejected trend (fit says no) | Done: backend and "Try a risky trend" button |
| Slack | **Real**: incoming webhook (`SLACK_WEBHOOK_URL` in `.env`), posts on ship; `Run.slack` = posted / simulated / failed |
| Adobe / trends | Local simulations by team decision, no keys needed |
| Frontend | Builds and lints; not yet tested end to end in a real browser |
| Tag `v1.0.0-demo` | Not cut yet |

## Stefan: AI core, backend
- [x] Run `qa/live_eval.py` against the final `main`: 3/3 runs with a conflict, no canned fallback (2026-11-07 12:24).
- [x] Measured cost: **$0.0566 per post** (4 calls: fit, draft, reactions, referee; personas once, $0.17 total for 3 runs incl. personas). Prices $3 / $15 per Mtok set in `.env` (`LLM_PRICE_*`).
- [ ] After a clean rehearsal, cut `release/1.0.0` and tag `v1.0.0-demo` on `main`.

### Stefan: review against the judging criteria (2026-11-07, hackathon only)
Can break the demo (do first, in this order):
- [x] 1. Race in `add_comment` (`orchestrator.py:185`): a comment added while the referee runs is lost (status ends `REFEREED`, comment never refereed). Return 409 when `run.step` is set. Done when: a test covers it.
- [x] 2. Show when a fallback was used: add an optional `used_fallback` field (adding an optional field is allowed by the contract) so the UI can tell canned content from a real LLM answer in live mode. Done: `Run.fallback_calls`, "CANNED: …" in the run line.
- [ ] 3. (API flow checked via the Vite proxy; still needs a human click-through) Browser e2e with `VITE_USE_MOCKS=false` (draft, comments, referee, apply). Same item as Andu's above; Stefan checks it too.
- [ ] 4. 3 clean rehearsals on the presentation laptop, including the rejected-trend beat, plus the backup video (with Anda).
- [ ] 5. Before the tag: commit or revert the modified `frontend/package-lock.json`, then cut `release/1.0.0` and tag `v1.0.0-demo`.

Can cost points:
- [ ] 6. Third-party (15%) is the weakest criterion: only Slack is real. In the pitch, say what is real and what is simulated; present Adobe as "integration-ready" (`adobe.py` is the seam). A real Firefly/Reddit call goes to "What's next" (feature freeze).
- [ ] 7. Demo mode is canned content (0 tokens). In the pitch, show `qa/results/live_eval_*.md` and `logs/usage.jsonl` as proof that the AI is real and measured.
- [ ] 8. Cost bonus (+10): put $0.0566 per post next to "about 2 hours vs 8 days" on the slide (with Anda).
- [x] 9. The image never reaches the real Slack message: `ADOBE_MOCK_IMAGE_URL` is a relative path and `slack._is_web_url` rejects it (the UI preview shows it). Fixed: set `PUBLIC_BASE_URL` (an https URL where the frontend is reachable) in `.env`; without it the image is left out.

Cleanup:
- [x] 10. Docs out of sync: the test count here (106, now 119) and `docs/qa-report.md` still lists the rejected-trend button as "Left".

Not now, put in "What's next" in the pitch: CI, `MAX_TOKENS` (2048) cutting the referee JSON, file write under the lock in `store.mutate`, `_guarded` not stopping timed-out threads, the retry time budget (up to ~30s), auth on `/admin/demo-mode`, a real Adobe call.

## Andu: frontend
- [x] "Try another trend" button: `GET /trend?which=rejected`, then `POST /runs`; show `run.fit.reason` on `REJECTED`. Done by Ada on `feature/ada-friendly-adobe-theme` ("Try a risky trend", key B, brand-safety shield).
- [ ] Test the full flow in a real browser with `VITE_USE_MOCKS=false` in `frontend/.env.local` (draft, comments, referee, apply).
- [ ] Check the `needs_human` banner and that apply still works (it is allowed on purpose, see `ARCHITECTURE.md` §3).

## Militaru: integrations
- [x] Image in the Slack preview: the simulated preview now shows the post's image, the local placeholder included (no external image needed).
- [x] `ruff format` on the backend (`adobe.py`, `slack.py`, `test_adobe.py`, `test_llm_client.py`).
- [x] `ARCHITECTURE.md` §4.4–4.6, ADR-003 and §10 describe the local simulations.
- [x] Real Slack integration (Third-party integrations, 15%): webhook post on ship, preview fallback, UI label shows posted / not posted. Tested: a demo run posted to `#all-ai-de-plm-marketing-team`.
- [x] Real CC0 photo for the post (`frontend/public/visuals/`), and real trends from the web for the live mock (`data/live_trends.json`).
- [ ] Give the team the webhook URL privately (not in git) so every laptop posts to the same channel.

## Anda: data, demo script, pitch, QA
- [ ] Read the cost from `qa/results/live_eval_20261107_122427.md` (**$0.0566 per post**, 3 live runs on `eu.anthropic.claude-sonnet-4-6` at $3 / $15 per Mtok) and put it in the cost slide. No need to ask Stefan.
- [ ] Run the 3/3 rehearsal with `docs/demo-script.md`, including the rejected-trend beat. Done when: three clean runs in a row on the demo laptop.
- [ ] Record the backup video.
- [x] Update `docs/qa-report.md`: mark what is fixed, list what is left.
- [x] Check that `docs/demo-scenario.md` matches the canned content on `main`.
- [x] Replace "1h 50m" with the on-screen clock + "about two hours vs eight days" (README, demo script).

## Everyone
- [ ] No new features after the freeze; fixes only.
- [ ] Two full end-to-end rehearsals on the presentation laptop before the demo.

## Done
- [x] Adobee, the animated red robot bee: a header honeycomb fills with honey per step; the bee flies on an arc (pollen trail) to where the run is (fit gauge, post, comments, referee, Slack), rings the section, orbits on conflicts, bursts honey on ship; never covers the header or the ship bar (`frontend/src/components/Adobee.tsx`, `components/adobee/`, `lib/adobee.ts`, tests)
- [x] Live eval 3/3 and cost per post measured on the final `main` (2026-11-07)
- [x] `.env` model fixed to one the Bedrock account can use
- [x] `needs_human` can ship; a blank `final_caption` keeps the current caption (PR #13)
- [x] Second saved trend rejected by the fit check, backend side (PR #13)
- [x] Boabe canned demo content in `demo_cache.py`
- [x] Comment and review weighting (`docs/comment-weighting.md`)
- [x] AI cost panel in the UI
- [x] `adapters.py` Slack and trend bugs (hotfix)
