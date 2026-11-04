// 평가계획 데이터 → 연구회 양식 그대로의 HWPX(한글 문서) 만들기.
// public/template/plan-template.hwpx(원본 양식에서 내용만 뺀 틀)의 스타일을 그대로 쓰고,
// 표 안의 글자와 행 수만 데이터에 맞게 바꾼다. 브라우저와 Node(테스트) 양쪽에서 동작한다.
import JSZip from 'jszip';
import type { EvalPlan, ScoringTable } from '../types';
import { EVAL_TYPES, EVALUATORS, EVAL_MODES } from '../types';
import { gradeLabel } from './labels';

const HP = 'http://www.hancom.co.kr/hwpml/2011/paragraph';
const HC = 'http://www.hancom.co.kr/hwpml/2011/core';

export interface XmlEnv {
  parse(xml: string): Document;
  serialize(doc: Document): string;
}

export interface HwpxImage {
  data: Uint8Array;
  /** png | jpg | bmp | gif */
  ext: string;
  width: number;
  height: number;
}

export interface HwpxOptions {
  template: ArrayBuffer | Uint8Array;
  xml: XmlEnv;
  standardText: (code: string) => string | undefined;
  image?: HwpxImage | null;
}

// ---------- 작은 DOM 도우미 (xmldom 호환을 위해 기본 API만 사용) ----------
type El = Element;
const kids = (n: Node, local: string): El[] => {
  const out: El[] = [];
  for (let c = n.firstChild; c; c = c.nextSibling) {
    if (c.nodeType === 1 && (c as El).localName === local) out.push(c as El);
  }
  return out;
};
const kid = (n: Node, local: string): El | undefined => kids(n, local)[0];
const all = (n: Document | El, local: string): El[] => Array.from(n.getElementsByTagNameNS(HP, local));
const remove = (n: Node) => n.parentNode?.removeChild(n);

function cellAt(tbl: El, row: number, col: number): El | undefined {
  for (const tr of kids(tbl, 'tr')) {
    for (const tc of kids(tr, 'tc')) {
      const a = kid(tc, 'cellAddr')!;
      if (Number(a.getAttribute('rowAddr')) === row && Number(a.getAttribute('colAddr')) === col) return tc;
    }
  }
  return undefined;
}

function textOf(n: Node): string {
  return all(n as El, 't').map((t) => t.textContent ?? '').join('');
}

/** 셀 내용을 주어진 줄들로 바꾼다. 첫 문단의 문단 모양과 가장 긴 글자 묶음의 글자 모양을 쓴다. */
function setCellLines(tc: El, lines: string[]) {
  const sub = kid(tc, 'subList')!;
  const ps = kids(sub, 'p');
  const proto = ps[0];
  let charPr = '0';
  let best = -1;
  for (const p of ps) {
    for (const r of kids(p, 'run')) {
      const len = textOf(r).length;
      if (len > best) {
        best = len;
        charPr = r.getAttribute('charPrIDRef') ?? '0';
      }
    }
  }
  const doc = tc.ownerDocument!;
  for (const p of ps) remove(p);
  const ls = lines.length ? lines : [''];
  for (const line of ls) {
    const p = proto.cloneNode(false) as El;
    const run = doc.createElementNS(HP, 'hp:run');
    run.setAttribute('charPrIDRef', charPr);
    const t = doc.createElementNS(HP, 'hp:t');
    if (line) t.appendChild(doc.createTextNode(line));
    run.appendChild(t);
    p.appendChild(run);
    sub.appendChild(p);
  }
}

function setCell(tbl: El, row: number, col: number, lines: string[] | string) {
  const tc = cellAt(tbl, row, col);
  if (!tc) throw new Error(`양식 셀을 찾을 수 없음 (${row},${col})`);
  setCellLines(tc, Array.isArray(lines) ? lines : splitLines(lines));
}

const splitLines = (s: string) => (s ?? '').split(/\r?\n/);

