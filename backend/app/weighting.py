"""How much each piece of feedback counts. Spec: docs/comment-weighting.md.

weight = expertise x recency
- expertise: 3.0 for a person verified in the brand's industry, 1.0 for anyone else
- recency: halves every half-life, never below 0.1; unknown date -> 0.5, future date -> 1.0
"""

import json
import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path

from . import store
from .models import Comment

logger = logging.getLogger(__name__)

VERIFIED_FACTOR = 3.0
REGULAR_FACTOR = 1.0
MIN_RECENCY = 0.1
UNKNOWN_DATE_RECENCY = 0.5
COMMENT_HALF_LIFE = timedelta(hours=24)
REVIEW_HALF_LIFE = timedelta(days=365)

EXPERTS_PATH = store.ROOT / "data" / "industry_experts.json"


@dataclass(frozen=True)
class Expert:
    name: str
    title: str
    industry: str


def expertise_factor(industry_verified: bool) -> float:
    return VERIFIED_FACTOR if industry_verified else REGULAR_FACTOR


def recency_factor(created_at: datetime | None, now: datetime, half_life: timedelta) -> float:
    if created_at is None:
        return UNKNOWN_DATE_RECENCY
    age = max(now - created_at, timedelta(0))  # a future date counts as brand new
    return max(MIN_RECENCY, 0.5 ** (age / half_life))


def weight(
    industry_verified: bool, created_at: datetime | None, now: datetime, half_life: timedelta
) -> float:
    return round(
        expertise_factor(industry_verified) * recency_factor(created_at, now, half_life), 2
    )


# --- who counts as verified ---------------------------------------------------


def _normalize(name: str) -> str:
    return " ".join(name.split()).casefold()


def load_experts(path: Path | None = None) -> tuple[str, dict[str, Expert]]:
    """(brand_industry, experts by normalized name). Empty if the file is missing or broken."""
    target = path or EXPERTS_PATH
    try:
        data = json.loads(target.read_text(encoding="utf-8"))
        experts = [Expert(e["name"], e.get("title", ""), e["industry"]) for e in data["experts"]]
        return str(data["brand_industry"]), {_normalize(e.name): e for e in experts}
    except (OSError, ValueError, KeyError, TypeError) as exc:
        logger.warning("Industry experts list %s unusable, nobody is verified: %s", target, exc)
        return "", {}


def is_brand_industry(industry: str | None, brand_industry: str) -> bool:
    return bool(industry and brand_industry) and _normalize(industry) == _normalize(brand_industry)


def find_verified_expert(author: str | None, path: Path | None = None) -> Expert | None:
    """The expert behind `author`, only if they work in the brand's industry."""
    if not author or not author.strip():
        return None
    brand_industry, experts = load_experts(path)
    expert = experts.get(_normalize(author))
    if expert and is_brand_industry(expert.industry, brand_industry):
        return expert
    return None


# --- comments -----------------------------------------------------------------


def author_fields(author: str | None) -> dict[str, str | bool | None]:
    """Comment fields decided by the backend from the optional author name."""
    expert = find_verified_expert(author)
    typed = " ".join(author.split()) if author and author.strip() else None
    return {
        "author": expert.name if expert else typed,  # verified: the name as on the list
        "author_title": expert.title if expert else None,
        "industry_verified": expert is not None,
    }


def weigh_comments(comments: list[Comment], now: datetime) -> list[Comment]:
    """Copies of the comments with their weight at `now` (recency changes over time)."""
    return [
        c.model_copy(
            update={"weight": weight(c.industry_verified, c.created_at, now, COMMENT_HALF_LIFE)}
        )
        for c in comments
    ]


# --- customer reviews ---------------------------------------------------------


@dataclass(frozen=True)
class WeightedReview:
    text: str
    rating: str
    weight: float
    verified: bool
    date: str | None


def _parse_date(value: str | None) -> datetime | None:
    try:
        return datetime.fromisoformat(value.strip()).replace(tzinfo=UTC) if value else None
    except ValueError:
        return None


def weigh_reviews(rows: list[dict[str, str]], now: datetime) -> list[WeightedReview]:
    """Reviews heaviest first. Optional CSV columns: `date` (YYYY-MM-DD), `verified_industry`."""
    brand_industry, _ = load_experts()
    reviews = []
    for row in rows:
        verified = is_brand_industry(row.get("verified_industry"), brand_industry)
        date = _parse_date(row.get("date"))
        reviews.append(
            WeightedReview(
                text=row.get("text", ""),
                rating=row.get("rating") or "?",
                weight=weight(verified, date, now, REVIEW_HALF_LIFE),
                verified=verified,
                date=date.date().isoformat() if date else None,
            )
        )
    return sorted(reviews, key=lambda r: r.weight, reverse=True)  # stable: CSV order on ties
