"""카카오톡·SNS 공유 미리보기 그림(1200×630)을 만든다. → public/og-image.png
사용법: python tools/make_og_image.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'og-image.png'
FONTS = Path('C:/Windows/Fonts')
BOLD = FONTS / 'malgunbd.ttf'
REG = FONTS / 'malgun.ttf'

W, H = 1200, 630
BRAND = (31, 79, 168)
WHITE = (255, 255, 255)
SOFT = (214, 226, 250)

img = Image.new('RGB', (W, H), BRAND)
d = ImageDraw.Draw(img)

# 오른쪽 아래 큰 공 무늬 (사이트 로고와 같은 모양)
cx, cy, r = 1010, 470, 250
d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(73, 114, 192), width=18)
d.line([cx - r, cy, cx + r, cy], fill=(73, 114, 192), width=14)
d.arc([cx - r * 0.55, cy - r, cx + r * 0.55, cy + r], 90, 270, fill=(73, 114, 192), width=14)
d.arc([cx - r * 0.55, cy - r, cx + r * 0.55, cy + r], 270, 90, fill=(73, 114, 192), width=14)

# 로고
lx, ly = 80, 80
d.rounded_rectangle([lx, ly, lx + 72, ly + 72], radius=18, fill=WHITE)
c = (lx + 36, ly + 36)
d.ellipse([c[0] - 24, c[1] - 24, c[0] + 24, c[1] + 24], outline=BRAND, width=5)
d.line([c[0] - 24, c[1], c[0] + 24, c[1]], fill=BRAND, width=4)
d.arc([c[0] - 13, c[1] - 24, c[0] + 13, c[1] + 24], 90, 270, fill=BRAND, width=4)
d.arc([c[0] - 13, c[1] - 24, c[0] + 13, c[1] + 24], 270, 90, fill=BRAND, width=4)
d.text((lx + 96, ly + 14), '서울 체육교육 프론티어 교사단', font=ImageFont.truetype(str(REG), 34), fill=SOFT)

d.text((80, 215), '학교 체육 수업 길잡이', font=ImageFont.truetype(str(BOLD), 92), fill=WHITE)
d.text((84, 345), '2022 개정 교육과정 수행평가 계획서', font=ImageFont.truetype(str(REG), 44), fill=SOFT)
d.text((84, 405), '검색 · 미리보기 · 한글/엑셀 내려받기', font=ImageFont.truetype(str(REG), 44), fill=SOFT)

# 아래 꼬리표
tags = ['교육과정', '종목', '평가 방법', '에듀테크']
x = 84
f = ImageFont.truetype(str(BOLD), 30)
for t in tags:
    w = d.textlength(t, font=f)
    d.rounded_rectangle([x, 505, x + w + 44, 557], radius=26, fill=WHITE)
    d.text((x + 22, 512), t, font=f, fill=BRAND)
    x += w + 60

img.save(OUT, optimize=True)
print('saved', OUT, OUT.stat().st_size, 'bytes')
