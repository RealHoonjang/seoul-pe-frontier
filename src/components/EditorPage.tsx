// 내 학교용으로 가져오기: 내용을 고치면서 오른쪽에서 양식 미리보기를 확인하고 HWPX·엑셀로 내려받는다
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useApp } from '../ctx';
import type { EvalPlan, Measure, ScoringTable, SchoolLevel } from '../types';
import { EVAL_TYPES, EVALUATORS, EVAL_MODES, MEASURE_LABEL } from '../types';
import { GRADES, OFFICES } from '../lib/labels';
import { downloadHwpx, printPlan } from '../lib/download';
import PlanView from './PlanView';
import { IconDownload, IconPrint, IconSheet } from './Icons';

const LV5 = ['A', 'B', 'C', 'D', 'E'];
const LV3 = ['A', 'B', 'C'];
const COURSES = ['체육1', '체육2', '운동과 건강', '스포츠 문화', '스포츠 과학', '스포츠 생활1', '스포츠 생활2'];

const draftKey = (id: string) => `evalhub.draft.${id}`;

function blankTable(levels: string[]): ScoringTable {
  return {
    title: '평가 항목',
    elements: [''],
    measure: 'count',
    unit: '회',
    better: 'higher',
    genderSplit: true,
    rows: levels.map((level) => ({ level, male: '', female: '' })),
  };
}

function blankPlan(): EvalPlan {
  return {
    id: 'new',
    title: '',
    docTitle: '체육과 수행평가 계획서',
    schoolLevel: '중학교',
    grade: 1,
    sport: '',
    standards: [],
    intent: '',
    digital: { devices: [], apps: [], content: '' },
    methods: { types: ['실기평가'], evaluators: ['교사평가'], modes: ['개인별 수행'] },
    contents: [''],
    scoring: [blankTable(LV5)],
    achievement: LV5.map((level) => ({ level, text: '' })),
    explanation: {},
    author: { office: '', school: '', name: '' },
    updated: new Date().toISOString().slice(0, 10),
  };
}

function fromSource(p: EvalPlan): EvalPlan {
  const c: EvalPlan = JSON.parse(JSON.stringify(p));
  delete c.files;
  delete c.dummy;
  delete c.sample;
  c.author = { office: '', school: '', name: '' };
  c.updated = new Date().toISOString().slice(0, 10);
  return c;
}

const lines = (s: string) => s.split('\n');
const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
const num = (s: string) => (s.trim() === '' || isNaN(Number(s)) ? undefined : Number(s));

