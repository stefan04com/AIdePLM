# COORDINATION

Live task board for the team. Read it before you start, update it when you finish something.
Rules and architecture live in `CLAUDE.md` and `ARCHITECTURE.md`; this file only tracks **who does what next**.

**How to use it**
- Tick a box (`[x]`) in the same PR as the work, or in a one-line `docs:` PR right after.
- New task? Add it under the owner, with a short "done when". Blocked? Write `BLOCKED by <who>: <why>`.
- After the feature freeze (hour 8) only fixes go here; ideas go to "What's next" in the pitch.
- Open PRs into `develop`; `main` only gets `develop` or `release/*` / `hotfix/*` PRs. Don't push straight to `main`.

Last updated: 2026-11-07 (Ada)

## Status

| Area | State |
|---|---|
| Backend flow (fit → draft → reactions → referee → apply) | Done in demo mode; 106 tests pass |
| Real LLM (Bedrock) | Worked 3/3 in Ada's eval (~$0.056/run). Team decision: no more paid runs; the demo uses demo mode ($0) |
| Rejected trend (fit says no) | Backend done (`GET /trend?which=rejected`); UI button pending |
| Adobe / Slack / trends | Local simulations by team decision, no keys needed |
| Frontend | Builds and lints; not yet tested end to end in a real browser |
| Tag `v1.0.0-demo` | Not cut yet |

## Stefan: AI core, backend
- [ ] Run `qa/live_eval.py` (on `feature/ada-live-eval`) against the final `main`. Done when: 3/3 runs have a conflict and no canned fallback.
- [ ] Take the cost numbers from `logs/usage.jsonl` / `GET /usage` after a live run and give them to Anda. Done when: one measured "$ per post" line exists.
- [ ] After a clean rehearsal, cut `release/1.0.0` and tag `v1.0.0-demo` on `main`.
- [ ] Decide how to stop direct pushes to `main` (GitHub branch protection or frequent main → develop syncs) and tell the team.

## Andu: frontend
- [ ] "Try another trend" button: `GET /trend?which=rejected`, then `POST /runs`; show `run.fit.reason` on `REJECTED`. Backend is ready (`docs/rejected-trend.md`).
- [ ] Test the full flow in a real browser with `VITE_USE_MOCKS=false` in `frontend/.env.local` (draft, comments, referee, apply).
- [ ] Check the `needs_human` banner and that apply still works (it is allowed on purpose, see `ARCHITECTURE.md` §3).

## Militaru: integrations
- [ ] Check that the image in the Slack preview shows. If not, set `ADOBE_MOCK_IMAGE_URL` to an https image (the default is a `data:` URL).
- [ ] Run `ruff format` on `backend/app/adobe.py` and `slack.py` (the only unformatted files).
- [ ] Align `ARCHITECTURE.md` §4.4–4.6, ADR-003 and §10 with the local simulations (a note sits above them for now).
- [ ] Use PRs into `develop` instead of pushing to `main`.

## Anda: data, demo script, pitch, QA
- [ ] Put the measured cost line into the cost slide (from Stefan).
- [ ] Run the 3/3 rehearsal with `docs/demo-script.md`, including the rejected-trend beat. Done when: three clean runs in a row on the demo laptop.
- [ ] Record the backup video.
- [x] Update `docs/qa-report.md`: mark what is fixed, list what is left.
- [x] Check that `docs/demo-scenario.md` matches the canned content on `main`.
- [x] Replace "1h 50m" with the on-screen clock + "about two hours vs eight days" (README, demo script).

## Everyone
- [ ] No new features after the freeze; fixes only.
- [ ] Two full end-to-end rehearsals on the presentation laptop before the demo.

## Done
- [x] `needs_human` can ship; a blank `final_caption` keeps the current caption (PR #13)
- [x] Second saved trend rejected by the fit check, backend side (PR #13)
- [x] Boabe canned demo content in `demo_cache.py`
- [x] Comment and review weighting (`docs/comment-weighting.md`)
- [x] AI cost panel in the UI
- [x] `adapters.py` Slack and trend bugs (hotfix)
