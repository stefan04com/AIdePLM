"""Live QA: run the whole demo flow N times against the real LLM and report what the stage would show.

Answers the question the demo depends on: with data/demo_trend.json and data/demo_comments.json,
does the Referee find the conflict every time, and does any call silently fall back to canned data?

Usage (needs LLM_MODEL plus LLM_API_KEY, or the Bedrock vars, in the repo's .env):
    cd backend && source .venv/bin/activate
    python ../qa/live_eval.py --runs 3
Writes a Markdown report to qa/results/. Uses a temp dir for runs/usage, so data/ is untouched.
"""

import argparse
import os
import sys
import tempfile
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app import adapters, demo_cache, store
from app.llm import calls, usage
from app.main import app
from fastapi.testclient import TestClient

CLAIM_WORDS = ("no added sugar", "sugar-free", "healthy", "healthiest", "the best")

fallbacks: list[str] = []


def track_fallbacks() -> None:
    """Record every call that ended in its canned fallback instead of a real model answer."""
    real = calls.call_structured

    def wrapped(*, call, fallback, **kwargs):
        def noted():
            fallbacks.append(call)
            return fallback()

        return real(call=call, fallback=noted, **kwargs)

    calls.call_structured = wrapped


def one_run(client: TestClient) -> dict:
    started = time.monotonic()
    fallbacks.clear()
    trend = client.get("/trend").json()
    run = client.post("/runs", json={"trend_id": trend["id"]}).json()
    run = client.get(f"/runs/{run['id']}").json()
    row = {
        "status_after_draft": run["status"],
        "fit": run["fit"],
        "caption": (run["draft"] or {}).get("caption", ""),
    }
    if run["status"] != "DRAFTED":
        return row | {
            "fallbacks": list(fallbacks),
            "seconds": time.monotonic() - started,
        }

    reactions = client.post(f"/runs/{run['id']}/reactions").json()
    for c in adapters.scripted_comments():
        client.post(
            f"/runs/{run['id']}/comments", json={"role": c["role"], "text": c["text"]}
        )
    ref = client.post(f"/runs/{run['id']}/referee").json()
    return row | {
        "run_id": run["id"],
        "reactions": reactions,
        "referee": ref,
        "fallbacks": list(fallbacks),
        "seconds": time.monotonic() - started,
    }


def conflict_line(conflict: dict) -> str:
    parties = " vs ".join(p["label"] for p in conflict["between"])
    return f"{parties}: {conflict['summary']}"


def report(
    rows: list[dict], model: str, personas: list[dict], persona_fallback: list[str]
) -> str:
    ok = [
        r for r in rows if r.get("referee", {}).get("conflicts") and not r["fallbacks"]
    ]
    legal_product = [
        r
        for r in ok
        if any(
            {"legal", "product"} <= {p["id"] for p in c["between"]}
            for c in r["referee"]["conflicts"]
        )
    ]
    persona_conflict = [
        r
        for r in ok
        if any(
            p["kind"] == "persona" for c in r["referee"]["conflicts"] for p in c["between"]
        )
    ]
    total = usage.summary(None)
    lines = [
        f"# Live eval, {datetime.now():%Y-%m-%d %H:%M}",
        "",
        f"Model `{model}` · {len(rows)} runs · trend `data/demo_trend.json` · comments `data/demo_comments.json`",
        "",
        "| Check | Result |",
        "|---|---|",
        f"| Runs with ≥1 conflict and no fallback | **{len(ok)}/{len(rows)}** |",
        f"| Runs with the Legal vs Product conflict | {len(legal_product)}/{len(rows)} |",
        f"| Runs with a human vs persona conflict | **{len(persona_conflict)}/{len(rows)}** |",
        f"| Runs with any canned fallback | {sum(1 for r in rows if r['fallbacks'])}/{len(rows)} |",
        f"| Total cost (all runs, incl. personas once) | ${total.total_cost_usd:.4f} |",
        f"| Cost per run (avg) | ${total.total_cost_usd / max(len(rows), 1):.4f} |",
        "",
        "## Personas" + (" (**canned fallback**)" if persona_fallback else ""),
        "",
        *[
            f"- `{p['id']}` {p['name']}: {p['segment']}. Quote: {(p['sample_quotes'] or [''])[0]}"
            for p in personas
        ],
        "",
    ]
    for i, r in enumerate(rows, 1):
        fit = r["fit"] or {}
        lines += [
            f"## Run {i} ({r['seconds']:.0f}s)",
            "",
            f"- Fit: {fit.get('fits')} · {fit.get('score')} · {fit.get('reason', '')}",
            f"- Draft caption: {r['caption']}",
            f"- Claim words in draft: {[w for w in CLAIM_WORDS if w in r['caption'].lower()] or 'none'}",
            f"- Fallbacks: {r['fallbacks'] or 'none'}",
        ]
        for rx in r.get("reactions", []):
            lines.append(
                f"- Persona `{rx['persona_id']}` ({rx['sentiment']:+.1f}): {rx['reaction']}"
            )
        ref = r.get("referee")
        if ref:
            lines.append(f"- Referee status: `{ref['status']}`")
            lines += [f"- Conflict: {conflict_line(c)}" for c in ref["conflicts"]] or [
                "- Conflict: **none**"
            ]
            lines.append(f"- Final caption: {ref['final_caption']}")
        lines.append("")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--runs", type=int, default=3)
    parser.add_argument(
        "--demo", action="store_true", help="smoke-test the script with canned data"
    )
    args = parser.parse_args()

    model = os.environ.get("LLM_MODEL", "")  # .env is loaded when app.main is imported
    if not args.demo and (
        not (
            os.environ.get("LLM_API_KEY") or os.environ.get("AWS_BEARER_TOKEN_BEDROCK")
        )
        or not model
    ):
        sys.exit(
            "LLM_MODEL or provider credentials missing in .env: this would only test the canned fallbacks."
        )

    tmp = Path(tempfile.mkdtemp(prefix="moment-qa-"))
    store.configure(tmp / "runs.json")
    usage.configure(tmp / "usage.jsonl")
    demo_cache.configure(tmp / "last_good.json")
    store.set_demo_mode(args.demo)
    track_fallbacks()

    with TestClient(app) as client:  # lifespan builds the personas once (call #3)
        personas = client.get("/personas").json()
        persona_fallback = list(fallbacks)
        print("personas:", ", ".join(f"{p['id']} ({p['name']})" for p in personas))
        rows = []
        for i in range(args.runs):
            print(f"run {i + 1}/{args.runs} ...", flush=True)
            rows.append(one_run(client))

    text = report(rows, model or "demo-cache", personas, persona_fallback)
    out_dir = ROOT / "qa" / "results"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"live_eval_{datetime.now():%Y%m%d_%H%M%S}.md"
    out.write_text(text, encoding="utf-8")
    print(text.split("\n## ")[0])
    print(f"Full report: {out}")


if __name__ == "__main__":
    main()
