"""Recommended posting windows per platform, read from ``data/posting_windows.json``.

The file holds industry averages from "best time to post" reports (Sprout Social,
Buffer, Hootsuite, ...) with their sources and a confidence tag. Times are the
audience's local time. Nothing here contacts the network. If the file is missing
or malformed the loader logs a warning and returns an empty list: never raises.
"""

import json
import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
POSTING_WINDOWS_PATH = DATA_DIR / "posting_windows.json"

DAYS = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")
CONFIDENCE_LEVELS = ("high", "medium", "low")
_TIME = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


@dataclass(frozen=True)
class Source:
    name: str
    url: str
    accessed: str


@dataclass(frozen=True)
class Window:
    days: tuple[str, ...]
    start: str  # "HH:MM", audience's local time
    end: str


@dataclass(frozen=True)
class PlatformWindows:
    platform: str
    best_days: tuple[str, ...]
    windows: tuple[Window, ...]
    avoid: str
    reason: str
    confidence: str
    sources: tuple[Source, ...]


def load_posting_windows(path: Path | None = None) -> list[PlatformWindows]:
    """Read every platform's windows, in file order. Empty if the file is unusable."""
    target = path or POSTING_WINDOWS_PATH
    try:
        data = json.loads(target.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise TypeError("posting windows file is not a JSON object")
        return [_platform(item) for item in _list(data.get("platforms"), "platforms")]
    # ValueError covers bad JSON and our own checks; RecursionError comes from deeply
    # nested JSON. A recommendation is optional: never raise.
    except (OSError, ValueError, TypeError, KeyError, RecursionError) as exc:
        logger.warning("Posting windows %s unusable, no recommendation: %s", target, exc)
        return []


def recommend(platform: str, path: Path | None = None) -> PlatformWindows | None:
    """Windows for one platform ("instagram", "x", ...), or None if unknown."""
    wanted = platform.strip().lower()
    for item in load_posting_windows(path):
        if item.platform == wanted:
            return item
    return None


def _platform(item: Any) -> PlatformWindows:
    if not isinstance(item, dict):
        raise TypeError("platform entry is not a JSON object")
    confidence = _text(item, "confidence")
    if confidence not in CONFIDENCE_LEVELS:
        raise ValueError(f"unknown confidence {confidence!r}")
    sources = tuple(_source(s) for s in _list(item.get("sources"), "sources"))
    if not sources:
        raise ValueError("platform has no source")
    return PlatformWindows(
        platform=_text(item, "platform").lower(),
        best_days=_days(item.get("best_days")),
        windows=tuple(_window(w) for w in _list(item.get("windows"), "windows")),
        avoid=_text(item, "avoid"),
        reason=_text(item, "reason"),
        confidence=confidence,
        sources=sources,
    )


def _window(item: Any) -> Window:
    if not isinstance(item, dict):
        raise TypeError("window is not a JSON object")
    start, end = _text(item, "start"), _text(item, "end")
    if not _TIME.match(start) or not _TIME.match(end):
        raise ValueError(f"bad window time {start!r}-{end!r}")
    return Window(days=_days(item.get("days")), start=start, end=end)


def _source(item: Any) -> Source:
    if not isinstance(item, dict):
        raise TypeError("source is not a JSON object")
    url = _text(item, "url")
    if not url.startswith("https://"):
        raise ValueError(f"source url is not https: {url!r}")
    return Source(name=_text(item, "name"), url=url, accessed=_text(item, "accessed"))


def _days(value: Any) -> tuple[str, ...]:
    days = tuple(_list(value, "days"))
    if not days or any(day not in DAYS for day in days):
        raise ValueError(f"bad days {days!r}")
    return days


def _list(value: Any, name: str) -> list[Any]:
    if not isinstance(value, list):
        raise TypeError(f"{name} is not a list")
    return value


def _text(item: dict[str, Any], key: str) -> str:
    value = item.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"missing or empty {key!r}")
    return value