/** □/■ 체크박스 글자만 바꾼다 (양식의 탭·띄어쓰기 배치는 그대로 유지) */
function setChecks(tc: El, selected: Set<string>, labels: readonly string[], etc?: string) {
  for (const t of all(tc, 't')) {
    for (let c = t.firstChild; c; c = c.nextSibling) {
      if (c.nodeType !== 3) continue;
      const node = c as Text;
      let s = node.data;
      for (const label of labels) {
        const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        s = s.replace(new RegExp(`[□■](\\s*)${esc}`), (_m, sp) => {
          const mark = selected.has(label) ? '■' : '□';
          const extra = label === '기타' && etc && selected.has('기타') ? `(${etc})` : '';
          return `${mark}${sp}${label}${extra}`;
        });
      }
      node.data = s;
      (node as unknown as { nodeValue: string }).nodeValue = s;
    }
  }
}

function setAddr(tc: El, row: number) {
  kid(tc, 'cellAddr')!.setAttribute('rowAddr', String(row));
}

/** 떠 있는 표를 '자리 차지' 배치로 바꿔 내용이 늘어나도 겹치지 않게 한다 */
function normalizeTable(tbl: El) {
  tbl.setAttribute('textWrap', 'TOP_AND_BOTTOM');
  // 쪽이 넘어갈 때 한 행이 둘로 쪼개지지 않고 행 단위로 넘어가게 한다
  // ('NONE'(나누지 않음)은 떠 있는 표끼리 겹치는 문제가 있어 쓰지 않는다)
  tbl.setAttribute('pageBreak', 'TABLE');
  tbl.setAttribute('id', String(1000000000 + Math.floor(Math.random() * 900000000)));
  const pos = kid(tbl, 'pos');
  if (pos) {
    pos.setAttribute('treatAsChar', '0');
    pos.setAttribute('flowWithText', '1');
    pos.setAttribute('vertRelTo', 'PARA');
    pos.setAttribute('horzRelTo', 'COLUMN');
    pos.setAttribute('vertAlign', 'TOP');
    pos.setAttribute('horzAlign', 'LEFT');
    pos.setAttribute('vertOffset', '0');
    pos.setAttribute('horzOffset', '0');
  }
}

function tableParagraph(protoP: El, tbl: El): El {
  const doc = protoP.ownerDocument!;
  const p = protoP.cloneNode(false) as El;
  const run = doc.createElementNS(HP, 'hp:run');
  run.setAttribute('charPrIDRef', '26');
  normalizeTable(tbl);
  run.appendChild(tbl);
  run.appendChild(doc.createElementNS(HP, 'hp:t'));
  p.appendChild(run);
  return p;
}

// ---------- 표별 채우기 ----------

function fillBasic(tbl: El, plan: EvalPlan, std: HwpxOptions['standardText']) {
  setCell(tbl, 0, 1, plan.title);
  setCell(
    tbl,
    1,
    1,
    plan.standards.map((c) => `[${c}] ${std(c) ?? ''}`.trim()),
  );
  setCell(tbl, 2, 1, plan.intent);
  setCell(tbl, 3, 2, plan.digital.devices.join(', '));
  setCell(tbl, 4, 2, plan.digital.apps.join(', '));
  setCell(tbl, 5, 2, plan.digital.content);
  setChecks(cellAt(tbl, 6, 3)!, new Set(plan.methods.types), EVAL_TYPES, plan.methods.typeEtc);
  setChecks(cellAt(tbl, 7, 3)!, new Set(plan.methods.evaluators), EVALUATORS);
  setChecks(cellAt(tbl, 8, 3)!, new Set(plan.methods.modes), EVAL_MODES);
  setCell(
    tbl,
    9,
    1,
    plan.contents.map((c) => `․ ${c}`),
  );
}

