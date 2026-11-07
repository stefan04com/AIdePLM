# Bonus beat: the fit check says no (about 10 s)

## The beat
- Screen: the Spot panel loads a second saved trend, "The 10 espressos in 10 minutes challenge is taking over feeds". Within seconds the run flips to a red **REJECTED** badge with the fit reason under it. No draft appears, the Review buttons stay disabled.
- Presenter, one line: "Not every trend is ours. Moment checks the brand first and stops before anyone wastes an hour on a bad post."
- Then go back to the cozy autumn trend and continue the main demo.

## Why the fit check should reject it
Data: `data/demo_trend_rejected.json` (`Trend`, source "saved", id `trend_espresso_challenge`).
- `data/brand.md` Legal no-go 1: no health claims. A caffeine-overdose dare invites exactly the health risk the brand can never talk about.
- Voice: "Calm" and "Quietly funny, never a meme pile-on". The trend is loud, competitive and a pile-on.
- Don't: "Talk down to other coffee drinkers". The thread mocks anyone who stops early.
- Who we are: "slow down for ten minutes". The trend is the opposite.
No real person, brand, tragedy or politics is involved, so it is safe on stage.

## Today's backend (origin/develop)
- `GET /trend` returns exactly one trend: `adapters.current_trend()` reads `data/demo_trend.json` only (Militaru's `trends.py` does the same, or a mock "reddit" trend with `live=True`).
- `POST /runs` needs a `trend_id` that `store.find_trend` already knows. Only trends returned by `current_trend` (or restored from `runs.json`) are remembered, so the new file cannot be started today.
- Demo mode never gives `fits=false`: the fit call falls back to `demo_cache.fit()`, i.e. `CANNED_FIT` (fits=true) or the last good live result. REJECTED is only covered by a test that monkeypatches `CANNED_FIT`.

## Proposed change (Stefan / Militaru, additive, contract-safe)
1. `GET /trend?which=rejected` (optional param, default unchanged): load `data/demo_trend_rejected.json` and call `store.remember_trend`, so `POST /runs` accepts its id.
2. Make the canned fit trend-aware: if `trend.id == "trend_espresso_challenge"` return `FitResult(fits=False, score=9, reason="Health-risk dare and a pile-on tone clash with Boabe's calm voice and no-health-claims rule.")`. This needs `calls.check_fit` to pass the trend to the fallback.
3. UI (Andu): a small "Try another trend" button that calls `/trend?which=rejected` then `POST /runs`, and shows `run.fit.reason` on REJECTED.
