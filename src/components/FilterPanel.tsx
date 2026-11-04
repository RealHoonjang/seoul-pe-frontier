import { useMemo, useState } from 'react';
import { useApp } from '../ctx';
import { AXES, FACETS, facetCounts, toggle, type Facet, type Query } from '../lib/search';

interface Props {
  q: Query;
  onChange: (q: Query) => void;
  open: boolean;
  onClose: () => void;
}

const AXIS_HINT: Record<string, string> = {
  교육과정: '학교급 · 학년 · 영역 · 성취기준',
  종목: '농구, 배구, 줄넘기 …',
  평가: '유형 · 주체 · 방식 · 측정',
  에듀테크: '기기 · 앱',
};

function FacetBlock({ facet, q, onChange }: { facet: Facet; q: Query; onChange: (q: Query) => void }) {
  const { data } = useApp();
  const [find, setFind] = useState('');
  const counts = useMemo(() => facetCounts(data.plans, q, facet), [data.plans, q, facet]);
  if (!counts.length) return null;
  const sel = q.f[facet.key] ?? [];
  const shown = find ? counts.filter((c) => c.value.toLowerCase().includes(find.toLowerCase())) : counts;

  if (facet.key === 'std') {
    const list = counts.filter((c) => {
      if (!find) return true;
      const s = data.stdMap.get(c.value);
      return c.value.includes(find) || (s?.text ?? '').includes(find);
    });
    return (
      <div className="facet">
        <h3>{facet.label}</h3>
        <input className="facet-search" placeholder="코드나 낱말로 찾기" value={find} onChange={(e) => setFind(e.target.value)} aria-label="성취기준 찾기" />
        <div className="stdlist">
          {list.map(({ value, count }) => (
            <button
              key={value}
              className="stdopt"
              aria-pressed={sel.includes(value)}
              onClick={() => onChange(toggle(q, facet.key, value))}
              title={data.stdMap.get(value)?.text}
            >
              <code>[{value}]</code>
              <span>{(data.stdMap.get(value)?.text ?? '').slice(0, 34)}…</span>
              <span className="n">{count}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="facet">
      <h3>{facet.label}</h3>
      {facet.searchable && counts.length > 8 && (
        <input className="facet-search" placeholder={`${facet.label} 찾기`} value={find} onChange={(e) => setFind(e.target.value)} aria-label={`${facet.label} 찾기`} />
      )}
      <div className="chips">
        {shown.map(({ value, count }) => (
          <button
            key={value}
            className="chip"
            aria-pressed={sel.includes(value)}
            disabled={count === 0 && !sel.includes(value)}
            onClick={() => onChange(toggle(q, facet.key, value))}
          >
            {value} <span className="n">{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FilterPanel({ q, onChange, open, onClose }: Props) {
  const clearAxis = (axis: string) => {
    const f = { ...q.f };
    for (const fc of FACETS) if (fc.axis === axis) delete f[fc.key];
    onChange({ ...q, f });
  };
  return (
    <aside className={`filters no-print${open ? ' open' : ''}`} aria-label="검색 조건">
      <div className="filters-head">
        <h2>검색 조건</h2>
        <button className="linkbtn filter-toggle" onClick={onClose}>닫기</button>
      </div>
      {AXES.map((axis) => {
        const n = FACETS.filter((f) => f.axis === axis).reduce((s, f) => s + (q.f[f.key]?.length ?? 0), 0);
        return (
          <details className="axis" key={axis} open={axis !== '에듀테크' || n > 0}>
            <summary>
              <span className="axis-dot" aria-hidden />
              <span className="axis-name">
                {axis}
                <small>{AXIS_HINT[axis]}</small>
              </span>
              {n > 0 && <span className="axis-badge">{n}</span>}
            </summary>
            {n > 0 && (
              <div style={{ padding: '0 16px' }}>
                <button className="linkbtn" onClick={() => clearAxis(axis)}>이 축 조건 지우기</button>
              </div>
            )}
            {FACETS.filter((f) => f.axis === axis).map((f) => (
              <FacetBlock key={f.key} facet={f} q={q} onChange={onChange} />
            ))}
          </details>
        );
      })}
    </aside>
  );
}
