"""Hashtag suggestions from the saved cache in ``data/hashtags.json``.

The cache holds real hashtags collected from public, citable pages (each with
its source URL) for the Boabe demo themes and the live trends. Nothing here
calls the network: ``suggest()`` matches the post's keywords to the cached
topics, ranks niche and local tags before broad ones, removes duplicates and
caps the list (Boabe's brand rule: at most 3 hashtags unless ``limit`` says
otherwise, never more than the platform allows). It never raises: a missing or
malformed file gives empty suggestions and a warning in the log.
"""

import json
import logging
import re
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
HASHTAGS_PATH = DATA_DIR / "hashtags.json"

# Boabe brand guidelines: "Max 3 hashtags."
BRAND_MAX_HASHTAGS = 3
DEFAULT_PLATFORM = "instagram"

Kind = Literal["niche", "local", "branded-generic", "broad"]


class HashtagSuggestion(BaseModel):
    model_config = ConfigDict(frozen=True)

    tag: str
    kind: Kind
    topic: str
    evidence: str
    source_url: str
    source: Literal["saved"] = "saved"


class PlatformLimit(BaseModel):
    model_config = ConfigDict(frozen=True)

    platform: str
    max_hashtags_per_post: int | None = None
    recommended: str | None = None
    note: str = ""
    source: str = ""


class HashtagTopic(BaseModel):
    model_config = ConfigDict(frozen=True)

    topic: str
    keywords: tuple[str, ...]
    hashtags: tuple[HashtagSuggestion, ...]


class HashtagCache(BaseModel):
    model_config = ConfigDict(frozen=True)

    collected_at: str | None = None
    platform_limits: tuple[PlatformLimit, ...] = ()
    topics: tuple[HashtagTopic, ...] = ()


class HashtagSuggestions(BaseModel):
    model_config = ConfigDict(frozen=True)

    platform: str
    hashtags: tuple[HashtagSuggestion, ...] = ()
    cap: int = 0
    matched_topics: tuple[str, ...] = ()
    collected_at: str | None = None
    source: Literal["saved"] = "saved"
    platform_note: str = ""
    platform_source: str = ""


