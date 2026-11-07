# COORDINATION

Live task board for the team. Read it before you start, update it when you finish something.
Rules and architecture live in `CLAUDE.md` and `ARCHITECTURE.md`; this file only tracks **who does what next**.

**How to use it**
- Tick a box (`[x]`) in the same PR as the work, or in a one-line `docs:` PR right after.
- New task? Add it under the owner, with a short "done when". Blocked? Write `BLOCKED by <who>: <why>`.
- After the feature freeze (hour 8) only fixes go here; ideas go to "What's next" in the pitch.
- `main` is open: push or merge there as you like (team decision, 2026-11-07). Before you push, `git pull` first, and run the tests (`pytest -q`, `npm run build && npm run lint`) so `main` still runs the demo. Never force-push `main`.

Last updated: 2026-11-07 12:30 (Stefan)

## Status

| Area | State |
|---|---|
| Backend flow (fit → draft → reactions → referee → apply) | Done in demo mode; 106 tests pass |
| Real LLM (Bedrock) | Live eval on final `main`: 3/3 conflict, 0 fallbacks, **$0.0566/run** (`qa/results/live_eval_20261107_122427.md`). Use `LLM_MODEL=eu.anthropic.claude-sonnet-4-6`; `anthropic.claude-sonnet-5-5` returns 403 on our Bedrock account |
| Rejected trend (fit says no) | Backend done (`GET /trend?which=rejected`); UI button pending |
| Adobe / Slack / trends | Local simulations by team decision, no keys needed |
| Frontend | Builds and lints; not yet tested end to end in a real browser |
| Tag `v1.0.0-demo` | Not cut yet |

## Stefan: AI core, backend
- [x] Run `qa/live_eval.py` against the final `main`: 3/3 runs with a conflict, no canned fallback (2026-11-07 12:24).
- [x] Measured cost: **$0.0566 per post** (4 calls: fit, draft, reactions, referee; personas once, $0.17 total for 3 runs incl. personas). Prices $3 / $15 per Mtok set in `.env` (`LLM_PRICE_*`).
- [ ] After a clean rehearsal, cut `release/1.0.0` and tag `v1.0.0-demo` on `main`.

## Andu: frontend
- [ ] "Try another trend" button: `GET /trend?which=rejected`, then `POST /runs`; show `run.fit.reason` on `REJECTED`. Backend is ready (`docs/rejected-trend.md`).
- [ ] Test the full flow in a real browser with `VITE_USE_MOCKS=false` in `frontend/.env.local` (draft, comments, referee, apply).
- [ ] Check the `needs_human` banner and that apply still works (it is allowed on purpose, see `ARCHITECTURE.md` §3).

## Militaru: integrations
- [x] Image in the Slack preview: the simulated preview now shows the post's image, the local placeholder included (no external image needed).
- [x] `ruff format` on the backend (`adobe.py`, `slack.py`, `test_adobe.py`, `test_llm_client.py`).
- [x] `ARCHITECTURE.md` §4.4–4.6, ADR-003 and §10 describe the local simulations.

## Anda: data, demo script, pitch, QA
- [ ] Read the cost from `qa/results/live_eval_20261107_122427.md` (**$0.0566 per post**, 3 live runs on `eu.anthropic.claude-sonnet-4-6` at $3 / $15 per Mtok) and put it in the cost slide. No need to ask Stefan.
- [ ] Run the 3/3 rehearsal with `docs/demo-script.md`, including the rejected-trend beat. Done when: three clean runs in a row on the demo laptop.
- [ ] Record the backup video.
- [ ] Update `docs/qa-report.md`: mark what is fixed, list what is left.
- [ ] Check that `docs/demo-scenario.md` matches the canned content on `main`.

## Everyone
- [ ] No new features after the freeze; fixes only.
- [ ] Two full end-to-end rehearsals on the presentation laptop before the demo.

## Done
- [x] Live eval 3/3 and cost per post measured on the final `main` (2026-11-07)
- [x] `.env` model fixed to one the Bedrock account can use
- [x] `needs_human` can ship; a blank `final_caption` keeps the current caption (PR #13)
- [x] Second saved trend rejected by the fit check, backend side (PR #13)
- [x] Boabe canned demo content in `demo_cache.py`
- [x] Comment and review weighting (`docs/comment-weighting.md`)
- [x] AI cost panel in the UI
- [x] `adapters.py` Slack and trend bugs (hotfix)
