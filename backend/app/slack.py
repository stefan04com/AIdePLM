"""Slack integration: posts the final approved post to an incoming webhook.

With ``SLACK_WEBHOOK_URL`` set (an https URL), `send_final_post` really posts the
Block Kit message built by `build_blocks`. Without it, nothing leaves the process
and the result is a simulation, so the UI can still show the message as a preview.
It never raises: a Slack failure is reported in `SlackResult.delivery`.

The webhook URL is a secret, so error messages are fixed text: urllib exceptions
can contain the URL, so their text is never copied or logged.
"""

import html
import http.client
import json
import logging
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Literal
from urllib.parse import urlsplit

from app.models import Task

logger = logging.getLogger(__name__)

WEBHOOK_ENV = "SLACK_WEBHOOK_URL"
BASE_URL_ENV = "PUBLIC_BASE_URL"  # makes a relative image path (/visuals/x.jpg) reachable by Slack
# Optional public https image for the Slack message, used instead of the post's own image.
# Lets Slack show a picture when the frontend has no public URL (no PUBLIC_BASE_URL needed).
IMAGE_URL_ENV = "SLACK_IMAGE_URL"
TIMEOUT_S = 15.0
MAX_SECTION_CHARS = 3000  # Slack's limit for a section's text
ELLIPSIS = "…"

Delivery = Literal["posted", "simulated", "failed"]


@dataclass(frozen=True)
class SlackResult:
    delivery: Delivery  # posted to Slack, simulated (no webhook), or the post failed
    blocks: list[dict[str, Any]]
    error: str | None = None

    @property
    def sent(self) -> bool:
        """True unless a real post failed: the simulation counts as sent."""
        return self.delivery != "failed"


def send_final_post(
    caption: str,
    image_url: str | None,
    tasks: list[Task],
    elapsed: timedelta,
    *,
    timeout_s: float = TIMEOUT_S,
) -> SlackResult:
    """Post the final message to Slack, or simulate it when no webhook is set."""
    blocks = build_blocks(caption, image_url, tasks, elapsed)
    webhook_url = os.environ.get(WEBHOOK_ENV, "").strip()
    if not webhook_url.startswith("https://"):
        logger.info("Slack: no webhook set, message simulated (%d blocks)", len(blocks))
        return SlackResult(delivery="simulated", blocks=blocks)

    payload = {"text": f"Moment: post approved. {caption}"[:MAX_SECTION_CHARS], "blocks": blocks}
    error = _post_json(webhook_url, payload, timeout_s)
    if error == "Slack returned HTTP 400" and any(b["type"] == "image" for b in blocks):
        # Slack rejects the whole message when it can't download the image: post it without.
        logger.warning("Slack: rejected with the image, retrying without it")
        blocks = [b for b in blocks if b["type"] != "image"]
        error = _post_json(webhook_url, {**payload, "blocks": blocks}, timeout_s)
    if error:
        logger.warning("Slack: post failed: %s", error)
        return SlackResult(delivery="failed", blocks=blocks, error=error)
    return SlackResult(delivery="posted", blocks=blocks)


# The blocks follow Slack's real Block Kit rules, so the preview is realistic and
# a real webhook could later post them unchanged.
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
    image_url = os.environ.get(IMAGE_URL_ENV, "").strip() or _absolute(image_url)
    if image_url and _is_web_url(image_url):
        blocks.append({"type": "image", "image_url": image_url, "alt_text": "Final post image"})
    if tasks:
        lines = ["*Tasks*", *(_task_line(task) for task in tasks)]
        blocks.append(_section("\n".join(lines)))
    blocks.append(_section(f"Trend → approved: {format_elapsed(elapsed)}"))
    return blocks


def format_elapsed(elapsed: timedelta) -> str:
    """Format as "1h 50m", "45m" or, under a minute, "4s" (rounded down). Negative is 0s.

    Seconds matter on stage: a live demo ships in seconds, and "0m" would contradict the clock.
    """
    elapsed = max(elapsed, timedelta(0))
    if elapsed < timedelta(minutes=1):
        return f"{int(elapsed.total_seconds())}s"
    minutes = elapsed // timedelta(minutes=1)
    hours, minutes = divmod(minutes, 60)
    return f"{hours}h {minutes}m" if hours else f"{minutes}m"


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


def _absolute(image_url: str | None) -> str | None:
    """Turn "/visuals/x.jpg" into an absolute URL when PUBLIC_BASE_URL is set; else unchanged."""
    base = os.environ.get(BASE_URL_ENV, "").strip().rstrip("/")
    if image_url and image_url.startswith("/") and not image_url.startswith("//") and base:
        return base + image_url
    return image_url


def _is_web_url(url: str) -> bool:
    # Slack image blocks only accept http(s); a data: URL would fail the whole post.
    if any(char.isspace() for char in url):
        return False
    try:
        parts = urlsplit(url)
    except ValueError:
        return False
    return parts.scheme in ("http", "https") and bool(parts.netloc)


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
        if isinstance(exc, TimeoutError) or isinstance(getattr(exc, "reason", None), TimeoutError):
            return "Slack request timed out"
        return "Could not reach Slack"
    return None if status == 200 else f"Slack returned HTTP {status}"


def _one_line(text: str) -> str:
    # Collapsing newlines stops an untrusted field from faking extra task lines.
    return _escape(" ".join(text.split()))


def _task_line(task: Task) -> str:
    owner = _one_line(task.owner) or "Unassigned"
    line = f"• *{owner}*: {_one_line(task.task)}"
    due = _one_line(task.due)
    return f"{line} (due: {due})" if due else line
