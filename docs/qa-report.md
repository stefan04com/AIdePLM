# QA report, 2026-11-07

Two bugs in `backend/app/adapters.py` broke Slack and the live trend; **both fixed in `hotfix/adapters-trend-slack`** with `backend/tests/test_adapters.py`. Everything else is minor. Checked against `develop` at `5ca6d6e`, `feature/andu-skeleton` (PR #6) and `feature/militaru-adobe-integration`, each merged with `develop` locally. Nothing was pushed to those branches.

## Blocked the demo (fixed)

| # | Owner | Where | Problem | Fix |
|---|---|---|---|---|
| 1 | Stefan | `backend/app/adapters.py:163-169` | `send_to_slack` calls `mod.SlackTask` (doesn't exist) and passes `demo_mode=` / `timeout_s=`, which `slack.send_final_post` doesn't take. It raises, `_guarded` swallows it, nothing is sent. | `mod.send_final_post(draft.caption, draft.image_url, tasks, elapsed)` with `models.Task` list; read `.sent` |
| 2 | Stefan | `backend/app/adapters.py:101` | `asdict()` on the Pydantic `Trend` that `trends.get_trend()` returns raises `TypeError`, so `_fallback_trend` is always used: the saved trend still showed, but `live=True` never reached `trends.py`. | `return mod.get_trend(live=live)` |

All 69 tests passed with both bugs. `test_adapters.py` now fails on each of them.

## Should fix

| # | Owner | Where | Problem | Fix |
|---|---|---|---|---|
| 3 | Stefan | `backend/app/orchestrator.py:227-245` | `apply()` ignores `referee.status`; a `needs_human` result still ships. | Decide: block apply unless an override is sent, or allow and warn in the UI. Add it to the state machine in `ARCHITECTURE.md` §3. |
| 4 | Andu | `frontend/src/mocks/scriptedComments.ts:9` | "Fill scripted comments" posts the mock's #FirstSipFace comments, also in real mode. | Use the text from `data/demo_comments.json`. |
| 5 | Andu | `frontend/src/mocks/` | Mocks are on #FirstSipFace; the demo is Boabe cozy autumn (`docs/demo-scenario.md`). | Update mocks; demo runs with `VITE_USE_MOCKS=false`. |
| 6 | Stefan | `backend/app/demo_cache.py` | Canned draft, personas and referee are still the transit app. Demo mode would show the wrong story. | Align with `docs/demo-scenario.md`. |
| 7 | Militaru | `backend/app/slack.py` | Pure mock: returns `sent=True` without posting. | Real webhook before the demo, or the pitch says Slack is simulated. |
| 8 | Militaru | `slack.py:~99-107` | Default image is a `data:` URL, which Slack can't show. | Set `ADOBE_MOCK_IMAGE_URL` to an https image. |
| 9 | Militaru | `.env.example` | Merge conflict with `develop` (both appended lines). | Keep both blocks. |

## Minor

- `frontend/src/api/types.ts:~118`: `ApplyRequest.accept_all_edits` is required in TS, optional in the backend. Harmless.
- `frontend/src/App.tsx:44-46`: `startRun` refreshes with a stale `runId`; the next poll fixes it.
- `adapters.py`: `Draft.version` never takes `post.version` from Express; the orchestrator bumps it anyway.
- `CLAUDE.md` still lists `SLACK_WEBHOOK_URL` and `ADOBE_*` as required although both modules are mocks.

## What passed

- Frontend (PR #6): `npm run build` and `npm run lint` clean; `types.ts` matches `models.py` on every model; the whole flow works through the Vite proxy against the real backend in demo mode.
- Integrations branch: merges with `develop` with one trivial conflict; 69 tests and `ruff` pass; Adobe adapter signatures match; every external call has a 15s timeout; Express and Slack are only touched in `apply`; no secrets in the tree.
- `trends.load_saved_trend()` parses the Boabe `data/demo_trend.json`.

## Not tested yet

- A run with the real LLM: does the conflict appear 3/3 with `data/demo_comments.json`? `qa/live_eval.py` (branch `feature/ada-live-eval`) does this once `.env` has `LLM_API_KEY` and `LLM_MODEL`.
- The REJECTED path: no way to start a run on a second trend yet. Proposal in `docs/rejected-trend.md`.
- The UI in a real browser.
