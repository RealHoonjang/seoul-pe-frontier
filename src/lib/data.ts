import type { EvalPlan, Standard } from '../types';
import { MEASURE_LABEL } from '../types';
import { bigArea, TYPE_PARENT, SCHOOL_SHORT } from './labels';

export interface Indexed {
  plan: EvalPlan;
  stds: Standard[];
  /** 학년 표기 (예: 중2) */
  gradeKey: string;
  areas: string[];
  types: string[];
  measures: string[];
  /** 검색용 전체 문장 (소문자) */
  text: string;
  /** 띄어쓰기를 뺀 검색용 문장 */
  textNs: string;
}

export interface DataSet {
  plans: Indexed[];
  standards: Standard[];
  stdMap: Map<string, Standard>;
  byId: Map<string, Indexed>;
}

const uniq = <T,>(a: T[]) => Array.from(new Set(a));

export function planText(p: EvalPlan, stds: Standard[]): string {
  return [
    p.title,
    p.sport,
    p.intent,
    p.schoolLevel,
    `${p.grade}학년`,
    p.course ?? '',
    ...p.standards,
    ...stds.map((s) => s.text),
    ...p.digital.devices,
    ...p.digital.apps,
    p.digital.content,
    ...p.methods.types,
    p.methods.typeEtc ?? '',
    ...p.methods.evaluators,
    ...p.methods.modes,
    ...p.contents,
    ...p.scoring.flatMap((s) => [s.title, ...s.elements, ...s.rows.flatMap((r) => [r.male, r.female ?? ''])]),
    ...p.achievement.map((a) => a.text),
    p.explanation.text ?? '',
    p.author.office,
    p.author.school,
    p.author.name,
  ].join('\n');
}

export function indexPlan(p: EvalPlan, stdMap: Map<string, Standard>): Indexed {
  const stds = p.standards.map((c) => stdMap.get(c)).filter((s): s is Standard => !!s);
  const areas = uniq(stds.map(bigArea));
  const types = uniq(
    stds.flatMap((s) => (s.subtype ? [s.subtype, TYPE_PARENT[s.subtype]].filter(Boolean) : [])) as string[],
  );
  const measures = uniq(p.scoring.map((s) => MEASURE_LABEL[s.measure]));
  const text = planText(p, stds).toLowerCase();
  return {
    plan: p,
    stds,
    gradeKey: `${SCHOOL_SHORT[p.schoolLevel]}${p.grade}`,
    areas,
    types,
    measures,
    text,
    textNs: text.replace(/\s+/g, ''),
  };
}

export async function loadData(): Promise<DataSet> {
  const [plans, standards] = await Promise.all([
    fetch('data/plans.json', { cache: 'no-cache' }).then((r) => r.json() as Promise<EvalPlan[]>),
    fetch('data/standards.json').then((r) => r.json() as Promise<Standard[]>),
  ]);
  const stdMap = new Map(standards.map((s) => [s.code, s]));
  const indexed = plans.map((p) => indexPlan(p, stdMap));
  return { plans: indexed, standards, stdMap, byId: new Map(indexed.map((x) => [x.plan.id, x])) };
}
