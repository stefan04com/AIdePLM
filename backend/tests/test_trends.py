"""Tests for the trend source. ``urlopen`` is always faked; nothing hits the network."""

import json
import logging
import urllib.error
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, Self

import pytest

from app import trends
from app.trends import TrendFetchError

MAX_BYTES = 5 * 1024 * 1024


class FakeUrlopen:
    """Stands in for ``urlopen`` and its response: raises or returns ``reply``."""

    def __init__(self, reply: Any) -> None:
        self.reply = reply
        self.calls: list[tuple[Any, float]] = []
        self.read_size: int | None = None

    def __call__(self, request: Any, timeout: float) -> Self:
        self.calls.append((request, timeout))
        if isinstance(self.reply, Exception):
            raise self.reply
        return self

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *args: object) -> None:
        pass

    def read(self, size: int) -> bytes:
        self.read_size = size
        if isinstance(self.reply, bytes):
            return self.reply[:size]
        return json.dumps(self.reply).encode()[:size]


def post(**overrides: Any) -> dict[str, Any]:
    return {
        "id": "abc123",
        "title": "A hot post",
        "permalink": "/r/popular/comments/abc123/a_hot_post/",
        "selftext": "Post body",
        **overrides,
    }


def listing(*posts: dict[str, Any]) -> dict[str, Any]:
    return {"data": {"children": [{"data": p} for p in posts]}}


@pytest.fixture(autouse=True)
def reddit(monkeypatch: pytest.MonkeyPatch) -> FakeUrlopen:
    """Every test gets a fake Reddit that serves one good post by default."""
    fake = FakeUrlopen(listing(post()))
    monkeypatch.setattr(trends.urllib.request, "urlopen", fake)
    monkeypatch.delenv(trends.SUBREDDIT_ENV_VAR, raising=False)
    return fake


@pytest.fixture(autouse=True)
def saved_path(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "demo_trend.json"
    monkeypatch.setattr(trends, "SAVED_TREND_PATH", path)
    return path


def write_saved(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data), encoding="utf-8")


# Saved trend


def test_saved_file_is_loaded_with_source_forced_to_saved(saved_path: Path) -> None:
    saved = {
        "id": "t1",
        "title": "Saved title",
        "source": "reddit",
        "url": "https://example.com/t1",
        "summary": "Saved summary",
        "detected_at": "2026-11-07T10:00:00+00:00",
    }
    write_saved(saved_path, saved)
    trend = trends.load_saved_trend()
    assert trend.model_dump() == {
        **saved,
        "source": "saved",
        "detected_at": datetime(2026, 11, 7, 10, tzinfo=UTC),
    }


def test_saved_file_with_only_a_title_gets_defaults(saved_path: Path) -> None:
    write_saved(saved_path, {"title": "Just a title"})
    trend = trends.load_saved_trend()
    assert trend.id.startswith("saved-")
    assert trend.id == trends.load_saved_trend().id
    assert trend.summary == "Just a title"
    assert trend.url is None
    assert abs(datetime.now(UTC) - trend.detected_at) < timedelta(minutes=1)


@pytest.mark.parametrize("raw", ["2026-11-07T10:00:00", "2026-11-07T12:00:00+02:00"])
def test_saved_timestamp_becomes_utc(saved_path: Path, raw: str) -> None:
    write_saved(saved_path, {"title": "t", "detected_at": raw})
    detected_at = trends.load_saved_trend().detected_at
    assert detected_at == datetime(2026, 11, 7, 10, tzinfo=UTC)
    assert detected_at.tzinfo == UTC


def test_missing_saved_file_gives_placeholder() -> None:
    assert trends.load_saved_trend().id == "saved-placeholder"


@pytest.mark.parametrize(
    "content",
    [
        "not json",
        "[]",
        '{"summary": "no title"}',
        '{"title": "t", "id": 5}',
        "[" * 100_000 + "]" * 100_000,
    ],
)
def test_malformed_saved_file_gives_placeholder(saved_path: Path, content: str) -> None:
    saved_path.write_text(content, encoding="utf-8")
    assert trends.load_saved_trend().id == "saved-placeholder"


