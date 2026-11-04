import { useApp } from '../ctx';
import { bigArea } from '../lib/labels';

export default function StandardPage({ code }: { code: string }) {
  const { data } = useApp();
  const c = decodeURIComponent(code);
  const s = data.stdMap.get(c);
  if (!s) return <div className="empty">성취기준 [{c}]을(를) 찾을 수 없습니다.</div>;
  const plans = data.plans.filter((x) => x.plan.standards.includes(c));
  const sibs = data.standards.filter((t) => t.school === s.school && t.grade === s.grade && t.course === s.course && t.area === s.area);

  return (
    <div className="detail">
      <div>
        <nav className="crumb">
          <a href="#/">← 검색</a>
          <span>/</span>
          <span>{s.school} {s.grade}</span>
          <span>/</span>
          <span>{s.course} · {s.area}</span>
        </nav>
        <section className="std-hero">
          <div className="code">[{s.code}]</div>
          <h1>{s.text}</h1>
          <div className="tags" style={{ marginBottom: 12 }}>
            <span className="tag lv">{s.school}</span>
            <span className="tag">{s.grade}</span>
            <span className="tag">{s.course}</span>
            <span className="tag sport">{bigArea(s)}</span>
            {s.subtype && <span className="tag">{s.subtype}</span>}
          </div>
          {s.explanation ? (
            <div className="exp">
              <b>성취기준 해설</b>
              {s.explanation}
            </div>
          ) : (
            <div className="exp">교육과정 문서에 이 성취기준의 별도 해설은 없습니다.</div>
          )}
        </section>
        <h2 style={{ fontSize: 17 }}>이 성취기준을 쓴 계획서 {plans.length}건</h2>
        {plans.length === 0 ? (
          <div className="empty">아직 이 성취기준으로 올라온 계획서가 없습니다.</div>
        ) : (
          <div className="similar">
            {plans.map((x) => (
              <a key={x.plan.id} href={`#/plan/${encodeURIComponent(x.plan.id)}`} className="panel" style={{ padding: 14 }}>
                <span style={{ fontWeight: 700 }}>{x.plan.title}</span>
                <span className="why">
                  {x.gradeKey} · {x.plan.sport} · {x.plan.methods.types.join(', ')} · {x.plan.author.school}
                  {x.plan.dummy ? ' · 더미' : ''}
                </span>
              </a>
            ))}
          </div>
        )}
        <p style={{ marginTop: 14 }}>
          <a href={`#/?std=${encodeURIComponent(c)}`}>검색 화면에서 이 성취기준으로 찾기 →</a>
        </p>
      </div>
      <aside className="side">
        <section className="panel">
          <h2>같은 영역 성취기준 <span className="sub">{s.area}</span></h2>
          <div className="sibs">
            {sibs.map((t) => (
              <a key={t.code} href={`#/std/${encodeURIComponent(t.code)}`} className={t.code === c ? 'on' : undefined}>
                <code>{t.code}</code>
                <span>{t.text}</span>
              </a>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
