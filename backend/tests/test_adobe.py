"""Tests for the mocked Adobe module. Run from backend/ with `pytest -q`."""

import base64
import dataclasses
import re
import time
import xml.etree.ElementTree as ET

import pytest

from app import adobe

DATA_URL_PREFIX = "data:image/svg+xml;base64,"
SVG_NS = "{http://www.w3.org/2000/svg}"
IMAGE = "https://example.com/image.png"


@pytest.fixture(autouse=True)
def clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv(adobe.IMAGE_URL_ENV, raising=False)
    monkeypatch.delenv(adobe.LATENCY_ENV, raising=False)


def parse_svg(image_url: str) -> ET.Element:
    assert image_url.startswith(DATA_URL_PREFIX)
    svg_bytes = base64.b64decode(image_url.removeprefix(DATA_URL_PREFIX))
    return ET.fromstring(svg_bytes)


def svg_text(root: ET.Element) -> str:
    return "".join(element.text or "" for element in root.iter(f"{SVG_NS}text"))


# --- generate_visual ---


def test_same_prompt_gives_same_visual() -> None:
    assert adobe.generate_visual("a sunny day") == adobe.generate_visual("a sunny day")


def test_visual_is_a_valid_svg_data_url() -> None:
    root = parse_svg(adobe.generate_visual("a sunny day").image_url)
    assert root.tag == f"{SVG_NS}svg"
    assert "a sunny day" in svg_text(root)
    assert adobe.MOCK_LABEL in svg_text(root)


def test_markup_in_prompt_is_escaped() -> None:
    prompt = "</text><script>alert(1)</script>&"
    root = parse_svg(adobe.generate_visual(prompt).image_url)
    assert not any(element.tag.endswith("script") for element in root.iter())
    assert prompt in svg_text(root)


def test_control_characters_do_not_break_svg() -> None:
    parse_svg(adobe.generate_visual("bad\x00char\x0bhere\x1f").image_url)


def test_blank_prompt_shows_placeholder_text() -> None:
    root = parse_svg(adobe.generate_visual("   ").image_url)
    assert adobe.BLANK_PROMPT_TEXT in svg_text(root)


def test_env_image_url_replaces_svg(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(adobe.IMAGE_URL_ENV, IMAGE)
    assert adobe.generate_visual("a sunny day").image_url == IMAGE


def test_blank_env_image_url_is_ignored(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(adobe.IMAGE_URL_ENV, "   ")
    assert adobe.generate_visual("a sunny day").image_url.startswith(DATA_URL_PREFIX)


# --- create_post / update_post ---


def test_create_post_starts_at_version_1() -> None:
    post = adobe.create_post("Caption", IMAGE)
    assert (post.caption, post.image_url, post.version) == ("Caption", IMAGE, 1)
    assert post.url == adobe.EXPRESS_HOME_URL


def test_doc_id_is_deterministic() -> None:
    first = adobe.create_post("Caption", IMAGE).doc_id
    assert first == adobe.create_post("Caption", IMAGE).doc_id
    assert re.fullmatch(r"mock-[0-9a-f]{12}", first)


def test_update_post_bumps_version() -> None:
    post = adobe.create_post("Caption", IMAGE)
    updated = adobe.update_post(post, caption="New", image_url="https://example.com/2")
    assert (updated.caption, updated.image_url) == ("New", "https://example.com/2")
    assert updated.version == 2
    assert updated.doc_id == post.doc_id


def test_update_post_keeps_fields_not_given() -> None:
    post = adobe.create_post("Caption", IMAGE)
    caption_only = adobe.update_post(post, caption="New")
    image_only = adobe.update_post(post, image_url="https://example.com/2")
    assert caption_only.image_url == IMAGE
    assert image_only.caption == "Caption"


def test_update_post_does_not_change_the_input() -> None:
    post = adobe.create_post("Caption", IMAGE)
    before = dataclasses.asdict(post)
    adobe.update_post(post, caption="New")
    assert dataclasses.asdict(post) == before


# --- simulated latency ---


def call_every_function() -> None:
    adobe.generate_visual("prompt")
    adobe.update_post(adobe.create_post("caption", IMAGE))


@pytest.mark.parametrize("value", ["abc", "-1", "0", "nan", "inf", "16"])
def test_invalid_latency_is_ignored(monkeypatch: pytest.MonkeyPatch, value: str) -> None:
    sleeps: list[float] = []
    monkeypatch.setattr(time, "sleep", sleeps.append)
    monkeypatch.setenv(adobe.LATENCY_ENV, value)
    call_every_function()
    assert sleeps == []


def test_valid_latency_sleeps_on_every_call(monkeypatch: pytest.MonkeyPatch) -> None:
    sleeps: list[float] = []
    monkeypatch.setattr(time, "sleep", sleeps.append)
    monkeypatch.setenv(adobe.LATENCY_ENV, "0.25")
    call_every_function()
    assert sleeps == [0.25, 0.25, 0.25]
