// 연구회 평가계획서 양식을 웹에서 그대로 보여주는 미리보기 (A방식)
import type { ReactNode } from 'react';
import type { EvalPlan, Standard } from '../types';
import { EVAL_TYPES, EVALUATORS, EVAL_MODES } from '../types';
import { gradeLabel } from '../lib/labels';
import { Hl } from './Hl';

interface Props {
  plan: EvalPlan;
  stdMap: Map<string, Standard>;
  highlight?: string[];
}

function Checks({ labels, selected, etc }: { labels: readonly string[]; selected: string[]; etc?: string }) {
  return (
    <div className="checks">
      {labels.map((l) => (
        <span key={l}>
          {selected.includes(l) ? '■' : '□'} {l}
          {l === '기타' && etc && selected.includes('기타') ? `(${etc})` : ''}
        </span>
      ))}
    </div>
  );
}

export default function PlanView({ plan, stdMap, highlight = [] }: Props) {
  const h = (s: string): ReactNode => <Hl text={s} toks={highlight} />;
  const d = plan.digital;
  return (
    <div className="paper-stack">
      <article className="paper" aria-label="평가계획서 1쪽">
        <p className="doc-title">{plan.docTitle?.trim() || '체육과 수행평가 계획서'}</p>
        <p className="grade">가. {gradeLabel(plan)}</p>
        <table className="form thick-top">
          <colgroup>
            <col style={{ width: '15.4%' }} />
            <col style={{ width: '8.7%' }} />
            <col style={{ width: '3.8%' }} />
            <col />
          </colgroup>
          <tbody>
            <tr className="thick-top">
              <th scope="row">❶수행평가명</th>
              <td colSpan={3} className="c">{h(plan.title)}</td>
            </tr>
            <tr>
              <th scope="row">교육과정<br />성취기준</th>
              <td colSpan={3}>
                {plan.standards.map((c) => (
                  <p className="std-line" key={c}>
                    [{c}] {h(stdMap.get(c)?.text ?? '')}
                  </p>
                ))}
              </td>
            </tr>
            <tr>
              <th scope="row">평가 의도</th>
              <td colSpan={3}>{h(plan.intent)}</td>
            </tr>
            <tr>
              <th scope="row" rowSpan={3}>
                디지털 기기<br />활용 방법
                <span className="note-red">(없다면 빈칸)</span>
              </th>
              <td className="c">기기</td>
              <td colSpan={2}>{h(d.devices.join(', '))}</td>
            </tr>
            <tr>
              <td className="c">앱</td>
              <td colSpan={2}>{h(d.apps.join(', '))}</td>
            </tr>
            <tr>
              <td className="c">내용</td>
              <td colSpan={2}>{h(d.content)}</td>
            </tr>
            <tr>
              <th scope="row" rowSpan={3}>평가 방법</th>
              <td colSpan={2} className="c">평가유형</td>
              <td><Checks labels={EVAL_TYPES} selected={plan.methods.types} etc={plan.methods.typeEtc} /></td>
            </tr>
            <tr>
              <td colSpan={2} className="c">평가주체</td>
              <td><Checks labels={EVALUATORS} selected={plan.methods.evaluators} /></td>
            </tr>
            <tr>
              <td colSpan={2} className="c">평가방식</td>
              <td><Checks labels={EVAL_MODES} selected={plan.methods.modes} /></td>
            </tr>
            <tr className="thick-bottom">
              <th scope="row">평가 내용</th>
              <td colSpan={3}>
                <ul className="lines dot" style={{ fontWeight: 700 }}>
                  {plan.contents.map((c, i) => <li key={i}>{h(c)}</li>)}
                </ul>
              </td>
            </tr>
          </tbody>
        </table>

        {plan.scoring.map((st, i) => (
          <table className="form thick-top" key={i}>
            <colgroup>
              <col style={{ width: '55%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: st.genderSplit ? '17%' : '37%' }} />
              {st.genderSplit && <col style={{ width: '20%' }} />}
            </colgroup>
            <thead>
              <tr>
                <th rowSpan={2}>평가요소</th>
                <th colSpan={st.genderSplit ? 3 : 2}>채점 기준</th>
              </tr>
              <tr>
                <th>성취<br />수준</th>
                {st.genderSplit ? (
                  <>
                    <th>남</th>
                    <th>여</th>
                  </>
                ) : (
                  <th>기준</th>
                )}
              </tr>
            </thead>
            <tbody>
              {st.rows.map((r, j) => (
                <tr key={j} className={j === st.rows.length - 1 ? 'thick-bottom' : undefined}>
                  {j === 0 && (
                    <td rowSpan={st.rows.length} style={{ verticalAlign: 'middle' }}>
                      <div className="table-title">
                        [{h(st.title)}{st.unit ? ` · 단위: ${st.unit}` : ''}]
                      </div>
                      <ul className="lines dash" style={{ fontWeight: 700 }}>
                        {st.elements.map((e, k) => <li key={k}>{h(e)}</li>)}
                      </ul>
                    </td>
                  )}
                  <td className="c">{r.level}</td>
                  <td className={st.measure === 'rubric' ? undefined : 'c'}>{h(r.male)}</td>
                  {st.genderSplit && <td className="c">{h(r.female ?? '')}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </article>

      <article className="paper" aria-label="평가계획서 2쪽">
        <table className="form thick-top">
          <colgroup>
            <col style={{ width: '10.8%' }} />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th>성취도</th>
              <th>성취 수준</th>
            </tr>
          </thead>
          <tbody>
            {plan.achievement.map((a, i) => (
              <tr key={i} className={i === plan.achievement.length - 1 ? 'thick-bottom' : undefined}>
                <td className="c">{a.level}</td>
                <td>{h(a.text)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {(plan.explanation.image || plan.explanation.text) && (
          <table className="form thick-top">
            <thead>
              <tr>
                <th>평가 설명</th>
              </tr>
            </thead>
            <tbody>
              <tr className="thick-bottom">
                <td>
                  {plan.explanation.image && (
                    <img className="exp-img" src={plan.explanation.image} alt="평가 설명 그림" />
                  )}
                  {plan.explanation.text && <div className="exp-text">{h(plan.explanation.text)}</div>}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </article>
    </div>
  );
}
