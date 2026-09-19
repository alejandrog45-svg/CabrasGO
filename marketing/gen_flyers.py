from pathlib import Path

ROOT = Path(__file__).resolve().parent
TPL_DIR = ROOT / "plantillas"

FONT_LINKS = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">'
    '<link href="https://fonts.googleapis.com/css2?family=Anton&family=Poppins:wght@600;700;800;900&display=swap" rel="stylesheet">'
)

BASE = """<!doctype html>
<html lang="es-CL">
<head>
<meta charset="UTF-8" />
{fonts}
<link rel="stylesheet" href="shared.css" />
<style>
body {{ background: {bg}; color: {text_color}; }}
.ribbon {{ background: {ribbon_bg}; box-shadow: 0 10px 28px {ribbon_shadow}; }}
h1 .accent {{ color: {accent}; }}
.tagline {{ color: {tagline_color}; }}
.bottom-card {{ background: {card_bg}; border: 1px solid {card_border}; }}
.bottom-text .label {{ color: #E2E8F0; }}
.bottom-text .url {{ color: {accent}; }}
{decoration_css}
</style>
</head>
<body>
{decoration_html}
<div class="wrap">
  <div class="badge"><img src="../../frontend/public/logo.png" /></div>
  <div class="ribbon">{ribbon}</div>
  <h1>{headline}</h1>
  <p class="tagline">{tagline}</p>
  <div class="bottom-card">
    <div class="bottom-text">
      <div class="label">Escaneá para instalar</div>
      <div class="url">cabrasgo.web.app</div>
    </div>
    <div class="qr-box"><img src="{qr}" /></div>
  </div>
</div>
</body>
</html>
"""

SUNBURST_CSS = ".sunburst {{ background: repeating-conic-gradient({c1} 0deg 4deg, transparent 4deg 12deg); }}"
CONFETTI_CSS = ""
PINWHEEL_CSS = ".pinwheel {{ background: repeating-conic-gradient({c1} 0deg 18deg, transparent 18deg 36deg); opacity: 0.5; }}"
STRIPES_CSS = ".stripes {{ background: repeating-linear-gradient(45deg, {c1} 0px, {c1} 30px, transparent 30px, transparent 60px); }}"

def confetti_html(colors, n=26, seed=7):
    import random
    r = random.Random(seed)
    dots = []
    for i in range(n):
        x = r.randint(2, 98)
        y = r.randint(2, 96)
        size = r.randint(10, 26)
        c = colors[i % len(colors)]
        dots.append(f'<span style="left:{x}%; top:{y}%; width:{size}px; height:{size}px; background:{c};"></span>')
    return '<div class="confetti">' + "".join(dots) + "</div>"

