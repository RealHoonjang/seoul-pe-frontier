import type { Indexed } from './data';
import { AREA_ORDER, TYPE_ORDER } from './labels';
import { EVAL_TYPES, EVALUATORS, EVAL_MODES } from '../types';

export type Axis = '교육과정' | '종목' | '평가' | '에듀테크';

export interface Facet {
  key: string;
  label: string;
  axis: Axis;
  values: (x: Indexed) => string[];
  /** 값 정렬 순서 (없으면 개수 많은 순) */
  order?: readonly string[];
  /** 값이 많을 때 검색창 표시 */
  searchable?: boolean;
}

const GRADE_ORDER = ['초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];

export const FACETS: Facet[] = [
  { key: 'lv', label: '학교급', axis: '교육과정', values: (x) => [x.plan.schoolLevel], order: ['초등학교', '중학교', '고등학교'] },
  { key: 'gr', label: '학년', axis: '교육과정', values: (x) => [x.gradeKey], order: GRADE_ORDER },
  { key: 'area', label: '영역', axis: '교육과정', values: (x) => x.areas, order: AREA_ORDER },
  { key: 'type', label: '세부 유형', axis: '교육과정', values: (x) => x.types, order: TYPE_ORDER },
  { key: 'course', label: '고등학교 과목', axis: '교육과정', values: (x) => (x.plan.course ? [x.plan.course] : []) },
  { key: 'std', label: '성취기준', axis: '교육과정', values: (x) => x.plan.standards, searchable: true },
  { key: 'sport', label: '종목', axis: '종목', values: (x) => [x.plan.sport], searchable: true },
  { key: 'etype', label: '평가 유형', axis: '평가', values: (x) => x.plan.methods.types, order: EVAL_TYPES },
  { key: 'who', label: '평가 주체', axis: '평가', values: (x) => x.plan.methods.evaluators, order: EVALUATORS },
  { key: 'mode', label: '평가 방식', axis: '평가', values: (x) => x.plan.methods.modes, order: EVAL_MODES },
  { key: 'measure', label: '측정 방식', axis: '평가', values: (x) => x.measures },
  {
    key: 'use',
    label: '디지털 활용',
    axis: '에듀테크',
    values: (x) => [x.plan.digital.devices.length || x.plan.digital.apps.length ? '활용함' : '활용 안 함'],
    order: ['활용함', '활용 안 함'],
  },
  { key: 'device', label: '기기', axis: '에듀테크', values: (x) => x.plan.digital.devices, searchable: true },
  { key: 'app', label: '앱·프로그램', axis: '에듀테크', values: (x) => x.plan.digital.apps, searchable: true },
];

export const AXES: Axis[] = ['교육과정', '종목', '평가', '에듀테크'];

/** 학교급별로 차례대로 보여 줄 기본 조건. 앞 단계를 고르면 다음 단계가 열린다(type 은 영역을 고른 뒤) */
export const GUIDE_STEPS: Record<string, string[]> = {
  초등학교: ['gr', 'area', 'type', 'sport'],
  중학교: ['gr', 'area', 'type', 'sport'],
  고등학교: ['course', 'gr', 'area', 'type', 'sport'],
  전체: ['area', 'sport'],
};

/** '상세 조건'에 접어 두는 조건 */
export const ADVANCED = ['etype', 'who', 'mode', 'measure', 'use', 'device', 'app', 'std'];

export const facetByKey = (k: string) => FACETS.find((f) => f.key === k)!;

export type SortKey = 'recent' | 'grade' | 'sport';

export interface Query {
  q: string;
  f: Record<string, string[]>;
  sort: SortKey;
  /** 학교급을 고르지 않고 전체를 둘러보는 중 */
  all?: boolean;
}

export const emptyQuery = (): Query => ({ q: '', f: {}, sort: 'recent' });

/** 학교급에 따라 달라지는 조건 — 학교급을 바꾸면 지운다 */
export const LEVEL_BOUND = ['gr', 'course', 'type', 'std'];

export function setLevel(q: Query, level: string | null): Query {
  const f = { ...q.f };
  for (const k of LEVEL_BOUND) delete f[k];
  if (level) f.lv = [level];
  else delete f.lv;
  return { ...q, f, all: !level };
}

export function queryToParams(q: Query): string {
  const sp = new URLSearchParams();
  if (q.all && !q.f.lv?.length) sp.set('all', '1');
  if (q.q.trim()) sp.set('q', q.q.trim());
  for (const [k, vs] of Object.entries(q.f)) for (const v of vs) sp.append(k, v);
  if (q.sort !== 'recent') sp.set('sort', q.sort);
  return sp.toString();
}

export function paramsToQuery(s: string): Query {
  const sp = new URLSearchParams(s);
  const q = emptyQuery();
  q.q = sp.get('q') ?? '';
  q.all = sp.get('all') === '1';
  const sort = sp.get('sort');
  if (sort === 'grade' || sort === 'sport') q.sort = sort;
  for (const f of FACETS) {
    const vs = sp.getAll(f.key);
    if (vs.length) q.f[f.key] = vs;
  }
  return q;
}

/** 검색어를 낱말로 나눈다. 큰따옴표로 묶은 구절은 하나로 취급 */
export function tokens(q: string): string[] {
  const out: string[] = [];
  const re = /"([^"]+)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(q.toLowerCase()))) out.push((m[1] ?? m[2]).trim());
  return out.filter(Boolean);
}

