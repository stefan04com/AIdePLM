# AdoBee frontend (war room)

React 19 + TypeScript (strict) + Vite. Owner: Andu.

```bash
npm install
npm run dev            # http://localhost:5173
npm run build && npm run lint   # must pass before every PR
npm test               # comment-weighting formula (docs/comment-weighting.md)
```

## Mock vs real backend

By default the app runs against an **in-browser mock API** (`src/mocks/mockApi.ts`). Its content is
the Boabe cozy-autumn demo scenario (`docs/demo-scenario.md`), in the same shape as
`backend/tests/fixtures/run_refereed.json`. It walks through the whole lifecycle
(SPOTTED → DRAFTED → IN_REVIEW → REFEREED → SHIPPED) with `step` labels and 404/409 errors,
and mirrors `backend/app/orchestrator.py` (busy runs, allowed statuses, how `apply` changes the draft).

To use the real backend (`uvicorn` on :8000), create `.env.local`:

```
VITE_USE_MOCKS=false
```

Requests go to `/api/*`, and the Vite proxy rewrites them to `http://localhost:8000/*`.

## Types

`src/api/types.ts` is hand-mirrored from `backend/app/models.py` (contract v1). Once the backend
serves `/openapi.json`:

```bash
npm run gen:types      # writes src/api/schema.gen.ts from http://localhost:8000/openapi.json
```

## Layout

| Path | What |
|---|---|
| `src/api/client.ts` | The only place that calls the backend (or the mock) |
| `src/api/types.ts` | Contract types, mirrored from `models.py` |
| `src/hooks/useRun.ts` | Polls `GET /runs/{id}` every 1s until SHIPPED/REJECTED |
| `src/components/` | Trend · Canvas · Review columns; `ui.tsx` has shared `Card`, `Badge`, `Muted` |
| `src/components/review/` | Review actions, human reviewers, persona cards |
| `src/components/referee/` | Conflict cards (accept compromise), word-diff edits, tasks, ship bar |
| `src/lib/` | Formatting, labels, word diff, run-status rules, colour tones |
| `src/mocks/` | Fixture copy, personas, scripted comments, mock API |
| `scripts/check-lines.mjs` | Fails if any line is over 300 characters (part of `npm run lint`) |

## Code style

- No line longer than 300 characters (`npm run lint` checks it).
- If something repeats, extract it: a helper in `src/lib/`, a component in `ui.tsx`, or a CSS tone class.
