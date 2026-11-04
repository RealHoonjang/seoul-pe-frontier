// 평가계획서 한 건의 데이터 구조.
// public/data/plans.json 은 이 EvalPlan 의 배열이다. (제출본을 넣을 때도 이 구조를 따른다)

export type SchoolLevel = '초등학교' | '중학교' | '고등학교';

export const EVAL_TYPES = ['서술', '논술', '구술', '토의·토론', '포트폴리오', '프로젝트', '실기평가', '기타'] as const;
export const EVALUATORS = ['교사평가', '자기평가', '동료평가'] as const;
export const EVAL_MODES = ['모둠별 수행', '개인별 수행'] as const;

/** 측정 방식: 횟수(개수), 기록(시간·거리), 점수, 루브릭(관찰·서술형 기준) */
export type Measure = 'count' | 'time' | 'distance' | 'score' | 'rubric';

export const MEASURE_LABEL: Record<Measure, string> = {
  count: '횟수·개수',
  time: '기록(시간)',
  distance: '기록(거리)',
  score: '점수',
  rubric: '관찰·루브릭',
};

export interface ScoringRow {
  /** 성취수준 기호 (A~E) */
  level: string;
  /** 남학생 기준 (성별 구분이 없으면 이것만 사용) */
  male: string;
  /** 여학생 기준 */
  female?: string;
  /** 그래프·엑셀 자동판정용 숫자 경계값 (예: '7개 이상' → 7, '25초 이내' → 25). 마지막 단계는 비워도 됨 */
  m?: number;
  f?: number;
}

export interface ScoringTable {
  /** 표 제목 (예: '과제 성공 개수') */
  title: string;
  /** 평가요소 (줄 단위) */
  elements: string[];
  measure: Measure;
  /** 단위 (개, 초, m, 회, 점 …) */
  unit?: string;
  /** higher: 클수록 좋음 / lower: 작을수록 좋음 (시간 기록) */
  better?: 'higher' | 'lower';
  genderSplit: boolean;
  rows: ScoringRow[];
}

export interface EvalPlan {
  id: string;
  /** 수행평가명 */
  title: string;
  /** 양식 맨 위 제목 (비우면 기본 제목) */
  docTitle?: string;
  schoolLevel: SchoolLevel;
  /** 학년 (초 3~6, 중 1~3, 고 1~3) */
  grade: number;
  /** 고등학교 과목명 (체육1, 스포츠 생활1 …) */
  course?: string;
  /** 종목 */
  sport: string;
  /** 성취기준 코드 목록 (예: '9체02-11') */
  standards: string[];
  /** 평가 의도 */
  intent: string;
  digital: {
    devices: string[];
    apps: string[];
    content: string;
  };
  methods: {
    types: string[];
    typeEtc?: string;
    evaluators: string[];
    modes: string[];
  };
  /** 평가 내용 (줄 단위) */
  contents: string[];
  scoring: ScoringTable[];
  /** 성취수준 서술 */
  achievement: { level: string; text: string }[];
  /** 평가 설명 (글 또는 그림) */
  explanation: { text?: string; image?: string };
  author: {
    office: string;
    school: string;
    name: string;
  };
  /** 원본 파일 (public/ 아래 경로). 없으면 HWPX를 데이터로 새로 만든다 */
  files?: { hwp?: string; hwpx?: string; pdf?: string };
  /** 더미(가짜) 데이터 표시 */
  dummy?: boolean;
  /** 예시 자료 표시 */
  sample?: boolean;
  updated: string;
}

export interface Standard {
  code: string;
  text: string;
  explanation: string;
  school: SchoolLevel;
  /** 학년군 표기 (3~4학년, 5~6학년, 1~3학년, 고등학교) */
  grade: string;
  /** 체육 / 체육1 / 운동과 건강 … */
  course: string;
  /** 운동·스포츠·표현 (고등은 과목 내 영역명) */
  area: string;
  /** 기록형·영역형·건강·현대 표현 … */
  subtype: string | null;
}
