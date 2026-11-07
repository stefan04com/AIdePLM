"""Tests for Slack: the real webhook post (urlopen faked) and the simulation without one."""

import json
import socket
import urllib.error
import urllib.request
from datetime import timedelta
from email.message import Message
from typing import Any

import pytest

from app.models import Task
from app.slack import SlackResult, build_blocks, format_elapsed, send_final_post

IMAGE_URL = "https://cdn.example.invalid/post.png"
WEBHOOK = "https://hooks.slack.com/services/T000/B000/secretsecret"
ELAPSED = timedelta(hours=1, minutes=50)
TASKS = [Task(owner="Legal", task="Check the claim", due="Today 17:00")]


def sections(blocks: list[dict[str, Any]]) -> list[str]:
    return [b["text"]["text"] for b in blocks if b["type"] == "section"]


class FakeResponse:
    def __init__(self, status: int = 200) -> None:
        self.status = status

    def __enter__(self) -> "FakeResponse":
        return self

    def __exit__(self, *exc: object) -> None:
        return None


def fake_urlopen(monkeypatch: pytest.MonkeyPatch, result: object) -> list[Any]:
    """Replace urlopen; record (request, timeout); return or raise `result`."""
    calls: list[Any] = []

    def urlopen(request: urllib.request.Request, timeout: float) -> object:
        calls.append((request, timeout))
        if isinstance(result, Exception):
            raise result
        return result

    monkeypatch.setattr(urllib.request, "urlopen", urlopen)
    return calls


# --- no webhook: simulated ---------------------------------------------------


def test_without_webhook_the_post_is_simulated_with_the_built_blocks() -> None:
    result = send_final_post("Caption", IMAGE_URL, TASKS, ELAPSED)
    assert result == SlackResult(
        delivery="simulated", blocks=build_blocks("Caption", IMAGE_URL, TASKS, ELAPSED)
    )
    assert result.sent


def test_without_webhook_no_network_call(monkeypatch: pytest.MonkeyPatch) -> None:
    def no_network(*args: object, **kwargs: object) -> None:
        raise AssertionError("network call attempted")

    monkeypatch.setattr(urllib.request, "urlopen", no_network)
    monkeypatch.setattr(socket.socket, "connect", no_network)
    monkeypatch.setenv("SLACK_WEBHOOK_URL", "http://not-https.example")
    assert send_final_post("Caption", IMAGE_URL, TASKS, ELAPSED).delivery == "simulated"


def test_send_accepts_blank_inputs() -> None:
    result = send_final_post("", None, [], timedelta(0))
    assert result.sent
    assert sections(result.blocks) == ["Trend → approved: 0s"]


# --- webhook set: real post --------------------------------------------------


