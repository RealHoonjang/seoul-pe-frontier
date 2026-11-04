// 학교급을 고른 뒤 단계별로 좁혀 가는 검색 조건
// 기본 단계(학년 → 영역 → 세부 유형 → 종목)는 늘 보이고, 평가 방법·에듀테크·성취기준은 '상세 조건'에 접어 둔다.
import { useMemo, useState } from 'react';
import { useApp } from '../ctx';
import { ADVANCED, GUIDE_STEPS, facetByKey, facetCounts, toggle, type Query } from '../lib/search';
import { TYPE_PARENT } from '../lib/labels';

interface Props {
  q: Query;
  level: string;
  onChange: (q: Query) => void;
}

const STEP_HINT: Record<string, string> = {
  course: '과목',
  gr: '학년',
  area: '영역',
  type: '세부 유형',
  sport: '종목',
};

function Chips({ facetKey, q, onChange, limit }: { facetKey: string; q: Query; onChange: (q: Query) => void; limit?: number }) {
  const { data } = useApp();
  const facet = facetByKey(facetKey);
  const counts = useMemo(() => facetCounts(data.plans, q, facet), [data.plans, q, facet]);
  const [more, setMore] = useState(false);
  const sel = q.f[facetKey] ?? [];
  const shown = limit && !more ? counts.slice(0, limit) : counts;
  return (
    <div className="chips">
      {shown.map(({ value, count }) => (
        <button
          key={value}
          className="chip"
          aria-pressed={sel.includes(value)}
          disabled={count === 0 && !sel.includes(value)}
          onClick={() => onChange(toggle(q, facetKey, value))}
        >
          {value} <span className="n">{count}</span>
        </button>
      ))}
      {limit && counts.length > limit && (
        <button className="chip more" onClick={() => setMore(!more)}>
          {more ? '접기' : `+${counts.length - limit}개 더`}
        </button>
      )}
    </div>
  );
}

