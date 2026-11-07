"""Trend source: the saved demo trend by default, Reddit when explicitly asked.

``Trend`` is a frozen dataclass mirroring the ``Trend`` model in ARCHITECTURE.md
section 6, because ``models.py`` does not exist yet. Stefan can replace it with the
Pydantic model later: the field names and types match, and every construction here
uses keyword arguments.

Reddit content is untrusted. It is stored as plain data and never interpreted here;
prompts must wrap it in ``<trend>`` tags (ARCHITECTURE.md section 7). Post text is
never logged.
"""

import hashlib
import json
import logging
import os
import re
import urllib.request
from dataclasses import dataclass
from datetime import UTC, datetime
from http.client import HTTPException
from pathlib import Path
from typing import Any, Literal

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


@dataclass(frozen=True)
class Trend:
    id: str
    title: str
    source: Literal["reddit", "news", "saved"]
    url: str | None
    summary: str
    detected_at: datetime


class TrendFetchError(Exception):
    """A live trend could not be fetched or normalised."""


def get_trend(*, live: bool = False, timeout_s: float = DEFAULT_TIMEOUT_S) -> Trend:
    """Return the saved trend, or a Reddit trend if ``live`` and Reddit cooperates."""
    if not live:
        return load_saved_trend()
    try:
        return fetch_reddit_trend(timeout_s=timeout_s)
    except TrendFetchError as exc:
        logger.warning("Live trend fetch failed, using saved trend: %s", exc)
    # Deliberately broad: a live fetch must never break the demo flow.
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Unexpected live trend error, using saved trend: %s", type(exc).__name__
        )
    return load_saved_trend()


def load_saved_trend(path: Path | None = None) -> Trend:
    """Read the saved trend, or return a placeholder if it is missing or malformed."""
    target = path if path is not None else SAVED_TREND_PATH
    try:
        return _trend_from_saved(json.loads(target.read_text(encoding="utf-8")))
    except (OSError, ValueError, TypeError, RecursionError) as exc:
        logger.warning("Saved trend %s unusable, using placeholder: %s", target, exc)
        return _placeholder_trend()


def fetch_reddit_trend(
    subreddit: str | None = None, *, timeout_s: float = DEFAULT_TIMEOUT_S
) -> Trend:
    """Return the first usable hot post, or raise ``TrendFetchError``."""
    name = _resolve_subreddit(subreddit)
    url = f"{REDDIT_BASE_URL}/r/{name}/hot.json?limit=25"
    return _trend_from_post(_first_eligible_post(_fetch_json(url, timeout_s)))


def _trend_from_saved(data: Any) -> Trend:
    if not isinstance(data, dict):
        raise TypeError("expected a JSON object")
    title = _non_empty_str(data.get("title"))
    if title is None:
        raise ValueError("missing title")
    url = data.get("url")
    return Trend(
        id=_non_empty_str(data.get("id")) or _saved_id(title),
        title=title,
        source="saved",
        url=url if isinstance(url, str) else None,
        summary=_non_empty_str(data.get("summary")) or title,
        detected_at=_parse_detected_at(data.get("detected_at")),
    )


def _placeholder_trend() -> Trend:
    return Trend(
        id="saved-placeholder",
        title="Demo trend (placeholder)",
        source="saved",
        url=None,
        summary="Placeholder trend: data/demo_trend.json is missing or malformed.",
        detected_at=_now_utc(),
    )


def _saved_id(title: str) -> str:
    """Derive an id that stays the same across restarts for the same title."""
    digest = hashlib.sha256(title.encode("utf-8", "replace")).hexdigest()
    return f"saved-{digest[:12]}"


def _parse_detected_at(value: Any) -> datetime:
    """Parse an ISO timestamp to UTC; naive means UTC, unusable means now."""
    if not isinstance(value, str):
        return _now_utc()
    try:
        parsed = datetime.fromisoformat(value)
        if parsed.utcoffset() is None:
            return parsed.replace(tzinfo=UTC)
        return parsed.astimezone(UTC)
    except (ValueError, OverflowError):
        return _now_utc()


def _resolve_subreddit(subreddit: str | None) -> str:
    name = subreddit
    if name is None:
        name = os.environ.get(SUBREDDIT_ENV_VAR) or DEFAULT_SUBREDDIT
    if not SUBREDDIT_PATTERN.fullmatch(name):
        raise TrendFetchError(f"Invalid subreddit name: {name!r}")
    return name


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
    except (ValueError, RecursionError) as exc:
        raise TrendFetchError("Reddit response is not valid JSON") from exc


def _first_eligible_post(payload: Any) -> dict[str, Any]:
    data = payload.get("data") if isinstance(payload, dict) else None
    children = data.get("children") if isinstance(data, dict) else None
    if not isinstance(children, list):
        raise TrendFetchError("Reddit response has an unexpected shape")
    for child in children:
        post = child.get("data") if isinstance(child, dict) else None
        if isinstance(post, dict) and _is_eligible(post):
            return post
    raise TrendFetchError("Reddit listing has no eligible post")


def _is_eligible(post: dict[str, Any]) -> bool:
    if post.get("stickied") or post.get("over_18"):
        return False
    return _non_empty_str(post.get("title")) is not None


def _trend_from_post(post: dict[str, Any]) -> Trend:
    post_id = _non_empty_str(post.get("id"))
    permalink = post.get("permalink")
    if post_id is None:
        raise TrendFetchError("Reddit post has no id")
    # Requiring the slash keeps a hostile value such as "@evil.example" off our host.
    if not isinstance(permalink, str) or not permalink.startswith("/"):
        raise TrendFetchError("Reddit post has no usable permalink")
    title = post["title"]
    selftext = _non_empty_str(post.get("selftext"))
    return Trend(
        id=f"reddit-{post_id}",
        title=title,
        source="reddit",
        url=f"{REDDIT_BASE_URL}{permalink}",
        summary=selftext[:MAX_SUMMARY_CHARS] if selftext else title,
        detected_at=_now_utc(),
    )


def _non_empty_str(value: Any) -> str | None:
    return value if isinstance(value, str) and value.strip() else None


def _now_utc() -> datetime:
    return datetime.now(UTC)