def test_with_webhook_posts_the_blocks(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SLACK_WEBHOOK_URL", f" {WEBHOOK} ")
    calls = fake_urlopen(monkeypatch, FakeResponse(200))
    result = send_final_post("Caption", IMAGE_URL, TASKS, ELAPSED)

    assert result.delivery == "posted" and result.sent and result.error is None
    ((request, timeout),) = calls
    assert request.full_url == WEBHOOK and request.get_method() == "POST"
    assert request.get_header("Content-type") == "application/json"
    assert timeout == 15.0
    body = json.loads(request.data)
    assert body["blocks"] == result.blocks
    assert "Caption" in body["text"]


@pytest.mark.parametrize(
    "outcome",
    [
        FakeResponse(500),
        urllib.error.HTTPError(WEBHOOK, 403, "Forbidden", Message(), None),
        urllib.error.URLError(TimeoutError()),
        urllib.error.URLError(f"cannot reach {WEBHOOK}"),
        TimeoutError(),
        OSError(f"socket error for {WEBHOOK}"),
    ],
)
def test_failed_post_is_reported_without_raising_or_leaking_the_url(
    monkeypatch: pytest.MonkeyPatch, outcome: object
) -> None:
    monkeypatch.setenv("SLACK_WEBHOOK_URL", WEBHOOK)
    fake_urlopen(monkeypatch, outcome)
    result = send_final_post("Caption", IMAGE_URL, TASKS, ELAPSED)
    assert result.delivery == "failed" and not result.sent
    assert result.error and "secretsecret" not in repr(result)


# --- message content --------------------------------------------------------


def test_message_has_header_caption_image_tasks_and_elapsed() -> None:
    blocks = build_blocks("Caption", IMAGE_URL, TASKS, ELAPSED)

    assert [b["type"] for b in blocks] == [
        "header",
        "section",
        "image",
        "section",
        "section",
    ]
    assert sections(blocks) == [
        "Caption",
        "*Tasks*\n• *Legal*: Check the claim (due: Today 17:00)",
        "Trend → approved: 1h 50m",
    ]
    assert all(b["text"]["verbatim"] for b in blocks if b["type"] == "section")


def test_text_is_escaped_for_slack() -> None:
    tasks = [Task(owner="<!channel>", task="a & b", due="")]
    texts = sections(build_blocks("<@U1> & co", None, tasks, ELAPSED))
    assert texts[0] == "&lt;@U1&gt; &amp; co"
    assert texts[1] == "*Tasks*\n• *&lt;!channel&gt;*: a &amp; b"


def test_newlines_in_task_fields_cannot_fake_another_task() -> None:
    tasks = [Task(owner="Legal", task="ok\n• *CEO*: approve", due="")]
    tasks_text = sections(build_blocks("", None, tasks, ELAPSED))[0]
    assert tasks_text == "*Tasks*\n• *Legal*: ok • *CEO*: approve"


def test_blank_owner_shows_unassigned() -> None:
    tasks = [Task(owner="  ", task="Post it", due="")]
    tasks_text = sections(build_blocks("", None, tasks, ELAPSED))[0]
    assert tasks_text == "*Tasks*\n• *Unassigned*: Post it"


def test_blank_caption_and_no_tasks_leave_only_header_and_elapsed() -> None:
    blocks = build_blocks("  \n", None, [], ELAPSED)
    assert [b["type"] for b in blocks] == ["header", "section"]
    assert sections(blocks) == ["Trend → approved: 1h 50m"]


@pytest.mark.parametrize(
    "url",
    [
        None,
        "data:image/png;base64,AAAA",
        "ftp://x/a.png",
        "https://",
        "https://x.com/a b.png",
    ],
)
def test_image_block_only_for_http_urls(url: str | None) -> None:
    blocks = build_blocks("Caption", url, TASKS, ELAPSED)
    assert "image" not in [b["type"] for b in blocks]


def test_long_sections_are_cut_to_3000_chars() -> None:
    tasks = [Task(owner="Legal", task="t" * 5000, due="")]
    texts = sections(build_blocks("c" * 5000, None, tasks, ELAPSED))
    assert [len(text) for text in texts[:2]] == [3000, 3000]
    assert all(text.endswith("…") for text in texts[:2])


@pytest.mark.parametrize("prefix", range(2994, 3000))
def test_truncation_never_cuts_an_entity_in_half(prefix: int) -> None:
    caption_text = sections(build_blocks("a" * prefix + "&" * 10, None, [], ELAPSED))[0]
    body = caption_text.removesuffix("…")
    assert len(caption_text) <= 3000
    assert body == "a" * prefix + "&amp;" * ((len(body) - prefix) // 5)


@pytest.mark.parametrize(
    ("elapsed", "expected"),
    [
        (timedelta(hours=1, minutes=50, seconds=59), "1h 50m"),
        (timedelta(minutes=45), "45m"),
        (timedelta(seconds=4, milliseconds=900), "4s"),
        (timedelta(seconds=59), "59s"),
        (timedelta(minutes=-5), "0s"),
    ],
)
def test_format_elapsed(elapsed: timedelta, expected: str) -> None:
    assert format_elapsed(elapsed) == expected


def test_relative_image_becomes_absolute_with_public_base_url(monkeypatch) -> None:
    monkeypatch.setenv("PUBLIC_BASE_URL", "https://moment.example/")
    blocks = build_blocks("Caption", "/visuals/photo.jpg", TASKS, ELAPSED)
    assert {
        "type": "image",
        "image_url": "https://moment.example/visuals/photo.jpg",
        "alt_text": "Final post image",
    } in blocks


def test_relative_image_is_dropped_without_public_base_url(monkeypatch) -> None:
    monkeypatch.delenv("PUBLIC_BASE_URL", raising=False)
    blocks = build_blocks("Caption", "/visuals/photo.jpg", TASKS, ELAPSED)
    assert all(b["type"] != "image" for b in blocks)


def test_slack_image_url_overrides_the_post_image(monkeypatch) -> None:
    monkeypatch.setenv("SLACK_IMAGE_URL", "https://example.com/public.jpg")
    blocks = build_blocks("Caption", "/visuals/x.jpg", [], ELAPSED)
    images = [b["image_url"] for b in blocks if b["type"] == "image"]
    assert images == ["https://example.com/public.jpg"]


def test_rejected_image_is_retried_without_it(monkeypatch) -> None:
    import app.slack as slack

    calls: list[dict] = []

    def fake_post(url: str, payload: dict, timeout_s: float) -> str | None:
        calls.append(payload)
        has_image = any(b["type"] == "image" for b in payload["blocks"])
        return "Slack returned HTTP 400" if has_image else None

    monkeypatch.setenv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/services/T/B/X")
    monkeypatch.setattr(slack, "_post_json", fake_post)
    result = send_final_post("Caption", "https://example.com/missing.jpg", [], ELAPSED)
    assert result.delivery == "posted"
    assert len(calls) == 2
    assert all(b["type"] != "image" for b in result.blocks)
