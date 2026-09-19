from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output" / "revision"
OUT.mkdir(parents=True, exist_ok=True)

names = [
    "pasajero-A-sunburst",
    "pasajero-B-confetti",
    "pasajero-C-stripes",
    "conductor-A-pinwheel",
    "conductor-B-sunburst",
    "conductor-C-confetti",
]

with sync_playwright() as p:
    browser = p.chromium.launch()
    for name in names:
        page = browser.new_page(viewport={"width": 1080, "height": 1080})
        page.goto((ROOT / "plantillas" / f"{name}.html").as_uri())
        page.wait_for_timeout(400)
        page.screenshot(path=str(OUT / f"{name}.png"))
        page.close()
        print(f"exported {name}.png")
    browser.close()
