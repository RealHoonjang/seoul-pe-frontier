import { Fragment } from 'react';

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 검색어를 노란색으로 표시 */
export function Hl({ text, toks }: { text: string; toks: string[] }) {
  const ts = toks.filter((t) => t.length > 0);
  if (!ts.length || !text) return <>{text}</>;
  const re = new RegExp(`(${ts.map(esc).join('|')})`, 'gi');
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? <mark key={i}>{p}</mark> : <Fragment key={i}>{p}</Fragment>,
      )}
    </>
  );
}

/** 검색어 주변 문장 조각 */
export function snippet(full: string, toks: string[], radius = 38): string | null {
  const lower = full.toLowerCase();
  for (const t of toks) {
    const i = lower.indexOf(t);
    if (i >= 0) {
      const s = Math.max(0, i - radius);
      const e = Math.min(full.length, i + t.length + radius);
      return (s > 0 ? '…' : '') + full.slice(s, e).replace(/\s+/g, ' ') + (e < full.length ? '…' : '');
    }
  }
  return null;
}
