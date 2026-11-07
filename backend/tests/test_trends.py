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
