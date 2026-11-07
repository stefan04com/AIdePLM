# Where `reviews.csv` comes from

65 real, public customer reviews, collected on 2026-11-07. Used to build the 3 synthetic personas (call #3).

| Source | Rows | Pages |
|---|---|---|
| Tripadvisor, Bucharest specialty cafés | 40 | [Origo Coffee p.1](https://www.tripadvisor.com/Restaurant_Review-g294458-d4059772-Reviews-Origo_Coffee-Bucharest.html), [p.2](https://www.tripadvisor.com/Restaurant_Review-g294458-d4059772-Reviews-or15-Origo_Coffee-Bucharest.html) · [M60 p.1](https://www.tripadvisor.com/Restaurant_Review-g294458-d7346560-Reviews-M60-Bucharest.html), [p.2](https://www.tripadvisor.com/Restaurant_Review-g294458-d7346560-Reviews-or15-M60-Bucharest.html) · [Trofic](https://www.tripadvisor.com/Restaurant_Review-g294458-d12849885-Reviews-Trofic-Bucharest.html) |
| Apple App Store, coffee-chain order-ahead apps (US, UK) | 25 | [US app, page 1 feed](https://itunes.apple.com/us/rss/customerreviews/page=1/id=331177714/sortby=mostrecent/json) · [UK app, page 5 feed](https://itunes.apple.com/gb/rss/customerreviews/page=5/id=578627826/sortby=mostrecent/json) |

Ratings: 31 × 5, 9 × 4, 2 × 3, 3 × 2, 20 × 1 (5-star share 48%).

**Moderate weighting.** 87 reviews were collected; 5-star ones were 61%, which would make every persona a fan. 22 generic or food-only 5-star Tripadvisor reviews were dropped, keeping the ones about laptop work, coffee craft and ordering ahead. No review was edited or added to rebalance.

## What was changed

- Text is copied verbatim. Each Tripadvisor review was checked by SHA-256 against the live page; each App Store review against Apple's feed.
- Removed: reviewer names, locations and profile data (never copied), and Tripadvisor UI text ("Review collected in partnership with this restaurant").
- Replaced: café, competitor and shop names with `[cafe]`, `[brand]`, `[shop]`, `[hostel]`, so persona quotes never show another brand (see `brand.md`, legal no-go 3).
- Whitespace collapsed to single spaces.
- Skipped: reviews machine-translated by Tripadvisor, and reviews under 8 words.

## Pitch wording

Say "personas built from 65 real public reviews of Bucharest specialty cafés and coffee-ordering apps". Don't say they are Boabe's customers: Boabe is fictional.
