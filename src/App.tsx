import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadData, type DataSet } from './lib/data';
import { useRoute, lastSearchHash } from './lib/router';
import { Ctx } from './ctx';
import { LogoMark, IconBox } from './components/Icons';
import SearchPage from './components/SearchPage';
import DetailPage from './components/DetailPage';
import StandardPage from './components/StandardPage';
import EditorPage from './components/EditorPage';
import AboutPage from './components/AboutPage';
import CartDrawer from './components/CartDrawer';
import { USAGE_TERMS } from './lib/labels';
const CART_KEY = 'evalhub.cart';

function readCart(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export default function App() {
  const [data, setData] = useState<DataSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<string[]>(readCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const route = useRoute();

  useEffect(() => {
    loadData().then(setData, (e) => setError(String(e)));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* 저장 못 해도 이번 방문 동안은 동작 */
    }
  }, [cart]);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg((m) => (m === msg ? null : m)), 2600);
  }, []);

  const ctx = useMemo(
    () =>
      data && {
        data,
        cart: cart.filter((id) => data.byId.has(id)),
        toggleCart: (id: string) => setCart((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id])),
        clearCart: () => setCart([]),
        openCart: () => setCartOpen(true),
        toast,
      },
    [data, cart, toast],
  );

  const [page, arg] = route.path;
  let body;
  if (error) body = <div className="loading">자료를 불러오지 못했습니다. ({error})</div>;
  else if (!ctx) body = <div className="loading">자료를 불러오는 중…</div>;
  else if (page === 'plan' && arg) body = <DetailPage id={arg} />;
  else if (page === 'std' && arg) body = <StandardPage code={arg} />;
  else if (page === 'edit') body = <EditorPage id={arg ?? 'new'} />;
  else if (page === 'about') body = <AboutPage />;
  else body = <SearchPage query={route.query} />;

  const content = (
    <>
      <header className="topbar no-print">
        <div className="topbar-in">
          <a className="logo" href={lastSearchHash()}>
            <LogoMark />
            <span>
              체육 평가계획 나눔터
              <small>2022 개정 교육과정 수행평가 계획서 검색·미리보기·내려받기</small>
            </span>
          </a>
          <nav className="topnav">
            <a href="#/" className="hide-sm">검색</a>
            <a href="#/edit/new" className="hide-sm">새로 작성</a>
            <a href="#/about" className="hide-sm">이용 안내</a>
            {ctx && (
              <button className="cart-btn" onClick={() => setCartOpen(true)} aria-label={`담은 자료 ${ctx.cart.length}건`}>
                <IconBox /> 담은 자료<span className="cart-count">{ctx.cart.length}</span>
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="wrap">{body}</main>
      <footer className="footer no-print">
        <p className="terms">{USAGE_TERMS}</p>
        서울 체육교육 프론티어 교사단 · 성취기준 출처: 2022 개정 체육과 교육과정(교육부 고시 [별책 11])
        <p className="made-by">Made By 훈장님</p>
      </footer>
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </>
  );

  if (!ctx) return content;
  return (
    <Ctx.Provider value={ctx}>
      {content}
      {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}
    </Ctx.Provider>
  );
}
