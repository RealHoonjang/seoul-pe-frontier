"""제출받은 평가계획서(HWP/HWPX)를 읽어 public/data/plans.json 에 넣는다.

사용법 (프로젝트 폴더에서):
  python tools/import_plan.py 제출폴더                 # 폴더 안의 .hwp/.hwpx 모두
  python tools/import_plan.py 파일1.hwp 파일2.hwpx      # 파일 지정
  python tools/import_plan.py 제출폴더 --office 강서양천  # 교육지원청 지정
  python tools/import_plan.py 제출폴더 --dry-run         # 읽기만 하고 저장 안 함
  python tools/import_plan.py --remove-dummy             # 더미 자료 모두 지우기

- .hwp 는 한글 프로그램(자동화)으로 .hwpx 로 바꿔서 읽는다. (한글이 설치된 PC 필요)
- 원본 파일과 PDF 를 public/files/ 에 복사한다.
- 종목·작성자처럼 양식에 없는 정보는 수행평가명과 파일 이름에서 추정한다.
  파일 이름을 '학교 이름_수행평가명.hwp' 또는 '평가계획(학교 이름).hwp' 처럼 주면 작성자를 읽는다.
- 끝나면 '확인 필요' 목록을 보여준다. plans.json 을 열어 고치면 된다.
"""
import argparse
import datetime as dt
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
PLANS = ROOT / 'public' / 'data' / 'plans.json'
STDS = ROOT / 'public' / 'data' / 'standards.json'
FILES = ROOT / 'public' / 'files'
CONVERT = ROOT / 'tools' / 'hwp_convert.ps1'

HP = '{http://www.hancom.co.kr/hwpml/2011/paragraph}'
HC = '{http://www.hancom.co.kr/hwpml/2011/core}'

EVAL_TYPES = ['서술', '논술', '구술', '토의·토론', '포트폴리오', '프로젝트', '실기평가', '기타']
EVALUATORS = ['교사평가', '자기평가', '동료평가']
MODES = ['모둠별 수행', '개인별 수행']
SPORTS = [
    '농구', '배구', '축구', '풋살', '핸드볼', '플로어볼', '플라잉디스크', '얼티미트', '럭비', '티볼', '소프트볼', '야구', '킨볼',
    '배드민턴', '탁구', '테니스', '피클볼', '족구', '세팍타크로', '줄넘기', '음악 줄넘기', '육상', '달리기', '멀리뛰기', '높이뛰기',
    '허들', '수영', '태권도', '씨름', '유도', '레슬링', '매트', '뜀틀', '평균대', '체조', '댄스', '라인댄스', '방송댄스', '치어리딩',
    '민속무용', '강강술래', '탈춤', '오리엔티어링', '스포츠클라이밍', '등산', '자전거', '크로스핏', '서킷', '체력', '건강', '피구',
    '골프', '스키', '빙상', '컬링', '양궁', '사격', '카누',
]


# ---------------- HWPX 읽기 ----------------

def para_text(p):
    out = []
    for t in p.iter(HP + 't'):
        if t.text:
            out.append(t.text)
        for c in t:
            if c.tag in (HP + 'tab', HP + 'fwSpace'):
                out.append(' ')
            if c.tail:
                out.append(c.tail)
    return ''.join(out).strip()


def cell_lines(tc):
    sub = tc.find(HP + 'subList')
    if sub is None:
        return []
    return [para_text(p) for p in sub.findall(HP + 'p')]


def table_grid(tbl):
    grid = {}
    for tr in tbl.findall(HP + 'tr'):
        for tc in tr.findall(HP + 'tc'):
            a = tc.find(HP + 'cellAddr')
            s = tc.find(HP + 'cellSpan')
            r, c = int(a.get('rowAddr')), int(a.get('colAddr'))
            grid[(r, c)] = {
                'lines': [l for l in cell_lines(tc)],
                'rs': int(s.get('rowSpan')),
                'cs': int(s.get('colSpan')),
                'tc': tc,
            }
    return grid


def text_of(cell):
    return '\n'.join(l for l in cell['lines'] if l.strip()) if cell else ''


