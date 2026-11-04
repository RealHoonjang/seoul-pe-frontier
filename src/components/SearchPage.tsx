import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../ctx';
import { paramsToQuery, queryToParams, runQuery, toggle, tokens, facetByKey, setLevel, type Query, type SortKey } from '../lib/search';
import { replace, rememberSearch } from '../lib/router';
import LevelPicker from './LevelPicker';
import GuidedFilters from './GuidedFilters';
import PlanCard from './PlanCard';
import { IconSearch } from './Icons';

const LEVEL_TABS = ['초등학교', '중학교', '고등학교'];

export default function SearchPage({ query }: { query: string }) {
  const { data } = useApp();
  const q = useMemo(() => paramsToQuery(query), [query]);
  const [text, setText] = useState(q.q);

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

  const level = q.f.lv?.[0] ?? null;
  const hasAnyFilter = Object.keys(q.f).length > 0;
  const showPicker = !level && !q.all && !q.q.trim() && !hasAnyFilter;

  const results = useMemo(() => runQuery(data.plans, q), [data.plans, q]);
  const toks = tokens(q.q);
  const chipsActive = Object.entries(q.f)
    .filter(([k]) => k !== 'lv')
    .flatMap(([k, vs]) => vs.map((v) => ({ k, v })));

  const searchForm = (
    <form
      className="searchbar"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        set({ ...q, q: text, all: q.all || !level });
      }}
    >
      <label className="searchbox">
        <IconSearch />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={level ? `${level} 계획서에서 낱말로 찾기 (예: 드리블, 골밑슛)` : '낱말로 바로 찾기 (예: 드리블, 골밑슛, 구글 시트)'}
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
    </form>
  );

  if (showPicker) {
    return (
      <>
        <section className="hero center">
          <h1>체육 수행평가 계획서 찾기</h1>
          <p>학교급을 고르면 학년 · 영역 · 종목 순서로 좁혀 갈 수 있어요.</p>
        </section>
        <LevelPicker onPick={(lv) => set(setLevel(q, lv))} />
        <div className="picker-search">{searchForm}</div>
      </>
    );
  }

  return (
    <>
      <nav className="level-tabs" aria-label="학교급">
        <button className="level-home" onClick={() => { setText(''); set({ q: '', f: {}, sort: q.sort }); }} title="처음 화면으로">
          ← 처음
        </button>
        {LEVEL_TABS.map((lv) => (
          <button key={lv} aria-pressed={level === lv} onClick={() => set(setLevel(q, lv))}>
            {lv}
          </button>
        ))}
        <button aria-pressed={!level} onClick={() => set(setLevel(q, null))}>
          전체
        </button>
      </nav>

      <section className="search-head">
        {searchForm}
        <GuidedFilters q={q} level={level ?? '전체'} onChange={set} />
      </section>

      <section aria-label="검색 결과">
        <div className="result-bar">
          <span className="count">
            {level ?? '전체'} <b>{results.length}</b>건
          </span>
          {chipsActive.map(({ k, v }) => (
            <button key={k + v} className="chip active-chip" onClick={() => set(toggle(q, k, v))} aria-label={`${facetByKey(k).label} ${v} 조건 빼기`}>
              {v} <span className="x">×</span>
            </button>
          ))}
          {(chipsActive.length > 0 || q.q) && (
            <button className="linkbtn" onClick={() => { setText(''); set({ q: '', f: level ? { lv: [level] } : {}, sort: q.sort, all: !level }); }}>
              조건 지우기
            </button>
          )}
          <select value={q.sort} onChange={(e) => set({ ...q, sort: e.target.value as SortKey })} aria-label="정렬">
            <option value="recent">최근 올린 순</option>
            <option value="grade">학년 순</option>
            <option value="sport">종목 이름 순</option>
          </select>
        </div>
        {results.length === 0 ? (
          <div className="empty">
            조건에 맞는 계획서가 없습니다.
            <br />
            조건을 줄이거나 다른 낱말로 찾아보세요.
          </div>
        ) : (
          <div className="cards">
            {results.map((x) => (
              <PlanCard key={x.plan.id} x={x} toks={toks} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
