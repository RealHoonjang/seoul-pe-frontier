"""2022 개정 체육과 교육과정([별책11]) 텍스트에서 성취기준 목록을 뽑아 standards.json으로 만든다.

사용법:
  python tools/hwp_text.py "[별책11]+체육과+교육과정.hwp" curriculum.txt
  python tools/build_standards.py curriculum.txt public/data/standards.json
"""
import json
import re
import sys

src, out = sys.argv[1], sys.argv[2]
lines = [l.strip() for l in open(src, encoding='utf-8').read().split('\n')]

CODE = r'\[(\d+[^\]\s]*?-\d+)\]'
std_re = re.compile(r'^' + CODE + r'\s+(.+)$')
exp_start = re.compile(r'^' + CODE)

COURSE = {
    '체육1': '체육1', '체육2': '체육2', '운건': '운동과 건강', '스문': '스포츠 문화',
    '스과': '스포츠 과학', '스생1': '스포츠 생활1', '스생2': '스포츠 생활2',
}
SUBTYPES = ['생활⋅자연환경형', '기록형', '동작형', '투기형', '영역형', '필드형', '네트형', '생활환경형', '자연환경형',
            '생태형', '기술형', '전략형', '스포츠 표현', '전통 표현', '현대 표현']


def meta(code):
    m = re.match(r'^(\d+)(체)(\d\d)-\d+$', code)
    if m:
        band = m.group(1)
        school, grade = {'4': ('초등학교', '3~4학년'), '6': ('초등학교', '5~6학년'), '9': ('중학교', '1~3학년')}[band]
        area = {'01': '운동', '02': '스포츠', '03': '표현'}[m.group(3)]
        return dict(school=school, grade=grade, course='체육', area=area)
    m = re.match(r'^12(체육1|체육2|운건|스문|스과|스생1|스생2)-?(\d\d)-\d+$', code)
    if m:
        return dict(school='고등학교', grade='고등학교', course=COURSE[m.group(1)], area=None)
    raise ValueError(code)


stds = {}
order = []
section = None  # "(1) 운동" 같은 소제목
in_exp = False
for l in lines:
    h = re.match(r'^\(\d\)\s*(.+)$', l)
    if h:
        section = h.group(1).strip()
        in_exp = False
        continue
    if l.startswith('(가) 성취기준 해설'):
        in_exp = True
        continue
    if l.startswith('(나)'):
        in_exp = False
        continue
    m = std_re.match(l)
    if m and not in_exp:
        code, text = m.group(1), m.group(2).strip()
        if code in stds:
            continue
        d = meta(code)
        if d['area'] is None:
            d['area'] = section
        d.update(code=code, text=text, explanation='')
        stds[code] = d
        order.append(code)
        continue
    if in_exp and exp_start.match(l):
        codes = re.findall(CODE, l[:80])
        # "[9체02-01]~[9체02-03]" 형태의 범위 처리
        rng = re.match(r'^' + CODE + r'\s*[~∼]\s*' + CODE, l)
        if rng:
            a, b = rng.group(1), rng.group(2)
            pa, na = a.rsplit('-', 1)
            codes = [f'{pa}-{i:02d}' for i in range(int(na), int(b.rsplit('-', 1)[1]) + 1)]
        for c in codes:
            if c in stds:
                stds[c]['explanation'] = (stds[c]['explanation'] + '\n' + l).strip()

for c in order:
    s = stds[c]
    found = [t for t in SUBTYPES if t in s['text']]
    if s['area'] == '스포츠' or s['school'] == '고등학교':
        s['subtype'] = found[0] if found else None
    elif s['area'] == '표현':
        s['subtype'] = found[0] if found else None
    else:
        # 운동 영역: 체력(체력 증진·관리·운동 처방) / 건강(그 밖의 건강·안전·성장)
        s['subtype'] = '체력' if ('체력' in s['text'] or '운동 처방' in s['text']) else '건강'

json.dump([stds[c] for c in order], open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(order), 'standards;', sum(1 for c in order if stds[c]['explanation']), 'with explanation')