VARIANTS = [
    # PASAJERO (light theme)
    dict(
        name="pasajero-A-sunburst",
        bg="radial-gradient(circle at 15% 8%, rgba(16,185,129,0.18), transparent 42%), #F8FAFC",
        text_color="#0F172A", accent="#0F766E",
        ribbon_bg="linear-gradient(90deg,#10B981,#0F766E)", ribbon_shadow="rgba(16,185,129,0.35)",
        tagline_color="#475569", card_bg="#0F172A", card_border="rgba(255,255,255,0.1)",
        ribbon="5% DE DESCUENTO", headline='Instalá<br/>CabrasGo',
        tagline="Tu viaje seguro por Las Cabras, Peumo y el Lago Rapel. 5% de descuento al instalar la app.",
        decoration_html='<div class="sunburst"></div>',
        decoration_css=SUNBURST_CSS.format(c1="rgba(16,185,129,0.12)"),
        qr="../assets/qr/qr-pasajero.png",
    ),
    dict(
        name="pasajero-B-confetti",
        bg="#0F172A", text_color="#F8FAFC", accent="#34D399",
        ribbon_bg="linear-gradient(90deg,#10B981,#0F766E)", ribbon_shadow="rgba(16,185,129,0.4)",
        tagline_color="#CBD5E1", card_bg="rgba(255,255,255,0.07)", card_border="rgba(255,255,255,0.14)",
        ribbon="5% DE DESCUENTO", headline='Instalá<br/>CabrasGo',
        tagline="Pedí tu viaje en segundos. 5% de descuento al instalar la app.",
        decoration_html=confetti_html(["#10B981", "#34D399", "#0F766E", "#F8FAFC33"], seed=3),
        decoration_css=CONFETTI_CSS,
        qr="../assets/qr/qr-pasajero.png",
    ),
    dict(
        name="pasajero-C-stripes",
        bg="#F1F5F9", text_color="#0F172A", accent="#0F766E",
        ribbon_bg="linear-gradient(90deg,#10B981,#0F766E)", ribbon_shadow="rgba(16,185,129,0.3)",
        tagline_color="#475569", card_bg="#0F172A", card_border="rgba(255,255,255,0.1)",
        ribbon="5% DE DESCUENTO", headline='Instalá<br/>CabrasGo',
        tagline="Movilidad para Las Cabras, Peumo y San Vicente. 5% de descuento al instalar la app.",
        decoration_html='<div class="stripes"></div>',
        decoration_css=STRIPES_CSS.format(c1="rgba(16,185,129,0.08)"),
        qr="../assets/qr/qr-pasajero.png",
    ),
    # CONDUCTOR (dark OLED theme, driver-app style: text-black on accent)
    dict(
        name="conductor-A-pinwheel",
        bg="#090D16", text_color="#F8FAFC", accent="#34D399",
        ribbon_bg="#10B981", ribbon_shadow="rgba(16,185,129,0.4)",
        tagline_color="#94A3B8", card_bg="rgba(255,255,255,0.06)", card_border="rgba(255,255,255,0.12)",
        ribbon="SUMATE COMO CONDUCTOR", headline='Manejá con<br/>CabrasGo',
        tagline="Generá ingresos con tu propio horario en Las Cabras y alrededores.",
        decoration_html='<div class="pinwheel"></div>',
        decoration_css=PINWHEEL_CSS.format(c1="rgba(16,185,129,0.14)"),
        qr="../assets/qr/qr-conductor.png",
    ),
    dict(
        name="conductor-B-sunburst",
        bg="radial-gradient(circle at 85% 10%, rgba(16,185,129,0.22), transparent 42%), #131B2E",
        text_color="#F8FAFC", accent="#34D399",
        ribbon_bg="#10B981", ribbon_shadow="rgba(16,185,129,0.4)",
        tagline_color="#94A3B8", card_bg="rgba(255,255,255,0.06)", card_border="rgba(255,255,255,0.12)",
        ribbon="SUMATE COMO CONDUCTOR", headline='Manejá con<br/>CabrasGo',
        tagline="85% de tu tarifa neta para vos. Aceptá viajes desde tu celular.",
        decoration_html='<div class="sunburst"></div>',
        decoration_css=SUNBURST_CSS.format(c1="rgba(16,185,129,0.10)"),
        qr="../assets/qr/qr-conductor.png",
    ),
    dict(
        name="conductor-C-confetti",
        bg="#1E293B", text_color="#F8FAFC", accent="#34D399",
        ribbon_bg="#10B981", ribbon_shadow="rgba(16,185,129,0.4)",
        tagline_color="#CBD5E1", card_bg="rgba(255,255,255,0.07)", card_border="rgba(255,255,255,0.14)",
        ribbon="SUMATE COMO CONDUCTOR", headline='Manejá con<br/>CabrasGo',
        tagline="Vehículo propio, tus horarios, tus ganancias. Registrate hoy.",
        decoration_html=confetti_html(["#10B981", "#34D399", "#0F766E44", "#F8FAFC22"], seed=11),
        decoration_css=CONFETTI_CSS,
        qr="../assets/qr/qr-conductor.png",
    ),
]

for v in VARIANTS:
    html = BASE.format(fonts=FONT_LINKS, **v)
    out = TPL_DIR / f"{v['name']}.html"
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out.name}")
