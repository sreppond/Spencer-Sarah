"""Regenerate assets/img/social-preview.jpg (1200x630 iMessage / OG card).

    pip install Pillow
    # Cormorant Garamond is not vendored; fetch the two variable faces once:
    mkdir -p tools/fonts && cd tools/fonts
    curl -O "https://raw.githubusercontent.com/google/fonts/main/ofl/cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf"
    curl -O "https://raw.githubusercontent.com/google/fonts/main/ofl/cormorantgaramond/CormorantGaramond-Italic%5Bwght%5D.ttf"

    python3 tools/make-social-preview.py

Type spec matches the hero: Cormorant Garamond Regular, uppercase, 0.22em
tracking, scaleX .88, #514e4b, with an italic #c49f6c ampersand.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONTS = Path(__file__).resolve().parent / "fonts"

from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC = ROOT / "images/hero-lake.jpg"
OUT = ROOT / "assets/img/social-preview.jpg"
SS = 3  # supersample factor for crisp type

W, H = 1200, 630

im = Image.open(str(SRC)).convert("RGB")
# Crop a 1.905:1 band that keeps clouds, mountains, lodge, tent and marina.
cw = im.width
ch = int(round(cw / (W / H)))
top = 205
im = im.crop((0, top, cw, top + ch)).resize((W * SS, H * SS), Image.LANCZOS)

# Warm scrim so the lettering holds contrast without washing out the painting.
scrim = Image.new("L", (W * SS, H * SS), 0)
sd = ImageDraw.Draw(scrim)
cx, cy = W * SS * 0.5, H * SS * 0.50
rx, ry = W * SS * 0.46, H * SS * 0.44
for i in range(28):
    t = i / 27
    a = int(round(214 * (1 - t) ** 1.7))
    sd.ellipse(
        (cx - rx * (0.35 + 0.65 * t), cy - ry * (0.35 + 0.65 * t),
         cx + rx * (0.35 + 0.65 * t), cy + ry * (0.35 + 0.65 * t)),
        fill=a,
    )
scrim = scrim.filter(ImageFilter.GaussianBlur(40 * SS / 3))
im = Image.composite(Image.new("RGB", im.size, (252, 250, 246)), im, scrim)

d = ImageDraw.Draw(im)


def vfont(path, size, name):
    f = ImageFont.truetype(path, size)
    f.set_variation_by_name(name)
    return f


CG  = str(FONTS / "CormorantGaramond[wght].ttf")
CGI = str(FONTS / "CormorantGaramond-Italic[wght].ttf")

INK = (0x51, 0x4E, 0x4B)
GOLD = (0xC4, 0x9F, 0x6C)
DATE = (0x8F, 0x89, 0x81)
PLACE = (0x9C, 0x93, 0x82)
LEAF = (0x9E, 0x9C, 0x84)
RULE = (0xCD, 0xBC, 0xA6)


def tracked(runs, y, tracking, scale_x=1.0, anchor_y="baseline"):
    """runs: list of (text, font, color). Draws centred with letter tracking."""
    widths = []
    for text, font, _ in runs:
        w = 0
        for chn in text:
            w += d.textlength(chn, font=font) + tracking * font.size
        widths.append(w)
    total = sum(widths) * scale_x
    x = (W * SS - total) / 2
    for (text, font, color), w in zip(runs, widths):
        for chn in text:
            adv = d.textlength(chn, font=font) + tracking * font.size
            if chn != " ":
                # draw each glyph on its own so tracking + x-scale stay exact
                gw = max(1, int(d.textlength(chn, font=font)) + 4)
                gh = font.size * 2
                lay = Image.new("RGBA", (gw, int(gh)), (0, 0, 0, 0))
                ld = ImageDraw.Draw(lay)
                ld.text((0, gh * 0.5), chn, font=font, fill=color + (255,), anchor="ls")
                if scale_x != 1.0:
                    lay = lay.resize((max(1, int(gw * scale_x)), int(gh)), Image.LANCZOS)
                im.paste(lay, (int(round(x)), int(round(y - gh * 0.5))), lay)
            x += adv * scale_x


# --- Names: Cormorant Garamond Regular, uppercase, 0.22em tracking, scaleX .88
title_size = int(round(W * SS * 0.0663))
f_title = vfont(CG, title_size, "Regular")
f_amp = vfont(CGI, int(round(title_size * 1.06)), "Italic")
baseline = int(round(H * SS * 0.4235))
tracked(
    [("SARAH ", f_title, INK), ("&", f_amp, GOLD), (" SPENCER", f_title, INK)],
    baseline, 0.22, 0.88,
)

# --- Botanical divider: hairline rules broken by a small laurel sprig.
# Drawn on its own RGBA layer so the leaves can be rotated individually.
dy = baseline + int(round(H * SS * 0.078))
half = int(round(W * SS * 0.124))
gap = int(round(W * SS * 0.0335))
lw = max(1, int(round(SS * 0.85)))
lay = Image.new("RGBA", im.size, (0, 0, 0, 0))
ld = ImageDraw.Draw(lay)
for x0, x1 in ((cx - half, cx - gap), (cx + gap, cx + half)):
    ld.line((x0, dy, x1, dy), fill=RULE + (199,), width=lw)


def leaf(cxx, cyy, length, angle):
    """One almond leaf, drawn as a rotated ellipse on a scratch layer."""
    lw_ = int(length * 2.4)
    lh_ = int(length * 2.4)
    s = Image.new("RGBA", (lw_, lh_), (0, 0, 0, 0))
    sd_ = ImageDraw.Draw(s)
    sd_.ellipse(
        (lw_ / 2 - length, lh_ / 2 - length * 0.36,
         lw_ / 2 + length, lh_ / 2 + length * 0.36),
        fill=LEAF + (235,),
    )
    s = s.rotate(angle, resample=Image.BICUBIC, center=(lw_ / 2, lh_ / 2))
    lay.alpha_composite(s, (int(cxx - lw_ / 2), int(cyy - lh_ / 2)))


# stem through the middle, leaves stepping outward and alternating up/down
ld.line((cx - gap * 0.92, dy, cx + gap * 0.92, dy), fill=LEAF + (170,), width=lw)
for sgn in (-1, 1):
    for i, t in enumerate((0.30, 0.58, 0.86)):
        length = SS * (7.4 - i * 1.7)
        leaf(cx + sgn * gap * t, dy - length * 0.30, length, sgn * 24)
        leaf(cx + sgn * gap * t * 0.985, dy + length * 0.30, length, -sgn * 24)
ld.ellipse((cx - SS * 1.9, dy - SS * 1.9, cx + SS * 1.9, dy + SS * 1.9), fill=LEAF + (235,))
im = Image.alpha_composite(im.convert("RGBA"), lay).convert("RGB")
d = ImageDraw.Draw(im)

# --- Date + location
f_date = vfont(CG, int(round(W * SS * 0.0159)), "Medium")
tracked([("JUNE 12, 2027", f_date, DATE)], dy + int(round(H * SS * 0.068)), 0.39)

f_place = vfont(CGI, int(round(W * SS * 0.0187)), "Light Italic")
tracked([("whitefish, montana", f_place, PLACE)], dy + int(round(H * SS * 0.126)), 0.12)

im = im.resize((W, H), Image.LANCZOS)
im.save(str(OUT), "JPEG", quality=88, optimize=True, progressive=True)
print("wrote", OUT, im.size)
