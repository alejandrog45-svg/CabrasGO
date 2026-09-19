from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output" / "revision"
OUT.mkdir(parents=True, exist_ok=True)

jobs = [
    ("post-lanzamiento.html", "post-lanzamiento.png", 1080, 1080),
    ("story-lanzamiento.html", "story-lanzamiento.png", 1080, 1920),
]

with sync_playwright() as p:
    browser = p.chromium.launch()
    for html_name, png_name, w, h in jobs:
        page = browser.new_page(viewport={"width": w, "height": h})
        page.goto((ROOT / "plantillas" / html_name).as_uri())
        page.wait_for_timeout(400)
        page.screenshot(path=str(OUT / png_name))
        page.close()
        print(f"exported {png_name}")
    browser.close()