export default function EditorPage({ id }: { id: string }) {
  const { data, toast } = useApp();
  const srcId = decodeURIComponent(id);
  const source = srcId === 'new' ? null : data.byId.get(srcId)?.plan ?? null;
  const initial = useMemo(() => {
    try {
      const saved = localStorage.getItem(draftKey(srcId));
      if (saved) return JSON.parse(saved) as EvalPlan;
    } catch {
      /* 저장된 초안 없음 */
    }
    return source ? fromSource(source) : blankPlan();
  }, [srcId, source]);
  const [p, setP] = useState<EvalPlan>(initial);
  const [saved, setSaved] = useState<string>('');
  const [stdFind, setStdFind] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const first = useRef(true);

  useEffect(() => setP(initial), [initial]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(draftKey(srcId), JSON.stringify(p));
        setSaved(`이 브라우저에 자동 저장됨 ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`);
      } catch {
        setSaved('자동 저장 실패 (그림이 너무 크거나 저장소를 쓸 수 없음) — 내려받아 보관하세요');
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [p, srcId]);

  const up = (patch: Partial<EvalPlan>) => setP((x) => ({ ...x, ...patch }));
  const levels = p.achievement.map((a) => a.level);

  const setLevelCount = (n: 3 | 5) => {
    const lv = n === 3 ? LV3 : LV5;
    setP((x) => ({
      ...x,
      achievement: lv.map((level, i) => x.achievement[i] ? { ...x.achievement[i], level } : { level, text: '' }),
      scoring: x.scoring.map((s) => ({
        ...s,
        rows: lv.map((level, i) => (s.rows[i] ? { ...s.rows[i], level } : { level, male: '', female: '' })),
      })),
    }));
  };

  const setTable = (i: number, patch: Partial<ScoringTable>) =>
    setP((x) => ({ ...x, scoring: x.scoring.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const setRow = (i: number, r: number, patch: Partial<ScoringTable['rows'][number]>) =>
    setP((x) => ({
      ...x,
      scoring: x.scoring.map((s, j) => (j === i ? { ...s, rows: s.rows.map((row, k) => (k === r ? { ...row, ...patch } : row)) } : s)),
    }));

  const toggleIn = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const stdChoices = useMemo(() => {
    const f = stdFind.trim();
    return data.standards
      .filter((s) => s.school === p.schoolLevel)
      .filter((s) => p.schoolLevel !== '고등학교' || !p.course || s.course === p.course)
      .filter((s) => p.schoolLevel !== '초등학교' || s.grade === (p.grade <= 4 ? '3~4학년' : '5~6학년'))
      .filter((s) => !f || s.code.includes(f) || s.text.includes(f))
      .filter((s) => !p.standards.includes(s.code));
  }, [data.standards, p.schoolLevel, p.course, p.grade, p.standards, stdFind]);

  const onImage = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast('그림은 3MB 이하로 넣어 주세요.');
      return;
    }
    const r = new FileReader();
    r.onload = () => up({ explanation: { ...p.explanation, image: String(r.result) } });
    r.readAsDataURL(file);
  };

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast(`내려받지 못했습니다: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const reset = () => {
    if (!confirm('고친 내용을 지우고 처음 상태로 되돌릴까요?')) return;
    try {
      localStorage.removeItem(draftKey(srcId));
    } catch {
      /* 무시 */
    }
    setP(source ? fromSource(source) : blankPlan());
    setSaved('');
  };

  return (
    <>
      <nav className="crumb no-print">
        {source ? <a href={`#/plan/${encodeURIComponent(source.id)}`}>← 원래 계획서</a> : <a href="#/">← 검색</a>}
        <span>/</span>
        <span>{source ? `「${source.title}」 가져와서 고치기` : '빈 양식으로 새로 작성'}</span>
      </nav>
      <div className="actions no-print">
        <button className="btn primary" disabled={!!busy} onClick={() => run('hwpx', () => downloadHwpx(p, data.stdMap))}>
          <IconDownload /> {busy === 'hwpx' ? '만드는 중…' : '한글 파일(HWPX)'}
        </button>
        <button className="btn" onClick={() => printPlan(p)}><IconPrint /> PDF로 저장·인쇄</button>
        <button className="btn" disabled={!!busy} onClick={() => run('xlsx', async () => (await import('../lib/excel')).downloadExcel(p, data.stdMap))}>
          <IconSheet /> 채점기준·기록지 엑셀
        </button>
        <span className="sep" />
        <button className="btn ghost" onClick={reset}>처음 상태로</button>
        <span className="saved">{saved}</span>
      </div>

      <div className="editor">
        <form className="edit-form no-print" onSubmit={(e) => e.preventDefault()}>
          <fieldset>
            <legend>기본 정보</legend>
            <label className="field"><span>문서 제목</span>
              <input value={p.docTitle ?? ''} onChange={(e) => up({ docTitle: e.target.value })} />
            </label>
            <label className="field"><span>수행평가명</span>
              <input value={p.title} onChange={(e) => up({ title: e.target.value })} placeholder="예: 농구 종합 평가" />
            </label>
            <div className="row3">
              <label className="field"><span>학교급</span>
                <select
                  value={p.schoolLevel}
                  onChange={(e) => {
                    const lv = e.target.value as SchoolLevel;
                    up({ schoolLevel: lv, grade: GRADES[lv][0], course: lv === '고등학교' ? COURSES[0] : undefined, standards: [] });
                  }}
                >
                  {Object.keys(GRADES).map((l) => <option key={l}>{l}</option>)}
                </select>
              </label>
              <label className="field"><span>학년</span>
                <select value={p.grade} onChange={(e) => up({ grade: Number(e.target.value) })}>
                  {GRADES[p.schoolLevel].map((g) => <option key={g} value={g}>{g}학년</option>)}
                </select>
              </label>
              <label className="field"><span>종목</span>
                <input value={p.sport} onChange={(e) => up({ sport: e.target.value })} placeholder="예: 농구" />
              </label>
            </div>
            {p.schoolLevel === '고등학교' && (
              <label className="field"><span>과목</span>
                <select value={p.course ?? ''} onChange={(e) => up({ course: e.target.value, standards: [] })}>
                  {COURSES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
            )}
            <label className="field"><span>성취수준 단계</span>
              <select value={levels.length} onChange={(e) => setLevelCount(Number(e.target.value) as 3 | 5)}>
                <option value={5}>5단계 (A~E)</option>
                <option value={3}>3단계 (A~C)</option>
              </select>
            </label>
          </fieldset>

          <fieldset>
            <legend>교육과정 성취기준</legend>
            <div className="std-picked">
              {p.standards.map((c) => (
                <div key={c}>
                  <b>[{c}]</b>
                  <span>{data.stdMap.get(c)?.text}</span>
                  <button type="button" onClick={() => up({ standards: p.standards.filter((x) => x !== c) })} aria-label={`${c} 빼기`}>×</button>
                </div>
              ))}
            </div>
            <label className="field"><span>성취기준 더하기</span>
              <input value={stdFind} onChange={(e) => setStdFind(e.target.value)} placeholder="코드나 낱말로 찾기 (예: 영역형)" />
              <small>{p.schoolLevel} {p.schoolLevel === '고등학교' ? p.course : ''} 성취기준 {stdChoices.length}개</small>
            </label>
            <div className="stdlist">
              {stdChoices.map((s) => (
                <button type="button" key={s.code} className="stdopt" onClick={() => up({ standards: [...p.standards, s.code] })}>
                  <code>[{s.code}]</code>
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>평가 의도·디지털 기기</legend>
            <label className="field"><span>평가 의도</span>
              <textarea value={p.intent} onChange={(e) => up({ intent: e.target.value })} />
            </label>
            <div className="row2">
              <label className="field"><span>기기</span>
                <input value={p.digital.devices.join(', ')} onChange={(e) => up({ digital: { ...p.digital, devices: list(e.target.value) } })} placeholder="쉼표로 구분" />
              </label>
              <label className="field"><span>앱</span>
                <input value={p.digital.apps.join(', ')} onChange={(e) => up({ digital: { ...p.digital, apps: list(e.target.value) } })} placeholder="쉼표로 구분" />
              </label>
            </div>
            <label className="field"><span>활용 내용</span>
              <textarea value={p.digital.content} onChange={(e) => up({ digital: { ...p.digital, content: e.target.value } })} placeholder="없다면 빈칸" />
            </label>
          </fieldset>

          <fieldset>
            <legend>평가 방법·내용</legend>
            <div className="field"><span>평가 유형</span>
              <div className="checkrow">
                {EVAL_TYPES.map((t) => (
                  <label key={t}><input type="checkbox" checked={p.methods.types.includes(t)} onChange={() => up({ methods: { ...p.methods, types: toggleIn(p.methods.types, t) } })} />{t}</label>
                ))}
              </div>
              {p.methods.types.includes('기타') && (
                <input value={p.methods.typeEtc ?? ''} onChange={(e) => up({ methods: { ...p.methods, typeEtc: e.target.value } })} placeholder="기타 내용" />
              )}
            </div>
            <div className="field"><span>평가 주체</span>
              <div className="checkrow">
                {EVALUATORS.map((t) => (
                  <label key={t}><input type="checkbox" checked={p.methods.evaluators.includes(t)} onChange={() => up({ methods: { ...p.methods, evaluators: toggleIn(p.methods.evaluators, t) } })} />{t}</label>
                ))}
              </div>
            </div>
            <div className="field"><span>평가 방식</span>
              <div className="checkrow">
                {EVAL_MODES.map((t) => (
                  <label key={t}><input type="checkbox" checked={p.methods.modes.includes(t)} onChange={() => up({ methods: { ...p.methods, modes: toggleIn(p.methods.modes, t) } })} />{t}</label>
                ))}
              </div>
            </div>
            <label className="field"><span>평가 내용</span>
              <textarea value={p.contents.join('\n')} onChange={(e) => up({ contents: lines(e.target.value) })} />
              <small>한 줄에 하나씩</small>
            </label>
          </fieldset>

          <fieldset>
            <legend>채점 기준</legend>
            {p.scoring.map((st, i) => (
              <div className="subcard" key={i}>
                <div className="subcard-head">
                  <b>채점 기준 {i + 1}</b>
                  <button type="button" className="btn ghost" onClick={() => up({ scoring: p.scoring.filter((_, j) => j !== i) })}>표 빼기</button>
                </div>
                <div className="row2">
                  <label className="field"><span>표 제목</span>
                    <input value={st.title} onChange={(e) => setTable(i, { title: e.target.value })} />
                  </label>
                  <label className="field"><span>측정 방식</span>
                    <select
                      value={st.measure}
                      onChange={(e) => {
                        const m = e.target.value as Measure;
                        setTable(i, { measure: m, better: m === 'time' ? 'lower' : m === 'rubric' ? undefined : 'higher', genderSplit: m === 'rubric' ? false : st.genderSplit });
                      }}
                    >
                      {(Object.keys(MEASURE_LABEL) as Measure[]).map((m) => <option key={m} value={m}>{MEASURE_LABEL[m]}</option>)}
                    </select>
                  </label>
                </div>
                <div className="row2">
                  <label className="field"><span>단위</span>
                    <input value={st.unit ?? ''} onChange={(e) => setTable(i, { unit: e.target.value })} placeholder="회, 초, m, 점 …" />
                  </label>
                  <label className="field" style={{ justifyContent: 'flex-end' }}>
                    <span>&nbsp;</span>
                    <span style={{ fontWeight: 400 }}>
                      <input type="checkbox" checked={st.genderSplit} onChange={(e) => setTable(i, { genderSplit: e.target.checked })} /> 남녀 기준 따로
                    </span>
                  </label>
                </div>
                <label className="field"><span>평가요소</span>
                  <textarea value={st.elements.join('\n')} onChange={(e) => setTable(i, { elements: lines(e.target.value) })} />
                  <small>한 줄에 하나씩</small>
                </label>
                <div className={`lvgrid${st.genderSplit ? '' : ' nosplit'}`}>
                  <span className="h">수준</span>
                  <span className="h">{st.genderSplit ? '남' : '기준'}</span>
                  {st.genderSplit && <span className="h">여</span>}
                  <span className="h" title="그래프와 엑셀 자동판정에 쓰는 숫자">{st.genderSplit ? '남 숫자' : '숫자'}</span>
                  {st.genderSplit && <span className="h">여 숫자</span>}
                  {st.rows.map((r, k) => (
                    <FragmentRow key={k}>
                      <span className="lv">{r.level}</span>
                      <input value={r.male} onChange={(e) => setRow(i, k, { male: e.target.value })} aria-label={`${r.level} ${st.genderSplit ? '남' : ''} 기준`} />
                      {st.genderSplit && <input value={r.female ?? ''} onChange={(e) => setRow(i, k, { female: e.target.value })} aria-label={`${r.level} 여 기준`} />}
                      <input inputMode="decimal" value={r.m ?? ''} onChange={(e) => setRow(i, k, { m: num(e.target.value) })} aria-label={`${r.level} 숫자 경계`} disabled={st.measure === 'rubric'} />
                      {st.genderSplit && <input inputMode="decimal" value={r.f ?? ''} onChange={(e) => setRow(i, k, { f: num(e.target.value) })} aria-label={`${r.level} 여 숫자 경계`} disabled={st.measure === 'rubric'} />}
                    </FragmentRow>
                  ))}
                </div>
                {st.measure !== 'rubric' && (
                  <small style={{ color: 'var(--muted)', fontSize: 12 }}>
                    숫자 칸: 그 수준에 들어가는 경계값 ({st.better === 'lower' ? '이 값 이내' : '이 값 이상'}). 채우면 엑셀 기록지에서 성취수준이 자동으로 나오고 남녀 비교 그래프가 그려집니다.
                  </small>
                )}
              </div>
            ))}
            <button type="button" className="btn" onClick={() => up({ scoring: [...p.scoring, blankTable(levels)] })}>+ 채점 기준 표 더하기</button>
          </fieldset>

          <fieldset>
            <legend>성취수준</legend>
            {p.achievement.map((a, i) => (
              <label className="field" key={a.level}><span>{a.level}</span>
                <textarea
                  value={a.text}
                  onChange={(e) => up({ achievement: p.achievement.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })}
                />
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>평가 설명</legend>
            <label className="field"><span>설명 글</span>
              <textarea value={p.explanation.text ?? ''} onChange={(e) => up({ explanation: { ...p.explanation, text: e.target.value } })} />
            </label>
            <label className="field"><span>그림 (배치도 등)</span>
              <input type="file" accept="image/png,image/jpeg,image/gif,image/bmp" onChange={(e) => onImage(e.target.files?.[0])} />
            </label>
            {p.explanation.image && (
              <button type="button" className="btn ghost" onClick={() => up({ explanation: { ...p.explanation, image: undefined } })}>그림 빼기</button>
            )}
          </fieldset>

          <fieldset>
            <legend>작성자 (선택)</legend>
            <div className="row3">
              <label className="field"><span>교육지원청</span>
                <select value={p.author.office} onChange={(e) => up({ author: { ...p.author, office: e.target.value } })}>
                  <option value="">고르기</option>
                  {OFFICES.map((o) => <option key={o}>{o}</option>)}
                </select>
              </label>
              <label className="field"><span>학교</span>
                <input value={p.author.school} onChange={(e) => up({ author: { ...p.author, school: e.target.value } })} />
              </label>
              <label className="field"><span>교사</span>
                <input value={p.author.name} onChange={(e) => up({ author: { ...p.author, name: e.target.value } })} />
              </label>
            </div>
          </fieldset>
        </form>

        <div className="editor-preview print-area" aria-label="미리보기">
          <PlanView plan={p} stdMap={data.stdMap} />
        </div>
      </div>
    </>
  );
}

function FragmentRow({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
