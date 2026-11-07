"""Comment and review weighting (docs/comment-weighting.md): formula, lookup, usage."""

import json
from datetime import UTC, datetime, timedelta

import pytest
from test_flow import start_run

from app import adapters, orchestrator, weighting
from app.llm import calls

NOW = datetime(2026, 11, 7, 12, 0, tzinfo=UTC)
DAY = timedelta(days=1)
HOUR = timedelta(hours=1)
COMMENT = weighting.COMMENT_HALF_LIFE
REVIEW = weighting.REVIEW_HALF_LIFE


@pytest.fixture(autouse=True)
def experts(tmp_path, monkeypatch):
    """A known experts list, so tests don't depend on data/industry_experts.json."""
    path = tmp_path / "industry_experts.json"
    path.write_text(
        json.dumps(
            {
                "brand_industry": "coffee",
                "experts": [
                    {"name": "Ioana Marin", "title": "Head barista", "industry": "coffee"},
                    {"name": "Andrei Stan", "title": "Wine sommelier", "industry": "wine"},
                ],
            }
        )
    )
    monkeypatch.setattr(weighting, "EXPERTS_PATH", path)
    return path


# --- the reference table in docs/comment-weighting.md ---------------------------------


@pytest.mark.parametrize(
    ("verified", "created_at", "half_life", "expected"),
    [
        (True, NOW, COMMENT, 3.00),
        (False, NOW, COMMENT, 1.00),
        (True, NOW - 24 * HOUR, COMMENT, 1.50),
        (False, NOW - 48 * HOUR, COMMENT, 0.25),
        (False, NOW - 30 * DAY, COMMENT, 0.10),
        (True, NOW + HOUR, COMMENT, 3.00),
        (False, None, COMMENT, 0.50),
        (True, NOW - 730 * DAY, REVIEW, 0.75),
    ],
)
def test_reference_values(verified, created_at, half_life, expected):
    assert weighting.weight(verified, created_at, NOW, half_life) == expected


def test_verified_expert_outweighs_regular_person_of_same_age():
    expert = weighting.weight(True, NOW - HOUR, NOW, COMMENT)
    regular = weighting.weight(False, NOW - HOUR, NOW, COMMENT)
    assert expert == pytest.approx(3 * regular, abs=0.01)


def test_newer_feedback_outweighs_older_feedback():
    assert weighting.weight(False, NOW - HOUR, NOW, COMMENT) > weighting.weight(
        False, NOW - 10 * HOUR, NOW, COMMENT
    )


# --- who is verified -------------------------------------------------------------------


@pytest.mark.parametrize(
    ("author", "verified"),
    [
        ("Ioana Marin", True),
        ("  ioana   MARIN ", True),  # case and spaces don't matter
        ("Andrei Stan", False),  # verified expert, but in another industry
        ("Random Person", False),
        ("", False),
        (None, False),
    ],
)
def test_find_verified_expert(author, verified):
    assert (weighting.find_verified_expert(author) is not None) is verified


def test_missing_experts_file_means_nobody_is_verified(tmp_path, monkeypatch):
    monkeypatch.setattr(weighting, "EXPERTS_PATH", tmp_path / "missing.json")
    assert weighting.find_verified_expert("Ioana Marin") is None


# --- it is actually used: API, referee prompt, demo referee, reviews --------------------


def _comment(client, run_id: str, role: str, text: str, author: str | None = None) -> dict:
    body = {"role": role, "text": text} | ({"author": author} if author else {})
    r = client.post(f"/runs/{run_id}/comments", json=body)
    assert r.status_code == 200
    return r.json()


def test_api_sets_verification_and_weight(client):
    run_id = start_run(client)["id"]
    expert = _comment(client, run_id, "product", "Keep the latte the hero.", " ioana  MARIN ")
    regular = _comment(client, run_id, "brand", "Softer CTA.", "Random   Person")
    anonymous = _comment(client, run_id, "legal", "Remove the sugar claim.")

    assert expert["industry_verified"] is True
    assert expert["author"] == "Ioana Marin"  # shown as on the experts list
    assert expert["author_title"] == "Head barista"
    assert expert["weight"] == 3.0
    assert regular["industry_verified"] is False and regular["weight"] == 1.0
    assert regular["author"] == "Random Person" and regular["author_title"] is None
    assert anonymous["author"] is None and anonymous["weight"] == 1.0


