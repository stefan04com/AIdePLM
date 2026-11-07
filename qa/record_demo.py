"""Records the full AdoBee demo as a video (no sound): for the presentation and as a backup.

The story: the risky trend is rejected by brand safety, then the good trend becomes a post
(Firefly visual, rewrite, hashtags, posting time, trend score), three humans and three synthetic
customers review it, the Referee finds the conflicts, Adobee ships it, and the closing screen.
A visible cursor and a caption per beat are drawn on the page, since Playwright records neither.

Needs, all at $0:
- backend on :8000 in demo mode: `DEMO_MODE=1 LIVE_IN_DEMO= uvicorn app.main:app --port 8000`
- frontend on :5173 with `VITE_USE_MOCKS=false` (`npm run dev`)
- in a venv outside the repo: `pip install playwright imageio-ffmpeg`, then
  `python -m playwright install chromium`

Run: python qa/record_demo.py [--out qa/results/adobee-demo.mp4] [--url http://localhost:5173]
"""

# ruff: noqa: E501  (the overlay below is CSS/JS kept on one line per rule)

from __future__ import annotations

import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path

import imageio_ffmpeg
from playwright.sync_api import Locator, Page, sync_playwright

SIZE = {"width": 1600, "height": 900}
ROOT = Path(__file__).resolve().parent.parent

# A cursor that follows the mouse (with a ripple on click) and a caption pill per beat.
OVERLAY = """
window.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    #demo-cursor { position: fixed; z-index: 99999; width: 22px; height: 22px; margin: -11px 0 0 -11px;
      border-radius: 50%; background: rgb(235 16 0 / 0.35); border: 2px solid #eb1000;
      pointer-events: none; transition: transform 0.12s; left: -50px; top: -50px; }
    #demo-cursor.down { transform: scale(0.7); }
    .demo-ripple { position: fixed; z-index: 99998; width: 22px; height: 22px; margin: -11px 0 0 -11px;
      border-radius: 50%; border: 3px solid #eb1000; pointer-events: none;
      animation: demo-ripple 0.6s ease-out forwards; }
    @keyframes demo-ripple { to { transform: scale(3.2); opacity: 0; } }
    #demo-caption { position: fixed; z-index: 99997; left: 28px; bottom: 28px; max-width: 760px;
      padding: 12px 20px; border-radius: 16px; color: #fff; font: 600 22px/1.3 system-ui, sans-serif;
      background: rgb(20 12 16 / 0.82); box-shadow: 0 12px 30px rgb(0 0 0 / 0.3);
      pointer-events: none; opacity: 0; transform: translateY(12px);
      transition: opacity 0.35s, transform 0.35s; }
    #demo-caption.on { opacity: 1; transform: none; }
    #demo-caption small { display: block; margin-bottom: 2px; color: #ffd256;
      font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; }
  `;
  document.head.appendChild(style);
  const cursor = document.createElement('div');
  cursor.id = 'demo-cursor';
  const caption = document.createElement('div');
  caption.id = 'demo-caption';
  document.body.append(cursor, caption);
  addEventListener('mousemove', (e) => { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; }, true);
  addEventListener('mousedown', (e) => {
    cursor.classList.add('down');
    const r = document.createElement('div');
    r.className = 'demo-ripple'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
    document.body.appendChild(r); setTimeout(() => r.remove(), 700);
  }, true);
  addEventListener('mouseup', () => cursor.classList.remove('down'), true);
  window.__caption = (step, text) => {
    if (!text) { caption.classList.remove('on'); return; }
    caption.innerHTML = '<small>' + step + '</small>' + text;
    caption.classList.add('on');
  };
});
"""


class Demo:
    def __init__(self, page: Page) -> None:
        self.page = page

    def wait(self, seconds: float) -> None:
        self.page.wait_for_timeout(int(seconds * 1000))

    def caption(self, step: str, text: str = "") -> None:
        self.page.evaluate("([s, t]) => window.__caption && window.__caption(s, t)", [step, text])

    def key(self, key: str) -> None:
        # presenter keys are ignored while a tab or a field has focus, as on stage
        self.page.evaluate("document.activeElement && document.activeElement.blur()")
        self.page.keyboard.press(key)

    def scroll_to(self, target: Locator, block: str = "center", settle: float = 1.0) -> None:
        target.first.evaluate(
            "(el, b) => el.scrollIntoView({ behavior: 'smooth', block: b })", block
        )
        self.wait(settle)

    def scroll_top(self) -> None:
        self.page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' })")
        self.wait(1)

    def hover(self, target: Locator, pause: float = 0.5) -> None:
        box = target.first.bounding_box()
        if box:
            self.page.mouse.move(
                box["x"] + box["width"] / 2, box["y"] + box["height"] / 2, steps=25
            )
        self.wait(pause)

    def click(self, target: Locator, pause: float = 0.4, force: bool = False) -> None:
        self.hover(target, pause)
        target.first.click(force=force)  # force: Adobee never stops moving


