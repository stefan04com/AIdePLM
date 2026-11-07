"""The adapters must reach the real integration modules, not silently fall back."""

import json
from datetime import timedelta

from app import adapters
from app.models import Draft, Task


def test_current_trend_uses_saved_trend_file():
    saved = json.loads((adapters.DATA / "demo_trend.json").read_text())
    assert adapters.current_trend().id == saved["id"]


def test_live_trend_reaches_trends_module():
    # the adapter's own fallback only knows the saved trend, so a non-"saved" source proves
    # trends.py answered (data/live_trends.json gives "news", its built-in sample "reddit")
    assert adapters.current_trend(live=True).source in {"news", "reddit"}


def test_send_to_slack_reaches_slack_module():
    draft = Draft(brief="b", caption="Pull up a chair.", visual_prompt="latte on a desk")
    tasks = [Task(owner="Legal", task="Sign off the caption", due="today 15:00")]
    assert adapters.send_to_slack(draft, tasks, timedelta(minutes=12)) is True