function fillScoring(proto: El, st: ScoringTable): El {
  const tbl = proto.cloneNode(true) as El;
  const rows = kids(tbl, 'tr');
  const [head1, head2, first, mid, , , last] = rows;
  // 다음 쪽으로 넘어가면 '평가요소 | 채점 기준' 머리행을 반복한다
  for (const tc of [...kids(head1, 'tc'), ...kids(head2, 'tc')]) tc.setAttribute('header', '1');
  const n = Math.max(1, st.rows.length);
  // 본문 행 다시 구성: 첫 행(평가요소 칸 포함) + 가운데 행 복제 + 마지막 행(아래 굵은 선)
  for (const r of rows.slice(2)) remove(r);
  const body: El[] = [first];
  for (let i = 1; i < n - 1; i++) body.push(mid.cloneNode(true) as El);
  if (n >= 2) body.push(last);
  body.forEach((tr, i) => {
    kids(tr, 'tc').forEach((tc) => setAddr(tc, 2 + i));
    tbl.appendChild(tr);
  });
  tbl.setAttribute('rowCnt', String(2 + n));

  const elemCell = kids(first, 'tc')[0];
  kid(elemCell, 'cellSpan')!.setAttribute('rowSpan', String(n));
  kid(elemCell, 'cellSz')!.setAttribute('height', String(2817 * n));
  const titleLine = `[${st.title}${st.unit ? ` · 단위: ${st.unit}` : ''}]`;
  setCellLines(elemCell, [titleLine, ...st.elements.map((e) => `- ${e}`)]);

  // 성별 구분이 없으면 남/여 칸을 합친다
  if (!st.genderSplit) {
    const merge = (tr: El) => {
      const tcs = kids(tr, 'tc');
      const fCell = tcs[tcs.length - 1];
      const mCell = tcs[tcs.length - 2];
      const w = Number(kid(mCell, 'cellSz')!.getAttribute('width')) + Number(kid(fCell, 'cellSz')!.getAttribute('width'));
      kid(mCell, 'cellSpan')!.setAttribute('colSpan', '2');
      kid(mCell, 'cellSz')!.setAttribute('width', String(w));
      mCell.setAttribute('borderFillIDRef', fCell.getAttribute('borderFillIDRef') ?? mCell.getAttribute('borderFillIDRef')!);
      remove(fCell);
    };
    merge(head2);
    body.forEach(merge);
    setCellLines(kids(head2, 'tc')[1], ['기준']);
  }

  body.forEach((tr, i) => {
    const r = st.rows[i];
    const tcs = kids(tr, 'tc');
    const off = i === 0 ? 1 : 0; // 첫 행은 맨 앞에 평가요소 칸이 있음
    setCellLines(tcs[off], [r?.level ?? '']);
    setCellLines(tcs[off + 1], [r?.male ?? '']);
    if (st.genderSplit) setCellLines(tcs[off + 2], [r?.female ?? '']);
  });
  const sz = kid(tbl, 'sz');
  sz?.setAttribute('height', String(1382 + 3446 + 2817 * n));
  return tbl;
}

function fillAchievement(tbl: El, plan: EvalPlan) {
  const rows = kids(tbl, 'tr');
  const [headRow, ...levelRows] = rows;
  // 다음 쪽으로 넘어가면 '성취도 | 성취 수준' 머리행을 반복한다
  kids(headRow, 'tc').forEach((tc) => tc.setAttribute('header', '1'));
  const n = Math.max(1, plan.achievement.length);
  const lastRow = levelRows[levelRows.length - 1];
  for (const r of levelRows) remove(r);
  const body: El[] = [];
  for (let i = 0; i < n - 1; i++) body.push((levelRows[Math.min(i, levelRows.length - 2)]).cloneNode(true) as El);
  body.push(lastRow);
  body.forEach((tr, i) => {
    kids(tr, 'tc').forEach((tc) => setAddr(tc, 1 + i));
    const [lv, tx] = kids(tr, 'tc');
    const a = plan.achievement[i];
    setCellLines(lv, [a?.level ?? '']);
    setCellLines(tx, splitLines(a?.text ?? ''));
    tbl.appendChild(tr);
  });
  tbl.setAttribute('rowCnt', String(1 + n));
}

