# QA report, 2026-11-07 (updated)

Everything that blocked the demo is fixed on `main`; what's left is the image, the rejected-trend button, formatting and the rehearsal. Checked on `main` at `6dc0ce4`: 106 backend tests pass, the frontend builds, and the flow (draft, comments, personas, referee) was clicked through in Chrome against the real backend in demo mode.

## Fixed

| # | Owner | What was wrong | Fixed by |
|---|---|---|---|
| 1 | Stefan | `adapters.py` called `slack.send_final_post` with a `SlackTask` and arguments it doesn't take, so Slack was silently skipped on every apply | hotfix `adapters-trend-slack`, guarded by `backend/tests/test_adapters.py` |
| 2 | Stefan | `adapters.py` ran `asdict()` on a Pydantic `Trend`, so `live=True` never reached `trends.py` | same hotfix |
| 3 | Stefan | `needs_human` had no defined behaviour | Apply still ships; a blank `final_caption` keeps the current caption (PR #13, `ARCHITECTURE.md` §3) |
| 4 | Andu | "Fill scripted comments" posted old Legal/Product wording | Synced with `data/demo_comments.json`; Product is pre-filled, Brand and Legal are left for the judges |
| 5 | Stefan | Demo mode told the transit-app story | `demo_cache.py` shows the Boabe story from a live run, plus the rejected trend (fit 9) |
| 6 | Militaru | Slack and Express looked real but were mocks | Previews labelled as simulated; fake Express link removed; `CLAUDE.md` lists only LLM keys as required |
| 7 | Militaru | `.env.example` merge conflict | Resolved in the merges into `main` |

## Left

| # | Owner | What | Done when |
|---|---|---|---|
| 8 | Militaru | The visual is a placeholder (`data:` URL): Slack shows no image, Express shows a text card | `ADOBE_MOCK_IMAGE_URL` points to an https image the team may use |
| 9 | Andu | No UI for the rejected trend (backend `GET /trend?which=rejected` is ready) | "Try another trend" shows REJECTED with the fit reason |
| 10 | Militaru | `backend/app/adobe.py` and `slack.py` are not `ruff format`-ed | `ruff format --check app` passes |
| 11 | Everyone | No rehearsal on the presentation laptop yet | Three clean runs in a row |

## Minor (unchanged, harmless)

- `frontend/src/api/types.ts`: `ApplyRequest.accept_all_edits` is required in TS, optional in the backend.
- `adapters.py`: `Draft.version` never takes `post.version` from the Express mock; the orchestrator bumps it anyway.

## Live LLM

One eval on 2026-11-07 (Bedrock, `eu.anthropic.claude-sonnet-4-6`, 3 runs, `qa/results/live_eval_20261107_114731.md`): conflict 3/3, Legal vs Product 3/3, no fallback, about 20 s and **$0.056 per run** at list price. The team decided not to spend more, so the demo runs in demo mode ($0) and the cost slide uses this number.
