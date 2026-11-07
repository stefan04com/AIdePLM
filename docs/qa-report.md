# QA report, 2026-11-07 (updated)

Everything that blocked the demo is fixed on `main`; what's left is the rejected-trend button and the rehearsal. Checked on `main` at `a9cc3e3`: 106 backend tests pass, the frontend builds, and the flow (draft, comments, personas, referee) was clicked through in Chrome against the real backend in demo mode.

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
| 8b | Militaru | Backend not `ruff format`-ed | Formatted (line length 100) |
| 8 | Militaru | The visual was a placeholder card | Real CC0 photo served locally: `ADOBE_MOCK_IMAGE_URL=/visuals/boabe-pumpkin-latte.jpg` (pumpkin latte, matches the Boabe story) (default in `.env.example`; credits in `frontend/public/visuals/CREDITS.md`). No internet needed on stage |

## Fixed later

- Rejected trend: "Try a risky trend" button in the UI (Ada), REJECTED shows the fit reason.
- Race in `add_comment`: a comment while a step runs now gets 409 instead of being lost.
- Canned content in live mode is now visible: `Run.fallback_calls` and "CANNED: …" in the run line.
- Slack image: a relative image path is made absolute with `PUBLIC_BASE_URL`.

## Left

| # | Owner | What | Done when |
|---|---|---|---|
| 10 | Everyone | No rehearsal on the presentation laptop yet | Three clean runs in a row |

## Minor (unchanged, harmless)

- `frontend/src/api/types.ts`: `ApplyRequest.accept_all_edits` is required in TS, optional in the backend.
- `adapters.py`: `Draft.version` never takes `post.version` from the Express mock; the orchestrator bumps it anyway.

## Live LLM

Two evals on 2026-11-07 (Bedrock, `eu.anthropic.claude-sonnet-4-6`, 3 runs each): `qa/results/live_eval_20261107_114731.md` (Ada) and `qa/results/live_eval_20261107_122427.md` (Stefan, final `main`). Both: conflict 3/3, no fallback, about 20 s per run. **Cost per post: $0.0566** at $3 / $15 per Mtok; this is the number for the cost slide. No more paid runs are needed: the demo runs in demo mode ($0).