function fillExplanation(tbl: El, plan: EvalPlan, image?: HwpxImage | null): boolean {
  const cell = cellAt(tbl, 1, 0)!;
  const pic = all(cell, 'pic')[0];
  const text = plan.explanation.text?.trim();
  if (image && pic) {
    // 그림 크기: 칸 너비에 맞추고 비율 유지 (HWPUNIT: 1px ≈ 75)
    const orgW = image.width * 75;
    const orgH = image.height * 75;
    let curW = 41358;
    let curH = Math.round((curW * image.height) / image.width);
    const maxH = 52000;
    if (curH > maxH) {
      curW = Math.round((curW * maxH) / curH);
      curH = maxH;
    }
    const set = (local: string, ns: string, attrs: Record<string, number | string>) => {
      const e = Array.from(pic.getElementsByTagNameNS(ns, local))[0];
      if (e) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    };
    set('offset', HP, { x: 0, y: 0 });
    set('orgSz', HP, { width: orgW, height: orgH });
    set('curSz', HP, { width: curW, height: curH });
    set('rotationInfo', HP, { centerX: Math.round(curW / 2), centerY: Math.round(curH / 2) });
    set('transMatrix', HC, { e1: 1, e2: 0, e3: 0, e4: 0, e5: 1, e6: 0 });
    set('scaMatrix', HC, { e1: (curW / orgW).toFixed(6), e2: 0, e3: 0, e4: 0, e5: (curH / orgH).toFixed(6), e6: 0 });
    set('pt1', HC, { x: orgW, y: 0 });
    set('pt2', HC, { x: orgW, y: orgH });
    set('pt3', HC, { x: 0, y: orgH });
    set('imgClip', HP, { left: 0, right: orgW, top: 0, bottom: orgH });
    set('imgDim', HP, { dimwidth: orgW, dimheight: orgH });
    set('sz', HP, { width: curW, height: curH });
    set('pos', HP, { horzOffset: 0, vertOffset: 0 });
    const comment = Array.from(pic.getElementsByTagNameNS(HP, 'shapeComment'))[0];
    if (comment) comment.textContent = '평가 설명 그림';
    kid(cell, 'cellSz')!.setAttribute('height', String(curH + 600));
    if (text) {
      // 그림 아래에 설명 글 덧붙이기
      const sub = kid(cell, 'subList')!;
      const proto = kids(sub, 'p')[0];
      for (const line of splitLines(text)) {
        const p = proto.cloneNode(false) as El;
        p.setAttribute('paraPrIDRef', '61');
        const run = cell.ownerDocument!.createElementNS(HP, 'hp:run');
        run.setAttribute('charPrIDRef', '0');
        const t = cell.ownerDocument!.createElementNS(HP, 'hp:t');
        t.appendChild(cell.ownerDocument!.createTextNode(line));
        run.appendChild(t);
        p.appendChild(run);
        sub.appendChild(p);
      }
    }
    return true;
  }
  if (!text) return false;
  setCellLines(cell, splitLines(text));
  // 그림용 가운데 정렬 대신 성취수준 칸과 같은 왼쪽 정렬 문단 모양을 쓴다
  for (const p of kids(kid(cell, 'subList')!, 'p')) p.setAttribute('paraPrIDRef', '61');
  kid(cell, 'cellSz')!.setAttribute('height', '3000');
  return true;
}

// ---------- 본문 ----------

