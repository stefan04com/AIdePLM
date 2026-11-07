"""Tests for the mocked Adobe module. Run from backend/ with `pytest -q`."""

import ast
import base64
import dataclasses
import importlib
import re
import socket
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest

# pytest puts tests/ on sys.path, not backend/, and there is no conftest.py.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

adobe = importlib.import_module("app.adobe")

DATA_URL_PREFIX = "data:image/svg+xml;base64,"
SVG_NS = "{http://www.w3.org/2000/svg}"
XSS_PROMPT = "</text><script>alert(1)</script>&"
IMAGE = "https://example.com/image.png"


@pytest.fixture(autouse=True)
def clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv(adobe.IMAGE_URL_ENV, raising=False)
    monkeypatch.delenv(adobe.LATENCY_ENV, raising=False)


@pytest.fixture
def sleeps(monkeypatch: pytest.MonkeyPatch) -> list[float]:
    recorded: list[float] = []
    monkeypatch.setattr(time, "sleep", recorded.append)
    return recorded


def parse_svg(image_url: str) -> ET.Element:
    assert image_url.startswith(DATA_URL_PREFIX)
    encoded = image_url.removeprefix(DATA_URL_PREFIX)
    return ET.fromstring(base64.b64decode(encoded, validate=True))


def svg_text(root: ET.Element) -> str:
    return "".join(element.text or "" for element in root.iter(f"{SVG_NS}text"))


def stop_colors(root: ET.Element) -> list[str | None]:
    return [stop.get("stop-color") for stop in root.iter(f"{SVG_NS}stop")]


def make_post() -> adobe.ExpressPost:
    return adobe.create_post("Caption", IMAGE)


# --- generate_visual ---


def test_generate_visual_is_deterministic() -> None:
    assert adobe.generate_visual("a sunny day") == adobe.generate_visual("a sunny day")


def test_generate_visual_returns_mock_visual_with_prompt() -> None:
    visual = adobe.generate_visual("a sunny day")
    assert visual.prompt == "a sunny day"
    assert visual.is_mock is True


def test_svg_data_url_decodes_and_parses_at_1080() -> None:
    root = parse_svg(adobe.generate_visual("a sunny day").image_url)
    assert root.tag == f"{SVG_NS}svg"
    assert (root.get("width"), root.get("height")) == ("1080", "1080")
    assert "a sunny day" in svg_text(root)


def test_gradient_depends_on_prompt() -> None:
    first = parse_svg(adobe.generate_visual("first prompt").image_url)
    second = parse_svg(adobe.generate_visual("second prompt").image_url)
    assert len(stop_colors(first)) == 2
    assert stop_colors(first) != stop_colors(second)


def test_markup_in_prompt_is_escaped() -> None:
    visual = adobe.generate_visual(XSS_PROMPT)
    root = parse_svg(visual.image_url)
    local_names = {element.tag.rpartition("}")[2] for element in root.iter()}
    assert "script" not in local_names
    assert XSS_PROMPT in svg_text(root)
    assert visual.prompt == XSS_PROMPT


def test_long_prompt_is_truncated_and_stays_valid() -> None:
    root = parse_svg(adobe.generate_visual("& word " * 500).image_url)
    prompt_rows = len(list(root.iter(f"{SVG_NS}text"))) - 1
    assert prompt_rows == adobe.MAX_TEXT_LINES
    assert "..." in svg_text(root)


@pytest.mark.parametrize("prompt", ["", "   ", "\n\t "])
def test_blank_prompt_gives_valid_placeholder(prompt: str) -> None:
    visual = adobe.generate_visual(prompt)
    assert adobe.BLANK_PROMPT_TEXT in svg_text(parse_svg(visual.image_url))
    assert visual.prompt == prompt


@pytest.mark.parametrize(
    "prompt", ["bad\x00char\x0bhere\x1f", "lone \ud800 surrogate", "￾￿", "\x00"]
)
def test_characters_invalid_in_xml_do_not_break_svg(prompt: str) -> None:
    parse_svg(adobe.generate_visual(prompt).image_url)