def clean_line(s):
    return re.sub(r'^[\s․·\-‐–•ㆍ]+', '', s).strip()


def top_tables(root):
    """본문 문단 바로 아래(표 안의 표 제외)에 있는 표들"""
    out = []
    for p in root.findall(HP + 'p'):
        for run in p.findall(HP + 'run'):
            out.extend(run.findall(HP + 'tbl'))
    return out


def all_text(tbl):
    return ' '.join(text_of(c) for c in table_grid(tbl).values())


def right_of(grid, label):
    """label 칸의 오른쪽 칸. 글자가 똑같은 칸을 먼저 찾고, 없으면 label 을 포함하는 칸"""
    norm = lambda cell: re.sub(r'\s+', '', text_of(cell))  # noqa: E731
    for exact in (True, False):
        for (r, c), cell in sorted(grid.items()):
            t = norm(cell)
            if (t == label) if exact else (label in t):
                nxt = grid.get((r, c + cell['cs']))
                if nxt:
                    return nxt
    return None


def checked(text, labels):
    sel = []
    for l in labels:
        m = re.search(r'([■□☑☐✔✓▣])\s*' + re.escape(l), text)
        if m and m.group(1) in '■☑✔✓▣':
            sel.append(l)
    etc = None
    m = re.search(r'[■☑✔✓▣]\s*기타\s*\(([^)]*)\)', text)
    if m:
        etc = m.group(1).strip()
    return sel, etc


def first_num(s):
    nums = re.findall(r'\d+(?:\.\d+)?', s or '')
    return [float(n) if '.' in n else int(n) for n in nums]


def guess_measure(values):
    joined = ' '.join(values)
    if re.search(r'\d\s*(초|분)', joined) or re.search(r'\d+\.\d+\s*~', joined):
        unit = '분' if re.search(r'\d\s*분', joined) else '초'
        return 'time', unit, 'lower'
    if re.search(r'\d\s*(cm|m|미터)', joined):
        return 'distance', ('cm' if 'cm' in joined else 'm'), 'higher'
    if re.search(r'\d\s*(개|회|번)', joined):
        return 'count', ('개' if '개' in joined else '회'), 'higher'
    if re.search(r'\d\s*점', joined):
        return 'score', '점', 'higher'
    if sum(1 for v in values if re.search(r'\d', v)) >= len(values) - 1 and values:
        return 'time', '', 'lower'
    return 'rubric', None, None


def boundary(text, better):
    ns = first_num(text)
    if not ns:
        return None
    if better == 'lower':
        return max(ns)
    return min(ns) if '~' in text else ns[0]


def parse_scoring(tbl, idx):
    g = table_grid(tbl)
    male_col = female_col = std_col = lvl_col = None
    head_rows = set()
    for (r, c), cell in g.items():
        t = text_of(cell).replace(' ', '')
        if t == '남':
            male_col, head_rows = c, head_rows | {r}
        elif t == '여':
            female_col = c
        elif t == '기준':
            std_col, head_rows = c, head_rows | {r}
        elif t in ('성취수준', '성취\n수준') or t.replace('\n', '') == '성취수준':
            lvl_col, head_rows = c, head_rows | {r}
    max_head = max(head_rows) if head_rows else 1
    rows = []
    elements = []
    for (r, c), cell in sorted(g.items()):
        if r <= max_head:
            continue
        if c == 0 and cell['rs'] > 1 or (c == 0 and lvl_col not in (None, 0)):
            elements += [clean_line(l) for l in cell['lines'] if clean_line(l)]
    body_rows = sorted({r for (r, c) in g if r > max_head})
    for r in body_rows:
        lv = text_of(g.get((r, lvl_col if lvl_col is not None else 1))).strip()
        if not re.fullmatch(r'[A-E]', lv):
            continue
        male = text_of(g.get((r, male_col if male_col is not None else std_col)))
        female = text_of(g.get((r, female_col))) if female_col is not None else None
        rows.append({'level': lv, 'male': male, 'female': female})
    split = female_col is not None
    measure, unit, better = guess_measure([x['male'] for x in rows] + [x['female'] or '' for x in rows])
    for i, x in enumerate(rows):
        if measure != 'rubric' and i < len(rows) - 1:
            x['m'] = boundary(x['male'], better)
            if split:
                x['f'] = boundary(x['female'], better)
        if not split:
            x.pop('female', None)
    title = None
    for e in elements:
        m = re.search(r'(.+?)에\s*대해\s*평가', e)
        if m:
            title = clean_line(m.group(1))
            break
    t = {
        'title': title or f'채점 기준 {idx}',
        'elements': elements,
        'measure': measure,
        'genderSplit': split,
        'rows': rows,
    }
    if unit is not None:
        t['unit'] = unit
    if better:
        t['better'] = better
    return t


