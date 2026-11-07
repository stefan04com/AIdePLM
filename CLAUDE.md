# CLAUDE.md — Moment

Guidance for Claude Code (and humans) working in this repo. Read this first, then `ARCHITECTURE.md`. Open tasks per person are in [`COORDINATION.md`](COORDINATION.md): check it before starting and tick items when you finish.

## Project in one paragraph

**Moment** gets a trend to an approved social post in ~2 hours. Flow: **Spot** (trend from Reddit/news → AI brand-fit check) → **Draft** (AI brief, caption, visual prompt; the visual and the post are a local simulation, integration-ready for Adobe Firefly / Express) → **Review** (Brand/Legal/Product humans + 3 synthetic customer personas built from real reviews, side by side) → **Referee** (one structured LLM call → conflict cards, concrete edits, compromise, tasks) → **Ship** ("apply" bumps the post version, final post + tasks are posted to Slack through an incoming webhook). Built in 12 hours at the IT Fest Adobe Hackathon ("Marketing Reimagined"). The demo is 3 minutes and must work 3/3 times.

## Progress (2026-11-07, 14:15)

Feature freeze is on: fixes only.

- **Works end to end** on `main`: trend → fit → draft → personas → human comments → referee → apply → Slack, plus the rejected "risky trend" beat. Backend 128 tests, frontend 20 tests, build and lint pass.
- **Real AI:** live eval 3/3 with a conflict, 0 fallbacks, **$0.0602 per post** (`qa/results/live_eval_20261107_142630.md`).
- **Real Slack** webhook on ship (`Run.slack` = posted / simulated / failed). The time reads in seconds under a minute ("37s", not "0m"), `SLACK_IMAGE_URL` gives Slack a public image, and a message Slack rejects because of its image is retried once without it. The "Shipped" banner says what really happened to the Slack message.
- **Browser-tested** with `VITE_USE_MOCKS=false` in Chromium (`qa/e2e_browser.py`): 3/3 clean runs, no console or HTTP errors; the `needs_human` banner shows and apply still ships. Run in demo mode, so a live-LLM click-through is still open.
- **Backup video:** `qa/results/moment-backup-demo.mp4` (72 s, no sound, demo mode).
- **Simulated by decision:** Adobe (Firefly / Express) and trends. Say so in the pitch.
- **Open:** see `COORDINATION.md` (rehearsals on the presentation laptop, webhook on every laptop, cost slide, tag `v1.0.0-demo`).

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

# browser e2e of the whole demo (backend + `npm run dev` with VITE_USE_MOCKS=false running)
pip install playwright && python -m playwright install chromium
python qa/e2e_browser.py run1     # exit 0 = every check passed, screenshots in qa/results/e2e/

# demo mode (cached responses for every external call)
curl -X POST localhost:8000/admin/demo-mode -d '{"on": true}' -H 'Content-Type: application/json'
```

Copy `.env.example` to `.env` and fill in keys. Required: `LLM_PROVIDER` and `LLM_MODEL`, plus `LLM_API_KEY` (direct Anthropic API) or `AWS_BEARER_TOKEN_BEDROCK` exported in your shell (`LLM_PROVIDER=bedrock`, optional `AWS_REGION`). No Adobe keys are needed (local mock, see "Integrations" below). Optional: `SLACK_WEBHOOK_URL` (real Slack post; without it the message is only previewed), `PUBLIC_BASE_URL` or `SLACK_IMAGE_URL` (an image Slack can download), `ADOBE_MOCK_IMAGE_URL`, `ADOBE_MOCK_LATENCY_S`.

---

## Git flow

We use **git flow**, slimmed down for a 12-hour build.

### Branches

| Branch | Purpose | Branches from | Merges into | Protected |
|---|---|---|---|---|
| `main` | Demo-ready code only. Every commit here must run the full demo. | — | — | No: direct pushes allowed (team decision), but tests must pass and never force-push |
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
fix(adobe): keep the previous visual when the mock update fails
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
- Every external call (today the LLM and the Slack webhook; any future Adobe or Reddit/news integration) and every integration module call needs a timeout (default 15s) and a fallback in demo mode; `adapters.py` already wraps the mocks this way. If you add an integration without a fallback, the PR isn't done.
- The saved trend `data/demo_trend.json` is the default for the demo. Live trend fetch must never block the flow.
- Nothing is applied to the post or the Slack message without the user clicking "apply".

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

## Integrations (Slack real; Adobe and trends simulated)

By team decision there is no live Adobe or Reddit integration: those two modules (owner: Militaru) make no network calls and need no keys, and return results as if the call had worked. Slack is real when `SLACK_WEBHOOK_URL` is set. Apart from `models.py`, they use only the standard library. `backend/app/adapters.py` already wires them into the flow, each call with a 15s timeout and a fallback.

| Module | What it does | Used by `adapters.py` |
|---|---|---|
| `trends.py` | `get_trend()` returns the saved trend from `data/demo_trend.json` (a placeholder if the file is missing or malformed). `live=True` (env `LIVE_TRENDS=1`) returns the first of the real trends collected from the web into `data/live_trends.json` (each with its source article), or a built-in sample if that file is unusable; nothing contacts Reddit or news sites at runtime | `current_trend()` |
| `adobe.py` | `generate_visual(prompt)` returns a placeholder SVG (same prompt, same image), labelled as a mock. `create_post(caption, image_url)` returns a mock post at version 1; `update_post(...)` returns a copy with `version + 1`. Its `url` is only the Express home page, not a post | `create_visual_and_post()`, `update_post()` |
| `slack.py` | `send_final_post(caption, image_url, tasks, elapsed)` builds the Block Kit message (caption, image, tasks, "Trend → approved" time) and POSTs it to `SLACK_WEBHOOK_URL` (image from `SLACK_IMAGE_URL`, else the post image made absolute with `PUBLIC_BASE_URL`; on HTTP 400 it retries once without the image); returns `posted`, `simulated` (no webhook) or `failed`, stored in `Run.slack`; the UI shows the blocks as a preview either way | `send_to_slack()` |

Environment (both optional, read by `adobe.py`):

- `ADOBE_MOCK_IMAGE_URL`: an image URL to use instead of the SVG placeholder.
- `ADOBE_MOCK_LATENCY_S`: simulated delay per Adobe call in seconds (default 0, max 15), to show loading states. It blocks, so call it from a worker thread (as `adapters.py` does), not directly from async code.

**Integration-ready.** For the pitch: Moment can be integrated with Adobe Firefly (image generation) and Adobe Express (the post) later. `adobe.py` is the seam: a real integration would replace its function bodies and keep the same signatures. Likewise, `slack.py` builds valid Block Kit that a real webhook could post unchanged, and `trends.py` is where a live Reddit/news fetch would go. The LLM calls are real (Anthropic API or Amazon Bedrock).

## Guidance for Claude Code specifically

- Read `COORDINATION.md` for what is open for each owner, and update it when you finish a task.
- Ask which area/branch you're working on if it isn't clear; don't edit files outside that owner's paths unprompted.
- Before writing code, check `models.py` and `ARCHITECTURE.md` so changes fit the contract.
- Create a `feature/<owner>-<desc>` branch from `develop` for new work; never commit straight to `main` or `develop`.
- Use Conventional Commits as above.
- Run the relevant tests/build before saying something is done.
- After hour 8 (feature freeze), only make fixes. Push back on new features and suggest putting them in "What's next" on the pitch instead.
- Out of scope; don't build: live multi-platform monitoring, auth/permissions, scheduling, notifications, enforced timers, round-2 review, pre-mortem mode, more than 3 personas.
