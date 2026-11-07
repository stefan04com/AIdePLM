# Comment and review weighting

Decided 2026-11-07 (Andu). Not every piece of feedback should count the same. A comment from a
**verified person in the brand's industry** counts much more than one from an ordinary person, and
**newer feedback counts more than older feedback**. The rule applies to both kinds of feedback:

| Feedback | Where it comes from | What the weight changes |
|---|---|---|
| **War-room comments** | `POST /runs/{id}/comments` (Brand / Legal / Product reviewers) | How much the Referee (call #5) listens to each comment when they conflict |
| **Customer reviews** | `data/reviews.csv` | Which reviews shape the 3 personas (call #3) and their sample quotes |

## Formula

```
weight = expertise × recency
```

**Expertise**

| Author | Factor |
|---|---|
| Verified in the brand's industry | **3.0** |
| Anyone else (unknown, unverified, or verified in another industry) | 1.0 |

**Recency** halves every *half-life* and never drops below a floor:

```
recency = max(0.1, 0.5 ^ (age / half_life))
```

| Feedback | Half-life | Example |
|---|---|---|
| War-room comment | 24 hours | Comments from the same session are almost equal; yesterday's comment counts half |
| Customer review | 365 days | A 2-year-old review counts a quarter of a new one |

Edge cases: a date in the future counts as age 0 (recency 1.0). A missing date gives recency 0.5,
as if the feedback were one half-life old, so undated feedback never beats fresh, dated feedback.

Weights are rounded to 2 decimals.

### Reference values (the tests check exactly these)

| Verified | Age | Half-life | Weight |
|---|---|---|---|
| yes | 0 | 24 h | **3.00** |
| no | 0 | 24 h | **1.00** |
| yes | 24 h | 24 h | **1.50** |
| no | 48 h | 24 h | **0.25** |
| no | 30 days | 24 h | **0.10** (floor) |
| yes | 1 hour in the future | 24 h | **3.00** |
| no | unknown | any | **0.50** |
| yes | 730 days | 365 days | **0.75** |

## Who counts as verified

There are no accounts in Moment (auth is out of scope), so verification is a lookup in
`data/industry_experts.json`:

```json
{
  "brand_industry": "coffee",
  "experts": [{ "name": "Ioana Marin", "title": "Head barista", "industry": "coffee" }]
}
```

- **Comments:** the reviewer can give their name (`CommentCreate.author`, optional). The backend looks
  it up, case-insensitively and ignoring extra spaces. It is verified only if the name is on the list
  **and** the expert's `industry` equals `brand_industry`. A wine sommelier on the list is still weight
  1.0 for a coffee brand. The client never sends "verified": the backend decides.
- **Reviews:** `reviews.csv` can have two optional columns: `date` (`YYYY-MM-DD`) and
  `verified_industry` (the industry the platform verified for that reviewer, empty if none). A review
  counts as verified when `verified_industry` equals `brand_industry`. Without these columns every
  review gets weight 0.5, so nothing changes until the data is filled in.

## Hard rule: weight never beats the brand guide

Weight decides **whose opinion wins between reviewers**. It never overrides the legal no-gos in
`data/brand.md`: a verified expert who asks for "no added sugar" without documentation is still blocked
by Legal.

## Where it lives in the code

| What | File |
|---|---|
| Formula + expert lookup | `backend/app/weighting.py` |
| Comment fields `author`, `author_title`, `industry_verified`, `weight` | `backend/app/models.py` (optional, additive) |
| Weight set on new comments and refreshed on every `GET /runs/{id}` | `backend/app/orchestrator.py` |
| Referee sees `weight`, `verified`, `author_title` on every `<comment>` | `backend/app/llm/calls.py`, `prompts/referee.md` |
| Demo-mode Referee picks the heaviest comment per role (newest on a tie) | `backend/app/demo_cache.py` |
| Reviews sorted by weight, weight shown to the persona call | `backend/app/adapters.py`, `prompts/personas.md` |
| UI: "commenting as" name, verified badge, weight, comment age | `frontend/src/components/review/` |
| Same formula for the in-browser mock | `frontend/src/lib/weighting.ts` |

## How to check it works

```bash
cd backend && pytest -q tests/test_weighting.py   # formula, lookup, API, referee prompt, demo referee, reviews
cd frontend && npm test                            # same reference values for the mock's formula
```

Both suites assert the reference table above, so if one side changes the formula, a test fails.
