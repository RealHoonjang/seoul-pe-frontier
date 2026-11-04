import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../ctx';
import { lastSearchHash } from '../lib/router';
import { gradeLabel, USAGE_TERMS } from '../lib/labels';
import { downloadFile, downloadHwpx, extOf, printPlan, baseName } from '../lib/download';
import { tokens, paramsToQuery } from '../lib/search';
import type { Indexed } from '../lib/data';
import PlanView from './PlanView';
import GenderChart, { chartable } from './GenderChart';
import { IconDownload, IconPrint, IconSheet, IconEdit, IconBox, IconFile } from './Icons';

function similar(all: Indexed[], me: Indexed): { x: Indexed; why: string }[] {
  return all
    .filter((x) => x.plan.id !== me.plan.id)
    .map((x) => {
      const sharedStd = x.plan.standards.filter((c) => me.plan.standards.includes(c));
      const sameSport = x.plan.sport === me.plan.sport;
      const sharedType = x.types.filter((t) => me.types.includes(t));
      const score = sharedStd.length * 3 + (sameSport ? 4 : 0) + sharedType.length;
      const why = sameSport ? `같은 종목 · ${x.gradeKey}` : sharedStd.length ? `같은 성취기준 ${sharedStd.join(', ')}` : `같은 유형 · ${sharedType.join(', ')}`;
      return { x, score, why };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export default function DetailPage({ id }: { id: string }) {
  const { data, cart, toggleCart, toast } = useApp();
  const me = data.byId.get(decodeURIComponent(id));
  const [busy, setBusy] = useState<string | null>(null);
  const toks = useMemo(() => tokens(paramsToQuery(lastSearchHash().split('?')[1] ?? '').q), []);

  useEffect(() => {
    if (me) document.title = `${me.plan.title} · 학교 체육 수업 길잡이`;
    return () => {
      document.title = '학교 체육 수업 길잡이';
    };
  }, [me]);

  if (!me) {
    return (
      <div className="empty">
        찾는 계획서가 없습니다. <a href="#/">검색으로 돌아가기</a>
      </div>
    );
  }
  const p = me.plan;
  const picked = cart.includes(p.id);
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
  const charts = p.scoring.filter(chartable);
  const sims = similar(data.plans, me);

  return (
    <>
      <nav className="crumb no-print">
        <a href={lastSearchHash()}>← 검색 결과</a>
        <span>/</span>
        <span>{gradeLabel(p)}</span>
        <span>/</span>
        <span>{p.sport}</span>
      </nav>
      <header className="detail-head no-print">
        <div className="tags">
          <span className="tag lv">{me.gradeKey}</span>
          <span className="tag sport">{p.sport}</span>
          {me.areas.map((a) => <span key={a} className="tag">{a}</span>)}
          {me.types.map((t) => <span key={t} className="tag">{t}</span>)}
          {p.sample && <span className="tag sample">예시</span>}
          {p.dummy && <span className="tag dummy">더미</span>}
        </div>
        <h1>{p.title}</h1>
        <div className="byline">
          {p.author.office} · {p.author.school} · {p.author.name} · {p.updated}
        </div>
      </header>

      {p.dummy && (
        <div className="notice no-print">
          화면 점검용 <b>더미(가짜) 자료</b>입니다. 실제 제출본을 넣으면 이 자료는 한 번에 지울 수 있습니다.
        </div>
      )}

      <div className="actions no-print" role="toolbar" aria-label="내려받기">
        <button className="btn primary" disabled={!!busy} onClick={() => run('hwpx', () => downloadHwpx(p, data.stdMap))}>
          <IconDownload /> {busy === 'hwpx' ? '만드는 중…' : '한글 파일(HWPX)'}
        </button>
        {[p.files?.hwp, p.files?.hwpx, p.files?.pdf].filter(Boolean).map((f) => (
          <button key={f} className="btn" disabled={!!busy} onClick={() => run(f!, () => downloadFile(f!, `원본_${baseName(p)}.${extOf(f!)}`))}>
            <IconFile /> 원본 {extOf(f!).toUpperCase()}
          </button>
        ))}
        <button className="btn" onClick={() => printPlan(p)}>
          <IconPrint /> PDF로 저장·인쇄
        </button>
        <button
          className="btn"
          disabled={!!busy}
          onClick={() => run('xlsx', async () => (await import('../lib/excel')).downloadExcel(p, data.stdMap))}
        >
          <IconSheet /> {busy === 'xlsx' ? '만드는 중…' : '채점기준·기록지 엑셀'}
        </button>
        <span className="sep" />
        <a className="btn" href={`#/edit/${encodeURIComponent(p.id)}`}>
          <IconEdit /> 내 학교용으로 가져오기
        </a>
        <button className="btn ghost" onClick={() => { toggleCart(p.id); toast(picked ? '담기를 취소했습니다.' : '담았습니다. 위쪽 「담은 자료」에서 한꺼번에 내려받을 수 있어요.'); }}>
          <IconBox /> {picked ? '담기 취소' : '담기'}
        </button>
        <p className="terms-note">{USAGE_TERMS}</p>
      </div>

      <div className="detail">
        <div className="print-area">
          <PlanView plan={p} stdMap={data.stdMap} highlight={toks} />
        </div>
        <aside className="side no-print">
          <section className="panel">
            <h2>성취기준 <span className="sub">2022 개정 교육과정</span></h2>
            {me.stds.map((s) => (
              <div className="std-item" key={s.code}>
                <a className="code" href={`#/std/${encodeURIComponent(s.code)}`}>[{s.code}]</a>
                <div className="path">{s.school} {s.grade} · {s.course} · {s.area}{s.subtype ? ` · ${s.subtype}` : ''}</div>
                <p>{s.text}</p>
                {s.explanation && (
                  <details>
                    <summary>성취기준 해설 보기</summary>
                    <p>{s.explanation}</p>
                  </details>
                )}
              </div>
            ))}
          </section>
          {charts.length > 0 && (
            <section className="panel">
              <h2>남녀 기준 비교</h2>
              <div className="chart-wrap">
                {charts.map((st, i) => <GenderChart key={i} st={st} />)}
              </div>
            </section>
          )}
          {sims.length > 0 && (
            <section className="panel">
              <h2>비슷한 계획서</h2>
              <div className="similar">
                {sims.map(({ x, why }) => (
                  <a key={x.plan.id} href={`#/plan/${encodeURIComponent(x.plan.id)}`}>
                    <span>{x.plan.title}</span>
                    <span className="why">{x.gradeKey} · {x.plan.sport} — {why}</span>
                  </a>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
