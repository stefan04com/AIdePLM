"""Tests for the saved hashtag cache and suggest()."""

import json
import logging
from pathlib import Path
from typing import Any

import pytest

from app import hashtags
from app.hashtags import HashtagSuggestions, load_hashtags, suggest

LIMITS = [
    {"platform": "instagram", "max_hashtags_per_post": 5, "recommended": "3-5"},
    {"platform": "x", "max_hashtags_per_post": None, "recommended": "1-2"},
]


def tag(name: str, kind: str = "niche", url: str = "https://example.com/src") -> dict[str, Any]:
    return {"tag": name, "kind": kind, "evidence": "seen there", "source": url}


SAMPLE = {
    "collected_at": "2026-11-07",
    "platform_limits": LIMITS,
    "topics": [
        {
            "topic": "coffee",
            "keywords": ["coffee", "specialty coffee"],
            "hashtags": [
                tag("#coffee", "broad"),
                tag("#specialtycoffee"),
                tag("#singleorigin"),
                tag("#filtercoffee"),
                tag("#coffeeroaster"),
                tag("#pourover"),
            ],
        },
        {
            "topic": "bucharest",
            "keywords": ["Bucharest", "romania"],
            "hashtags": [tag("#romania", "broad"), tag("#bucharest", "local")],
        },
        {
            "topic": "tasting",
            "keywords": ["tasting", "coffee tasting"],
            "hashtags": [tag("#SpecialtyCoffee"), tag("#cupping")],
        },
    ],
}