def load_hashtags(path: Path | None = None) -> HashtagCache:
    """Read the saved cache. Empty if the file is missing or malformed.

    Single bad hashtag entries (no ``#``, no http(s) source, unknown kind) are
    skipped with a warning instead of dropping the whole file.
    """
    target = path or HASHTAGS_PATH
    try:
        data = json.loads(target.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise TypeError("hashtag cache is not a JSON object")
        topics = data.get("topics")
        if not isinstance(topics, list):
            raise TypeError("hashtag cache has no 'topics' list")
        return HashtagCache(
            collected_at=_str_or_none(data.get("collected_at")),
            platform_limits=_parse_limits(data.get("platform_limits")),
            topics=tuple(t for t in (_parse_topic(item) for item in topics) if t is not None),
        )
    # ValueError covers bad JSON and Pydantic's ValidationError; RecursionError
    # comes from deeply nested JSON. This feeds the demo: never raise.
    except (OSError, ValueError, TypeError, AttributeError, RecursionError) as exc:
        logger.warning("Hashtag cache %s unusable, no suggestions: %s", target, exc)
        return HashtagCache()


def suggest(
    keywords: list[str],
    platform: str = DEFAULT_PLATFORM,
    limit: int | None = None,
    *,
    path: Path | None = None,
) -> HashtagSuggestions:
    """Return saved hashtags for ``keywords``, ranked and capped for ``platform``."""
    try:
        return _suggest(keywords, platform, limit, load_hashtags(path))
    except Exception as exc:  # last line of defence for the demo
        logger.warning("Hashtag suggestions failed, returning none: %s", exc)
        return HashtagSuggestions(platform=str(platform or DEFAULT_PLATFORM).lower())


def _suggest(
    keywords: list[str], platform: str, limit: int | None, cache: HashtagCache
) -> HashtagSuggestions:
    name = (platform or DEFAULT_PLATFORM).strip().lower()
    platform_limit = _limit_for(name, cache.platform_limits)
    cap = _cap(platform_limit, limit)
    wanted = [_normalise(k) for k in keywords or [] if isinstance(k, str)]
    wanted = [k for k in wanted if k]

    matched = _matched_topics(cache.topics, wanted)
    seen: set[str] = set()
    unique: list[HashtagSuggestion] = []
    for item in _ranked(matched):
        key = item.tag.lower()
        if key not in seen:
            seen.add(key)
            unique.append(item)

    return HashtagSuggestions(
        platform=name,
        hashtags=tuple(unique[:cap]),
        cap=cap,
        matched_topics=tuple(t.topic for t in matched),
        collected_at=cache.collected_at,
        platform_note=platform_limit.note if platform_limit else "",
        platform_source=platform_limit.source if platform_limit else "",
    )


def _limit_for(name: str, limits: tuple[PlatformLimit, ...]) -> PlatformLimit | None:
    by_name = {item.platform.lower(): item for item in limits}
    if name in by_name:
        return by_name[name]
    logger.warning("No hashtag limits for platform %r, using %s", name, DEFAULT_PLATFORM)
    return by_name.get(DEFAULT_PLATFORM)


def _cap(platform_limit: PlatformLimit | None, limit: int | None) -> int:
    """Brand max (or ``limit``), never above what the platform allows or recommends."""
    hard = platform_limit.max_hashtags_per_post if platform_limit else None
    recommended = _upper_bound(platform_limit.recommended) if platform_limit else None
    if limit is None:
        bounds = [BRAND_MAX_HASHTAGS, recommended, hard]
    else:
        bounds = [max(int(limit), 0), hard if hard is not None else recommended]
    return min(b for b in bounds if b is not None)


def _upper_bound(recommended: str | None) -> int | None:
    """``"3-5"`` → 5, ``"2"`` → 2, anything else → None."""
    numbers = re.findall(r"\d+", recommended or "")
    return int(numbers[-1]) if numbers else None


def _matched_topics(topics: tuple[HashtagTopic, ...], wanted: list[str]) -> list[HashtagTopic]:
    """Topics hit by a keyword, ordered by the first keyword that hits them.

    For the same keyword, an exact match ("pumpkin latte" = "pumpkin latte")
    beats a word inside it ("latte"); ties keep file order.
    """
    scored = []
    for order, topic in enumerate(topics):
        score = _match_score(topic, wanted)
        if score is not None:
            scored.append((score, order, topic))
    scored.sort(key=lambda item: (item[0], item[1]))
    return [topic for _, _, topic in scored]


def _match_score(topic: HashtagTopic, wanted: list[str]) -> tuple[int, int] | None:
    names = [n for n in (_normalise(k) for k in (*topic.keywords, topic.topic)) if n]
    for index, word in enumerate(wanted):
        if word in names:
            return (index, 0)
        if any(_phrase_in(name, word) for name in names):
            return (index, 1)
    return None


def _ranked(topics: list[HashtagTopic]) -> list[HashtagSuggestion]:
    """Niche/local before broad; inside each group, take turns across topics.

    Taking turns keeps a 3-tag cap from being filled by one topic, so
    "pumpkin latte, cozy autumn" gets one tag of each before a second of either.
    """
    keyed = []
    for topic_order, topic in enumerate(topics):
        own = sorted(topic.hashtags, key=_group)  # stable: file order inside a group
        for position, item in enumerate(own):
            keyed.append(((_group(item), position, topic_order), item))
    keyed.sort(key=lambda pair: pair[0])
    return [item for _, item in keyed]


def _group(item: HashtagSuggestion) -> int:
    return 1 if item.kind == "broad" else 0


def _phrase_in(keyword: str, text: str) -> bool:
    """True if ``keyword`` is ``text`` or appears in it as whole words."""
    return keyword == text or f" {keyword} " in f" {text} "


def _normalise(text: str) -> str:
    """Lowercase, drop a leading ``#`` and collapse punctuation to single spaces."""
    text = text.strip().lower().lstrip("#")
    return " ".join(re.sub(r"[^\w&']+", " ", text).split())


def _parse_limits(items: Any) -> tuple[PlatformLimit, ...]:
    if not isinstance(items, list):
        return ()
    limits = []
    for item in items:
        try:
            limits.append(PlatformLimit.model_validate(item))
        except ValueError as exc:
            logger.warning("Skipping malformed platform limit %r: %s", item, exc)
    return tuple(limits)


def _parse_topic(item: Any) -> HashtagTopic | None:
    if not isinstance(item, dict) or not isinstance(item.get("topic"), str):
        logger.warning("Skipping malformed hashtag topic %r", item)
        return None
    topic = item["topic"]
    keywords = tuple(k for k in item.get("keywords") or [] if isinstance(k, str))
    hashtags = []
    for raw in item.get("hashtags") or []:
        parsed = _parse_hashtag(raw, topic)
        if parsed is not None:
            hashtags.append(parsed)
    return HashtagTopic(topic=topic, keywords=keywords, hashtags=tuple(hashtags))


def _parse_hashtag(raw: Any, topic: str) -> HashtagSuggestion | None:
    if not isinstance(raw, dict):
        logger.warning("Skipping malformed hashtag %r in %s", raw, topic)
        return None
    tag, url = raw.get("tag"), raw.get("source")
    if not isinstance(tag, str) or not re.fullmatch(r"#\w+", tag.strip()):
        logger.warning("Skipping hashtag with a bad tag %r in %s", tag, topic)
        return None
    if not isinstance(url, str) or not url.startswith(("https://", "http://")):
        logger.warning("Skipping hashtag %s in %s: no source URL", tag, topic)
        return None
    try:
        return HashtagSuggestion(
            tag=tag.strip(),
            kind=raw.get("kind"),
            topic=topic,
            evidence=str(raw.get("evidence") or ""),
            source_url=url,
        )
    except ValueError as exc:
        logger.warning("Skipping hashtag %s in %s: %s", tag, topic, exc)
        return None


def _str_or_none(value: Any) -> str | None:
    return value if isinstance(value, str) else None
