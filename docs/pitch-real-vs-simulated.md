# What is real and what is simulated (pitch notes, Stefan's part)

Say this plainly on stage. Judges trust a team that draws the line itself.

## One-line version

"The AI and the Slack hand-off are real. Adobe and the trend feed are simulated, and each has a clear seam where the real thing plugs in."

## Real

| What | Proof |
|---|---|
| **LLM calls** (fit, draft, customer reactions, referee), Claude Sonnet on Amazon Bedrock | `qa/results/live_eval_20261107_142630.md`: 3 runs, 0 canned fallbacks |
| **The referee finds conflicts between people and customers** | Same eval: Legal vs Product 3/3, human vs synthetic customer 3/3 |
| **Cost per post: $0.0602** (4 calls, about 22 s of model time) | Same eval, prices at $3 / $15 per million tokens in / out |
| **Slack message** to the team channel through an incoming webhook | The message appears in `#all-ai-de-plm-marketing-team` when we click ship |
| **Personas** built from 65 real public reviews | `data/reviews.csv` |

On stage the referee runs live (`LIVE_IN_DEMO=referee`), so a comment typed by a judge changes the answer (about 22 s). Everything else in demo mode answers from a cache, with the same story as the live runs. If the LLM fails, the cached answer appears and the header says `CANNED`.

## Simulated, by decision

| What | How it is simulated | Where the real one plugs in |
|---|---|---|
| **Adobe Firefly** (visual) | A stored photo of a pumpkin latte | `adobe.generate_visual()` |
| **Adobe Express** (the post) | A mock post that gets `version + 1` on apply | `adobe.create_post()` / `adobe.update_post()` |
| **Trends** (Reddit / news) | A saved trend plus real trends collected from the web into `data/live_trends.json`; nothing is fetched at runtime | `trends.get_trend()` |

Same function signatures, so a real integration replaces the bodies and nothing else changes.

## If a judge asks

- **"Is the AI answer real or cached?"** The referee is live on stage. Here is the eval that ran the full flow three times against the real model: [show the eval file].
- **"Why not call Firefly?"** Twelve hours, and no Adobe developer credentials on the team. The seam is `adobe.py`.
- **"What does it cost?"** $0.0602 per post, measured. Compare with a review that takes 8 days and 3+ versions (Filestage, vendor-reported).
- **"Are the personas real customers?"** They are built from real public reviews of Bucharest cafés and ordering apps. Boabe is fictional, so they are not its customers.
