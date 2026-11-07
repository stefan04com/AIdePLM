"""Mock of the Slack integration.

Nothing is sent to Slack: no webhook, no network calls. `send_final_post` acts
as if the post went out and returns the message a real integration would post,
built by `build_blocks`, so the UI can show it as a preview.
"""

import html
import logging
from dataclasses import dataclass
from datetime import timedelta
from typing import Any
from urllib.parse import urlsplit

from app.models import Task

logger = logging.getLogger(__name__)

MAX_SECTION_CHARS = 3000  # Slack's limit for a section's text
ELLIPSIS = "…"


@dataclass(frozen=True)
class SlackResult:
    sent: bool
    blocks: list[dict[str, Any]]
    is_mock: bool = True


def send_final_post(
    caption: str, image_url: str | None, tasks: list[Task], elapsed: timedelta
) -> SlackResult:
    """Build the final message and report it as sent. Nothing leaves the process."""
    blocks = build_blocks(caption, image_url, tasks, elapsed)
    logger.info("Mock Slack: post not sent (%d blocks)", len(blocks))
    return SlackResult(sent=True, blocks=blocks)


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
    if image_url and _is_web_url(image_url):
        blocks.append({"type": "image", "image_url": image_url, "alt_text": "Final post image"})
    if tasks:
        lines = ["*Tasks*", *(_task_line(task) for task in tasks)]
        blocks.append(_section("\n".join(lines)))
    blocks.append(_section(f"Trend → approved: {format_elapsed(elapsed)}"))
    return blocks


def format_elapsed(elapsed: timedelta) -> str:
    """Format as "1h 50m" or "45m", rounding down to the minute. Negative is 0m."""
    minutes = max(elapsed, timedelta(0)) // timedelta(minutes=1)
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