def parse_hwpx(path, std_codes):
    z = zipfile.ZipFile(path)
    sec_names = sorted(n for n in z.namelist() if re.match(r'Contents/section\d+\.xml', n))
    roots = [ET.fromstring(z.read(n)) for n in sec_names]
    tables = [t for r in roots for t in top_tables(r)]
    paras = [para_text(p) for r in roots for p in r.findall(HP + 'p')]
    warn = []

    basic = next((t for t in tables if '수행평가명' in all_text(t)), None)
    if basic is None:
        raise ValueError('수행평가명 표를 찾지 못했습니다 (양식이 다른 파일일 수 있음)')
    g = table_grid(basic)
    title = text_of(right_of(g, '수행평가명')).replace('\n', ' ').strip()
    std_text = text_of(right_of(g, '성취기준'))
    standards = re.findall(r'\[(\d+[^\]\s]*?-\d+)\]', std_text)
    unknown = [c for c in standards if c not in std_codes]
    if unknown:
        warn.append(f'교육과정에 없는 성취기준 코드: {unknown}')
    intent = text_of(right_of(g, '평가의도')).replace('\n', ' ')
    devices = text_of(right_of(g, '기기'))
    apps = text_of(right_of(g, '앱'))
    dcontent = text_of(right_of(g, '내용')) if right_of(g, '기기') else ''
    types, etc = checked(text_of(right_of(g, '평가유형')), EVAL_TYPES)
    evaluators, _ = checked(text_of(right_of(g, '평가주체')), EVALUATORS)
    modes, _ = checked(text_of(right_of(g, '평가방식')), MODES)
    contents_cell = right_of(g, '평가내용')
    contents = [clean_line(l) for l in (contents_cell['lines'] if contents_cell else []) if clean_line(l)]

    scoring = [parse_scoring(t, i + 1) for i, t in enumerate(x for x in tables if '채점' in all_text(x) and '평가요소' in all_text(x))]
    if not scoring:
        warn.append('채점 기준 표를 찾지 못함')

    achievement = []
    ach = next((t for t in tables if '성취도' in all_text(t)), None)
    if ach is not None:
        ag = table_grid(ach)
        for (r, c), cell in sorted(ag.items()):
            lv = text_of(cell).strip()
            if c == 0 and re.fullmatch(r'[A-E]', lv):
                achievement.append({'level': lv, 'text': ' '.join(l.strip() for l in ag.get((r, 1), {'lines': []})['lines'] if l.strip())})
    else:
        warn.append('성취수준 표를 찾지 못함')

    explanation = {}
    image = None
    exp = next((t for t in tables if '평가설명' in all_text(t).replace(' ', '')), None)
    if exp is not None:
        eg = table_grid(exp)
        body = [c for (r, cc), c in sorted(eg.items()) if r > 0]
        txt = '\n'.join(text_of(c) for c in body).strip()
        if txt:
            explanation['text'] = txt
        for c in body:
            img = c['tc'].find('.//' + HC + 'img')
            if img is not None:
                ref = img.get('binaryItemIDRef')
                cand = [n for n in z.namelist() if n.startswith('BinData/') and Path(n).stem == ref]
                if cand:
                    image = (Path(cand[0]).suffix.lower(), z.read(cand[0]))
                break

    grade = None
    for t in paras[:8]:
        m = re.search(r'([1-6])\s*학년', t)
        if m:
            grade = int(m.group(1))
            break
    doc_title = next((t for t in paras[:4] if t and '학년' not in t), '')
    doc_title = re.sub(r'\(예시\)', '', doc_title).strip()

    level = course = None
    if standards:
        c0 = standards[0]
        level = {'4': '초등학교', '6': '초등학교', '9': '중학교'}.get(c0.split('체')[0])
        if c0.startswith('12'):
            level = '고등학교'
            course = {'체육1': '체육1', '체육2': '체육2', '운건': '운동과 건강', '스문': '스포츠 문화', '스과': '스포츠 과학',
                      '스생1': '스포츠 생활1', '스생2': '스포츠 생활2'}.get(re.match(r'12(체육1|체육2|운건|스문|스과|스생1|스생2)', c0).group(1))
    if not level:
        warn.append('학교급을 성취기준에서 알 수 없음')
        level = '중학교'
    if not grade:
        warn.append('학년을 찾지 못함')
        grade = 1

    sport = next((s for s in sorted(SPORTS, key=len, reverse=True) if s in title), None)
    if not sport:
        warn.append('종목을 수행평가명에서 찾지 못함 → plans.json 에서 sport 를 고치세요')
        sport = '미분류'

    plan = {
        'title': title,
        'docTitle': doc_title or None,
        'schoolLevel': level,
        'grade': grade,
        'course': course,
        'sport': sport,
        'standards': standards,
        'intent': intent,
        'digital': {
            'devices': [x.strip() for x in re.split(r'[,\n]', devices) if x.strip()],
            'apps': [x.strip() for x in re.split(r'[,\n]', apps) if x.strip()],
            'content': dcontent.replace('\n', ' '),
        },
        'methods': {k: v for k, v in {'types': types, 'typeEtc': etc, 'evaluators': evaluators, 'modes': modes}.items() if v is not None},
        'contents': contents,
        'scoring': scoring,
        'achievement': achievement,
        'explanation': explanation,
    }
    return {k: v for k, v in plan.items() if v is not None}, image, warn


