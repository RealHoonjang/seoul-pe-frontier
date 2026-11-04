import type { EvalPlan, Standard } from '../types';

/** 자료 이용 조건 (화면 아래, 이용 안내, 내려받기 버튼 옆에 표시) */
export const USAGE_TERMS = '자료 이용 조건: 수업·평가 목적으로 자유롭게 고쳐 쓸 수 있으며, 상업적 이용은 할 수 없습니다.';

export function gradeLabel(p: Pick<EvalPlan, 'schoolLevel' | 'grade' | 'course'>): string {
  const base = `${p.schoolLevel} ${p.grade}학년`;
  return p.course ? `${base} (${p.course})` : base;
}

export const SCHOOL_SHORT: Record<string, string> = { 초등학교: '초', 중학교: '중', 고등학교: '고' };

export const GRADES: Record<string, number[]> = {
  초등학교: [3, 4, 5, 6],
  중학교: [1, 2, 3],
  고등학교: [1, 2, 3],
};

/** 고등학교 과목 영역명을 운동·스포츠·표현 3영역으로 묶는다 */
export function bigArea(s: Standard): string {
  if (s.course === '체육') return s.area;
  if (/건강|체력/.test(s.area)) return '운동';
  if (/표현/.test(s.area)) return '표현';
  return '스포츠';
}

/** 스포츠 세부 유형의 상위 유형 */
export const TYPE_PARENT: Record<string, string> = {
  기록형: '기술형',
  동작형: '기술형',
  투기형: '기술형',
  영역형: '전략형',
  필드형: '전략형',
  네트형: '전략형',
  생활환경형: '생태형',
  자연환경형: '생태형',
  '생활⋅자연환경형': '생태형',
};

export const TYPE_ORDER = [
  '건강', '체력',
  '기술형', '기록형', '동작형', '투기형',
  '전략형', '영역형', '필드형', '네트형',
  '생태형', '생활환경형', '자연환경형', '생활⋅자연환경형',
  '스포츠 표현', '전통 표현', '현대 표현',
];

export const AREA_ORDER = ['운동', '스포츠', '표현'];

export const OFFICES = [
  '동부', '서부', '남부', '북부', '중부', '강동송파', '강서양천', '강남서초', '동작관악', '성동광진', '성북강북',
];

export const LEVEL_COLORS: Record<string, string> = {
  A: 'var(--lv-a)',
  B: 'var(--lv-b)',
  C: 'var(--lv-c)',
  D: 'var(--lv-d)',
  E: 'var(--lv-e)',
};