export function buildSection(xml: string, plan: EvalPlan, opts: Pick<HwpxOptions, 'xml' | 'standardText' | 'image'>): string {
  const doc = opts.xml.parse(xml);
  const sec = doc.documentElement;
  const ps = kids(sec, 'p');
  const topTables: El[] = [];
  for (const p of ps) for (const r of kids(p, 'run')) for (const t of kids(r, 'tbl')) topTables.push(t);
  if (topTables.length < 5) throw new Error('양식 틀의 표 구성이 예상과 다릅니다.');
  const [tBasic, tScore, tScore2, tAch, tExp] = topTables;

  const [pSec, pTitle, pEmpty, pGrade] = ps;
  const pTableProto = ps[4];

  // 제목
  const titleRuns = kids(pTitle, 'run');
  const titleT = all(titleRuns[0], 't')[0];
  while (titleT.firstChild) titleT.removeChild(titleT.firstChild);
  titleT.appendChild(doc.createTextNode(plan.docTitle?.trim() || '체육과 수행평가 계획서'));
  titleRuns.slice(1).forEach(remove);

  // 학년 문단 (표는 따로 떼어낸다)
  const gradeP = pGrade.cloneNode(true) as El;
  for (const r of kids(gradeP, 'run')) if (kids(r, 'tbl').length) remove(r);
  for (const t of all(gradeP, 't')) {
    if ((t.textContent ?? '').includes('학년')) {
      while (t.firstChild) t.removeChild(t.firstChild);
      t.appendChild(doc.createTextNode(`가. ${gradeLabel(plan)}`));
    }
  }

  fillBasic(tBasic, plan, opts.standardText);
  const scoreTables = plan.scoring.map((s) => fillScoring(tScore, s));
  fillAchievement(tAch, plan);
  const hasExp = fillExplanation(tExp, plan, opts.image);
  void tScore2;

  // 본문 다시 쌓기
  for (const p of ps.slice(1)) remove(p);
  const blank = () => pEmpty.cloneNode(true) as El;
  const add = (n: El) => sec.appendChild(n);
  add(pTitle);
  add(blank());
  add(gradeP);
  add(tableParagraph(pTableProto, tBasic));
  for (const t of scoreTables) {
    add(blank());
    add(tableParagraph(pTableProto, t));
  }
  add(blank());
  add(tableParagraph(pTableProto, tAch));
  if (hasExp) {
    add(blank());
    add(tableParagraph(pTableProto, tExp));
  }
  void pSec;

  // 줄 배치 정보(layout 캐시)는 지워서 한글이 다시 계산하게 한다
  for (const ls of all(doc, 'linesegarray')) remove(ls);

  let out = opts.xml.serialize(doc);
  if (!out.startsWith('<?xml')) out = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>' + out;
  return out;
}

export function planPlainText(plan: EvalPlan): string {
  return [plan.title, gradeLabel(plan), plan.sport, plan.intent, ...plan.contents].join('\r\n');
}

export async function buildHwpx(plan: EvalPlan, opts: HwpxOptions): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(opts.template);
  const section = await zip.file('Contents/section0.xml')!.async('string');
  zip.file('Contents/section0.xml', buildSection(section, plan, opts));
  zip.file('Preview/PrvText.txt', planPlainText(plan));
  if (opts.image) {
    const ext = opts.image.ext.toLowerCase().replace('jpeg', 'jpg');
    const mime = { png: 'image/png', jpg: 'image/jpg', bmp: 'image/bmp', gif: 'image/gif' }[ext] ?? 'image/png';
    zip.file(`BinData/image1.${ext}`, opts.image.data);
    const hpf = await zip.file('Contents/content.hpf')!.async('string');
    zip.file(
      'Contents/content.hpf',
      hpf.replace(
        '<opf:item id="section0"',
        `<opf:item id="image1" href="BinData/image1.${ext}" media-type="${mime}" isEmbeded="1"/><opf:item id="section0"`,
      ),
    );
  }
  // mimetype 은 압축하지 않은 채 맨 앞에 있어야 한다
  const mimetype = await zip.file('mimetype')!.async('string');
  zip.file('mimetype', mimetype, { compression: 'STORE' });
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', mimeType: 'application/hwp+zip' });
}