@pytest.fixture
def cache_path(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "hashtags.json"
    path.write_text(json.dumps(SAMPLE), encoding="utf-8")
    monkeypatch.setattr(hashtags, "HASHTAGS_PATH", path)
    return path


def tags(result: HashtagSuggestions) -> list[str]:
    return [item.tag for item in result.hashtags]


# The real file


def test_real_file_loads_and_every_hashtag_has_a_source_url() -> None:
    raw = json.loads(hashtags.HASHTAGS_PATH.read_text(encoding="utf-8"))
    raw_count = sum(len(topic["hashtags"]) for topic in raw["topics"])
    cache = load_hashtags()
    loaded = [h for topic in cache.topics for h in topic.hashtags]
    assert raw_count > 0
    assert len(loaded) == raw_count  # nothing was skipped as malformed
    assert all(h.source_url.startswith("https://") for h in loaded)
    assert all(h.evidence for h in loaded)
    assert raw["source_type"] == "saved"


def test_real_file_has_the_instagram_limits_with_sources() -> None:
    raw = json.loads(hashtags.HASHTAGS_PATH.read_text(encoding="utf-8"))
    by_platform = {item["platform"]: item for item in raw["platform_limits"]}
    assert by_platform["instagram"]["max_hashtags_per_post"] == 5
    api = by_platform["instagram-graph-api"]
    assert api["max_unique_hashtag_queries_per_7_days"] == 30
    assert all(item["source"].startswith("https://") for item in raw["platform_limits"])


def test_real_file_has_no_excluded_or_trademarked_tags() -> None:
    raw = json.loads(hashtags.HASHTAGS_PATH.read_text(encoding="utf-8"))
    used = {h["tag"].lower() for topic in raw["topics"] for h in topic["hashtags"]}
    excluded = {item["tag"].lower() for item in raw["excluded"]}
    assert not used & excluded
    assert not {"#psl", "#pumpkinspicelatte", "#starbucks"} & used


def test_real_file_suggests_for_the_demo_trend() -> None:
    result = suggest(["pumpkin latte", "cozy autumn", "Bucharest"])
    assert len(result.hashtags) == 3
    assert all(item.source == "saved" for item in result.hashtags)
    assert all(item.kind != "broad" for item in result.hashtags)


# Matching and ranking


def test_matches_topic_keywords_case_insensitively(cache_path: Path) -> None:
    result = suggest(["BUCHAREST"], limit=5)
    assert tags(result) == ["#bucharest", "#romania"]
    assert result.matched_topics == ("bucharest",)


def test_keyword_inside_a_phrase_matches_and_hash_is_ignored(cache_path: Path) -> None:
    assert suggest(["#Coffee"]).matched_topics == ("coffee",)
    assert suggest(["cosy coffee corner"]).matched_topics == ("coffee",)
    assert suggest(["coffees"]).hashtags == ()  # whole words only


def test_niche_and_local_rank_before_broad(cache_path: Path) -> None:
    # "#romania" is listed first in its topic but is broad, so it goes last.
    result = suggest(["romania", "tasting"], limit=5)
    assert tags(result) == ["#bucharest", "#SpecialtyCoffee", "#cupping", "#romania"]
    # With the default cap the broad tags are the ones left out.
    assert "broad" not in [item.kind for item in suggest(["coffee", "romania"]).hashtags]


def test_topics_take_turns_in_keyword_order(cache_path: Path) -> None:
    # Bucharest is asked for first, so its tag leads; then one coffee tag each turn.
    assert tags(suggest(["bucharest", "coffee"])) == [
        "#bucharest",
        "#specialtycoffee",
        "#singleorigin",
    ]
    assert tags(suggest(["coffee", "bucharest"]))[:2] == ["#specialtycoffee", "#bucharest"]


def test_exact_match_beats_word_inside_the_keyword(cache_path: Path) -> None:
    # "coffee tasting" is a tasting keyword; it only contains the coffee keyword.
    result = suggest(["coffee tasting"])
    assert result.matched_topics == ("tasting", "coffee")
    assert tags(result)[0] == "#SpecialtyCoffee"


def test_each_suggestion_is_saved_with_its_evidence_url(cache_path: Path) -> None:
    item = suggest(["coffee"]).hashtags[0]
    assert item.source == "saved"
    assert item.source_url == "https://example.com/src"
    assert item.topic == "coffee"


def test_no_match_gives_empty_suggestions(cache_path: Path) -> None:
    result = suggest(["skateboarding"])
    assert result.hashtags == ()
    assert result.matched_topics == ()


# Dedupe


def test_same_tag_from_two_topics_appears_once(cache_path: Path) -> None:
    result = suggest(["coffee", "tasting"], limit=5)
    lowered = [t.lower() for t in tags(result)]
    assert lowered.count("#specialtycoffee") == 1
    assert len(lowered) == len(set(lowered))


# Caps


def test_brand_cap_is_three_by_default(cache_path: Path) -> None:
    result = suggest(["coffee"])
    assert result.cap == 3
    assert tags(result) == ["#specialtycoffee", "#singleorigin", "#filtercoffee"]


def test_limit_overrides_brand_cap_but_not_platform_max(cache_path: Path) -> None:
    assert len(suggest(["coffee"], limit=4).hashtags) == 4
    result = suggest(["coffee"], limit=20)
    assert result.cap == 5
    assert len(result.hashtags) == 5
    assert suggest(["coffee"], limit=0).hashtags == ()
    assert suggest(["coffee"], limit=-2).hashtags == ()


def test_platform_recommended_max_caps_below_brand(cache_path: Path) -> None:
    assert suggest(["coffee"], platform="X").cap == 2
    assert suggest(["coffee"], platform="x", limit=4).cap == 2


def test_unknown_platform_falls_back_to_instagram(
    cache_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.WARNING, logger="app.hashtags"):
        result = suggest(["coffee"], platform="myspace", limit=9)
    assert result.platform == "myspace"
    assert result.cap == 5
    assert "myspace" in caplog.text


# Unusable files


def test_missing_file_gives_empty_suggestions_and_warns(
    tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.WARNING, logger="app.hashtags"):
        result = suggest(["coffee"], path=tmp_path / "nope.json")
    assert result.hashtags == ()
    assert "unusable" in caplog.text


@pytest.mark.parametrize(
    "content",
    ["{not json", "[]", '{"topics": 3}', '"text"', "[" * 5000 + "]" * 5000],
)
def test_malformed_file_gives_empty_suggestions(
    tmp_path: Path, caplog: pytest.LogCaptureFixture, content: str
) -> None:
    path = tmp_path / "bad.json"
    path.write_text(content, encoding="utf-8")
    with caplog.at_level(logging.WARNING, logger="app.hashtags"):
        result = suggest(["coffee"], path=path)
    assert result.hashtags == ()
    assert "unusable" in caplog.text


def test_bad_entries_are_skipped_not_fatal(tmp_path: Path) -> None:
    data = {
        "platform_limits": [{"platform": 5}, *LIMITS],
        "topics": [
            "not a topic",
            {
                "topic": "coffee",
                "keywords": ["coffee", 7],
                "hashtags": [
                    tag("#nourl", url=""),
                    tag("no hash"),
                    tag("#weirdkind", kind="viral"),
                    "nope",
                    tag("#good"),
                ],
            },
        ],
    }
    path = tmp_path / "partly_bad.json"
    path.write_text(json.dumps(data), encoding="utf-8")
    assert tags(suggest(["coffee"], path=path)) == ["#good"]


def test_suggest_never_raises_on_bad_input(cache_path: Path) -> None:
    assert suggest([]).hashtags == ()
    assert suggest(None).hashtags == ()  # type: ignore[arg-type]
    assert suggest(["coffee", 3, None]).hashtags  # type: ignore[list-item]
