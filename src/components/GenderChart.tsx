// 채점기준의 남/여 경계값을 성취수준별 막대로 비교한다
import type { ScoringTable } from '../types';

export function chartable(st: ScoringTable) {
  return st.genderSplit && st.measure !== 'rubric' && st.rows.some((r) => r.m !== undefined && r.f !== undefined);
}

export default function GenderChart({ st }: { st: ScoringTable }) {
  const rows = st.rows.filter((r) => r.m !== undefined || r.f !== undefined);
  const max = Math.max(...rows.flatMap((r) => [r.m ?? 0, r.f ?? 0])) || 1;
  const W = 340;
  const left = 30;
  const right = 56;
  const bh = 11;
  const rowH = bh * 2 + 2 + 12;
  const H = rows.length * rowH + 4;
  const x = (v: number) => ((W - left - right) * v) / max;
  const unit = st.unit ?? '';
  const dir = st.better === 'lower' ? '이내 (작을수록 좋음)' : '이상 (클수록 좋음)';

  const bar = (v: number | undefined, y: number, cls: string, who: string, level: string) => {
    if (v === undefined) return null;
    const w = Math.max(2, x(v));
    return (
      <g>
        <title>{`${level} · ${who} ${v}${unit} ${st.better === 'lower' ? '이내' : '이상'}`}</title>
        {/* 넓은 투명 영역: 마우스를 올리기 쉽게 */}
        <rect x={left} y={y - 1} width={W - left - right + 40} height={bh + 2} fill="transparent" />
        <path className={cls} d={`M${left},${y} h${w - 4} a4,4 0 0 1 4,4 v${bh - 8} a4,4 0 0 1 -4,4 h${-(w - 4)} z`} />
        <text className="val" x={left + w + 5} y={y + bh - 2}>{`${v}${unit}`}</text>
      </g>
    );
  };

  return (
    <div className="chart">
      <div className="chart-title">{st.title}</div>
      <div className="chart-sub">각 성취수준에 도달하는 기록 · {dir}</div>
      <div className="chart-legend" aria-hidden>
        <span><i style={{ background: 'var(--male)' }} />남</span>
        <span><i style={{ background: 'var(--female)' }} />여</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${st.title} 성취수준별 남녀 기준: ${rows.map((r) => `${r.level} 남 ${r.m ?? '-'} 여 ${r.f ?? '-'}`).join(', ')}`}>
        <line className="grid" x1={left} x2={left} y1={0} y2={H - 4} />
        {rows.map((r, i) => {
          const y = i * rowH + 4;
          return (
            <g key={r.level}>
              <text className="lvl" x={4} y={y + bh + 4}>{r.level}</text>
              {bar(r.m, y, 'bar-m', '남', r.level)}
              {bar(r.f, y + bh + 2, 'bar-f', '여', r.level)}
            </g>
          );
        })}
      </svg>
      {st.rows.length > rows.length && (
        <div className="chart-sub">
          {st.rows.filter((r) => r.m === undefined && r.f === undefined).map((r) => `${r.level}: 남 ${r.male} / 여 ${r.female ?? ''}`).join(' · ')}
        </div>
      )}
    </div>
  );
}
