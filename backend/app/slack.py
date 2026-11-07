"""Slack integration: posts the final approved post to an incoming webhook.

`send_final_post` never raises on an external failure; it reports the outcome
in `SlackResult`. The webhook URL is a secret, so error messages are fixed
text: urllib exceptions can contain the URL, so their text is never copied.
"""

import html
import http.client
import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Literal
from urllib.parse import urlsplit

from app.models import Task

WEBHOOK_ENV = "SLACK_WEBHOOK_URL"
MAX_SECTION_CHARS = 3000  # Slack's limit for a section's text
ELLIPSIS = "…"


@dataclass(frozen=True)
class SlackResult:
    sent: bool
    mode: Literal["live", "demo", "not_configured", "failed"]
    error: str | None = None


def send_final_post(
    caption: str,
    image_url: str | None,
    tasks: list[Task],
    elapsed: timedelta,
    *,
    demo_mode: bool = False,
    timeout_s: float = 15.0,
) -> SlackResult:
    """Post the final caption, image, tasks and elapsed time to Slack."""
    if demo_mode:
        return SlackResult(sent=False, mode="demo")

    webhook_url = os.environ.get(WEBHOOK_ENV, "").strip()
    if not webhook_url.startswith("https://"):
        error = f"{WEBHOOK_ENV} must be set to an https:// URL"
        return SlackResult(sent=False, mode="not_configured", error=error)

    payload = {
        "text": _fallback_text(caption, elapsed),
        "blocks": build_blocks(caption, image_url, tasks, elapsed),
    }
    error = _post_json(webhook_url, payload, timeout_s)
    if error:
        return SlackResult(sent=False, mode="failed", error=error)
    return SlackResult(sent=True, mode="live")


def build_blocks(
    caption: str,
    image_url: str | None,
    tasks: list[Task],
    elapsed: timedelta,
) -> list[dict[str, Any]]:
    """Build the Block Kit message: header, caption, image, tasks, elapsed time."""
    blocks: list[dict[str, Any]] = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": "Moment: post approved"},
        }
    ]
    # Slack rejects a section with blank text, which would fail the whole message.
    if caption.strip():
        blocks.append(_section(_escape(caption)))
    if image_url and _is_web_url(image_url):
        blocks.append(
            {"type": "image", "image_url": image_url, "alt_text": "Final post image"}
        )
    if tasks:
        lines = ["*Tasks*", *(_task_line(task) for task in tasks)]
        blocks.append(_section("\n".join(lines)))
    blocks.append(_section(_elapsed_line(elapsed)))
    return blocks


def format_elapsed(elapsed: timedelta) -> str:
    """Format as "1h 50m" or "45m", rounding down to the minute. Negative is 0m."""
    minutes = max(elapsed, timedelta(0)) // timedelta(minutes=1)
    hours, minutes = divmod(minutes, 60)
    return f"{hours}h {minutes}m" if hours else f"{minutes}m"


def _elapsed_line(elapsed: timedelta) -> str:
    return f"Trend → approved: {format_elapsed(elapsed)}"


def _fallback_text(caption: str, elapsed: timedelta) -> str:
    if not caption.strip():
        return _elapsed_line(elapsed)
    return f"{_truncate(_escape(caption))}\n{_elapsed_line(elapsed)}"


def _section(mrkdwn: str) -> dict[str, Any]:
    # verbatim stops Slack auto-linking bare URLs and parsing a bare @channel,
    # neither of which escaping &, < and > prevents.
    text = {"type": "mrkdwn", "text": _truncate(mrkdwn), "verbatim": True}
    return {"type": "section", "text": text}


def _escape(text: str) -> str:
    # With quote=False this escapes exactly Slack's special characters: &, < and >.
    return html.escape(text, quote=False)


def _truncate(escaped: str) -> str:
    """Cut already-escaped text to MAX_SECTION_CHARS without splitting an entity."""
    if len(escaped) <= MAX_SECTION_CHARS:
        return escaped
    cut = escaped[: MAX_SECTION_CHARS - len(ELLIPSIS)]
    # After escaping, every "&" starts an entity; drop one left without its ";".
    amp = cut.rfind("&")
    if amp != -1 and ";" not in cut[amp:]:
        cut = cut[:amp]
    return cut + ELLIPSIS


def _is_web_url(url: str) -> bool:
    # Slack image blocks only accept http(s); a data: URL would fail the whole post.
    if any(char.isspace() for char in url):
        return False
    try:
        parts = urlsplit(url)
    except ValueError:
        return False
    return parts.scheme in ("http", "https") and bool(parts.netloc)


def _one_line(text: str) -> str:
    # Collapsing newlines stops an untrusted field from faking extra task lines.
    return _escape(" ".join(text.split()))


def _task_line(task: Task) -> str:
    owner = _one_line(task.owner) or "Unassigned"
    line = f"• *{owner}*: {_one_line(task.task)}"
    due = _one_line(task.due)
    return f"{line} (due: {due})" if due else line


def _post_json(url: str, payload: dict[str, Any], timeout_s: float) -> str | None:
    """POST JSON. Return None on success, otherwise a short error without the URL."""
    try:
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=timeout_s) as response:
            status = response.status
    # HTTPError and URLError are OSError subclasses, so HTTPError must come first.
    except urllib.error.HTTPError as exc:
        return f"Slack returned HTTP {exc.code}"
    except (OSError, http.client.HTTPException, ValueError) as exc:
        # A timeout while connecting arrives as a URLError wrapping TimeoutError.
        if isinstance(exc, TimeoutError) or isinstance(
            getattr(exc, "reason", None), TimeoutError
        ):
            return "Slack request timed out"
        return "Could not reach Slack"
    return None if status == 200 else f"Slack returned HTTP {status}"
