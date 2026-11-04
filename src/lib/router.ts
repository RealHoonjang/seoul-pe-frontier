import { useEffect, useState } from 'react';

// 주소의 # 뒤를 경로로 쓴다 (#/plan/아이디, #/std/9체02-11, #/edit/아이디, #/?q=…)
// 정적 호스팅(GitHub Pages, Netlify 등)에서 새로고침해도 깨지지 않는다.

export interface Route {
  path: string[];
  query: string;
}

function parse(): Route {
  const h = decodeURI(location.hash.replace(/^#/, '') || '/');
  const [p, query = ''] = h.split('?');
  return { path: p.split('/').filter(Boolean), query };
}

const EVT = 'hashroute';

export function useRoute(): Route {
  const [r, setR] = useState(parse);
  useEffect(() => {
    const on = () => setR(parse());
    window.addEventListener('hashchange', on);
    window.addEventListener(EVT, on);
    return () => {
      window.removeEventListener('hashchange', on);
      window.removeEventListener(EVT, on);
    };
  }, []);
  return r;
}

/** 새 화면으로 이동 (뒤로 가기 가능) */
export function go(hash: string) {
  location.hash = hash;
  window.scrollTo(0, 0);
}

/** 같은 화면에서 주소만 바꾼다 (검색 조건 변경 등, 뒤로 가기 기록을 늘리지 않음) */
export function replace(hash: string) {
  history.replaceState(null, '', hash);
  window.dispatchEvent(new Event(EVT));
}

const LAST_SEARCH = 'lastSearch';
export function rememberSearch(query: string) {
  try {
    sessionStorage.setItem(LAST_SEARCH, query);
  } catch {
    /* 저장소를 못 써도 동작에는 지장 없음 */
  }
}
export function lastSearchHash(): string {
  try {
    const q = sessionStorage.getItem(LAST_SEARCH);
    return q ? `#/?${q}` : '#/';
  } catch {
    return '#/';
  }
}
