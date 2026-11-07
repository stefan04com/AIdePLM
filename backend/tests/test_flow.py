"""Whole pipeline in demo mode: trend -> run -> reactions -> comments -> referee -> apply."""

from app import adapters, demo_cache

INLINE_COMMENTS = [
    {"role": "brand", "text": "Love the tone, but keep the CTA softer and on-brand."},
    {"role": "legal", "text": "We cannot promise a guaranteed time saving. Remove the guarantee."},
    {
        "role": "product",
        "text": "The time-saving angle is our strongest feature, keep it prominent.",
    },
]


def scripted_comments() -> list[dict]:
    return adapters.scripted_comments() or INLINE_COMMENTS


def start_run(client) -> dict:
    trend = client.get("/trend").json()
    r = client.post("/runs", json={"trend_id": trend["id"]})
    assert r.status_code == 200
    first = r.json()
    assert first["status"] == "SPOTTED"  # returned immediately, work happens in background
    assert first["step"]
    return client.get(f"/runs/{first['id']}").json()


def test_full_flow(client):
    run = start_run(client)
    assert run["status"] == "DRAFTED"
    assert run["step"] is None
    assert run["fit"]["fits"] is True
    assert run["draft"]["caption"] and run["draft"]["hashtags"]
    run_id = run["id"]

    personas = client.get("/personas").json()
    assert len(personas) == 3

    reactions = client.post(f"/runs/{run_id}/reactions").json()
    assert {r["persona_id"] for r in reactions} == {p["id"] for p in personas}

    for c in scripted_comments():
        assert client.post(f"/runs/{run_id}/comments", json=c).status_code == 200
    assert client.get(f"/runs/{run_id}").json()["status"] == "IN_REVIEW"

    ref = client.post(f"/runs/{run_id}/referee").json()
    assert len(ref["conflicts"]) >= 1  # the scripted comments must produce a conflict
    comment_ids = {c["id"] for c in client.get(f"/runs/{run_id}").json()["comments"]}
    assert {s["comment_id"] for s in ref["comment_status"]} <= comment_ids
    party_ids = {p["id"] for p in ref["conflicts"][0]["between"]}
    assert set(ref["conflicts"][0]["positions"]) == party_ids
    assert client.get(f"/runs/{run_id}").json()["status"] == "REFEREED"

    shipped = client.post(f"/runs/{run_id}/apply", json={"accept_all_edits": True}).json()
    assert shipped["status"] == "SHIPPED"
    assert shipped["shipped_at"]
    assert shipped["draft"]["caption"] == ref["final_caption"]
    assert shipped["draft"]["version"] == 2

    usage = client.get("/usage", params={"run_id": run_id}).json()
    assert [c["call"] for c in usage["calls"]] == ["fit", "draft", "reactions", "referee"]
    assert client.get("/usage").json()["calls"]


def test_new_comment_after_referee_reopens_review(client):
    run_id = start_run(client)["id"]
    for c in scripted_comments():
        client.post(f"/runs/{run_id}/comments", json=c)
    client.post(f"/runs/{run_id}/referee")
    client.post(f"/runs/{run_id}/comments", json={"role": "legal", "text": "One more thing"})
    assert client.get(f"/runs/{run_id}").json()["status"] == "IN_REVIEW"
    assert client.post(f"/runs/{run_id}/referee").status_code == 200


def test_rejected_trend_stops_the_flow(client, monkeypatch):
    monkeypatch.setattr(
        demo_cache, "CANNED_FIT", demo_cache.CANNED_FIT.model_copy(update={"fits": False})
    )
    run = start_run(client)
    assert run["status"] == "REJECTED"
    assert run["draft"] is None
    assert client.post(f"/runs/{run['id']}/reactions").status_code == 409


def test_errors(client):
    assert client.get("/runs/nope").status_code == 404
    assert client.post("/runs/nope/referee").status_code == 404
    assert client.post("/runs", json={"trend_id": "nope"}).status_code == 404
    assert client.get("/usage", params={"run_id": "nope"}).status_code == 404

    run_id = start_run(client)["id"]
    r = client.post(f"/runs/{run_id}/referee")  # nothing reviewed yet
    assert r.status_code == 409 and isinstance(r.json()["detail"], str)
    assert client.post(f"/runs/{run_id}/apply", json={"accept_all_edits": False}).status_code == 409

    for c in scripted_comments():
        client.post(f"/runs/{run_id}/comments", json=c)
    client.post(f"/runs/{run_id}/referee")
    bad = client.post(
        f"/runs/{run_id}/apply", json={"conflict_ids": ["conf_x"], "accept_all_edits": False}
    )
    assert bad.status_code == 404
    assert (
        client.get(f"/runs/{run_id}").json()["status"] == "REFEREED"
    )  # failed apply changed nothing

    assert client.post(f"/runs/{run_id}/apply", json={"accept_all_edits": False}).status_code == 200
    assert client.post(f"/runs/{run_id}/apply", json={"accept_all_edits": False}).status_code == 409
    assert (
        client.post(f"/runs/{run_id}/comments", json={"role": "legal", "text": "late"}).status_code
        == 409
    )


def test_demo_mode_toggle(client):
    assert client.post("/admin/demo-mode", json={"on": False}).json() == {"on": False}
    assert client.post("/admin/demo-mode", json={"on": True}).json() == {"on": True}


def test_runs_survive_restart(client, tmp_path):
    from app import store

    run_id = start_run(client)["id"]
    store.reset()
    store.load_snapshot()
    assert store.get_run(run_id) is not None


def test_openapi_is_complete(client):
    spec = client.get("/openapi.json").json()
    for path, ops in spec["paths"].items():
        for method, op in ops.items():
            schema = op["responses"]["200"]["content"]["application/json"]["schema"]
            assert schema != {}, f"{method.upper()} {path} has no response_model"


def test_demo_mode_can_be_read_back(client):
    assert client.post("/admin/demo-mode", json={"on": False}).json() == {"on": False}
    assert client.get("/admin/demo-mode").json() == {"on": False}
    client.post("/admin/demo-mode", json={"on": True})
    assert client.get("/admin/demo-mode").json() == {"on": True}