# ---------------- 파일 처리 ----------------

def hwp_pids():
    r = subprocess.run(['tasklist', '/FI', 'IMAGENAME eq Hwp.exe', '/FO', 'CSV', '/NH'], capture_output=True, text=True, errors='replace')
    return set(re.findall(r'"Hwp\.exe","(\d+)"', r.stdout))


def convert(src, outs, timeout=120):
    """한글을 한 번 열어 outs(확장자로 형식 결정)로 저장한다. 시간이 넘으면 이 변환이 띄운 한글만 끈다."""
    cmd = ['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', str(CONVERT), '-In', str(src), '-Out', '|'.join(str(o) for o in outs)]
    before = hwp_pids()
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8', errors='replace')
    try:
        out, err = proc.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        proc.kill()
        out, err = proc.communicate()
        # 이 변환 중에 새로 뜬 한글만 끈다 (원래 열려 있던 한글 창은 건드리지 않음)
        mine = set(re.findall(r'^PID (\d+)', out or '', re.M)) | (hwp_pids() - before)
        for pid in mine:
            subprocess.run(['taskkill', '/PID', str(pid), '/F'], capture_output=True)
        raise RuntimeError(f'한글이 {timeout}초 안에 응답하지 않음 (열려 있는 한글 창을 모두 닫고 다시 해 보세요)')
    missing = [str(o) for o in outs if not Path(o).exists() or Path(o).stat().st_size == 0]
    if proc.returncode != 0 or missing:
        raise RuntimeError(f'한글 변환 실패: {(err or out).strip()[:300]}')


def author_from_name(stem):
    m = re.search(r'\(([^)]+)\)', stem)
    part = m.group(1) if m else stem.split('_')[0]
    bits = part.split()
    if len(bits) >= 2:
        return bits[0], bits[-1]
    return part, ''


