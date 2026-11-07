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
