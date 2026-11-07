"""Regenerate, trend score and posting time (demo mode = the saved-data fallbacks)."""

from typing import get_args

from test_flow import scripted_comments, start_run

from app.models import Platform


def test_regenerate_keeps_edit_and_restarts_review(client):
    run = start_run(client)
    run_id = run["id"]
    client.post(f"/runs/{run_id}/reactions")
    for c in scripted_comments():
        client.post(f"/runs/{run_id}/comments", json=c)
    client.post(f"/runs/{run_id}/referee")

    r = client.post(
        f"/runs/{run_id}/regenerate",
        json={"caption": "  My own words, grey Tuesday.  ", "instruction": "make it warmer"},
    )
    assert r.status_code == 200
    out = r.json()
    assert out["draft"]["caption"] == "My own words, grey Tuesday."
    assert out["draft"]["regenerations"] == 1
    assert out["draft"]["version"] == 1  # only apply bumps the version
    assert out["status"] == "DRAFTED" and out["step"] is None
    assert out["reactions"] == [] and out["referee"] is None
    assert len(out["comments"]) == len(scripted_comments())
    assert client.post(f"/runs/{run_id}/reactions").status_code == 200  # review can restart


def test_regenerate_validation_and_state(client):
    assert (
        client.post("/runs/nope/regenerate", json={"caption": "a", "instruction": "b"}).status_code
        == 404
    )
    run_id = start_run(client)["id"]
    assert (
        client.post(
            f"/runs/{run_id}/regenerate", json={"caption": "", "instruction": "b"}
        ).status_code
        == 422
    )
    assert client.post(f"/runs/{run_id}/regenerate", json={"caption": "a"}).status_code == 422


def test_regenerate_refused_after_ship(client):
    run_id = start_run(client)["id"]
    client.post(f"/runs/{run_id}/reactions")
    for c in scripted_comments():
        client.post(f"/runs/{run_id}/comments", json=c)
    client.post(f"/runs/{run_id}/referee")
    client.post(f"/runs/{run_id}/apply", json={})
    r = client.post(f"/runs/{run_id}/regenerate", json={"caption": "a", "instruction": "b"})
    assert r.status_code == 409


def test_trend_score_fallback(client):
    on = client.post(
        "/trend-score",
        json={
            "words": "Cozy work from anywhere autumn setup with a warm cup",
            "hashtags": ["#Cozy"],
        },
    ).json()
    off = client.post("/trend-score", json={"words": "Buy now", "hashtags": []}).json()
    assert 0 <= off["score"] < on["score"] <= 100
    assert off["suggestions"]
    assert client.post("/trend-score", json={"words": ""}).status_code == 422


def test_posting_time_every_platform(client):
    for platform in get_args(Platform):
        out = client.get("/posting-time", params={"platform": platform}).json()
        assert out["platform"] == platform and out["time"] and out["reason"]
    assert client.get("/posting-time", params={"platform": "myspace"}).status_code == 422
    assert client.get("/posting-time").status_code == 422


def test_posting_time_uses_the_verified_windows(client):
    out = client.get("/posting-time", params={"platform": "instagram_reels"}).json()
    assert out["confidence"] in {"high", "medium", "low"}
    assert out["sources"] and all(url.startswith("https://") for url in out["sources"])
    assert ":" in out["time"]  # e.g. "Tue, Wed 12:00-19:00; Thu 12:00-14:00"
    assert "Industry average" in out["reason"]


def test_posting_time_falls_back_to_the_guide_without_data(client, monkeypatch):
    from app import posting_times

    monkeypatch.setattr(posting_times, "recommend", lambda platform, path=None: None)
    out = client.get("/posting-time", params={"platform": "linkedin"}).json()
    assert out["time"].startswith("Wednesday-Thursday 15:00-18:00")
    assert out["confidence"] is None and out["sources"] == []


def test_hashtags_endpoint_suggests_sourced_tags(client):
    out = client.get(
        "/hashtags", params={"keywords": "pumpkin latte, cozy autumn, Bucharest"}
    ).json()
    assert out["source"] == "saved" and out["platform"] == "instagram"
    assert 1 <= len(out["hashtags"]) <= 3  # Boabe brand cap
    assert all(h["tag"].startswith("#") and h["source_url"] for h in out["hashtags"])
    assert client.get("/hashtags").status_code == 422  # keywords required
    empty = client.get("/hashtags", params={"keywords": " , "}).json()
    assert empty["hashtags"] == []


def test_live_trends_endpoint_returns_the_saved_feed(client):
    out = client.get("/trends/live").json()
    assert out["source"] == "saved" and out["collected_at"] == "2026-11-07"
    assert len(out["trends"]) >= 3
    assert all(t["url"].startswith("https://") for t in out["trends"])


def test_posting_windows_returns_the_structured_data(client):
    out = client.get("/posting-windows", params={"platform": "instagram_reels"}).json()
    assert out["platform"] == "instagram"  # Reels and feed share the app's entry
    assert out["best_days"] and out["confidence"] in {"high", "medium", "low"}
    assert out["reason"]
    for window in out["windows"]:
        assert window["days"] and ":" in window["start"] and ":" in window["end"]
    assert out["sources"] and all(
        s["url"].startswith("https://") and s["name"] for s in out["sources"]
    )
    assert (
        client.get("/posting-windows", params={"platform": "facebook_feed"}).json()["platform"]
        == "facebook"
    )
    for platform in ("tiktok", "x", "linkedin"):
        assert client.get("/posting-windows", params={"platform": platform}).status_code == 200


def test_posting_windows_404_without_data(client, monkeypatch):
    assert client.get("/posting-windows", params={"platform": "myspace"}).status_code == 404
    assert client.get("/posting-windows").status_code == 422
    from app import posting_times

    monkeypatch.setattr(posting_times, "recommend", lambda platform, path=None: None)
    r = client.get("/posting-windows", params={"platform": "instagram"})
    assert r.status_code == 404 and "detail" in r.json()
