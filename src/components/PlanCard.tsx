import type { Indexed } from '../lib/data';
import { useApp } from '../ctx';
import { Hl, snippet } from './Hl';
import { IconCheck } from './Icons';
import { planText } from '../lib/data';
import { TYPE_PARENT } from '../lib/labels';

interface Props {
  x: Indexed;
  toks: string[];
}

/** 결과 카드: 학년·종목·제목·평가 의도와 한 줄 요약만. 성취기준·도구 등 자세한 내용은 상세 화면에서 */
export default function PlanCard({ x, toks }: Props) {
  const { cart, toggleCart } = useApp();
  const p = x.plan;
  const picked = cart.includes(p.id);
  const head = `${p.title} ${p.intent}`.toLowerCase();
  const snip = toks.length && !toks.every((t) => head.includes(t)) ? snippet(planText(p, x.stds), toks) : null;
  // 세부 유형은 가장 구체적인 것 하나만 (예: 영역형)
  const sub = x.types.find((t) => TYPE_PARENT[t]) ?? x.types[0];
  const summary = [x.areas.join('·'), sub, p.methods.types.join('·')].filter(Boolean).join(' · ');
  const tools = [...p.digital.devices, ...p.digital.apps];

  return (
    <article className="card">
      <div className="pick">
        <button
          className="pickbox"
          aria-pressed={picked}
          onClick={() => toggleCart(p.id)}
          title={picked ? '담기 취소' : '여러 건 함께 내려받기에 담기'}
          aria-label={picked ? `${p.title} 담기 취소` : `${p.title} 담기`}
        >
          <IconCheck />
        </button>
      </div>
      <div className="card-top">
        <span className="tag lv">{x.gradeKey}</span>
        <span className="tag sport">{p.sport}</span>
        {p.course && <span className="tag">{p.course}</span>}
        {p.sample && <span className="tag sample">예시</span>}
        {p.dummy && <span className="tag dummy">더미</span>}
      </div>
      <h3>
        <a href={`#/plan/${encodeURIComponent(p.id)}`}>
          <Hl text={p.title} toks={toks} />
        </a>
      </h3>
      <p className="intent"><Hl text={p.intent} toks={toks} /></p>
      {snip && <p className="snippet"><Hl text={snip} toks={toks} /></p>}
      <p className="card-sum">{summary}</p>
      <div className="meta">
        <span>{tools.length ? `디지털: ${tools.slice(0, 2).join(', ')}${tools.length > 2 ? ` 외 ${tools.length - 2}` : ''}` : '디지털 활용 없음'}</span>
        <span style={{ marginLeft: 'auto' }}>{p.author.school}</span>
      </div>
    </article>
  );
}
