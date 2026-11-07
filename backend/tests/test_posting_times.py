"""Tests for the posting windows: the real data file and the fallbacks."""

import json
import logging
from pathlib import Path

import pytest

from app import posting_times
from app.posting_times import PlatformWindows, load_posting_windows, recommend

EXPECTED = {"instagram", "tiktok", "x", "linkedin", "facebook", "youtube_shorts"}


def test_real_file_loads_every_platform_with_a_source() -> None:
    platforms = load_posting_windows()

    assert EXPECTED <= {p.platform for p in platforms}
    for item in platforms:
        assert item.sources, item.platform
        assert all(s.url.startswith("https://") for s in item.sources)
        assert item.windows and item.best_days and item.reason
        assert item.confidence in posting_times.CONFIDENCE_LEVELS


def test_recommend_known_platform_ignores_case() -> None:
    result = recommend(" LinkedIn ")

    assert isinstance(result, PlatformWindows)
    assert result.platform == "linkedin"
    assert result.windows[0].start < result.windows[0].end


def test_recommend_unknown_platform_is_none() -> None:
    assert recommend("myspace") is None


def test_missing_file_returns_empty_and_warns(
    tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    missing = tmp_path / "nope.json"

    with caplog.at_level(logging.WARNING):
        assert load_posting_windows(missing) == []
        assert recommend("instagram", missing) is None
    assert "unusable" in caplog.text


@pytest.mark.parametrize(
    "content",
    [
        "{not json",
        "[]",
        json.dumps({"platforms": "instagram"}),
        json.dumps({"platforms": [{"platform": "x"}]}),
        "[" * 100_000,
    ],
)
def test_malformed_file_returns_empty(tmp_path: Path, content: str) -> None:
    path = tmp_path / "posting_windows.json"
    path.write_text(content, encoding="utf-8")

    assert load_posting_windows(path) == []


def test_entry_without_sources_is_rejected(tmp_path: Path) -> None:
    data = json.loads(posting_times.POSTING_WINDOWS_PATH.read_text(encoding="utf-8"))
    data["platforms"][0]["sources"] = []
    path = tmp_path / "posting_windows.json"
    path.write_text(json.dumps(data), encoding="utf-8")

    assert load_posting_windows(path) == []
