# CLAUDE.md — Moment

Guidance for Claude Code (and humans) working in this repo. Read this first, then `ARCHITECTURE.md`.

## Project in one paragraph

**Moment** gets a trend to an approved social post in ~2 hours. Flow: **Spot** (trend from Reddit/news → AI brand-fit check) → **Draft** (AI brief, caption, Firefly visual, post in Adobe Express) → **Review** (Brand/Legal/Product humans + 3 synthetic customer personas built from real reviews, side by side) → **Referee** (one structured LLM call → conflict cards, concrete edits, compromise, tasks) → **Ship** ("apply" updates Express, final post + tasks go to Slack). Built in 12 hours at the IT Fest Adobe Hackathon ("Marketing Reimagined"). The demo is 3 minutes and must work 3/3 times.

## Team and ownership

| Person | Area | Paths |
|---|---|---|
| Stefan | AI core, backend, orchestrator, models | `backend/app/main.py`, `models.py`, `orchestrator.py`, `llm/`, `demo_cache.py` |
| Andu | Frontend war room | `frontend/` |
| Militaru | Integrations: trends, Adobe, Slack | `backend/app/trends.py`, `adobe.py`, `slack.py` |
| Anda | Data, demo script, pitch, QA | `data/`, `docs/`, `pitch/` |

Stay inside your area. If a change needs someone else's files, tell them or open a small PR they review.

## Stack and commands

- Backend: Python 3.11+, FastAPI, Pydantic v2
- Frontend: React + TypeScript (Vite), optional Adobe Spectrum
- Storage: in-memory dict + `data/runs.json` snapshot. No database.

```bash
# backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
pytest -q                         # must pass before every PR

# frontend
cd frontend && npm install
npm run dev                       # http://localhost:5173, proxies /api → :8000
npm run build && npm run lint     # must pass before every PR

# demo mode (cached responses for every external call)
curl -X POST localhost:8000/admin/demo-mode -d '{"on": true}' -H 'Content-Type: application/json'
```

Copy `.env.example` to `.env` and fill in keys. Required: `LLM_API_KEY`, `LLM_MODEL`, `SLACK_WEBHOOK_URL`, `ADOBE_CLIENT_ID`, `ADOBE_CLIENT_SECRET`. Optional: `REDDIT_*` or `NEWS_API_KEY`.

---

## Git flow

We use **git flow**, slimmed down for a 12-hour build.

### Branches

| Branch | Purpose | Branches from | Merges into | Protected |
|---|---|---|---|---|
| `main` | Demo-ready code only. Every commit here must run the full demo. | — | — | Yes: PR only, no direct push |
| `develop` | Integration branch; everything lands here first | `main` | `release/*` | Yes: PR only |
| `feature/<owner>-<short-desc>` | One piece of work | `develop` | `develop` | No |
| `release/<version>` | Stabilisation before a checkpoint; bug fixes only | `develop` | `main` **and** `develop` | No |
| `hotfix/<short-desc>` | Urgent fix to demo-ready code (e.g. found during rehearsal) | `main` | `main` **and** `develop` | No |

Feature branch names use the owner's first name, lowercase:

```
feature/stefan-referee-call
feature/andu-conflict-cards
feature/militaru-slack-webhook
feature/anda-reviews-csv
hotfix/referee-json-retry
release/0.2.0
```

### Release plan tied to the hackathon checkpoints

| Hour | Release | What's in it | Tag on `main` |
|---|---|---|---|
| 1 | — | `models.py`, mocks, repo skeleton land on `develop` | — |
| 4 | `release/0.1.0` | End-to-end flow through the real backend (fallbacks allowed) | `v0.1.0` |
| 8 | `release/0.2.0` | **Feature freeze.** Real integrations, conflict cards, demo mode | `v0.2.0` |
| 10 | `release/1.0.0` | Polish, loading states, cost numbers. **This is what we present.** | `v1.0.0-demo` |

After hour 8, **no new `feature/*` branches**. Only `release/*` fixes and `hotfix/*`.

### Workflow

```bash
# start a feature
git checkout develop && git pull
git checkout -b feature/andu-conflict-cards
# ... work, commit small and often ...
git fetch origin && git rebase origin/develop      # keep it current before the PR
git push -u origin feature/andu-conflict-cards
# open PR → develop

# cut a release (whoever is release captain, default Stefan)
git checkout develop && git pull
git checkout -b release/0.2.0
# only bug fixes here, then PR → main, tag, and merge back to develop
git tag -a v0.2.0 -m "Feature freeze" && git push origin v0.2.0

# hotfix during rehearsal
git checkout main && git pull
git checkout -b hotfix/slack-image-missing
# fix → PR → main, tag patch (v1.0.1-demo), then merge main back into develop
```

If the `git flow` CLI (git-flow-avh) is installed, `git flow init -d` with default prefixes matches this setup, but plain git commands are fine.

### Commits

Conventional Commits, scoped by area:

```
feat(llm): add referee call with JSON schema validation
feat(ui): conflict card with apply-compromise button
fix(adobe): fall back to preview when Express update fails
chore(data): add 80 reviews to reviews.csv
docs: update cost model numbers
```

Types: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `style`. Scopes: `llm`, `api`, `orch`, `ui`, `trends`, `adobe`, `slack`, `data`, `pitch`.

### Pull requests

- Small PRs, merged within ~30 minutes. A feature branch older than 2 hours is a smell; merge what works.
- One approval from any teammate. For `models.py` or the API contract, approval from Stefan **and** Andu.
- Before opening: backend `pytest -q` passes, frontend `npm run build && npm run lint` pass.
- PR description: what changed, how to test it, screenshot/GIF for UI changes.
- Squash-merge features into `develop`; merge-commit (no squash) for `release/*` and `hotfix/*` into `main`, so history shows the checkpoints.
- Never force-push `main` or `develop`.

