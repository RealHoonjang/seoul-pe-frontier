// 채점기준표 엑셀: ① 채점기준 ② 성취수준 ③ 학생 기록지(기록을 넣으면 성취수준 자동 판정)
import type { EvalPlan, ScoringTable, Standard } from '../types';
import { gradeLabel } from './labels';
import { baseName, saveBlob } from './download';
type ExcelJS = typeof import('exceljs');

const thin = { style: 'thin' as const, color: { argb: 'FF8A94A6' } };
const border = { top: thin, left: thin, bottom: thin, right: thin };
const headFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFDFE6F7' } };

function colLetter(n: number) {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** 숫자 경계값으로 성취수준을 자동 판정하는 수식 (모든 단계 경계가 있을 때만) */
function levelFormula(st: ScoringTable, rec: string, gender: string): string | null {
  if (st.measure === 'rubric' || !st.better) return null;
  const n = st.rows.length;
  const cuts = (key: 'm' | 'f') => st.rows.slice(0, n - 1).map((r) => r[key]);
  const build = (cs: (number | undefined)[]) => {
    if (cs.some((c) => c === undefined)) return null;
    const op = st.better === 'lower' ? '<=' : '>=';
    let expr = `"${st.rows[n - 1].level}"`;
    for (let i = n - 2; i >= 0; i--) expr = `IF(${rec}${op}${cs[i]},"${st.rows[i].level}",${expr})`;
    return expr;
  };
  const m = build(cuts('m'));
  if (!m) return null;
  if (!st.genderSplit) return `IF(${rec}="","",${m})`;
  const f = build(cuts('f'));
  if (!f) return null;
  return `IF(${rec}="","",IF(${gender}="여",${f},${m}))`;
}

export async function buildWorkbook(plan: EvalPlan, stdMap: Map<string, Standard>): Promise<Blob> {
  const ExcelJS: ExcelJS = (await import('exceljs')).default as unknown as ExcelJS;
  const wb = new ExcelJS.Workbook();
  wb.creator = '학교 체육 수업 길잡이';

  // ① 채점기준
  const ws = wb.addWorksheet('채점기준');
  ws.columns = [{ width: 46 }, { width: 10 }, { width: 22 }, { width: 22 }];
  ws.addRow([plan.title]).font = { bold: true, size: 14 };
  ws.addRow([`${gradeLabel(plan)} · ${plan.sport}`]);
  for (const c of plan.standards) ws.addRow([`[${c}] ${stdMap.get(c)?.text ?? ''}`]).alignment = { wrapText: false };
  ws.addRow([]);
  for (const st of plan.scoring) {
    const t = ws.addRow([`${st.title}${st.unit ? ` (단위: ${st.unit})` : ''}`]);
    t.font = { bold: true, size: 12 };
    const h = ws.addRow(['평가요소', '성취수준', st.genderSplit ? '남' : '기준', st.genderSplit ? '여' : '']);
    h.eachCell((c) => {
      c.fill = headFill;
      c.font = { bold: true };
      c.border = border;
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    if (!st.genderSplit) ws.mergeCells(h.number, 3, h.number, 4);
    const first = h.number + 1;
    st.rows.forEach((r, i) => {
      const row = ws.addRow([i === 0 ? st.elements.map((e) => `- ${e}`).join('\n') : '', r.level, r.male, st.genderSplit ? r.female ?? '' : '']);
      row.eachCell({ includeEmpty: true }, (c, col) => {
        c.border = border;
        c.alignment = { vertical: 'middle', horizontal: col === 2 ? 'center' : 'left', wrapText: true };
      });
      if (!st.genderSplit) ws.mergeCells(row.number, 3, row.number, 4);
      row.height = st.measure === 'rubric' ? 36 : 22;
    });
    ws.mergeCells(first, 1, first + st.rows.length - 1, 1);
    ws.getCell(first, 1).alignment = { vertical: 'top', wrapText: true };
    ws.addRow([]);
  }

  // ② 성취수준
  const wa = wb.addWorksheet('성취수준');
  wa.columns = [{ width: 10 }, { width: 100 }];
  const ah = wa.addRow(['성취도', '성취 수준']);
  ah.eachCell((c) => {
    c.fill = headFill;
    c.font = { bold: true };
    c.border = border;
    c.alignment = { horizontal: 'center' };
  });
  for (const a of plan.achievement) {
    const r = wa.addRow([a.level, a.text]);
    r.eachCell((c, col) => {
      c.border = border;
      c.alignment = { wrapText: true, vertical: 'middle', horizontal: col === 1 ? 'center' : 'left' };
    });
    r.height = Math.max(30, Math.ceil(a.text.length / 55) * 16);
  }

  // ③ 학생 기록지
  const wr = wb.addWorksheet('기록지');
  const head = ['번호', '이름', '성별'];
  const plansCols: { st: ScoringTable; recCol?: number; lvCol: number }[] = [];
  let col = 4;
  for (const st of plan.scoring) {
    if (st.measure !== 'rubric') {
      head.push(`${st.title}${st.unit ? ` (${st.unit})` : ''}`, `${st.title} 수준`);
      plansCols.push({ st, recCol: col, lvCol: col + 1 });
      col += 2;
    } else {
      head.push(`${st.title} 수준`);
      plansCols.push({ st, lvCol: col });
      col += 1;
    }
  }
  head.push('비고');
  const hr = wr.addRow(head);
  hr.height = 34;
  hr.eachCell((c) => {
    c.fill = headFill;
    c.font = { bold: true };
    c.border = border;
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  wr.columns = head.map((_, i) => ({ width: i < 1 ? 6 : i < 3 ? 10 : 14 }));
  wr.getColumn(head.length).width = 24;
  wr.views = [{ state: 'frozen', ySplit: 1, xSplit: 3 }];
  const levels = plan.achievement.map((a) => a.level).join(',') || 'A,B,C,D,E';
  for (let i = 1; i <= 35; i++) {
    const rowNo = i + 1;
    const vals: (string | number | { formula: string })[] = [i, '', ''];
    for (const pc of plansCols) {
      if (pc.recCol) {
        const f = levelFormula(pc.st, `${colLetter(pc.recCol)}${rowNo}`, `C${rowNo}`);
        vals.push('', f ? { formula: f } : '');
      } else vals.push('');
    }
    vals.push('');
    const r = wr.addRow(vals);
    r.eachCell({ includeEmpty: true }, (c) => {
      c.border = border;
      c.alignment = { horizontal: 'center' };
    });
    wr.getCell(`C${rowNo}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"남,여"'] };
    for (const pc of plansCols) {
      if (!pc.recCol) wr.getCell(rowNo, pc.lvCol).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${levels}"`] };
    }
  }
  const note = wr.addRow([]);
  void note;
  wr.addRow(['', '※ 성별(남/여)과 기록을 넣으면 숫자 기준이 있는 항목은 성취수준이 자동으로 표시됩니다.']);

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export async function downloadExcel(plan: EvalPlan, stdMap: Map<string, Standard>) {
  saveBlob(await buildWorkbook(plan, stdMap), `${baseName(plan)}_채점기준.xlsx`);
}
