"""
Playwright screenshot script for the Whiteboard app.
Run via: uv run --with playwright python docs/screenshots/take_screenshots.py
"""
import asyncio
import os
from playwright.async_api import async_playwright

BASE_URL = "http://127.0.0.1:8000"
OUT_DIR = os.path.dirname(os.path.abspath(__file__))


async def screenshot(page, name, description):
    path = os.path.join(OUT_DIR, name)
    await page.screenshot(path=path, full_page=False)
    print(f"✅ Saved: {name}  ({description})")
    return path


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        ctx = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await ctx.new_page()

        # -----------------------------------------------------------------
        # 1. Main Canvas
        # -----------------------------------------------------------------
        await page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)
        await screenshot(page, "01_main_canvas.png", "Main infinite whiteboard canvas")

        # -----------------------------------------------------------------
        # 2. Drawing Tools – draw a few strokes on canvas
        # -----------------------------------------------------------------
        # Click the Pen tool (bottom toolbar)
        pen_btn = page.get_by_text("Pen", exact=False).first
        try:
            await pen_btn.click()
        except Exception:
            pass  # already selected

        canvas = page.locator("canvas").first
        box = await canvas.bounding_box()
        if box:
            cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
            # Draw a squiggle
            await page.mouse.move(cx - 100, cy)
            await page.mouse.down()
            for i in range(20):
                await page.mouse.move(cx - 100 + i * 10, cy + 30 * ((-1) ** i))
            await page.mouse.up()
            await page.wait_for_timeout(500)

        await screenshot(page, "02_drawing_tools.png", "Drawing tools – pen strokes on canvas")

        # -----------------------------------------------------------------
        # 3. Left sidebar – open Shapes or any left panel
        # -----------------------------------------------------------------
        # Try clicking the first sidebar icon
        sidebar_icons = page.locator(".sidebar-icon, [data-tool], .tool-btn, .left-sidebar button")
        count = await sidebar_icons.count()
        if count > 0:
            await sidebar_icons.first.click()
            await page.wait_for_timeout(800)
        await screenshot(page, "03_sidebar_tools.png", "Left sidebar / tools panel")

        # -----------------------------------------------------------------
        # 4. Step Box feature
        # -----------------------------------------------------------------
        # Look for Step Box button in sidebar
        step_box_btn = page.get_by_text("Step", exact=False).first
        try:
            await step_box_btn.click()
            await page.wait_for_timeout(500)
            # Drag to create a step box on canvas
            if box:
                await page.mouse.move(cx - 200, cy - 100)
                await page.mouse.down()
                await page.mouse.move(cx + 50, cy + 50)
                await page.mouse.up()
                await page.wait_for_timeout(1000)
        except Exception as e:
            print(f"  ⚠️  Step box drag failed: {e}")
        await screenshot(page, "04_step_box.png", "Step Box feature with floating dock")

        # -----------------------------------------------------------------
        # 5. Slide / Presentation Mode
        # -----------------------------------------------------------------
        frame_btn = page.get_by_text("Slide", exact=False).first
        try:
            await frame_btn.click()
            await page.wait_for_timeout(1000)
        except Exception:
            # Try frame icon in toolbar
            try:
                await page.locator("[title*='slide' i], [title*='frame' i], [aria-label*='slide' i]").first.click()
                await page.wait_for_timeout(1000)
            except Exception:
                pass
        await screenshot(page, "05_slide_mode.png", "16:9 Presentation Slide mode")

        # Exit slide mode
        try:
            exit_btn = page.get_by_text("Exit Slide Mode", exact=False).first
            await exit_btn.click()
            await page.wait_for_timeout(500)
        except Exception:
            pass

        # -----------------------------------------------------------------
        # 6. Multi-Board Sidebar (right panel)
        # -----------------------------------------------------------------
        boards_btn = page.get_by_text("Board", exact=False).first
        try:
            await boards_btn.click()
            await page.wait_for_timeout(800)
        except Exception:
            try:
                await page.locator(".right-sidebar, .boards-panel, [title*='board' i]").first.click()
                await page.wait_for_timeout(800)
            except Exception:
                pass
        await screenshot(page, "06_multi_board.png", "Multi-board management panel")

        # -----------------------------------------------------------------
        # 7. Dark mode (the app already uses dark background, just capture)
        # -----------------------------------------------------------------
        # Try to find a theme toggle
        try:
            theme_btn = page.locator("[title*='dark' i], [title*='theme' i], [aria-label*='dark' i]").first
            await theme_btn.click()
            await page.wait_for_timeout(800)
        except Exception:
            pass
        await screenshot(page, "07_dark_mode.png", "Dark mode / theme view")

        await browser.close()
        print("\n🎉 All screenshots captured!")


asyncio.run(main())