export function matchText(x: Indexed, toks: string[]): boolean {
  return toks.every((t) => x.text.includes(t) || x.textNs.includes(t.replace(/\s+/g, '')));
}

function matchFacets(x: Indexed, f: Record<string, string[]>, skip?: string): boolean {
  for (const facet of FACETS) {
    if (facet.key === skip) continue;
    const sel = f[facet.key];
    if (!sel?.length) continue;
    const vals = facet.values(x);
    if (!sel.some((s) => vals.includes(s))) return false;
  }
  return true;
}

const GRADE_RANK = (x: Indexed) => GRADE_ORDER.indexOf(x.gradeKey);

export function runQuery(all: Indexed[], q: Query): Indexed[] {
  const toks = tokens(q.q);
  const res = all.filter((x) => matchFacets(x, q.f) && matchText(x, toks));
  const cmp: Record<SortKey, (a: Indexed, b: Indexed) => number> = {
    recent: (a, b) =>
      Number(!!b.plan.sample) - Number(!!a.plan.sample) || b.plan.updated.localeCompare(a.plan.updated),
    grade: (a, b) => GRADE_RANK(a) - GRADE_RANK(b) || a.plan.sport.localeCompare(b.plan.sport, 'ko'),
    sport: (a, b) => a.plan.sport.localeCompare(b.plan.sport, 'ko') || GRADE_RANK(a) - GRADE_RANK(b),
  };
  return res.sort(cmp[q.sort]);
}

/** 각 패싯 값별 개수 — 그 패싯 자신의 선택은 빼고 나머지 조건을 적용해서 센다 */
export function facetCounts(all: Indexed[], q: Query, facet: Facet): { value: string; count: number }[] {
  const toks = tokens(q.q);
  const counts = new Map<string, number>();
  for (const x of all) {
    if (!matchText(x, toks) || !matchFacets(x, q.f, facet.key)) continue;
    for (const v of new Set(facet.values(x))) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  // 선택된 값은 0개여도 보여준다
  for (const v of q.f[facet.key] ?? []) if (!counts.has(v)) counts.set(v, 0);
  const arr = Array.from(counts, ([value, count]) => ({ value, count }));
  if (facet.order) {
    const rank = (v: string) => {
      const i = facet.order!.indexOf(v);
      return i < 0 ? 999 : i;
    };
    return arr.sort((a, b) => rank(a.value) - rank(b.value) || a.value.localeCompare(b.value, 'ko'));
  }
  return arr.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'ko'));
}

export function toggle(q: Query, key: string, value: string): Query {
  const cur = q.f[key] ?? [];
  const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
  const f = { ...q.f };
  if (next.length) f[key] = next;
  else delete f[key];
  return { ...q, f };
}

export function activeCount(q: Query): number {
  return Object.values(q.f).reduce((n, v) => n + v.length, 0) + (q.q.trim() ? 1 : 0);
}
