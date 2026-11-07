"""Tests for the Slack mock: message content and that nothing is sent."""

import socket
import urllib.request
from datetime import timedelta
from typing import Any

import pytest

from app.models import Task
from app.slack import SlackResult, build_blocks, format_elapsed, send_final_post

IMAGE_URL = "https://cdn.example.invalid/post.png"
ELAPSED = timedelta(hours=1, minutes=50)
TASKS = [Task(owner="Legal", task="Check the claim", due="Today 17:00")]


def sections(blocks: list[dict[str, Any]]) -> list[str]:
    return [b["text"]["text"] for b in blocks if b["type"] == "section"]


# --- mock send --------------------------------------------------------------


def test_send_returns_sent_mock_result_with_the_built_blocks() -> None:
    result = send_final_post("Caption", IMAGE_URL, TASKS, ELAPSED)
    assert result == SlackResult(
        sent=True,
        blocks=build_blocks("Caption", IMAGE_URL, TASKS, ELAPSED),
        is_mock=True,
    )


def test_send_makes_no_network_call(monkeypatch: pytest.MonkeyPatch) -> None:
    def no_network(*args: object, **kwargs: object) -> None:
        raise AssertionError("network call attempted")

    monkeypatch.setattr(urllib.request, "urlopen", no_network)
    monkeypatch.setattr(socket.socket, "connect", no_network)

    assert send_final_post("Caption", IMAGE_URL, TASKS, ELAPSED).sent


def test_send_accepts_blank_inputs() -> None:
    result = send_final_post("", None, [], timedelta(0))
    assert result.sent
    assert sections(result.blocks) == ["Trend → approved: 0m"]


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
        (timedelta(minutes=-5), "0m"),
    ],
)
def test_format_elapsed(elapsed: timedelta, expected: str) -> None:
    assert format_elapsed(elapsed) == expected