# get_trend


def test_default_get_trend_never_touches_the_network(
    reddit: FakeUrlopen, saved_path: Path
) -> None:
    write_saved(saved_path, {"title": "Saved"})
    assert trends.get_trend().title == "Saved"
    assert reddit.calls == []


def test_live_get_trend_returns_the_reddit_post(reddit: FakeUrlopen) -> None:
    trend = trends.get_trend(live=True, timeout_s=3.0)
    assert trend.id == "reddit-abc123"
    assert trend.source == "reddit"
    assert trend.title == "A hot post"
    assert trend.summary == "Post body"
    assert trend.url == "https://www.reddit.com/r/popular/comments/abc123/a_hot_post/"
    request, timeout = reddit.calls[0]
    assert request.full_url == "https://www.reddit.com/r/popular/hot.json?limit=25"
    assert request.get_header("User-agent") == "moment-hackathon/0.1"
    assert timeout == 3.0


@pytest.mark.parametrize(
    "reply",
    [
        urllib.error.URLError("no route"),
        TimeoutError("timed out"),
        RuntimeError("something unexpected"),
        b"<html>blocked</html>",
        {"unexpected": "shape"},
    ],
)
def test_live_failure_falls_back_to_saved_trend(
    reddit: FakeUrlopen, saved_path: Path, reply: Any
) -> None:
    reddit.reply = reply
    write_saved(saved_path, {"title": "Saved"})
    assert trends.get_trend(live=True).title == "Saved"


def test_live_failure_does_not_log_post_text(
    reddit: FakeUrlopen, caplog: pytest.LogCaptureFixture
) -> None:
    reddit.reply = RuntimeError("secret post text")
    with caplog.at_level(logging.DEBUG):
        trends.get_trend(live=True)
    assert "secret post text" not in caplog.text


# fetch_reddit_trend


def test_fetch_skips_stickied_adult_and_untitled_posts(reddit: FakeUrlopen) -> None:
    reddit.reply = listing(
        post(id="a", stickied=True),
        post(id="b", over_18=True),
        post(id="c", title="  "),
        post(id="d"),
    )
    assert trends.fetch_reddit_trend().id == "reddit-d"


def test_fetch_rejects_a_permalink_without_leading_slash(reddit: FakeUrlopen) -> None:
    reddit.reply = listing(post(permalink="@evil.example/"))
    with pytest.raises(TrendFetchError):
        trends.fetch_reddit_trend()


@pytest.mark.parametrize("name", ["a", "x" * 22, "bad/name", "../etc", "pop ular"])
def test_invalid_subreddit_is_rejected_before_any_request(
    reddit: FakeUrlopen, monkeypatch: pytest.MonkeyPatch, name: str
) -> None:
    with pytest.raises(TrendFetchError):
        trends.fetch_reddit_trend(name)
    monkeypatch.setenv(trends.SUBREDDIT_ENV_VAR, name)
    with pytest.raises(TrendFetchError):
        trends.fetch_reddit_trend()
    assert reddit.calls == []


def test_summary_is_capped_at_500_chars(reddit: FakeUrlopen) -> None:
    reddit.reply = listing(post(selftext="x" * 600))
    assert trends.fetch_reddit_trend().summary == "x" * 500


def test_summary_falls_back_to_title(reddit: FakeUrlopen) -> None:
    reddit.reply = listing(post(selftext=""))
    assert trends.fetch_reddit_trend().summary == "A hot post"


def test_response_over_5_mb_is_rejected(reddit: FakeUrlopen) -> None:
    reddit.reply = b" " * (MAX_BYTES + 1)
    with pytest.raises(TrendFetchError):
        trends.fetch_reddit_trend()
    assert reddit.read_size == MAX_BYTES + 1
