"""Thin seam between the orchestrator and the integration modules (trends, adobe, slack).

Each function has a 15s timeout and a fallback, so a missing/failed integration never blocks the
flow. Modules are imported lazily: if Militaru's file isn't there yet, the fallback is used.
"""

import csv
import importlib
import json
import logging
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from typing import Any, TypeVar

from . import store, weighting
from .models import Draft, Task, Trend

log = logging.getLogger(__name__)
T = TypeVar("T")

TIMEOUT_S = 15.0
DATA = store.ROOT / "data"
_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="integration")


def _module(name: str) -> Any | None:
    try:
        return importlib.import_module(f".{name}", __package__)
    except ImportError:
        return None


def _guarded(fn: Callable[[], T], fallback: T, what: str) -> T:
    """Run fn with a timeout; return fallback on any failure."""
    future = _pool.submit(fn)
    try:
        return future.result(timeout=TIMEOUT_S)
    except Exception as exc:  # noqa: BLE001 - integrations must never break the flow
        log.warning("%s failed (%s: %s); using fallback", what, type(exc).__name__, exc)
        future.cancel()
        return fallback


# --- data files -------------------------------------------------------------

DEFAULT_BRAND = (
    "Voice: friendly, witty, plain-spoken. Do: be concrete, own the joke. "
    "Don't: name competitors, promise guaranteed results, or make unsubstantiated claims."
)


def brand_guidelines() -> str:
    try:
        return (DATA / "brand.md").read_text() or DEFAULT_BRAND
    except OSError:
        return DEFAULT_BRAND


def reviews_text(limit: int = 100) -> str | None:
    """Reviews heaviest first, one per line with their weight (docs/comment-weighting.md).

    Review text + rating only (no usernames). None if reviews.csv doesn't exist.
    """
    try:
        with (DATA / "reviews.csv").open(newline="", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
    except OSError:
        return None
    reviews = weighting.weigh_reviews(rows, datetime.now(UTC))[:limit]
    return "\n".join(_review_line(r) for r in reviews) or None


def _review_line(review: weighting.WeightedReview) -> str:
    tags = [f"weight {review.weight:.2f}"]
    if review.verified:
        tags.append("verified industry reviewer")
    if review.date:
        tags.append(review.date)
    return f"[{', '.join(tags)}] ({review.rating}/5) {review.text}"


def scripted_comments() -> list[dict]:
    """data/demo_comments.json: [{role, text}], used by tests and as a demo fallback."""
    try:
        return json.loads((DATA / "demo_comments.json").read_text())
    except (OSError, ValueError):
        return []


# --- trends -----------------------------------------------------------------


def _fallback_trend() -> Trend:
    try:
        d = json.loads((DATA / "demo_trend.json").read_text())
        return Trend.model_validate(d)
    except (OSError, ValueError):
        return Trend(
            id="trend_cozy_autumn_setup",
            title="People are sharing their cozy autumn work-from-anywhere setups",
            source="saved",
            summary="A fast-growing thread: people post photos of their autumn corner (blanket, "
            "candle, laptop, something warm in a mug) with one line about why it makes the grey "
            "week bearable. Top posts are wholesome and low-key; replies reward honesty and mock "
            "anything that looks like an ad.",
            detected_at=datetime.now(UTC),
        )


def current_trend(live: bool = False) -> Trend:
    mod = _module("trends")

    def fetch() -> Trend:
        return Trend.model_validate(mod.get_trend(live=live))  # already a models.Trend

    trend = _guarded(fetch, _fallback_trend(), "trend fetch") if mod else _fallback_trend()
    store.remember_trend(trend)
    return trend


# --- Adobe ------------------------------------------------------------------


def create_visual_and_post(draft: Draft) -> Draft:
    """Generate the visual (Firefly) and create the post (Express). Fills image/doc ids."""
    mod = _module("adobe")
    if mod is None:
        return draft

    def run() -> tuple[str, str]:
        visual = mod.generate_visual(draft.visual_prompt)
        post = mod.create_post(draft.caption, visual.image_url)
        return visual.image_url, post.doc_id

    result = _guarded(run, None, "adobe create")
    if result is None:
        return draft
    return draft.model_copy(update={"image_url": result[0], "express_doc_id": result[1]})


def update_post(old: Draft, new: Draft) -> Draft:
    """Push the applied caption / visual to Express. Returns `new` with image/doc id updated."""
    mod = _module("adobe")
    if mod is None or not old.express_doc_id:
        return new

    def run() -> str:
        image_url = old.image_url or ""
        if new.visual_prompt != old.visual_prompt:
            image_url = mod.generate_visual(new.visual_prompt).image_url
        post = mod.ExpressPost(
            doc_id=old.express_doc_id,
            caption=old.caption,
            image_url=old.image_url or "",
            version=old.version,
            url=mod.EXPRESS_HOME_URL,
        )
        mod.update_post(post, caption=new.caption, image_url=image_url)
        return image_url

    image_url = _guarded(run, None, "adobe update")
    if image_url is None:
        return new
    return new.model_copy(update={"image_url": image_url or new.image_url})


# --- Slack ------------------------------------------------------------------


def send_to_slack(draft: Draft, tasks: list[Task], elapsed: timedelta) -> bool:
    mod = _module("slack")
    if mod is None:
        return False

    def run() -> bool:
        result = mod.send_final_post(draft.caption, draft.image_url, tasks, elapsed)
        return bool(result.sent)

    return _guarded(run, False, "slack")
