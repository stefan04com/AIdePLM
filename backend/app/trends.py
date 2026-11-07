"""Trend source: the saved demo trend by default, Reddit only when asked.

Returns ``app.models.Trend``. Reddit content is untrusted: it is stored as plain
data, prompts must wrap it in ``<trend>`` tags (ARCHITECTURE.md section 7), and
post text is never logged.
"""

import hashlib
import json
import logging
import os
import re
import urllib.request
from datetime import UTC, datetime
from http.client import HTTPException
from pathlib import Path
from typing import Any

from app.models import Trend

logger = logging.getLogger(__name__)

SAVED_TREND_PATH = Path(__file__).resolve().parents[2] / "data" / "demo_trend.json"

DEFAULT_TIMEOUT_S = 15.0
DEFAULT_SUBREDDIT = "popular"
SUBREDDIT_ENV_VAR = "REDDIT_SUBREDDIT"
SUBREDDIT_PATTERN = re.compile(r"[A-Za-z0-9_]{2,21}")
REDDIT_BASE_URL = "https://www.reddit.com"
USER_AGENT = "moment-hackathon/0.1"
MAX_RESPONSE_BYTES = 5 * 1024 * 1024
MAX_SUMMARY_CHARS = 500


class TrendFetchError(Exception):
    """A live trend could not be fetched or used."""


def get_trend(*, live: bool = False, timeout_s: float = DEFAULT_TIMEOUT_S) -> Trend:
    """Return the saved trend, or a Reddit trend if ``live`` and Reddit cooperates."""
    if not live:
        return load_saved_trend()
    try:
        return fetch_reddit_trend(timeout_s=timeout_s)
    except TrendFetchError as exc:
        logger.warning("Live trend fetch failed, using saved trend: %s", exc)
    except Exception as exc:  # noqa: BLE001
        # A live fetch must never break the demo. Log only the type: the message
        # of an unexpected error could contain post text.
        logger.warning("Live trend error, using saved trend: %s", type(exc).__name__)
    return load_saved_trend()


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


def fetch_reddit_trend(
    subreddit: str | None = None, *, timeout_s: float = DEFAULT_TIMEOUT_S
) -> Trend:
    """Return the first usable hot post, or raise ``TrendFetchError``."""
    name = _subreddit_name(subreddit)
    payload = _fetch_json(f"{REDDIT_BASE_URL}/r/{name}/hot.json?limit=25", timeout_s)
    return _trend_from_post(_first_eligible_post(payload))


def _trend_from_saved(data: Any) -> Trend:
    if not isinstance(data, dict):
        raise TypeError("saved trend is not a JSON object")
    title = data.get("title")
    if not _has_text(title):
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


def _subreddit_name(subreddit: str | None) -> str:
    if subreddit is None:
        subreddit = os.environ.get(SUBREDDIT_ENV_VAR) or DEFAULT_SUBREDDIT
    if not SUBREDDIT_PATTERN.fullmatch(subreddit):
        raise TrendFetchError(f"Invalid subreddit name: {subreddit!r}")
    return subreddit


def _fetch_json(url: str, timeout_s: float) -> Any:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=timeout_s) as response:
            body = response.read(MAX_RESPONSE_BYTES + 1)
    except (OSError, HTTPException, ValueError) as exc:
        raise TrendFetchError(f"Reddit request failed: {exc}") from exc
    if len(body) > MAX_RESPONSE_BYTES:
        raise TrendFetchError(f"Reddit response exceeds {MAX_RESPONSE_BYTES} bytes")
    try:
        return json.loads(body)
    except ValueError as exc:
        raise TrendFetchError("Reddit response is not valid JSON") from exc


def _first_eligible_post(payload: Any) -> dict[str, Any]:
    try:
        posts = [child["data"] for child in payload["data"]["children"]]
    except (KeyError, TypeError) as exc:
        raise TrendFetchError("Reddit response has an unexpected shape") from exc
    for post in posts:
        if _is_eligible(post):
            return post
    raise TrendFetchError("Reddit listing has no eligible post")


def _is_eligible(post: Any) -> bool:
    if not isinstance(post, dict) or post.get("stickied") or post.get("over_18"):
        return False
    permalink = post.get("permalink")
    return (
        _has_text(post.get("title"))
        and _has_text(post.get("id"))
        and isinstance(permalink, str)
        # The leading slash stops a permalink like "@evil.example" changing the host.
        and permalink.startswith("/")
    )


def _trend_from_post(post: dict[str, Any]) -> Trend:
    selftext = post.get("selftext")
    return Trend(
        id=f"reddit-{post['id']}",
        title=post["title"],
        source="reddit",
        url=REDDIT_BASE_URL + post["permalink"],
        summary=selftext[:MAX_SUMMARY_CHARS] if _has_text(selftext) else post["title"],
        detected_at=_now_utc(),
    )


def _has_text(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _now_utc() -> datetime:
    return datetime.now(UTC)
