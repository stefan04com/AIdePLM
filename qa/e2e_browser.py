"""Browser click-through of the whole demo against the real backend (VITE_USE_MOCKS=false).

Start the backend (:8000) and `npm run dev` (:5173) with VITE_USE_MOCKS=false first.
  pip install playwright && python -m playwright install chromium
  python qa/e2e_browser.py run1                           # checks + screenshots
  python qa/e2e_browser.py video --video qa/results/video --slow 60   # slow run, records .webm
Exit code 0 = every check passed and no console / HTTP errors.
"""
import json
import os
import sys
import time

from playwright.sync_api import sync_playwright

BASE = os.environ.get("MOMENT_URL", "http://localhost:5173")
OUT = os.environ.get("E2E_OUT", "qa/results/e2e")
os.makedirs(OUT, exist_ok=True)
label = sys.argv[1]
video_dir = sys.argv[sys.argv.index("--video") + 1] if "--video" in sys.argv else None
slow = int(sys.argv[sys.argv.index("--slow") + 1]) if "--slow" in sys.argv else 0
pause = (lambda s: time.sleep(s)) if video_dir else (lambda s: None)

problems: list[str] = []
checks: list[tuple[str, bool]] = []


def check(name: str, ok: bool) -> None:
    checks.append((name, ok))
    print(("PASS " if ok else "FAIL ") + name, flush=True)


with sync_playwright() as p:
    browser = p.chromium.launch(slow_mo=slow)
    ctx_args = {"viewport": {"width": 1600, "height": 1000}}
    if video_dir:
        ctx_args["record_video_dir"] = video_dir
        ctx_args["record_video_size"] = {"width": 1600, "height": 1000}
    ctx = browser.new_context(**ctx_args)
    page = ctx.new_page()
    page.on("console", lambda m: m.type == "error" and problems.append(f"console: {m.text}"))
    page.on("pageerror", lambda e: problems.append(f"pageerror: {e}"))
    page.on(
        "response",
        lambda r: r.status >= 400 and "/api/" in r.url and problems.append(f"HTTP {r.status} {r.url}"),
    )

    # --- main story -----------------------------------------------------------
    page.goto(BASE + ("/?intro" if video_dir else "/"))
    pause(4)
    page.wait_for_selector("text=People are sharing their cozy autumn")
    check("no 'mock API' badge (real backend)", page.locator("text=mock API").count() == 0)
    pause(1.5)

    page.get_by_role("button", name="Start run").click()
    page.wait_for_selector("text=Fits the brand", timeout=30000)
    page.wait_for_function("() => !document.body.innerText.includes('Writing the draft')", timeout=30000)
    pause(3)
    check("fit card shows 'Fits the brand'", True)
    check("post image rendered", page.locator("img[src*='boabe-laptop-mug']").count() > 0)

    page.get_by_role("button", name="Persona reactions").click()
    page.wait_for_function(
        "() => document.querySelectorAll('.persona, [class*=persona]').length > 0", timeout=30000
    )
    pause(3)

    boxes = page.locator("form.comment-box textarea")
    check("3 reviewer comment boxes", boxes.count() == 3)
    texts = [
        "This reads like an ad. Lead with the cozy moment and keep the latte in the background.",
        "We can't say 'no added sugar' or 'best latte in town', there's no documentation.",
    ]
    for i, text in enumerate(texts):  # Brand, Legal typed like a judge would
        boxes.nth(i).fill("")
        boxes.nth(i).type(text, delay=15 if video_dir else 0)
        page.locator("form.comment-box").nth(i).get_by_role("button", name="Send").click()
        page.wait_for_timeout(600)
        pause(1)
    # Product is pre-filled by the demo script
    product_text = boxes.nth(2).input_value()
    check("Product comment is pre-filled", bool(product_text.strip()))
    page.locator("form.comment-box").nth(2).get_by_role("button", name="Send").click()
    page.wait_for_timeout(800)
    pause(1.5)

    run_id = page.evaluate("() => new URL(location.href).searchParams.get('run')")
    page.get_by_role("button", name="Run referee").click()
    page.wait_for_selector("text=Apply all", timeout=30000)
    if video_dir:
        page.get_by_text("Product vs Legal").first.scroll_into_view_if_needed()
        page.mouse.wheel(0, 250)
    pause(5)
    if video_dir:
        page.mouse.wheel(0, 500)
        pause(4)
    conflicts = page.locator(".conflict, [class*=conflict-card]").count()
    check("referee shows conflict cards", conflicts > 0 or page.locator("text=conflicts").count() > 0)
    page.screenshot(path=f"{OUT}/{label}_refereed.png", full_page=True)

    page.get_by_role("button", name="Apply all & ship").click()
    page.wait_for_selector("text=Shipped", timeout=30000)
    page.wait_for_timeout(6000)
    pause(2)
    if video_dir:
        page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
        pause(3)
        page.get_by_text("Slack message preview", exact=False).first.scroll_into_view_if_needed()
        page.mouse.wheel(0, 300)
        pause(5)
        page.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
        pause(1.5)
    cap = page.locator("text=Grey").first.inner_text()
    print("CAPTION AFTER SHIP:", cap)
    check("run shipped", True)
    body = page.inner_text("body")
    check("Slack preview visible", "Slack" in body)
    page.screenshot(path=f"{OUT}/{label}_shipped.png", full_page=True)
    pause(2)

    # --- risky trend (brand-safety beat) ---------------------------------------
    page.get_by_role("button", name="Try a risky trend").click()
    page.wait_for_selector("text=Not a fit", timeout=30000)
    pause(4)
    check("risky trend is rejected ('Not a fit')", True)
    page.screenshot(path=f"{OUT}/{label}_rejected.png", full_page=True)

    ctx.close()
    browser.close()

print(json.dumps({"label": label, "checks": checks, "problems": problems}, indent=1))
sys.exit(0 if all(ok for _, ok in checks) and not problems else 1)