def test_env_image_url_overrides_placeholder(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(adobe.IMAGE_URL_ENV, f"  {IMAGE} ")
    assert adobe.generate_visual("a sunny day").image_url == IMAGE


@pytest.mark.parametrize("value", ["", "   ", "\t\n"])
def test_blank_env_image_url_is_ignored(
    monkeypatch: pytest.MonkeyPatch, value: str
) -> None:
    monkeypatch.setenv(adobe.IMAGE_URL_ENV, value)
    assert adobe.generate_visual("a sunny day").image_url.startswith(DATA_URL_PREFIX)


# --- create_post ---


def test_create_post_starts_at_version_1() -> None:
    post = make_post()
    assert post.caption == "Caption"
    assert post.image_url == IMAGE
    assert post.version == 1
    assert post.url == "https://new.express.adobe.com/"
    assert post.is_mock is True


def test_doc_id_is_deterministic_and_prefixed() -> None:
    assert make_post().doc_id == make_post().doc_id
    assert re.fullmatch(r"mock-[0-9a-f]{12}", make_post().doc_id)


def test_doc_id_keeps_caption_and_image_apart() -> None:
    assert adobe.create_post("ab", "c").doc_id != adobe.create_post("a", "bc").doc_id


@pytest.mark.parametrize("caption", ["", "   ", "\ud800"])
def test_blank_or_odd_caption_does_not_crash(caption: str) -> None:
    post = adobe.create_post(caption, IMAGE)
    assert post.caption == caption
    assert post.doc_id.startswith("mock-")
    assert adobe.update_post(post, caption=caption).version == 2


# --- update_post ---


def test_update_post_changes_both_fields_and_bumps_version() -> None:
    post = make_post()
    updated = adobe.update_post(post, caption="New", image_url="https://example.com/2")
    assert updated.caption == "New"
    assert updated.image_url == "https://example.com/2"
    assert updated.version == 2
    assert updated.doc_id == post.doc_id


def test_update_post_caption_only() -> None:
    updated = adobe.update_post(make_post(), caption="New")
    assert (updated.caption, updated.image_url) == ("New", IMAGE)


def test_update_post_image_only() -> None:
    updated = adobe.update_post(make_post(), image_url="https://example.com/2")
    assert (updated.caption, updated.image_url) == ("Caption", "https://example.com/2")


def test_update_post_without_changes_still_bumps_version() -> None:
    post = make_post()
    assert adobe.update_post(post) == dataclasses.replace(post, version=2)


def test_update_post_versions_accumulate() -> None:
    assert adobe.update_post(adobe.update_post(make_post())).version == 3


def test_update_post_does_not_mutate_input() -> None:
    post = make_post()
    snapshot = dataclasses.asdict(post)
    adobe.update_post(post, caption="New", image_url="https://example.com/2")
    assert dataclasses.asdict(post) == snapshot


def test_results_are_frozen() -> None:
    with pytest.raises(dataclasses.FrozenInstanceError):
        make_post().version = 99  # type: ignore[misc]
    with pytest.raises(dataclasses.FrozenInstanceError):
        adobe.generate_visual("x").image_url = "y"  # type: ignore[misc]


# --- latency ---


def call_all_public_functions() -> None:
    adobe.generate_visual("prompt")
    adobe.update_post(adobe.create_post("caption", IMAGE), caption="new")


@pytest.mark.parametrize(
    "value",
    ["abc", "", "   ", "-1", "0", "nan", "inf", "-inf", "1e400", "1e30", "16"],
)
def test_invalid_latency_does_not_raise_or_sleep(
    monkeypatch: pytest.MonkeyPatch, sleeps: list[float], value: str
) -> None:
    monkeypatch.setenv(adobe.LATENCY_ENV, value)
    call_all_public_functions()
    assert sleeps == []


def test_no_latency_by_default(sleeps: list[float]) -> None:
    call_all_public_functions()
    assert sleeps == []


def test_valid_latency_applies_to_every_public_function(
    monkeypatch: pytest.MonkeyPatch, sleeps: list[float]
) -> None:
    monkeypatch.setenv(adobe.LATENCY_ENV, "0.25")
    call_all_public_functions()
    assert sleeps == [0.25, 0.25, 0.25]


# --- no network ---


def module_source() -> str:
    return Path(adobe.__file__).read_text(encoding="utf-8")


@pytest.mark.parametrize("name", ["requests", "httpx", "urllib", "socket"])
def test_source_does_not_mention_network_library(name: str) -> None:
    assert name not in module_source()


def test_module_imports_only_expected_standard_library() -> None:
    imported: set[str] = set()
    for node in ast.walk(ast.parse(module_source())):
        if isinstance(node, ast.Import):
            imported.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            imported.add((node.module or "").split(".")[0])
    assert imported == {
        "base64",
        "dataclasses",
        "hashlib",
        "html",
        "os",
        "textwrap",
        "time",
    }


def test_public_functions_never_open_a_socket(monkeypatch: pytest.MonkeyPatch) -> None:
    def refuse(*args: object, **kwargs: object) -> None:
        raise AssertionError("the mock must not touch the network")

    monkeypatch.setattr(socket, "socket", refuse)
    monkeypatch.setattr(socket, "create_connection", refuse)
    call_all_public_functions()
