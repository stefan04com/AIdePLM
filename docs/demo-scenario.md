# Demo scenario: Boabe, cozy autumn

Decided 2026-11-07 (Ada). The demo uses **Boabe**, a fictional Bucharest specialty coffee brand, and the **cozy autumn setup** trend. This replaces the transit-app scenario and the #FirstSipFace mock.

## Source of truth

| What | File |
|---|---|
| Brand voice, legal no-gos, product facts | `data/brand.md` |
| Saved trend | `data/demo_trend.json` |
| Scripted Brand / Legal / Product comments | `data/demo_comments.json` |
| Reviews for personas (65, real) | `data/reviews.csv`, provenance in `data/reviews_sources.md` |

Mocks and canned responses should copy from these files, not the other way round.

## The story in one run

1. **Trend:** people share their cozy autumn work-from-anywhere corner. Fit is high: Boabe's core moment is the slow cup in a warm corner.
2. **Draft (expected shape):** a cozy caption that mentions the new **Pumpkin & Cinnamon Latte**, plus a Firefly visual of a latte on a cozy desk. The draft prompt obeys the legal no-gos, so it will **not** contain "no added sugar"; the comments are written to work either way.
3. **Comments:**
   - Product: add "no added sugar", make the drink the hero.
   - Legal: the caption can't say "no added sugar" (no documentation), "healthy" or "the best" (health claim, superlative).
   - Brand: it reads like an ad; lead with the moment, softer CTA.
4. **Expected conflicts:**
   - Legal vs Product on "no added sugar".
   - Brand (plus the student persona) vs Product on product-as-hero.
5. **Compromise (expected):** a cozy caption that names the Pumpkin & Cinnamon Latte naturally, no health or sugar claim, soft CTA. Task for Product: send the sugar documentation to Legal before using the claim in a later post.

## Personas

Built by call #3 from `reviews.csv`. To keep the frontend mock ids, use:

| id | Who | Shows up in the reviews as |
|---|---|---|
| `student_night_owl` | Works or studies with a laptop for hours | wifi, seats, noise, the weekend laptop ban |
| `busy_parent` | Orders ahead, short on time | app ordering, queues, wrong or late orders, prices |
| `coffee_purist` | Cares about beans and brewing | origin, V60, roast, "old crop", baristas who explain |

## Who needs to change what

| Owner | File | Change |
|---|---|---|
| Andu | `frontend/src/mocks/run_refereed.json`, `personas.json` | Trend, draft, comments and referee to this scenario |
| Stefan | `backend/app/demo_cache.py`, `backend/tests/fixtures/run_refereed.json` | Canned draft, personas and referee to this scenario (still transit app) |
| Stefan | `backend/app/llm/prompts/referee.md` | Check that the conflict appears 3/3 with `data/demo_comments.json` |
