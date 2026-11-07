"""Slack integration: posts the final approved post to an incoming webhook.

`send_final_post` never raises on an external failure; the outcome is reported
in `SlackResult`. The webhook URL is a secret, so errors are fixed strings and
exception text is never copied into them: urllib exceptions can contain the URL.
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

WEBHOOK_ENV = "SLACK_WEBHOOK_URL"
HEADER_TEXT = "Moment: post approved"
IMAGE_ALT_TEXT = "Final post image"
ELLIPSIS = "…"

# Slack limits.
MAX_SECTION_CHARS = 3000
MAX_BLOCKS = 50
MAX_IMAGE_URL_CHARS = 3000

# Per-field caps. Together with the punctuation they keep one task line well
# under MAX_SECTION_CHARS, so a line always fits in a section of its own.
MAX_OWNER_CHARS = 100
MAX_TASK_CHARS = 2500
MAX_DUE_CHARS = 100


@dataclass(frozen=True)
class SlackTask:
    owner: str
    task: str
    due: str


@dataclass(frozen=True)
class SlackResult:
    sent: bool
    mode: Literal["live", "demo", "not_configured", "failed"]
    error: str | None = None


def send_final_post(
    caption: str,
    image_url: str | None,
    tasks: list[SlackTask],
    elapsed: timedelta,
    *,
    demo_mode: bool = False,
    timeout_s: float = 15.0,
) -> SlackResult:
    """Post the final caption, image, tasks and elapsed time to Slack."""
    if demo_mode:
        return SlackResult(sent=False, mode="demo")

    webhook_url = os.environ.get(WEBHOOK_ENV, "").strip()
    if not webhook_url:
        return SlackResult(
            sent=False, mode="not_configured", error=f"{WEBHOOK_ENV} is not set"
        )
    if not webhook_url.startswith("https://"):
        return SlackResult(
            sent=False,
            mode="not_configured",
            error=f"{WEBHOOK_ENV} must start with https://",
        )

    payload = {
        "text": _fallback_text(caption, elapsed),
        "blocks": build_blocks(caption, image_url, tasks, elapsed),
    }
    error = _post_json(webhook_url, payload, timeout_s)
    if error is not None:
        return SlackResult(sent=False, mode="failed", error=error)
    return SlackResult(sent=True, mode="live")


def build_blocks(
    caption: str,
    image_url: str | None,
    tasks: list[SlackTask],
    elapsed: timedelta,
) -> list[dict[str, Any]]:
    """Build the Block Kit message. Pure: no environment access, no I/O."""
    head: list[dict[str, Any]] = [
        {"type": "header", "text": {"type": "plain_text", "text": HEADER_TEXT}}
    ]
    # Slack rejects a section with blank text, which would lose the whole message.
    if caption.strip():
        head.append(_section(_escape_truncated(caption, MAX_SECTION_CHARS)))
    if image_url is not None and _is_usable_image_url(image_url):
        head.append(
            {"type": "image", "image_url": image_url, "alt_text": IMAGE_ALT_TEXT}
        )

    tail = [_section(_elapsed_line(elapsed))]
    task_blocks = _task_blocks(tasks, MAX_BLOCKS - len(head) - len(tail))
    return [*head, *task_blocks, *tail]


def format_elapsed(elapsed: timedelta) -> str:
    """Format as "1h 50m" or "45m", rounding down to the minute. Negative counts as 0."""
    minutes = max(elapsed, timedelta(0)) // timedelta(minutes=1)
    hours, remainder = divmod(minutes, 60)
    return f"{hours}h {remainder}m" if hours else f"{remainder}m"


def _elapsed_line(elapsed: timedelta) -> str:
    return f"Trend → approved: {format_elapsed(elapsed)}"


def _fallback_text(caption: str, elapsed: timedelta) -> str:
    line = _elapsed_line(elapsed)
    if not caption.strip():
        return line
    return f"{_escape_truncated(caption, MAX_SECTION_CHARS)}\n{line}"


def _section(mrkdwn: str) -> dict[str, Any]:
    # verbatim stops Slack auto-linking bare URLs and parsing a bare @channel,
    # neither of which the &, <, > escaping alone prevents.
    return {
        "type": "section",
        "text": {"type": "mrkdwn", "text": mrkdwn, "verbatim": True},
    }


def _escape(text: str) -> str:
    # With quote=False this is exactly Slack's set: &, < and >.
    return html.escape(text, quote=False)


def _escape_truncated(text: str, limit: int) -> str:
    """Escape, then fit `limit` chars without cutting an entity in half."""
    escaped = _escape(text)
    if len(escaped) <= limit:
        return escaped

    budget = limit - len(ELLIPSIS)
    pieces: list[str] = []
    for char in text:
        piece = _escape(char)
        if len(piece) > budget:
            break
        pieces.append(piece)
        budget -= len(piece)
    return "".join(pieces) + ELLIPSIS


def _is_usable_image_url(url: str) -> bool:
    """Slack image blocks take http(s) URLs only; data: URLs would fail the whole post."""
    if len(url) > MAX_IMAGE_URL_CHARS or any(char.isspace() for char in url):
        return False
    try:
        parts = urlsplit(url)
    except ValueError:
        return False
    return parts.scheme in ("http", "https") and bool(parts.netloc)


def _single_line_field(text: str, limit: int) -> str:
    # Collapsing newlines stops one untrusted field from faking extra task lines.
    return _escape_truncated(" ".join(text.split()), limit)


def _task_line(task: SlackTask) -> str:
    owner = _single_line_field(task.owner, MAX_OWNER_CHARS) or "Unassigned"
    line = f"• *{owner}*: {_single_line_field(task.task, MAX_TASK_CHARS)}"
    due = _single_line_field(task.due, MAX_DUE_CHARS)
    return f"{line} (due: {due})" if due else line


def _chunk_lines(lines: list[str]) -> list[list[str]]:
    """Group lines so each group, joined by newlines, fits in one section."""
    chunks: list[list[str]] = []
    size = 0
    for line in lines:
        if chunks and size + 1 + len(line) <= MAX_SECTION_CHARS:
            chunks[-1].append(line)
            size += 1 + len(line)
        else:
            chunks.append([line])
            size = len(line)
    return chunks


def _task_blocks(tasks: list[SlackTask], max_blocks: int) -> list[dict[str, Any]]:
    """Render tasks in at most `max_blocks` sections, summarising any that do not fit."""
    if not tasks:
        return []

    chunks = _chunk_lines(["*Tasks*", *(_task_line(task) for task in tasks)])
    if len(chunks) <= max_blocks:
        return [_section("\n".join(chunk)) for chunk in chunks]

    kept = chunks[: max_blocks - 1]
    hidden = sum(len(chunk) for chunk in chunks[max_blocks - 1 :])
    return [
        *(_section("\n".join(chunk)) for chunk in kept),
        _section(f"{ELLIPSIS}and {hidden} more tasks"),
    ]


def _post_json(url: str, payload: dict[str, Any], timeout_s: float) -> str | None:
    """POST JSON and return None on success or a short, URL-free error string."""
    try:
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=timeout_s) as response:
            status = response.status
    except urllib.error.HTTPError as exc:
        status = exc.code
        if exc.fp is not None:
            exc.close()
    except TimeoutError:
        return "Slack request timed out"
    except urllib.error.URLError as exc:
        if isinstance(exc.reason, TimeoutError):
            return "Slack request timed out"
        return "Could not reach Slack"
    except (OSError, http.client.HTTPException):
        return "Could not reach Slack"
    except ValueError:
        return "Invalid Slack webhook request"
    return None if status == 200 else f"Slack returned HTTP {status}"
