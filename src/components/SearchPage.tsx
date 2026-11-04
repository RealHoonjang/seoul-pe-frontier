import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../ctx';
import { paramsToQuery, queryToParams, runQuery, toggle, tokens, FACETS, activeCount, type Query, type SortKey } from '../lib/search';
import { replace, rememberSearch } from '../lib/router';
import FilterPanel from './FilterPanel';
import PlanCard from './PlanCard';
import { IconSearch, IconFilter } from './Icons';

const QUICK = ['농구', '훈코치', '티처블머신', '심박계', '골밑슛', '포트폴리오', '모둠'];

export default function SearchPage({ query }: { query: string }) {
  const { data } = useApp();
  const q = useMemo(() => paramsToQuery(query), [query]);
  const [text, setText] = useState(q.q);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => setText(q.q), [q.q]);

  const set = (next: Query) => {
    const p = queryToParams(next);
    rememberSearch(p);
    replace(p ? `#/?${p}` : '#/');
  };
  useEffect(() => rememberSearch(queryToParams(q)), [q]);

  // 입력이 멈추면 주소에 반영
  useEffect(() => {
    if (text === q.q) return;
    const t = window.setTimeout(() => set({ ...q, q: text }), 220);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const results = useMemo(() => runQuery(data.plans, q), [data.plans, q]);
  const toks = tokens(q.q);
  const chipsActive = Object.entries(q.f).flatMap(([k, vs]) => vs.map((v) => ({ k, v })));
  const labelOf = (k: string) => FACETS.find((f) => f.key === k)?.label ?? k;

  return (
    <>
      <section className="hero">
        <h1>체육 수행평가 계획서 찾기</h1>
        <p>교육과정(학교급·학년·영역·성취기준), 종목, 평가 방법, 에듀테크로 찾고, 양식 그대로 미리 본 뒤 내려받으세요.</p>
        <form
          className="searchbar"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            set({ ...q, q: text });
          }}
        >
          <label className="searchbox">
            <IconSearch />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="낱말로 찾기 (예: 드리블, 골밑슛, 구글 시트, 9체02-11)"
              aria-label="낱말 검색"
              type="text"
              enterKeyHint="search"
            />
            {text && (
              <button type="button" className="clear" onClick={() => { setText(''); set({ ...q, q: '' }); }} aria-label="검색어 지우기">
                ×
              </button>
            )}
          </label>
          <button type="button" className="btn filter-toggle" onClick={() => setFiltersOpen(true)}>
            <IconFilter /> 조건
          </button>
        </form>
        <div className="quick" aria-label="자주 찾는 낱말">
          {QUICK.map((w) => (
            <button key={w} onClick={() => { setText(w); set({ ...q, q: w }); }}>{w}</button>
          ))}
        </div>
      </section>

      <div className="layout">
        {filtersOpen && <div className="drawer-bg" onClick={() => setFiltersOpen(false)} />}
        <FilterPanel q={q} onChange={set} open={filtersOpen} onClose={() => setFiltersOpen(false)} />

        <section aria-label="검색 결과">
          <div className="result-bar">
            <span className="count"><b>{results.length}</b>건</span>
            {activeCount(q) > 0 && (
              <button className="linkbtn" onClick={() => { setText(''); set({ q: '', f: {}, sort: q.sort }); }}>
                조건 모두 지우기
              </button>
            )}
            <select
              value={q.sort}
              onChange={(e) => set({ ...q, sort: e.target.value as SortKey })}
              aria-label="정렬"
            >
              <option value="recent">최근 올린 순</option>
              <option value="grade">학년 순</option>
              <option value="sport">종목 이름 순</option>
            </select>
          </div>
          {chipsActive.length > 0 && (
            <div className="active">
              {chipsActive.map(({ k, v }) => (
                <button key={k + v} className="chip" onClick={() => set(toggle(q, k, v))} aria-label={`${labelOf(k)} ${v} 조건 빼기`}>
                  {labelOf(k)}: {v} <span className="x">×</span>
                </button>
              ))}
            </div>
          )}
          {results.length === 0 ? (
            <div className="empty">
              조건에 맞는 계획서가 없습니다.
              <br />
              조건을 줄이거나 다른 낱말로 찾아보세요.
            </div>
          ) : (
            <div className="cards">
              {results.map((x) => (
                <PlanCard key={x.plan.id} x={x} toks={toks} onFacet={(k, v) => set(toggle(q, k, v))} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
