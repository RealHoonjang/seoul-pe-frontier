import type { Indexed } from '../lib/data';
import { useApp } from '../ctx';
import { Hl, snippet } from './Hl';
import { IconCheck } from './Icons';
import { planText } from '../lib/data';

interface Props {
  x: Indexed;
  toks: string[];
  onFacet: (key: string, value: string) => void;
}

export default function PlanCard({ x, toks, onFacet }: Props) {
  const { cart, toggleCart } = useApp();
  const p = x.plan;
  const picked = cart.includes(p.id);
  const head = `${p.title} ${p.intent}`.toLowerCase();
  const snip = toks.length && !toks.every((t) => head.includes(t)) ? snippet(planText(p, x.stds), toks) : null;
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
      <div className="tags">
        {[...x.areas, ...x.types.filter((t) => !['기술형', '전략형', '생태형'].includes(t) || x.types.length === 1)].map((t) => (
          <button key={t} className="tag" onClick={() => onFacet(x.areas.includes(t) ? 'area' : 'type', t)} title={`'${t}' 조건으로 찾기`} style={{ cursor: 'pointer' }}>
            {t}
          </button>
        ))}
        {p.standards.map((c) => (
          <a key={c} className="tag std" href={`#/std/${encodeURIComponent(c)}`} title={x.stds.find((s) => s.code === c)?.text}>
            {c}
          </a>
        ))}
      </div>
      <div className="tags">
        {p.methods.types.map((t) => <span key={t} className="tag">{t}</span>)}
        {tools.slice(0, 4).map((t) => (
          <button key={t} className="tag tool" style={{ cursor: 'pointer' }} onClick={() => onFacet(p.digital.devices.includes(t) ? 'device' : 'app', t)} title={`'${t}' 조건으로 찾기`}>
            {t}
          </button>
        ))}
        {tools.length > 4 && <span className="tag">+{tools.length - 4}</span>}
      </div>
      <div className="meta">
        <span>{p.author.office}</span>
        <span>{p.author.school}</span>
        <span>{p.author.name}</span>
        <span style={{ marginLeft: 'auto' }}>{p.updated}</span>
      </div>
    </article>
  );
}