def test_client_cannot_claim_verification(client):
    run_id = start_run(client)["id"]
    body = {"role": "brand", "text": "Trust me.", "industry_verified": True, "weight": 99}
    comment = client.post(f"/runs/{run_id}/comments", json=body).json()
    assert comment["industry_verified"] is False and comment["weight"] == 1.0


def test_weight_decays_on_read(client, monkeypatch):
    run_id = start_run(client)["id"]
    _comment(client, run_id, "product", "Keep the latte the hero.", "Ioana Marin")
    created = client.get(f"/runs/{run_id}").json()["comments"][0]["created_at"]
    one_day_later = datetime.fromisoformat(created) + COMMENT
    monkeypatch.setattr(orchestrator, "_now", lambda: one_day_later)

    assert client.get(f"/runs/{run_id}").json()["comments"][0]["weight"] == 1.5


def test_referee_prompt_carries_weights_heaviest_first(client, monkeypatch):
    seen: dict[str, str] = {}

    def fake_call_structured(**kwargs):
        if kwargs["call"] == "referee":
            seen["user"] = kwargs["user"]
        return kwargs["fallback"]()

    monkeypatch.setattr(calls, "call_structured", fake_call_structured)
    run_id = start_run(client)["id"]
    regular = _comment(client, run_id, "brand", "Softer CTA.")
    expert = _comment(client, run_id, "product", "Keep the latte the hero.", "Ioana Marin")
    client.post(f"/runs/{run_id}/referee")

    prompt = seen["user"]
    assert f'id="{expert["id"]}"' in prompt and 'weight="3.00"' in prompt
    assert 'verified="yes"' in prompt and 'author_title="Head barista"' in prompt
    assert prompt.index(expert["id"]) < prompt.index(regular["id"])  # heaviest first


def test_demo_referee_listens_to_heaviest_comment_per_role(client):
    run_id = start_run(client)["id"]
    _comment(client, run_id, "legal", "Remove the sugar claim.")
    heavy = _comment(client, run_id, "product", "Keep 'no added sugar'.", "Ioana Marin")
    light = _comment(client, run_id, "product", "Actually drop the latte.", "Random Person")

    ref = client.post(f"/runs/{run_id}/referee").json()
    product_ids = {s["comment_id"] for s in ref["comment_status"]} & {heavy["id"], light["id"]}
    assert product_ids == {heavy["id"]}  # newer but lighter comment does not win


def test_reviews_sorted_by_weight(tmp_path, monkeypatch):
    today = datetime.now(UTC).date()
    rows = [
        ("Old regular review", (today - 3 * 365 * DAY).isoformat(), ""),
        ("Undated review", "", ""),
        ("Fresh regular review", (today - DAY).isoformat(), ""),
        ("Barista review", (today - 30 * DAY).isoformat(), "coffee"),
        ("Sommelier review", (today - DAY).isoformat(), "wine"),
    ]
    csv_lines = ["text,rating,source,date,verified_industry"]
    csv_lines += [f"{text},5,tripadvisor,{date},{industry}" for text, date, industry in rows]
    (tmp_path / "reviews.csv").write_text("\n".join(csv_lines), encoding="utf-8")
    monkeypatch.setattr(adapters, "DATA", tmp_path)

    lines = adapters.reviews_text().splitlines()
    order = [line.split("(5/5) ")[1] for line in lines]
    assert order[0] == "Barista review"
    assert order.index("Fresh regular review") < order.index("Undated review")
    assert order.index("Undated review") < order.index("Old regular review")
    assert "verified industry reviewer" in lines[0] and "verified" not in lines[1]


def test_reviews_without_weight_columns_keep_csv_order(tmp_path, monkeypatch):
    (tmp_path / "reviews.csv").write_text("text,rating,source\nA,5,x\nB,4,y\n", encoding="utf-8")
    monkeypatch.setattr(adapters, "DATA", tmp_path)
    assert adapters.reviews_text() == "[weight 0.50] (5/5) A\n[weight 0.50] (4/5) B"