---

## Rules for code changes

### The contract is frozen
`backend/app/models.py` and the API table in `ARCHITECTURE.md` §5 are the contract between frontend and backend. After hour 1, **do not change field names or types** without telling the whole team. Adding an optional field is fine; renaming or removing one is not. Frontend mocks in `frontend/src/mocks/` must stay in sync with `models.py`.

### LLM calls
- All LLM calls go through `backend/app/llm/client.py`. Never call the provider directly from elsewhere.
- Each prompt lives in `backend/app/llm/prompts/<name>.md` and has a Pydantic output model. Validate every response; retry once on validation error; then return the cached last-good response.
- Every call logs `{call, model, input_tokens, output_tokens, latency_ms}` to `logs/usage.jsonl`. Don't remove this; it feeds the cost slide.
- Stay at ~5 calls per run (fit, draft, personas-once, reactions, referee). Adding a call needs a team decision.
- Untrusted text (trends, reviewer comments, reviews) goes into prompts inside delimited tags (`<trend>…</trend>`, `<comment role="legal">…</comment>`) with an instruction to treat it as data. Never concatenate it into the instruction part of a prompt.

### Reliability
- Every external call (LLM, Firefly, Express, Slack, Reddit/news) needs a timeout (default 15s) and a fallback in demo mode. If you add an integration without a fallback, the PR isn't done.
- The saved trend `data/demo_trend.json` is the default for the demo. Live trend fetch must never block the flow.
- Nothing is sent to Express or Slack without the user clicking "apply".

### Security
- Never commit `.env`, keys, tokens or webhook URLs. `.env` is gitignored; add new variables to `.env.example` with an empty value.
- The frontend never holds API keys; it only talks to our backend.
- Strip usernames and personal data from reviews before they go into `data/reviews.csv`.

### Style
- Python: type hints everywhere, `ruff` for lint/format, small functions, no global state outside the store module.
- TypeScript: strict mode, types generated from or hand-mirrored to `models.py`, functional components and hooks.
- Prefer boring, readable code over clever code. It's a 12-hour project that must not break on stage.

### Tests
- `backend/tests/test_flow.py` runs the whole pipeline on `data/demo_trend.json` + `data/demo_comments.json` in demo mode. It must pass on `develop` at all times.
- After hour 6, the Referee test asserts that at least one conflict appears with the scripted comments.

---

## Note for Stefan: integrations handoff (from Militaru)

`backend/app/adobe.py`, `slack.py` and `trends.py` are on `feature/militaru-adobe-integration`, which includes `develop` at `d28bf71`. They aren't wired into the app yet, because `main.py` and `orchestrator.py` don't exist.

**All three integrations are mocks, by team decision.** None of them makes a network call or needs a key: no Adobe, no Slack webhook, no Reddit. They return results as if the call had worked, so the demo flow runs end to end. `trends.py` returns `models.Trend` and `slack.py` takes `models.Task`. Apart from `models.py`, they use only the standard library.

| When | Call | What to do with the result |
|---|---|---|
| `GET /trend` | `trends.get_trend()` | Return it as is: it's a `models.Trend`. The default is the saved trend; `live=True` returns a built-in sample with `source="reddit"` |
| Draft | `adobe.generate_visual(prompt)`, then `adobe.create_post(caption, image_url)` | Set `Draft.image_url`, `express_doc_id` (`post.doc_id`) and `version` (`post.version`) |
| Apply | `adobe.update_post(post, caption=..., image_url=...)` | Returns a new post with `version + 1`. `caption=""` really blanks the caption, so guard against empty LLM output |
| Apply | `slack.send_final_post(caption, image_url, tasks, elapsed)` | Pass `RefereeResult.tasks` as is. Always returns `sent=True` plus `blocks`, the Slack message a real webhook would post; the UI can show it as a preview |

What you need to handle:

- **Mock latency:** `ADOBE_MOCK_LATENCY_S` (default 0) makes the Adobe calls sleep, to show loading states. It blocks, so outside the `POST /runs` background task use `def` endpoints or `asyncio.to_thread`.
- **Express link:** `Draft` has no field for `post.url`. If the UI needs the link, add an optional field. It only opens the Express home page, not the post.
- **Saved trend:** `data/demo_trend.json` is missing (Anda), so `get_trend()` returns "Demo trend (placeholder)" for now.
- **Stale docs:** these still describe real integrations: the "Required" env list above (`SLACK_WEBHOOK_URL`, `ADOBE_CLIENT_*`), the same keys and `REDDIT_*`/`NEWS_API_KEY` in `.env.example`, `ARCHITECTURE.md` (§4.4–4.6, ADR-003, §10), and the README on `feature/stefan-contract`.

Decision we need from you: what happens when the Referee returns `needs_human`? The state machine has no transition for it.

## Guidance for Claude Code specifically

- Ask which area/branch you're working on if it isn't clear; don't edit files outside that owner's paths unprompted.
- Before writing code, check `models.py` and `ARCHITECTURE.md` so changes fit the contract.
- Create a `feature/<owner>-<desc>` branch from `develop` for new work; never commit straight to `main` or `develop`.
- Use Conventional Commits as above.
- Run the relevant tests/build before saying something is done.
- After hour 8 (feature freeze), only make fixes. Push back on new features and suggest putting them in "What's next" on the pitch instead.
- Out of scope; don't build: live multi-platform monitoring, auth/permissions, scheduling, notifications, enforced timers, round-2 review, pre-mortem mode, more than 3 personas.
