"""Trend source: the saved demo trend by default, a mock "live" trend on request.

The saved trend in ``data/demo_trend.json`` (owned by Anda) is the default.
"Live" is a mock of a Reddit/news fetch with no network calls: it reads real
trends collected from the web into ``data/live_trends.json`` and returns the
first one, or a built-in sample if that file is missing or malformed. Both
return ``app.models.Trend``.
"""

import hashlib
import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.models import Trend

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
SAVED_TREND_PATH = DATA_DIR / "demo_trend.json"
LIVE_TRENDS_PATH = DATA_DIR / "live_trends.json"

# Fallback "live" trend when data/live_trends.json can't be read. Generic on
# purpose: no real person, brand or news event.
MOCK_LIVE_TREND_ID = "mock-reddit-sample"
MOCK_LIVE_TREND_TITLE = "People share their tiny morning rituals"
MOCK_LIVE_TREND_SUMMARY = (
    "A thread where people swap the small habits that make their mornings "
    "easier, from a short walk to a favourite breakfast."
)


def get_trend(*, live: bool = False) -> Trend:
    """Return the saved trend, or the first collected live trend if ``live``."""
    if not live:
        return load_saved_trend()
    collected = load_live_trends()
    return collected[0] if collected else _mock_live_trend()


def load_live_trends(path: Path | None = None) -> list[Trend]:
    """Read the collected real trends, in file order. Empty if the file is unusable."""
    target = path or LIVE_TRENDS_PATH
    try:
        items = json.loads(target.read_text(encoding="utf-8"))["trends"]
        trends = [Trend.model_validate(item) for item in items]
    # Same reasons as load_saved_trend, plus a missing "trends" key or a non-list.
    except (OSError, ValueError, TypeError, KeyError, RecursionError) as exc:
        logger.warning("Live trends %s unusable, using the built-in sample: %s", target, exc)
        return []
    for trend in trends:
        trend.detected_at = _as_utc(trend.detected_at)
    return trends


def load_saved_trend(path: Path | None = None) -> Trend:
    """Read the saved trend, or return a placeholder if it is missing or malformed."""
    target = path or SAVED_TREND_PATH
    try:
        return _trend_from_saved(json.loads(target.read_text(encoding="utf-8")))
    # ValueError covers bad JSON and Pydantic's ValidationError. RecursionError
    # comes from deeply nested JSON. This is the default demo path: never raise.
    except (OSError, ValueError, TypeError, RecursionError) as exc:
        logger.warning("Saved trend %s unusable, using placeholder: %s", target, exc)
        return _placeholder_trend()


def _mock_live_trend() -> Trend:
    # No url: there is no real Reddit page to link to.
    return Trend(
        id=MOCK_LIVE_TREND_ID,
        title=MOCK_LIVE_TREND_TITLE,
        source="reddit",
        url=None,
        summary=MOCK_LIVE_TREND_SUMMARY,
        detected_at=_now_utc(),
    )


def _trend_from_saved(data: Any) -> Trend:
    if not isinstance(data, dict):
        raise TypeError("saved trend is not a JSON object")
    title = data.get("title")
    if not isinstance(title, str) or not title.strip():
        raise ValueError("saved trend has no title")
    trend = Trend(
        id=data.get("id") or _saved_id(title),
        title=title,
        source="saved",
        url=data.get("url"),
        summary=data.get("summary") or title,
        detected_at=data.get("detected_at") or _now_utc(),
    )
    trend.detected_at = _as_utc(trend.detected_at)
    return trend


def _placeholder_trend() -> Trend:
    return Trend(
        id="saved-placeholder",
        title="Demo trend (placeholder)",
        source="saved",
        summary="Placeholder trend: data/demo_trend.json is missing or malformed.",
        detected_at=_now_utc(),
    )


def _saved_id(title: str) -> str:
    """Same title, same id, across restarts."""
    return "saved-" + hashlib.sha256(title.encode()).hexdigest()[:12]


def _as_utc(value: datetime) -> datetime:
    """Convert to UTC, treating a naive timestamp as UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _now_utc() -> datetime:
    return datetime.now(UTC)
