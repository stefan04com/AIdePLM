"""Trend source: the saved demo trend by default, a mock "live" trend on request.

The saved trend in ``data/demo_trend.json`` (owned by Anda) is the default.
"Live" is a mock of a Reddit fetch: nothing contacts Reddit, there are no
network calls, and it returns a built-in sample trend. Both return
``app.models.Trend``.
"""

import hashlib
import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.models import Trend

logger = logging.getLogger(__name__)

SAVED_TREND_PATH = Path(__file__).resolve().parents[2] / "data" / "demo_trend.json"

# Sample "live" trend. Generic on purpose: no real person, brand or news event.
# The team can replace the title and summary with any sample they prefer.
MOCK_LIVE_TREND_ID = "mock-reddit-sample"
MOCK_LIVE_TREND_TITLE = "People share their tiny morning rituals"
MOCK_LIVE_TREND_SUMMARY = (
    "A thread where people swap the small habits that make their mornings "
    "easier, from a short walk to a favourite breakfast."
)


def get_trend(*, live: bool = False) -> Trend:
    """Return the saved trend, or the mock live trend if ``live``."""
    return _mock_live_trend() if live else load_saved_trend()


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