/** 세부 유형: 기술형·전략형·생태형을 먼저 보이고, 고른 것의 하위 유형(기록형·영역형 …)만 이어서 보인다 */
function TypeChips({ q, onChange }: { q: Query; onChange: (q: Query) => void }) {
  const { data } = useApp();
  const facet = facetByKey('type');
  const counts = useMemo(() => facetCounts(data.plans, q, facet), [data.plans, q, facet]);
  const sel = q.f.type ?? [];
  const parents = new Set(Object.values(TYPE_PARENT));
  const childrenOf = (p: string) => Object.keys(TYPE_PARENT).filter((c) => TYPE_PARENT[c] === p);
  const openParents = new Set(sel.map((v) => (parents.has(v) ? v : TYPE_PARENT[v])).filter(Boolean));
  const setTypes = (types: string[]) => {
    const f = { ...q.f };
    if (types.length) f.type = types;
    else delete f.type;
    onChange({ ...q, f });
  };
  const clickParent = (p: string) => {
    if (openParents.has(p)) setTypes(sel.filter((v) => v !== p && TYPE_PARENT[v] !== p));
    else setTypes([...sel, p]);
  };
  const clickChild = (c: string) => {
    const p = TYPE_PARENT[c];
    let next = sel.includes(c) ? sel.filter((v) => v !== c) : [...sel.filter((v) => v !== p), c];
    // 하위 유형을 모두 빼면 상위 유형 선택으로 돌아간다
    if (!next.some((v) => TYPE_PARENT[v] === p) && !next.includes(p)) next = [...next, p];
    setTypes(next);
  };
  const top = counts.filter((c) => !TYPE_PARENT[c.value]);
  return (
    <div className="type-steps">
      <div className="chips">
        {top.map(({ value, count }) => {
          const isParent = parents.has(value);
          const on = isParent ? openParents.has(value) : sel.includes(value);
          return (
            <button
              key={value}
              className="chip"
              aria-pressed={on}
              onClick={() => (isParent ? clickParent(value) : setTypes(on ? sel.filter((v) => v !== value) : [...sel, value]))}
            >
              {value} <span className="n">{count}</span>
            </button>
          );
        })}
      </div>
      {[...openParents].map((p) => {
        const kids = counts.filter((c) => childrenOf(p).includes(c.value));
        if (!kids.length) return null;
        return (
          <div className="chips sub-chips" key={p}>
            <span className="sub-label">{p} ▸</span>
            {kids.map(({ value, count }) => (
              <button key={value} className="chip" aria-pressed={sel.includes(value)} onClick={() => clickChild(value)}>
                {value} <span className="n">{count}</span>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function StdPicker({ q, onChange }: { q: Query; onChange: (q: Query) => void }) {
  const { data } = useApp();
  const facet = facetByKey('std');
  const [find, setFind] = useState('');
  const counts = useMemo(() => facetCounts(data.plans, q, facet), [data.plans, q, facet]);
  const sel = q.f.std ?? [];
  const list = counts.filter((c) => {
    if (!find) return true;
    return c.value.includes(find) || (data.stdMap.get(c.value)?.text ?? '').includes(find);
  });
  return (
    <>
      <input className="facet-search" placeholder="코드나 낱말로 찾기" value={find} onChange={(e) => setFind(e.target.value)} aria-label="성취기준 찾기" />
      <div className="stdlist">
        {list.map(({ value, count }) => (
          <button key={value} className="stdopt" aria-pressed={sel.includes(value)} onClick={() => onChange(toggle(q, 'std', value))} title={data.stdMap.get(value)?.text}>
            <code>[{value}]</code>
            <span>{data.stdMap.get(value)?.text}</span>
            <span className="n">{count}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export default function GuidedFilters({ q, level, onChange }: Props) {
  const { data } = useApp();
  const steps = GUIDE_STEPS[level] ?? GUIDE_STEPS['전체'];
  // 세부 유형은 영역을 고른 뒤에만 연다
  const visible = steps.filter((k) => k !== 'type' || (q.f.area?.length ?? 0) > 0);
  const nonEmpty = (k: string) => facetCounts(data.plans, q, facetByKey(k)).length > 0;
  const advActive = ADVANCED.reduce((n, k) => n + (q.f[k]?.length ?? 0), 0);

  return (
    <div className="guide">
      {visible.filter(nonEmpty).map((k, i) => (
        <div className="guide-row" key={k}>
          <div className="guide-label">
            <span className="step-no">{i + 1}</span>
            {STEP_HINT[k] ?? facetByKey(k).label}
          </div>
          {k === 'type' ? (
            <TypeChips q={q} onChange={onChange} />
          ) : (
            <Chips facetKey={k} q={q} onChange={onChange} limit={k === 'sport' ? 12 : undefined} />
          )}
        </div>
      ))}
      {!q.f.area?.length && steps.includes('type') && (
        <p className="guide-tip">영역을 고르면 세부 유형(예: 영역형, 기록형, 현대 표현)으로 더 좁힐 수 있어요.</p>
      )}

      <details className="advanced" open={advActive > 0}>
        <summary>
          상세 조건 <span className="adv-sub">평가 방법 · 에듀테크 · 성취기준</span>
          {advActive > 0 && <span className="axis-badge">{advActive}</span>}
        </summary>
        <div className="adv-body">
          {ADVANCED.filter((k) => k !== 'std' && nonEmpty(k)).map((k) => (
            <div className="guide-row" key={k}>
              <div className="guide-label">{facetByKey(k).label}</div>
              <Chips facetKey={k} q={q} onChange={onChange} limit={k === 'device' || k === 'app' ? 10 : undefined} />
            </div>
          ))}
          {nonEmpty('std') && (
            <div className="guide-row">
              <div className="guide-label">성취기준</div>
              <div>
                <StdPicker q={q} onChange={onChange} />
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