def record(page: Page, url: str) -> None:
    d = Demo(page)
    button = lambda name: page.get_by_role("button", name=name)  # noqa: E731

    # Opening title
    page.goto(f"{url}/?intro")
    d.wait(5.5)
    page.mouse.move(800, 450)

    d.caption("Spot", "AdoBee watches what is trending right now")
    d.click(page.locator(".radar-scan"))
    d.wait(3)

    # 1. The risky trend: rejected before anyone spends a minute on it
    d.caption("1 · Brand safety", "A risky trend: the “10 espressos” dare. AdoBee says no.")
    d.key("b")
    page.locator(".shield").wait_for()
    d.wait(1.5)
    d.hover(page.locator(".shield-post"), 2.5)
    d.caption(
        "1 · Brand safety", "Blocked: health risk, wrong tone. No draft, no reviewer hours spent."
    )
    d.wait(3)

    # 2. The good trend: a draft in seconds
    d.caption("2 · Draft", "A trend that fits Boabe: cozy autumn corners. Fit 88/100, draft ready.")
    d.key("ArrowRight")
    page.locator(".express").wait_for()
    d.wait(3.5)

    d.caption("2 · Visual", "Adobe Firefly generates the visual from the brief (simulated).")
    d.scroll_to(page.locator(".post-visual"))
    d.click(page.locator(".firefly-button"))
    d.wait(4.5)

    d.caption("2 · Rewrite", "Not quite right? One instruction rewrites the caption.")
    d.scroll_to(page.locator(".edit-panel"))
    d.click(button("Make it shorter"))
    d.wait(0.6)
    d.click(page.locator(".edit-panel button.primary"))
    d.wait(0.8)
    d.scroll_to(page.locator(".express .caption"))
    d.wait(4)

    d.caption("2 · Hashtags", "Hashtags from saved sources, within each platform's limit.")
    d.scroll_to(page.locator(".hashtag-card"))
    d.click(page.locator(".hashtag-card .hashtag-chip:not(.current):not([disabled])"))
    d.wait(2.5)

    d.caption("2 · Timing", "When to post: the best slot per platform, with sources.")
    d.scroll_to(page.locator(".ph-schedule"))
    d.click(page.get_by_role("tab", name="TikTok"))
    d.wait(1.5)
    d.click(page.get_by_role("tab", name="Instagram"))
    d.wait(0.8)
    d.click(page.locator(".ph-schedule"))
    d.wait(3)

    d.caption("2 · Trend score", "How hot are the post's words against saved trends?")
    d.click(button("Check trend score"))
    d.wait(3)

    # 3. Review: humans and synthetic customers at the same time
    d.scroll_top()
    d.caption("3 · Review", "Three synthetic customers, built from 65 real reviews, react first.")
    d.key("ArrowRight")
    page.locator(".persona").first.wait_for()
    d.wait(3.5)
    d.caption("3 · Review", "Brand, Legal and Product comment. Legal blocks “no added sugar”.")
    d.key("ArrowRight")
    page.locator(".comment").nth(2).wait_for()
    d.wait(4)

    # 4. The Referee
    d.caption("4 · Referee", "The Referee reads every voice at once and finds the conflicts.")
    d.click(button("Run referee"))
    page.locator(".conflict").first.wait_for()
    d.wait(4.5)
    d.caption("4 · Referee", "Each conflict gets a compromise. Legal no-gos always win.")
    d.wait(4)

    # 5. Ship: one human click
    d.caption("5 · Ship", "Adobee is on the ship button. Nothing goes out without a human click.")
    bee = page.locator(".on-button .adobee-bee")
    bee.wait_for(timeout=15000)
    d.hover(bee, 1.5)
    d.click(bee, force=True)
    d.wait(2)
    d.caption("5 · Ship", "Approved in seconds, against 8 days for a typical review.")
    d.wait(3.5)
    d.caption("5 · Ship", "The caption rewrites itself, and the team gets it in Slack.")
    d.wait(9)

    # 6. The rules behind the scores
    d.caption("6 · Rules", "Every score is explained: factors, weights, platform rules, cost.")
    d.click(page.get_by_role("tab", name="Rules"))
    d.wait(1.5)
    d.hover(page.locator(".rules-page .rule-list").first, 2.5)
    d.hover(page.locator(".rules-page .rule-list").nth(2), 2.5)
    fetch = button("Fetch current trends")
    if fetch.count():
        d.caption("6 · Rules", "Current trends and hashtag suggestions, marked saved or live.")
        d.scroll_to(fetch)
        d.click(fetch)
        d.wait(3)
    d.caption("6 · Cost", "Measured: $0.0602 per post. Demo mode answers from the cache, at $0.")
    d.scroll_to(page.locator(".rules-page .card").last, settle=3)
    d.scroll_top()
    d.click(page.get_by_role("tab", name="Post"))
    d.wait(1.5)

    # Closing screen
    d.caption("")
    d.key("e")
    d.wait(6)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--url", default="http://localhost:5173")
    parser.add_argument("--out", default=str(ROOT / "qa" / "results" / "adobee-demo.mp4"))
    args = parser.parse_args()

    with tempfile.TemporaryDirectory() as tmp, sync_playwright() as pw:
        browser = pw.chromium.launch()
        context = browser.new_context(viewport=SIZE, record_video_dir=tmp, record_video_size=SIZE)
        context.add_init_script(OVERLAY)
        page = context.new_page()
        try:
            record(page, args.url)
        finally:
            video = page.video.path() if page.video else None
            context.close()
            browser.close()
        if not video:
            raise SystemExit("No video was recorded.")
        out = Path(args.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        cmd = [
            ffmpeg,
            "-y",
            "-loglevel",
            "error",
            "-i",
            str(video),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-crf",
            "18",
            "-preset",
            "slow",
            "-movflags",
            "+faststart",
            str(out),
        ]
        if subprocess.run(cmd).returncode != 0:
            shutil.copy(video, out.with_suffix(".webm"))
            raise SystemExit(f"ffmpeg failed; the raw video is at {out.with_suffix('.webm')}")
        print(f"Saved {out}")


if __name__ == "__main__":
    main()
