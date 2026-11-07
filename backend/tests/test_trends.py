"""Tests for the trend source: the saved file and the mock live trend."""

import json
import socket
import urllib.request
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest

from app import trends
from app.models import Trend


@pytest.fixture(autouse=True)
def saved_path(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "demo_trend.json"
    monkeypatch.setattr(trends, "SAVED_TREND_PATH", path)
    return path


@pytest.fixture(autouse=True)
def live_path(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Missing by default, so live=True falls back to the built-in sample."""
    path = tmp_path / "live_trends.json"
    monkeypatch.setattr(trends, "LIVE_TRENDS_PATH", path)
    return path


LIVE_ITEM = {
    "id": "live_one",
    "title": "Live title",
    "source": "news",
    "url": "https://example.com/article",
    "summary": "Live summary",
    "detected_at": "2026-11-02T00:00:00",
}


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


def test_default_get_trend_returns_the_saved_trend(saved_path: Path) -> None:
    write_saved(saved_path, {"title": "Saved"})
    trend = trends.get_trend()
    assert trend.title == "Saved"
    assert trend.source == "saved"


def test_live_get_trend_returns_the_first_collected_trend(live_path: Path) -> None:
    second = {**LIVE_ITEM, "id": "live_two", "title": "Second"}
    write_saved(live_path, {"about": "test", "trends": [LIVE_ITEM, second]})
    trend = trends.get_trend(live=True)
    assert trend.id == "live_one"
    assert trend.source == "news"
    assert trend.url == "https://example.com/article"
    assert trend.detected_at == datetime(2026, 11, 2, tzinfo=UTC)  # naive read as UTC
    assert [t.id for t in trends.load_live_trends()] == ["live_one", "live_two"]


@pytest.mark.parametrize(
    "content",
    ["not json", "[]", '{"trends": {}}', '{"trends": [{"title": "no other fields"}]}'],
)
def test_unusable_live_file_falls_back_to_the_sample(live_path: Path, content: str) -> None:
    live_path.write_text(content, encoding="utf-8")
    assert trends.get_trend(live=True).id.startswith("mock-reddit-")


def test_repo_live_trends_file_is_valid() -> None:
    """data/live_trends.json, the real file used in the demo, loads and has sources."""
    collected = trends.load_live_trends(trends.DATA_DIR / "live_trends.json")
    assert len(collected) >= 3
    assert all(t.url and t.url.startswith("https://") for t in collected)


def test_live_get_trend_returns_the_mock_trend() -> None:
    trend = trends.get_trend(live=True)
    assert isinstance(trend, Trend)
    assert trend.source == "reddit"
    assert trend.id.startswith("mock-reddit-")
    assert trend.url is None
    assert trend.title and trend.summary
    assert trend.detected_at.tzinfo == UTC
    assert abs(datetime.now(UTC) - trend.detected_at) < timedelta(minutes=1)


def test_get_trend_makes_no_network_calls(
    saved_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def no_network(*args: Any, **kwargs: Any) -> None:
        raise AssertionError("network call attempted")

    monkeypatch.setattr(urllib.request, "urlopen", no_network)
    monkeypatch.setattr(socket.socket, "connect", no_network)
    write_saved(saved_path, {"title": "Saved"})
    assert trends.get_trend().source == "saved"
    assert trends.get_trend(live=True).source == "reddit"