def main():
    ap = argparse.ArgumentParser(description='평가계획서 제출본 넣기')
    ap.add_argument('inputs', nargs='*')
    ap.add_argument('--office', default='')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--no-pdf', action='store_true', help='PDF 만들기 건너뛰기')
    ap.add_argument('--remove-dummy', action='store_true')
    a = ap.parse_args()

    plans = json.loads(PLANS.read_text(encoding='utf-8')) if PLANS.exists() else []
    if a.remove_dummy:
        before = len(plans)
        plans = [p for p in plans if not p.get('dummy')]
        PLANS.write_text(json.dumps(plans, ensure_ascii=False, indent=1), encoding='utf-8')
        print(f'더미 {before - len(plans)}건을 지웠습니다. 남은 자료 {len(plans)}건')
        if not a.inputs:
            return

    std_codes = {s['code'] for s in json.loads(STDS.read_text(encoding='utf-8'))}
    files = []
    for i in a.inputs:
        p = Path(i)
        files += sorted(x for x in p.iterdir() if x.suffix.lower() in ('.hwp', '.hwpx')) if p.is_dir() else [p]
    if not files:
        ap.print_help()
        return

    FILES.mkdir(parents=True, exist_ok=True)
    review = []
    tmp = Path(tempfile.mkdtemp(prefix='evalhub_'))
    for f in files:
        pid = 'p-' + hashlib.md5(f.name.encode('utf-8')).hexdigest()[:10]
        pdf_tmp = tmp / f'{pid}.pdf'
        pdf_note = None
        try:
            hwpx = f
            want_pdf = not a.no_pdf and not a.dry_run
            if f.suffix.lower() == '.hwp':
                hwpx = tmp / f'{pid}.hwpx'
                try:
                    convert(f, [hwpx] + ([pdf_tmp] if want_pdf else []))
                except RuntimeError as e:
                    if not want_pdf:
                        raise
                    pdf_note = f'PDF 만들기 실패: {e}'
                    convert(f, [hwpx])
            elif want_pdf:
                try:
                    convert(f, [pdf_tmp])
                except RuntimeError as e:
                    pdf_note = f'PDF 만들기 실패: {e}'
            plan, image, warn = parse_hwpx(hwpx, std_codes)
            if pdf_note:
                warn.append(pdf_note)
        except Exception as e:  # noqa: BLE001
            print(f'✗ {f.name}: {e}')
            review.append((f.name, [str(e)]))
            continue

        school, name = author_from_name(f.stem)
        plan = {
            'id': pid,
            **plan,
            'author': {'office': a.office, 'school': school, 'name': name},
            'files': {},
            'updated': dt.date.today().isoformat(),
        }
        if not a.dry_run:
            orig = FILES / f'{pid}{f.suffix.lower()}'
            shutil.copyfile(f, orig)
            plan['files'][f.suffix.lower().lstrip('.')] = f'files/{orig.name}'
            if pdf_tmp.exists() and pdf_tmp.stat().st_size > 0:
                pdf = FILES / f'{pid}.pdf'
                shutil.copyfile(pdf_tmp, pdf)
                plan['files']['pdf'] = f'files/{pdf.name}'
            if image:
                ext, data = image
                img = FILES / f'{pid}-explain{ext}'
                img.write_bytes(data)
                plan['explanation']['image'] = f'files/{img.name}'
        plans = [p for p in plans if p['id'] != pid] + [plan]
        print(f'✓ {f.name} → {plan["title"]} ({plan["schoolLevel"]} {plan["grade"]}학년, {plan["sport"]}, '
              f'채점표 {len(plan["scoring"])}개, 평가 설명 그림 {"있음" if image else "없음"})')
        if warn:
            review.append((f.name, warn))

    if not a.dry_run:
        PLANS.write_text(json.dumps(plans, ensure_ascii=False, indent=1), encoding='utf-8')
        print(f'\nplans.json 저장: 전체 {len(plans)}건')
    else:
        print('\n(--dry-run: 저장하지 않음)')
        print(json.dumps(plan, ensure_ascii=False, indent=1)[:4000])
    if review:
        print('\n확인 필요:')
        for name, ws in review:
            for w in ws:
                print(f'  - {name}: {w}')
    shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
