// 첫 화면: 학교급부터 고른다
import { useApp } from '../ctx';

const LEVELS = [
  { level: '초등학교', grades: '3~6학년', desc: '운동 · 스포츠(기술형·전략형·생태형) · 표현', mark: '초' },
  { level: '중학교', grades: '1~3학년', desc: '운동 · 스포츠(기록형·영역형·네트형 등) · 표현', mark: '중' },
  { level: '고등학교', grades: '과목별', desc: '체육1·2, 운동과 건강, 스포츠 생활 등', mark: '고' },
];

interface Props {
  onPick: (level: string | null) => void;
}

export default function LevelPicker({ onPick }: Props) {
  const { data } = useApp();
  const count = (lv: string) => data.plans.filter((x) => x.plan.schoolLevel === lv).length;
  return (
    <section className="picker" aria-label="학교급 고르기">
      <h2 className="picker-q">어느 학교급의 평가계획을 찾으세요?</h2>
      <div className="picker-grid">
        {LEVELS.map((l) => (
          <button key={l.level} className="level-card" onClick={() => onPick(l.level)}>
            <span className="level-mark" aria-hidden>{l.mark}</span>
            <span className="level-body">
              <span className="level-name">
                {l.level} <small>{l.grades}</small>
              </span>
              <span className="level-desc">{l.desc}</span>
            </span>
            <span className="level-count">
              <b>{count(l.level)}</b>건
            </span>
          </button>
        ))}
      </div>
      <button className="linkbtn picker-all" onClick={() => onPick(null)}>
        학교급 상관없이 전체 {data.plans.length}건 둘러보기 →
      </button>
    </section>
  );
}
