# Demo scenario: Boabe, cozy autumn

Decided 2026-11-07 (Ada). The demo uses **Boabe**, a fictional Bucharest specialty coffee brand, and the **cozy autumn setup** trend. Checked against `backend/app/demo_cache.py` on `main` (demo mode, no LLM calls, $0).

## Source of truth

| What | File |
|---|---|
| Brand voice, legal no-gos, product facts | `data/brand.md` |
| Saved trend | `data/demo_trend.json` |
| Rejected trend (bonus beat) | `data/demo_trend_rejected.json`, `docs/rejected-trend.md` |
| Scripted Brand / Legal / Product comments | `data/demo_comments.json` |
| Reviews for personas (65, real) | `data/reviews.csv`, provenance in `data/reviews_sources.md` |
| What demo mode shows | `backend/app/demo_cache.py` (taken from a live run on 2026-11-07) |

## The story in one run (what demo mode shows)

1. **Trend:** people share their cozy autumn work-from-anywhere corner. **Fit 88/100**: the quiet corner, the warm cup and the grey Bucharest day are Boabe's core moment.
2. **Draft:** "Grey Tuesday, one corner, the Pumpkin & Cinnamon Latte still warm. Bucharest does autumn slowly when you let it. Order ahead in the app." Hashtags `#CozySetup #BucharestAutumn`. The visual is a local placeholder, Firefly-ready. Like the live model, the draft obeys the legal no-gos, so it has no "no added sugar".
3. **Comments** (`data/demo_comments.json`):
   - Product: add "no added sugar", make the drink the hero.
   - Legal: the caption can't say "no added sugar" (no documentation), "healthy" or "the best".
   - Brand: it reads like an ad; lead with the moment, softer CTA.
4. **Personas** react: Laptop Regular +0.8, Origin Seeker −0.1 (wants origin and roast), App-First Commuter +0.8.
5. **Conflicts:**
   - Product vs Legal on "no added sugar". Compromise: sell the latte on what we can state (real pumpkin, Ceylon cinnamon); use the sugar claim once Legal has the documentation.
   - Brand vs Product on product-as-hero. Compromise: the moment first, the latte named once with its real ingredients, soft CTA.
6. **Final caption:** "Grey Tuesday. A Pumpkin & Cinnamon Latte, real pumpkin and Ceylon cinnamon, still warm in the corner. Bucharest does autumn slowly when you let it. Order ahead in the app."
7. **Tasks:** Legal signs off the caption today 15:00; Product sends Legal the sugar documentation this week.
8. **Bonus beat:** the "10 espressos in 10 minutes" trend gets **fit 9/100** and stops at REJECTED.

## Personas

Built by call #3 from `reviews.csv`; demo mode uses the set from the live run:

| id | Name | Shows up in the reviews as |
|---|---|---|
| `remote_worker_regular` | Laptop Regular | wifi, seats, noise, the weekend laptop ban |
| `curious_coffee_enthusiast` | Origin Seeker | origin, V60, roast, "old crop", baristas who explain |
| `on_the_go_commuter` | App-First Commuter | app ordering, queues, wrong or late orders, prices |

## Still open

- Rejected-trend UI button (Andu, see `COORDINATION.md`).
- A real https image instead of the placeholder (Militaru: `ADOBE_MOCK_IMAGE_URL`).
