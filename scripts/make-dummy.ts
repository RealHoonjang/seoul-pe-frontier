// 더미 평가계획 데이터를 만들어 public/data/plans.json 에 쓴다.
// 실행: npm run dummy
// 실제 제출본을 넣을 때는 tools/import_plan.py 를 사용한다 (더미는 dummy: true 로 표시되어 한 번에 지울 수 있음).
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import type { EvalPlan, ScoringTable, SchoolLevel } from '../src/types';

const OUT = 'public/data/plans.json';
const OFFICES = ['동부', '서부', '남부', '북부', '중부', '강동송파', '강서양천', '강남서초', '동작관악', '성동광진', '성북강북'];

const LV5 = ['A', 'B', 'C', 'D', 'E'];
const LV3 = ['A', 'B', 'C'];

/** 클수록 좋은 기준 (횟수·거리). cut: A~(마지막-1) 단계 하한값 */
function higher(cut: number[], unit: string, nLevels: number) {
  const lv = nLevels === 3 ? LV3 : LV5;
  return lv.map((level, i) =>
    i < lv.length - 1
      ? { level, text: `${cut[i]}${unit} 이상`, v: cut[i] }
      : { level, text: `${cut[i - 1]}${unit} 미만`, v: undefined },
  );
}
/** 작을수록 좋은 기준 (시간 기록). cut: A~(마지막-1) 단계 상한값 */
function lower(cut: number[], unit: string, nLevels: number) {
  const lv = nLevels === 3 ? LV3 : LV5;
  return lv.map((level, i) => {
    if (i === 0) return { level, text: `${cut[0]}${unit} 이내`, v: cut[0] };
    if (i < lv.length - 1) return { level, text: `${(cut[i - 1] + 0.1).toFixed(1)}~${cut[i]}${unit}`, v: cut[i] };
    return { level, text: `${cut[i - 1]}${unit} 초과`, v: undefined };
  });
}

function numTable(o: {
  title: string;
  elements: string[];
  measure: 'count' | 'time' | 'distance' | 'score';
  unit: string;
  levels: number;
  male: number[];
  female?: number[];
}): ScoringTable {
  const better = o.measure === 'time' ? 'lower' : 'higher';
  const f = better === 'lower' ? lower : higher;
  const m = f(o.male, o.unit, o.levels);
  const w = o.female ? f(o.female, o.unit, o.levels) : null;
  return {
    title: o.title,
    elements: o.elements,
    measure: o.measure,
    unit: o.unit,
    better,
    genderSplit: !!w,
    rows: m.map((r, i) => ({
      level: r.level,
      male: r.text,
      female: w?.[i].text,
      m: r.v,
      f: w?.[i].v,
    })),
  };
}

function rubric(title: string, elements: string[], criteria: string[]): ScoringTable {
  const lv = criteria.length === 3 ? LV3 : LV5;
  return {
    title,
    elements,
    measure: 'rubric',
    genderSplit: false,
    rows: criteria.map((c, i) => ({ level: lv[i], male: c })),
  };
}

/** 성취수준 서술 (더미용 문장 틀) */
function ach(skill: string, context: string, levels: number) {
  const five = [
    `${skill}의 원리를 정확히 이해하고, ${context}에서 정확하고 안정적으로 수행하며 스스로 개선점을 찾아 보완한다.`,
    `${skill}의 원리를 이해하고, ${context}에서 대체로 정확하게 수행하며 개선 방법을 탐색한다.`,
    `${skill}의 원리를 부분적으로 이해하고, ${context}에서 기본적인 동작을 수행한다.`,
    `${skill}의 원리를 이해하는 데 도움이 필요하며, ${context}에서 동작 수행이 다소 불안정하다.`,
    `${skill}의 원리에 대한 이해가 부족하고, ${context}에서 기본 동작을 수행하는 데 어려움이 있다.`,
  ];
  const pick = levels === 3 ? [five[0], five[2], five[4]] : five;
  return pick.map((text, i) => ({ level: (levels === 3 ? LV3 : LV5)[i], text }));
}

let seq = 0;
function plan(p: {
  id: string;
  title: string;
  level: SchoolLevel;
  grade: number;
  course?: string;
  sport: string;
  standards: string[];
  intent: string;
  devices?: string[];
  apps?: string[];
  digital?: string;
  types: string[];
  typeEtc?: string;
  evaluators: string[];
  modes: string[];
  contents: string[];
  scoring: ScoringTable[];
  skill: string;
  context: string;
  explanation?: string;
}): EvalPlan {
  seq++;
  const levels = p.level === '중학교' ? 5 : 3;
  const short = { 초등학교: '초등학교', 중학교: '중학교', 고등학교: '고등학교' }[p.level];
  const day = String(1 + ((seq * 7) % 28)).padStart(2, '0');
  return {
    id: p.id,
    title: p.title,
    schoolLevel: p.level,
    grade: p.grade,
    course: p.course,
    sport: p.sport,
    standards: p.standards,
    intent: p.intent,
    digital: { devices: p.devices ?? [], apps: p.apps ?? [], content: p.digital ?? '' },
    methods: { types: p.types, typeEtc: p.typeEtc, evaluators: p.evaluators, modes: p.modes },
    contents: p.contents,
    scoring: p.scoring,
    achievement: ach(p.skill, p.context, levels),
    explanation: { text: p.explanation },
    author: {
      office: OFFICES[seq % OFFICES.length],
      school: `샘플${short} ${String.fromCharCode(64 + ((seq % 26) || 26))}`,
      name: `더미 교사 ${String(seq).padStart(2, '0')}`,
    },
    dummy: true,
    updated: `2026-${seq % 2 ? '09' : '10'}-${day}`,
  };
}

// ---------------- 실제 예시 (연구회 평가계획서 예시) ----------------
const sample: EvalPlan = {
  id: 'sample-basketball',
  title: '농구 종합 평가',
  docTitle: '프론티어 교사단 평가계획서',
  schoolLevel: '중학교',
  grade: 2,
  sport: '농구',
  standards: ['9체02-11', '9체02-12'],
  intent: '농구 경기를 위한 기초 기능(패스, 드리블, 슛)을 상황에 맞게 종합적으로 활용할 수 있다.',
  digital: {
    devices: ['갤럭시 탭 S6'],
    apps: ['훈코치'],
    content: '교사 패드와 무선 연결, 모션 인식 타이머 활용하여 기록 측정 및 누적 관리',
  },
  methods: { types: ['실기평가'], evaluators: ['교사평가'], modes: ['개인별 수행'] },
  contents: [
    '농구의 기초 기능 패스, 드리블, 슛을 활용하여 정확하게 과제를 수행한다.',
    '농구의 기초 기능 패스, 드리블, 슛을 정해진 시간 내에 수행한다.',
  ],
  scoring: [
    {
      title: '성공한 과제 개수',
      elements: [
        '농구 종합 평가를 실시한다.',
        '성공한 과제 개수에 대해 평가한다.',
        '정해진 구역 내에서 종합 평가를 실기한다.',
        '패스-드리블-슛 순으로 평가한다.',
        '패스는 체스트, 바운드 패스, 슛은 골밑슛으로 한다.',
      ],
      measure: 'count',
      unit: '개',
      better: 'higher',
      genderSplit: true,
      rows: [
        { level: 'A', male: '7개 이상 성공', female: '6개 이상 성공', m: 7, f: 6 },
        { level: 'B', male: '6개 성공', female: '5개 성공', m: 6, f: 5 },
        { level: 'C', male: '5개 성공', female: '4개 성공', m: 5, f: 4 },
        { level: 'D', male: '4개 성공', female: '3개 성공', m: 4, f: 3 },
        { level: 'E', male: '3개 이하 성공', female: '2개 이하 성공' },
      ],
    },
    {
      title: '과제 소요 시간',
      elements: [
        '농구 종합 평가를 실시한다.',
        '성공한 과제 소요 시간에 대해 평가한다.',
        '정해진 구역 내에서 종합 평가를 실기한다.',
        '패스-드리블-슛 순으로 평가한다.',
        '패스는 체스트, 바운드 패스, 슛은 골밑슛으로 한다.',
      ],
      measure: 'time',
      unit: '초',
      better: 'lower',
      genderSplit: true,
      rows: [
        { level: 'A', male: '25초 이내', female: '35초 이내', m: 25, f: 35 },
        { level: 'B', male: '25.1~30초', female: '35.1~40초', m: 30, f: 40 },
        { level: 'C', male: '30.1~35초', female: '40.1~45초', m: 35, f: 45 },
        { level: 'D', male: '35.1~40초', female: '45.1~50초', m: 40, f: 50 },
        { level: 'E', male: '40.1~45초', female: '50.1~55초', m: 45, f: 55 },
      ],
    },
  ],
  achievement: [
    { level: 'A', text: '농구 기본기능인 드리블, 패스, 슛의 과학적 원리를 정확하게 파악하고 있으며 골밑슛을 구사할 때 공의 궤적을 이해하여 정확히 성공시키고 체스트, 바운드 패스를 완벽하게 수행하여 정확도가 높다. 공을 손끝으로 자유롭게 컨트롤해서 드리블을 원하는 곳으로 시간 내에 이동할 수 있는 능력이 있다.' },
    { level: 'B', text: '농구 기본기능인 드리블, 패스, 슛의 과학적 원리를 정확하게 파악하고 있으며 골밑슛을 구사할 때 공의 궤적을 이해하여 성공시키고 체스트, 바운드 패스를 정확하게 수행한다. 공을 손끝으로 자유롭게 컨트롤해서 드리블을 원하는 곳으로 시간 내에 이동할 수 있는 능력이 있다.' },
    { level: 'C', text: '농구 기본기능인 드리블, 패스, 슛의 과학적 원리를 정확하게 파악하고 있으며 골밑슛을 구사할 때 공의 궤적을 이해하여 성공시키고 체스트, 바운드 패스를 완벽하게 수행하려 노력한다. 공을 손끝으로 자유롭게 컨트롤해서 드리블을 원하는 곳으로 이동할 수 있는 능력이 있다.' },
    { level: 'D', text: '농구 기본기능인 드리블, 패스, 슛의 과학적 원리를 정확하게 파악하고 있으나 골밑슛을 구사할 때 정확도가 미흡하다. 체스트, 바운드 패스를 수행할 줄 알며 공을 손끝으로 컨트롤해서 드리블을 원하는 곳으로 이동하다 놓치는 경우가 있다.' },
    { level: 'E', text: '농구 기본기능인 드리블, 패스, 슛의 과학적 원리에 대한 이해가 부족하고 골밑슛 구사와 체스트, 바운드 패스 수행이 미흡하다. 공을 손끝으로 컨트롤해서 드리블을 원하는 곳으로 이동하는 것이 어렵다.' },
  ],
  explanation: { image: 'files/example-basketball-explain.jpg' },
  author: { office: '서울', school: '프론티어 교사단', name: '평가계획서 예시' },
  files: { hwp: 'files/example-basketball.hwp', pdf: 'files/example-basketball.pdf' },
  sample: true,
  updated: '2026-11-04',
};

const T = ['실기평가'];
const P = ['교사평가'];
const I = ['개인별 수행'];

const dummies: EvalPlan[] = [
  plan({
    id: 'd-e3-jumprope', title: '30초 양발 모아 뛰기', level: '초등학교', grade: 3, sport: '줄넘기',
    standards: ['4체01-02', '4체01-05'],
    intent: '자신의 체력 수준을 알고 줄넘기 기본 동작을 꾸준히 연습하여 기록을 높일 수 있다.',
    devices: ['크롬북'], apps: ['훈코치'], digital: '모션 인식 카운터로 30초 동안 뛴 횟수를 자동으로 세고 학급 기록표에 누적',
    types: T, evaluators: ['교사평가', '자기평가'], modes: I,
    contents: ['30초 동안 양발 모아 뛰기를 실시하여 성공 횟수를 측정한다.', '연습 전후 기록을 비교하여 자신의 변화를 확인한다.'],
    scoring: [numTable({ title: '30초 양발 모아 뛰기 횟수', elements: ['줄에 걸린 경우 다시 이어서 뛴다.', '2회 측정하여 좋은 기록을 반영한다.'], measure: 'count', unit: '회', levels: 3, male: [55, 35] })],
    skill: '줄넘기 양발 모아 뛰기', context: '정해진 시간 동안의 연속 동작',
    explanation: '교실 앞 공간에 2m 간격으로 4명씩 서서 측정한다. 모션 인식 카운터 화면을 전자칠판에 띄워 학생이 자신의 횟수를 바로 확인한다.',
  }),
  plan({
    id: 'd-e4-throwcatch', title: '피구형 게임 던지고 받기', level: '초등학교', grade: 4, sport: '피구',
    standards: ['4체02-06', '4체02-09'],
    intent: '전략형 스포츠에 필요한 던지기와 받기 동작을 익혀 게임 활동에 적용할 수 있다.',
    devices: ['태블릿'], apps: ['패들렛'], digital: '모둠별 던지기 동작 영상을 촬영하여 패들렛에 올리고 친구 피드백 남기기',
    types: ['실기평가', '포트폴리오'], evaluators: ['교사평가', '동료평가'], modes: ['모둠별 수행', '개인별 수행'],
    contents: ['목표물을 향해 정확하게 던지고 날아오는 공을 안정적으로 받는다.', '게임 규칙을 지키며 모둠원과 협력한다.'],
    scoring: [rubric('던지기·받기 동작', ['던지기: 체중 이동과 팔 휘두르기', '받기: 공의 방향을 보고 손 모으기', '게임 중 규칙 지키기'], [
      '던지기와 받기 동작을 바르게 연결하여 게임에서 안정적으로 수행한다.',
      '던지기와 받기 동작을 대체로 바르게 수행하나 게임 중 실수가 있다.',
      '도움을 받아 던지기와 받기 동작을 시도한다.',
    ])],
    skill: '던지기와 받기', context: '피구형 게임 상황',
  }),
  plan({
    id: 'd-e4-rhythm', title: '도구 활용 리듬 표현', level: '초등학교', grade: 4, sport: '리듬 체조',
    standards: ['4체03-05', '4체03-06'],
    intent: '공, 리본 등 도구를 활용하여 음악의 리듬에 맞게 움직임을 표현할 수 있다.',
    devices: ['태블릿', '블루투스 스피커'], apps: ['캔바'], digital: '모둠 작품 영상을 촬영하여 캔바로 짧은 발표 영상 만들기',
    types: ['실기평가', '프로젝트'], evaluators: ['교사평가', '자기평가', '동료평가'], modes: ['모둠별 수행'],
    contents: ['음악의 박자와 빠르기에 맞추어 도구를 활용한 동작을 구성한다.', '모둠 작품을 발표하고 친구 작품을 감상한다.'],
    scoring: [rubric('리듬 표현 작품', ['박자 맞추기', '도구 활용의 다양성', '모둠원과 동작 맞추기'], [
      '리듬에 맞추어 도구를 다양하게 활용하며 모둠원과 조화롭게 표현한다.',
      '리듬에 맞추어 도구를 활용하나 동작의 다양성이 부족하다.',
      '리듬에 맞추어 표현하는 데 도움이 필요하다.',
    ])],
    skill: '리듬에 맞춘 도구 표현', context: '모둠 작품 발표',
  }),
  plan({
    id: 'd-e5-longjump', title: '멀리뛰기 기록 향상', level: '초등학교', grade: 5, sport: '육상(멀리뛰기)',
    standards: ['6체02-02', '6체02-10'],
    intent: '도움닫기와 발구르기를 연결하여 멀리뛰기 기록을 높일 수 있다.',
    devices: ['태블릿', '삼각대'], apps: ['Kinovea'], digital: '발구르기 순간을 느린 화면으로 분석하여 자세 교정',
    types: T, evaluators: ['교사평가', '자기평가'], modes: I,
    contents: ['도움닫기-발구르기-공중 동작-착지를 연결하여 멀리뛰기를 수행한다.', '영상 분석으로 자신의 발구르기 자세를 점검한다.'],
    scoring: [numTable({ title: '멀리뛰기 기록', elements: ['3회 시기 중 최고 기록을 반영한다.', '발구름판을 밟으면 실패로 처리한다.'], measure: 'distance', unit: 'm', levels: 3, male: [3.2, 2.6], female: [2.8, 2.2] })],
    skill: '멀리뛰기의 도움닫기와 발구르기', context: '기록 측정 상황',
  }),
  plan({
    id: 'd-e5-paps', title: '왕복오래달리기 체력 관리', level: '초등학교', grade: 5, sport: '체력 운동',
    standards: ['6체01-02', '6체01-05'],
    intent: '자신의 심폐지구력을 측정하고 체력 수준에 맞는 운동을 꾸준히 실천할 수 있다.',
    devices: ['스마트워치(심박계)', '크롬북'], apps: ['구글 시트'], digital: '심박수와 왕복 횟수를 구글 시트에 기록하여 4주간 변화 그래프 확인',
    types: ['실기평가', '포트폴리오'], evaluators: ['교사평가', '자기평가'], modes: I,
    contents: ['20m 왕복오래달리기 횟수를 측정한다.', '4주 운동 계획과 실천 기록을 작성한다.'],
    scoring: [
      numTable({ title: '20m 왕복오래달리기', elements: ['신호음에 맞추어 20m를 왕복한다.', '신호음보다 2회 늦으면 측정을 마친다.'], measure: 'count', unit: '회', levels: 3, male: [45, 28], female: [35, 22] }),
      rubric('운동 실천 기록장', ['4주 운동 계획의 적절성', '실천 기록의 꾸준함'], [
        '자신의 체력 수준에 맞는 계획을 세우고 4주 동안 꾸준히 실천하였다.',
        '계획을 세우고 실천하였으나 기록이 일부 빠져 있다.',
        '계획과 실천 기록이 부족하다.',
      ]),
    ],
    skill: '심폐지구력 운동', context: '자신의 체력 수준에 맞는 운동 실천',
  }),
  plan({
    id: 'd-e6-teeball', title: '티볼 타격과 수비 전략', level: '초등학교', grade: 6, sport: '티볼',
    standards: ['6체02-05', '6체02-06'],
    intent: '티볼의 타격·수비 기능을 익히고 상황에 맞는 기본 전략을 게임에서 수행할 수 있다.',
    devices: ['크롬북'], apps: ['티처블머신', 'PoseNet'], digital: '타격 자세를 PoseNet으로 분석하고, 티처블머신으로 바른 자세 판별 모델을 만들어 자가 점검',
    types: ['실기평가', '토의·토론'], evaluators: ['교사평가', '동료평가', '자기평가'], modes: ['모둠별 수행', '개인별 수행'],
    contents: ['배팅티의 공을 정확하게 타격하여 페어 지역으로 보낸다.', '주자 상황에 맞는 수비 위치와 송구 방향을 정하여 게임에서 수행한다.'],
    scoring: [
      numTable({ title: '타격 성공 횟수', elements: ['10회 타격 중 페어 지역으로 보낸 횟수', '파울 라인 밖은 실패로 처리'], measure: 'count', unit: '회', levels: 3, male: [8, 5] }),
      rubric('상황별 수비 전략', ['주자 상황에 맞는 위치 선정', '정확한 송구 방향 선택', '모둠 전술 토의 참여'], [
        '주자 상황을 정확히 판단하여 알맞은 위치와 송구 방향을 선택한다.',
        '대체로 알맞은 위치를 선정하나 송구 판단에 도움이 필요하다.',
        '수비 위치와 송구 방향을 정하는 데 어려움이 있다.',
      ]),
    ],
    skill: '티볼의 타격과 수비', context: '간이 게임',
    explanation: '타격 스테이션(배팅티 3개), 수비 분석 스테이션(크롬북 2대), 전술 스테이션(작전판)을 순환한다.',
  }),
  plan({
    id: 'd-e6-folkdance', title: '강강술래 모둠 작품', level: '초등학교', grade: 6, sport: '민속무용',
    standards: ['6체03-04', '6체03-05'],
    intent: '강강술래의 기본 동작을 익히고 모둠별로 구성하여 발표할 수 있다.',
    devices: ['태블릿', '전자칠판'], apps: ['클래스보드'], digital: '모둠 발표 영상을 클래스보드에 올리고 감상평 나누기',
    types: ['실기평가', '프로젝트'], evaluators: ['교사평가', '동료평가'], modes: ['모둠별 수행'],
    contents: ['강강술래의 기본 동작(손잡고 돌기, 대문놀이 등)을 익힌다.', '기본 동작을 엮어 모둠 작품을 구성하고 발표한다.'],
    scoring: [rubric('모둠 작품 구성과 발표', ['기본 동작의 정확성', '작품 구성의 창의성', '감상 태도'], [
      '기본 동작을 정확히 수행하고 창의적으로 구성하여 발표한다.',
      '기본 동작을 수행하고 구성하여 발표하나 연결이 부자연스럽다.',
      '기본 동작 수행과 구성에 도움이 필요하다.',
    ])],
    skill: '강강술래 기본 동작', context: '모둠 작품 발표',
  }),
  plan({
    id: 'd-e6-orienteering', title: '학교 오리엔티어링', level: '초등학교', grade: 6, sport: '오리엔티어링',
    standards: ['6체02-08', '6체02-09', '6체02-12'],
    intent: '지도를 읽고 길을 찾는 기능을 익혀 모둠원과 함께 안전하게 코스를 완주할 수 있다.',
    devices: ['태블릿', 'QR 코드'], apps: ['구글 설문지'], digital: '각 지점의 QR 코드를 찍어 통과 시간을 자동 기록',
    types: T, evaluators: ['교사평가', '자기평가'], modes: ['모둠별 수행'],
    contents: ['학교 지도를 보고 8개 지점을 차례로 찾아 완주한다.', '모둠원과 역할을 나누고 안전 수칙을 지킨다.'],
    scoring: [numTable({ title: '코스 완주 시간', elements: ['8개 지점을 모두 통과해야 완주로 인정', '지점 누락 시 1분 추가'], measure: 'time', unit: '분', levels: 3, male: [15, 22] })],
    skill: '지도 읽기와 길 찾기', context: '학교 안 코스',
  }),
  plan({
    id: 'd-m1-volley', title: '배구 언더핸드 패스', level: '중학교', grade: 1, sport: '배구',
    standards: ['9체02-17', '9체02-18'],
    intent: '언더핸드 패스의 수행 원리를 이해하고 연속 패스를 안정적으로 수행할 수 있다.',
    devices: ['갤럭시 탭'], apps: ['훈코치'], digital: '모션 인식으로 연속 패스 횟수를 세고 개인 기록 그래프 확인',
    types: T, evaluators: P, modes: I,
    contents: ['지정된 원 안에서 언더핸드 패스를 연속으로 수행한다.', '공의 높이(머리 위 1m 이상)를 유지한다.'],
    scoring: [numTable({ title: '언더핸드 연속 패스', elements: ['지름 3m 원 안에서 실시', '2회 측정 중 좋은 기록 반영', '공 높이가 낮으면 횟수에서 제외'], measure: 'count', unit: '회', levels: 5, male: [30, 22, 15, 8], female: [25, 18, 12, 6] })],
    skill: '배구 언더핸드 패스', context: '연속 패스 과제',
  }),
  plan({
    id: 'd-m1-sprint', title: '50m 달리기 기록', level: '중학교', grade: 1, sport: '육상(단거리)',
    standards: ['9체02-05', '9체02-06'],
    intent: '출발, 가속, 중간 질주의 수행 원리를 적용하여 단거리 달리기 기록을 향상할 수 있다.',
    devices: ['광센서 타이머', '태블릿'], apps: ['구글 시트'], digital: '광센서로 기록을 측정하여 구글 시트에 자동 입력하고 1차·2차 기록 비교',
    types: T, evaluators: ['교사평가', '자기평가'], modes: I,
    contents: ['스탠딩 스타트로 50m를 전력 질주한다.', '1차 측정 후 영상 피드백을 받고 2차 측정한다.'],
    scoring: [numTable({ title: '50m 달리기', elements: ['스탠딩 스타트', '2회 측정 중 좋은 기록 반영'], measure: 'time', unit: '초', levels: 5, male: [7.5, 8.2, 8.9, 9.6], female: [8.6, 9.3, 10.0, 10.7] })],
    skill: '단거리 달리기의 출발과 가속', context: '50m 기록 측정',
  }),
  plan({
    id: 'd-m2-mat', title: '매트 운동 연결 동작', level: '중학교', grade: 2, sport: '기계체조(매트)',
    standards: ['9체02-02', '9체02-03'],
    intent: '매트 운동의 기본 기술을 연결하여 안전하고 아름답게 수행할 수 있다.',
    devices: ['태블릿', '삼각대'], apps: ['Kinovea'], digital: '연결 동작을 촬영하여 각도·자세를 분석하고 자기 평가지 작성',
    types: ['실기평가', '포트폴리오'], evaluators: ['교사평가', '자기평가'], modes: I,
    contents: ['앞구르기-뒤구르기-옆돌기를 포함한 연결 동작을 구성하여 수행한다.', '영상 분석 결과를 바탕으로 개선 계획을 작성한다.'],
    scoring: [rubric('연결 동작 수행', ['동작의 정확성', '연결의 부드러움', '착지와 마무리 자세'], [
      '모든 동작을 정확하게 수행하며 연결이 매우 부드럽고 마무리가 안정적이다.',
      '대부분의 동작을 정확하게 수행하며 연결이 부드럽다.',
      '기본 동작을 수행하나 연결 과정에서 멈춤이 있다.',
      '일부 동작을 보조를 받아 수행한다.',
      '기본 동작 수행이 어렵다.',
    ])],
    skill: '매트 운동 기본 기술', context: '연결 동작 발표',
  }),
  plan({
    id: 'd-m2-taekwondo', title: '태권도 품새 수행', level: '중학교', grade: 2, sport: '태권도',
    standards: ['9체02-08', '9체02-09'],
    intent: '태권도 품새의 동작 원리를 이해하고 정확한 자세와 절도 있는 동작으로 수행할 수 있다.',
    devices: ['태블릿'], apps: ['티처블머신'], digital: '티처블머신으로 기본 서기 자세를 판별하는 모델을 만들어 연습 중 자가 점검',
    types: T, evaluators: ['교사평가', '동료평가'], modes: I,
    contents: ['태극 1장을 정확한 서기와 막기·지르기 동작으로 수행한다.', '동료 평가지를 활용하여 서로의 동작을 점검한다.'],
    scoring: [rubric('태극 1장 품새', ['서기 자세', '막기·지르기의 정확성', '동작의 절도와 시선'], [
      '서기와 기술 동작이 정확하고 절도 있으며 시선과 기합이 바르다.',
      '서기와 기술 동작이 대체로 정확하며 절도 있다.',
      '동작 순서를 알고 수행하나 자세가 일부 부정확하다.',
      '동작 순서를 일부 잊거나 자세가 부정확하다.',
      '도움 없이 품새를 수행하기 어렵다.',
    ])],
    skill: '태권도 품새 동작', context: '품새 발표',
  }),
  plan({
    id: 'd-m3-softball', title: '소프트볼 수비와 송구', level: '중학교', grade: 3, sport: '소프트볼',
    standards: ['9체02-14', '9체02-15'],
    intent: '땅볼 포구와 송구의 수행 원리를 적용하고 경기 상황에 맞는 수비 전략을 활용할 수 있다.',
    devices: ['태블릿'], apps: ['패들렛'], digital: '경기 장면을 촬영하여 수비 위치 판단을 모둠별로 분석',
    types: ['실기평가', '토의·토론'], evaluators: ['교사평가', '동료평가'], modes: ['모둠별 수행', '개인별 수행'],
    contents: ['굴러오는 땅볼을 포구하여 1루로 정확하게 송구한다.', '주자 상황별 수비 전략을 토의하고 경기에 적용한다.'],
    scoring: [
      numTable({ title: '땅볼 포구 후 1루 송구', elements: ['10회 시도', '포구와 송구가 모두 성공해야 인정'], measure: 'count', unit: '회', levels: 5, male: [9, 7, 5, 3], female: [8, 6, 4, 2] }),
      rubric('경기 중 수비 전략', ['주자 상황 판단', '포지션별 역할 수행'], [
        '주자 상황을 정확히 판단하여 팀의 수비 전략을 주도적으로 수행한다.',
        '주자 상황에 맞게 대체로 알맞은 수비를 수행한다.',
        '자신의 포지션 역할을 알고 수행한다.',
        '도움을 받아 포지션 역할을 수행한다.',
        '수비 상황 판단이 어렵다.',
      ]),
    ],
    skill: '소프트볼 포구와 송구', context: '경기 상황',
  }),
  plan({
    id: 'd-m3-floorball', title: '플로어볼 드리블 슛', level: '중학교', grade: 3, sport: '플로어볼',
    standards: ['9체02-11', '9체02-12'],
    intent: '스틱 드리블과 슛의 수행 원리를 적용하여 경기 기능을 향상할 수 있다.',
    devices: ['갤럭시 탭'], apps: ['훈코치'], digital: '모션 인식 타이머로 드리블 코스 통과 시간을 자동 측정',
    types: T, evaluators: P, modes: I,
    contents: ['콘 사이를 지그재그로 드리블하여 통과한 뒤 슛을 한다.', '코스 통과 시간과 슛 성공 여부를 함께 평가한다.'],
    scoring: [numTable({ title: '지그재그 드리블 후 슛', elements: ['콘 6개 지그재그 통과', '콘을 건드리면 1초 추가', '슛 실패 시 2초 추가'], measure: 'time', unit: '초', levels: 5, male: [12, 14, 16, 18], female: [14, 16, 18, 20] })],
    skill: '플로어볼 스틱 드리블과 슛', context: '드리블 코스',
  }),
  plan({
    id: 'd-m1-circuit', title: '맞춤형 서킷 트레이닝', level: '중학교', grade: 1, sport: '체력 운동',
    standards: ['9체01-02', '9체01-06', '9체01-13'],
    intent: '자신의 체력을 진단하고 수준에 맞는 서킷 트레이닝을 계획하여 실천할 수 있다.',
    devices: ['스마트워치(심박계)', '크롬북'], apps: ['구글 시트'], digital: '운동 중 심박수 구간을 확인하고 구글 시트 운동 일지에 기록',
    types: ['실기평가', '포트폴리오'], evaluators: ['교사평가', '자기평가'], modes: I,
    contents: ['체력 진단 결과에 따라 6개 동작으로 서킷을 구성한다.', '4주 동안 운동 일지를 작성하고 변화를 분석한다.'],
    scoring: [
      numTable({ title: '1분 버피 테스트', elements: ['1분 동안 바른 자세로 수행한 횟수'], measure: 'count', unit: '회', levels: 5, male: [30, 25, 20, 15], female: [25, 20, 16, 12] }),
      rubric('운동 일지', ['운동 계획의 적절성', '실천의 꾸준함', '변화 분석'], [
        '체력 진단에 근거한 계획을 세우고 꾸준히 실천하며 변화를 구체적으로 분석한다.',
        '적절한 계획을 세우고 실천하며 변화를 분석한다.',
        '계획을 세우고 실천하나 분석이 부족하다.',
        '계획 또는 실천 기록이 부족하다.',
        '운동 일지를 거의 작성하지 않았다.',
      ]),
    ],
    skill: '체력 증진 운동', context: '자신의 체력 수준에 맞는 서킷 트레이닝',
  }),
  plan({
    id: 'd-m2-health', title: '나의 건강 활동 프로젝트', level: '중학교', grade: 2, sport: '건강 활동',
    standards: ['9체01-07', '9체01-08', '9체01-14'],
    intent: '신체 건강 활동의 종류와 특성을 분석하고 자신에게 맞는 활동을 계획·실천할 수 있다.',
    devices: ['크롬북'], apps: ['캔바', '구글 시트'], digital: '건강 활동 실천 기록을 구글 시트로 관리하고 캔바로 결과 포스터 제작',
    types: ['프로젝트', '서술'], evaluators: ['교사평가', '자기평가', '동료평가'], modes: I,
    contents: ['나에게 맞는 신체 건강 활동을 선정하고 3주간 실천한다.', '실천 결과를 포스터로 정리하여 발표한다.'],
    scoring: [rubric('건강 활동 프로젝트', ['활동 선정의 근거', '실천 과정 기록', '결과 정리와 발표'], [
      '자신의 건강 상태를 근거로 활동을 선정하고 꾸준히 실천하며 결과를 설득력 있게 발표한다.',
      '적절한 활동을 선정하여 실천하고 결과를 정리하여 발표한다.',
      '활동을 선정하고 실천하나 기록이 일부 부족하다.',
      '활동 선정 근거와 실천 기록이 부족하다.',
      '프로젝트 수행이 미흡하다.',
    ])],
    skill: '신체 건강 활동', context: '일상생활 속 실천',
  }),
  plan({
    id: 'd-m3-linedance', title: '라인댄스 모둠 창작', level: '중학교', grade: 3, sport: '라인댄스',
    standards: ['9체03-08', '9체03-09'],
    intent: '라인댄스의 표현 원리를 적용하여 모둠 작품을 창작하고 감상할 수 있다.',
    devices: ['태블릿', '블루투스 스피커'], apps: ['키네마스터', '패들렛'], digital: '모둠 작품을 촬영·편집하여 패들렛에 올리고 상호 감상평 작성',
    types: ['실기평가', '프로젝트'], evaluators: ['교사평가', '동료평가'], modes: ['모둠별 수행'],
    contents: ['기본 스텝을 활용하여 32카운트 이상의 모둠 작품을 창작한다.', '다른 모둠의 작품을 표현 요소를 고려하여 감상한다.'],
    scoring: [rubric('모둠 창작 작품', ['기본 스텝의 정확성', '대형 변화와 창의성', '음악과의 조화'], [
      '스텝이 정확하고 대형 변화가 창의적이며 음악과 완벽하게 어울린다.',
      '스텝이 정확하고 대형 변화가 있으며 음악과 잘 어울린다.',
      '기본 스텝을 수행하나 대형 변화가 단조롭다.',
      '스텝이 일부 부정확하고 음악과 맞지 않는 부분이 있다.',
      '작품 구성과 수행이 미흡하다.',
    ])],
    skill: '라인댄스 스텝과 대형', context: '모둠 작품 발표',
  }),
  plan({
    id: 'd-m1-musicrope', title: '음악 줄넘기 작품', level: '중학교', grade: 1, sport: '음악 줄넘기',
    standards: ['9체03-02', '9체03-03'],
    intent: '줄넘기 기술을 음악에 맞추어 심미적으로 표현하는 작품을 구성할 수 있다.',
    devices: ['태블릿'], apps: ['클래스보드'], digital: '연습 영상을 올려 모둠원과 동작 타이밍 비교',
    types: ['실기평가'], evaluators: ['교사평가', '동료평가'], modes: ['모둠별 수행', '개인별 수행'],
    contents: ['줄넘기 기술 6가지 이상을 음악에 맞추어 연결한다.', '모둠 작품의 시작과 끝 동작을 구성한다.'],
    scoring: [rubric('음악 줄넘기 표현', ['기술의 다양성', '음악 박자와의 일치', '동작의 아름다움'], [
      '다양한 기술을 음악에 정확히 맞추어 아름답게 표현한다.',
      '여러 기술을 음악에 맞추어 표현한다.',
      '기본 기술을 음악에 맞추어 수행한다.',
      '음악과 맞지 않는 부분이 많다.',
      '기술 연결이 어렵다.',
    ])],
    skill: '줄넘기 기술의 심미적 표현', context: '음악 줄넘기 작품',
  }),
  plan({
    id: 'd-m2-orienteering', title: '공원 오리엔티어링', level: '중학교', grade: 2, sport: '오리엔티어링',
    standards: ['9체02-23', '9체02-24', '9체02-27'],
    intent: '지도와 나침반을 활용하여 자연환경에서 안전하게 코스를 완주할 수 있다.',
    devices: ['스마트폰', '나침반'], apps: ['구글 지도'], digital: '스마트폰 위치 기록으로 이동 경로를 확인하고 경로 선택을 되돌아보기',
    types: ['실기평가', '토의·토론'], evaluators: ['교사평가', '자기평가'], modes: ['모둠별 수행'],
    contents: ['지도와 나침반으로 10개 지점을 찾아 완주한다.', '경로 선택 과정을 모둠별로 되돌아보고 발표한다.'],
    scoring: [numTable({ title: '코스 완주 시간', elements: ['10개 지점 통과 확인', '지점 누락 시 3분 추가'], measure: 'time', unit: '분', levels: 5, male: [25, 30, 35, 40] })],
    skill: '지도 읽기와 나침반 사용', context: '공원 코스',
  }),
  plan({
    id: 'd-m3-badminton', title: '배드민턴 하이 클리어', level: '중학교', grade: 3, sport: '배드민턴',
    standards: ['9체02-17', '9체02-18'],
    intent: '하이 클리어의 수행 원리를 이해하고 목표 지역으로 정확하게 보낼 수 있다.',
    devices: ['태블릿', '삼각대'], apps: ['Kinovea'], digital: '스윙 동작을 슬로 모션으로 촬영하여 타점 위치 확인',
    types: T, evaluators: P, modes: I,
    contents: ['토스된 셔틀콕을 하이 클리어로 상대 코트 뒤쪽 목표 지역에 보낸다.'],
    scoring: [numTable({ title: '하이 클리어 목표 지역 성공', elements: ['10회 시도', '엔드라인 앞 1.5m 지역에 떨어지면 성공'], measure: 'count', unit: '회', levels: 5, male: [8, 6, 4, 2], female: [7, 5, 3, 2] })],
    skill: '배드민턴 하이 클리어', context: '목표 지역 과제',
  }),
  plan({
    id: 'd-h1-soccer', title: '축구 패스와 경기 전략', level: '고등학교', grade: 1, course: '체육1', sport: '축구',
    standards: ['12체육1-02-02', '12체육1-02-03'],
    intent: '패스의 과학적 원리를 분석하여 기능을 개선하고, 경기 상황에 맞게 전략을 응용할 수 있다.',
    devices: ['태블릿', 'GPS 조끼'], apps: ['구글 시트'], digital: 'GPS 조끼로 경기 중 이동 거리와 위치를 기록하여 전략 수행 분석',
    types: ['실기평가', '서술'], evaluators: ['교사평가', '자기평가'], modes: ['모둠별 수행', '개인별 수행'],
    contents: ['10m 거리 인사이드 패스를 목표 게이트로 정확하게 보낸다.', '경기 분석 보고서를 작성한다.'],
    scoring: [
      numTable({ title: '인사이드 패스 정확도', elements: ['10회 중 게이트(폭 1m) 통과 횟수'], measure: 'count', unit: '회', levels: 3, male: [8, 5], female: [7, 4] }),
      rubric('경기 분석 보고서', ['이동 데이터 해석', '전략 개선 방안'], [
        '데이터를 근거로 팀 전략의 문제를 분석하고 구체적인 개선 방안을 제시한다.',
        '데이터를 활용해 전략을 분석하나 개선 방안이 일반적이다.',
        '분석과 개선 방안이 부족하다.',
      ]),
    ],
    skill: '축구 패스', context: '경기 상황',
  }),
  plan({
    id: 'd-h2-highjump', title: '높이뛰기 배면뛰기', level: '고등학교', grade: 2, course: '체육2', sport: '육상(높이뛰기)',
    standards: ['12체육2-02-02', '12체육2-02-03'],
    intent: '배면뛰기의 과학적 원리를 분석하여 자신의 기록을 향상할 수 있다.',
    devices: ['태블릿', '삼각대'], apps: ['Kinovea'], digital: '도움닫기 곡선과 발구르기 각도를 영상 분석',
    types: ['실기평가', '서술'], evaluators: ['교사평가', '자기평가'], modes: I,
    contents: ['배면뛰기로 높이뛰기 기록을 측정한다.', '영상 분석 결과를 근거로 자신의 동작을 서술한다.'],
    scoring: [numTable({ title: '높이뛰기 기록', elements: ['높이별 3회 시기', '최고 성공 높이 반영'], measure: 'distance', unit: 'cm', levels: 3, male: [140, 120], female: [115, 100] })],
    skill: '배면뛰기의 도움닫기와 발구르기', context: '기록 측정 상황',
  }),
  plan({
    id: 'd-h2-training', title: '트레이닝 프로그램 설계', level: '고등학교', grade: 2, course: '운동과 건강', sport: '크로스핏',
    standards: ['12운건02-01'],
    intent: '운동 처방 원리에 따라 트레이닝 프로그램을 계획하고 실천할 수 있다.',
    devices: ['크롬북', '스마트워치(심박계)'], apps: ['구글 시트'], digital: '운동 강도(심박수)와 실천 기록을 시트로 관리',
    types: ['프로젝트', '포트폴리오'], evaluators: ['교사평가', '자기평가'], modes: I,
    contents: ['FITT 원리에 따라 6주 트레이닝 프로그램을 설계한다.', '실천 기록과 체력 변화를 분석하여 보고서를 작성한다.'],
    scoring: [rubric('트레이닝 프로그램 보고서', ['FITT 원리 적용', '실천의 꾸준함', '변화 분석과 수정'], [
      'FITT 원리를 정확히 적용하고 꾸준히 실천하며 결과에 따라 프로그램을 수정한다.',
      '원리를 적용하여 실천하나 분석과 수정이 부분적이다.',
      '프로그램 설계와 실천이 미흡하다.',
    ])],
    skill: '트레이닝 원리', context: '자기 주도적 체력 관리',
  }),
  plan({
    id: 'd-h3-pickleball', title: '피클볼 서브와 랠리', level: '고등학교', grade: 3, course: '스포츠 생활2', sport: '피클볼',
    standards: ['12스생2-01-02', '12스생2-01-03'],
    intent: '피클볼 기능을 과학적으로 분석하여 발전시키고 창의적인 경기 전략을 발휘할 수 있다.',
    devices: ['태블릿'], apps: ['패들렛'], digital: '복식 경기 영상을 올리고 전략 장면에 댓글로 분석 남기기',
    types: ['실기평가', '토의·토론'], evaluators: ['교사평가', '동료평가'], modes: ['모둠별 수행', '개인별 수행'],
    contents: ['대각선 서브를 목표 지역에 넣는다.', '딩크 랠리를 연속으로 이어간다.'],
    scoring: [
      numTable({ title: '서브 성공', elements: ['10회 중 대각선 서비스 코트 성공 횟수'], measure: 'count', unit: '회', levels: 3, male: [8, 5] }),
      numTable({ title: '딩크 연속 랠리', elements: ['2인 1조, 키친 라인 안쪽', '연속 성공 횟수'], measure: 'count', unit: '회', levels: 3, male: [20, 10] }),
    ],
    skill: '피클볼 서브와 딩크', context: '복식 경기',
  }),
  plan({
    id: 'd-h1-climbing', title: '스포츠클라이밍 볼더링', level: '고등학교', grade: 1, course: '스포츠 생활1', sport: '스포츠클라이밍',
    standards: ['12스생1-02-02', '12스생1-02-03'],
    intent: '볼더링 기술을 분석하여 발전시키고 루트에 맞는 전략을 세워 완등할 수 있다.',
    devices: ['태블릿'], apps: ['Kinovea'], digital: '등반 영상을 분석하여 무게 중심 이동 경로 확인',
    types: ['실기평가', '포트폴리오'], evaluators: ['교사평가', '자기평가'], modes: I,
    contents: ['난이도별 루트 중 선택하여 완등을 시도한다.', '루트 분석과 등반 전략을 기록한다.'],
    scoring: [numTable({ title: '완등 루트 점수', elements: ['루트 난이도별 점수(1~5점) 합산', '3회 시도'], measure: 'score', unit: '점', levels: 3, male: [10, 6], female: [9, 5] })],
    skill: '볼더링 홀드 잡기와 무게 중심 이동', context: '루트 등반',
  }),
  plan({
    id: 'd-h2-dance', title: '창작 댄스 작품 비평', level: '고등학교', grade: 2, course: '체육2', sport: '창작 댄스',
    standards: ['12체육2-03-02', '12체육2-03-03'],
    intent: '표현 활동의 미적 원리를 적용하여 주제가 있는 작품을 창작하고 감상·비평할 수 있다.',
    devices: ['태블릿', '빔프로젝터'], apps: ['키네마스터', '구글 클래스룸'], digital: '작품 영상을 편집해 제출하고 상호 비평문을 클래스룸에 작성',
    types: ['실기평가', '논술'], evaluators: ['교사평가', '동료평가'], modes: ['모둠별 수행', '개인별 수행'],
    contents: ['주제를 정하여 모둠 창작 댄스를 발표한다.', '다른 모둠 작품에 대한 비평문을 작성한다.'],
    scoring: [
      rubric('창작 작품 발표', ['주제 표현', '동작의 미적 구성', '모둠 협력'], [
        '주제가 동작으로 분명히 드러나며 구성이 독창적이고 완성도가 높다.',
        '주제를 표현하나 구성의 독창성이 부족하다.',
        '주제 표현과 구성이 미흡하다.',
      ]),
      rubric('작품 비평문', ['표현 요소에 근거한 감상', '비평의 구체성'], [
        '표현 요소를 근거로 작품을 구체적이고 균형 있게 비평한다.',
        '표현 요소를 언급하나 비평이 일반적이다.',
        '감상 위주로 서술한다.',
      ]),
    ],
    skill: '표현 활동의 미적 원리', context: '창작 작품 발표',
  }),

  // ---------- 대표 종목 추가분 (인터넷에 공개된 평가 사례의 방식·수치를 참고해 새로 작성) ----------
  plan({
    id: 'd-m2-soccer-lifting', title: '축구 리프팅과 종합 기술', level: '중학교', grade: 2, sport: '축구',
    standards: ['9체02-11', '9체02-12'],
    intent: '공 다루기의 수행 원리를 이해하고 패스·드리블·슛을 연결하여 정해진 시간 안에 수행할 수 있다.',
    devices: ['갤럭시 탭'], apps: ['훈코치'], digital: '모션 인식 타이머로 종합 기술 코스 통과 시간을 측정하고 개인 기록을 누적',
    types: T, evaluators: ['교사평가', '자기평가'], modes: I,
    contents: ['정해진 구역 안에서 원바운드 리프팅을 연속으로 수행한다.', '패스-드리블-슛을 연결한 코스를 빠르고 정확하게 통과한다.', '발등을 이용한 바른 자세로 기능을 수행한다.'],
    scoring: [
      numTable({ title: '원바운드 리프팅', elements: ['지름 3m 원 안에서 실시', '원 밖으로 나가면 그 동안의 횟수는 세지 않음', '2회 측정 중 좋은 기록 반영'], measure: 'count', unit: '개', levels: 5, male: [20, 17, 14, 11], female: [10, 8, 6, 4] }),
      numTable({ title: '패스·드리블·슛 종합 기술', elements: ['벽 패스 → 콘 지그재그 드리블 → 슛 순서로 수행', '콘을 쓰러뜨리면 1초씩 더함', '슛이 골대 밖으로 나가면 다시 슛'], measure: 'time', unit: '초', levels: 5, male: [19, 21, 23, 25], female: [25, 27, 29, 31] }),
      rubric('기능 수행 자세', ['발등으로 공을 다루는가', '패스·드리블·슛의 기본 자세'], [
        '발등으로 공을 안정적으로 다루며 모든 기능을 바른 자세로 연결한다.',
        '발등으로 공을 다루고 대부분의 기능을 바른 자세로 수행한다.',
        '기본 자세로 기능을 수행하나 공 다루기가 불안정하다.',
        '일부 기능에서 자세가 무너져 도움이 필요하다.',
        '기본 자세로 공을 다루기 어렵다.',
      ]),
    ],
    skill: '축구 리프팅과 패스·드리블·슛', context: '종합 기술 코스',
    explanation: '코스: 출발선 → 5m 앞 벽에 패스 2회 → 콘 5개 지그재그 드리블 → 페널티 지역 밖에서 슛. 골이 들어가는 순간 타이머를 멈춘다.',
  }),
  plan({
    id: 'd-h1-soccer-selfcheck', title: '축구 경기 기능 진단과 연습 계획', level: '고등학교', grade: 1, course: '체육1', sport: '축구',
    standards: ['12체육1-02-02', '12체육1-02-03'],
    intent: '경기 중 자신의 기능 수준을 진단하고, 약점을 보완하는 연습 계획을 세워 실천할 수 있다.',
    devices: ['태블릿'], apps: ['구글 설문지', '구글 시트'], digital: '경기 후 자기·동료 체크리스트를 구글 설문지로 입력하고 시트로 패스·드리블 성공률 확인',
    types: ['실기평가', '포트폴리오'], evaluators: ['교사평가', '자기평가', '동료평가'], modes: ['모둠별 수행', '개인별 수행'],
    contents: ['경기 영상과 체크리스트로 위치 선정·트래핑·패스·드리블 수준을 진단한다.', '운동 강도·빈도·시간·기간을 고려한 보완 연습 계획을 세우고 발표한다.'],
    scoring: [
      rubric('경기 기능 (자기·동료 평가)', ['위치 선정: 포지션에 맞는 이동', '트래핑: 받은 공을 발 가까이 멈추기', '패스·드리블: 경기 중 성공률'], [
        '포지션에 맞게 능숙하게 움직이며 패스·드리블 성공률이 80% 이상이다.',
        '필요한 위치로 이동하며 패스·드리블 성공률이 50~80%이다.',
        '공이 없을 때의 움직임이 부족하고 성공률이 50% 이하이다.',
      ]),
      rubric('보완 연습 계획', ['진단 결과와 계획의 연결', '강도·빈도·시간·기간의 구체성', '발표와 피드백 반영'], [
        '진단 결과에 근거해 구체적인 계획을 세우고 피드백을 반영해 수정한다.',
        '진단 결과에 맞는 계획을 세우나 일부 요소가 구체적이지 않다.',
        '계획이 진단 결과와 연결되지 않거나 요소가 빠져 있다.',
      ]),
    ],
    skill: '축구 경기 기능', context: '실제 경기 상황',
  }),
  plan({
    id: 'd-h1-volley-record', title: '배구 기본 기능 기록과 활동 일지', level: '고등학교', grade: 1, course: '체육1', sport: '배구',
    standards: ['12체육1-02-01', '12체육1-02-02'],
    intent: '배구 기본 기능에 담긴 과학적 원리를 이해하고, 기록을 바탕으로 자신의 기능을 점검·개선할 수 있다.',
    devices: ['태블릿'], apps: ['구글 클래스룸'], digital: '개인 기록지와 활동 일지를 클래스룸에 제출하고 교사 피드백 받기',
    types: ['실기평가', '서술', '포트폴리오'], evaluators: ['교사평가', '자기평가'], modes: I,
    contents: ['언더핸드 서브, 언더핸드 패스, 오버핸드 패스를 각각 10회 시도해 정확하게 간 횟수를 기록한다.', '언더핸드 패스에 적용되는 반사의 원리를 설명한다.', '기록을 보고 활동 일지를 작성한다.'],
    scoring: [
      numTable({ title: '언더핸드 서브', elements: ['어택 라인에서 시작, 성공하면 엔드 라인으로 이동', '10회 중 상대 코트 안에 들어간 횟수'], measure: 'count', unit: '회', levels: 3, male: [8, 5], female: [7, 4] }),
      numTable({ title: '언더핸드·오버핸드 패스', elements: ['2인 1조, 던져 준 공을 짝에게 패스', '두 패스 각 10회 중 짝에게 정확히 간 횟수의 합'], measure: 'count', unit: '회', levels: 3, male: [15, 9] }),
      rubric('과학적 원리 서술과 활동 일지', ['입사각·반사각과 팔 각도의 관계 설명', '기록에 근거한 성찰'], [
        '팔 각도와 공의 방향 관계를 정확히 설명하고 기록에 근거해 구체적으로 성찰한다.',
        '원리를 대체로 설명하고 기록을 보며 성찰한다.',
        '원리 설명과 성찰이 부족하다.',
      ]),
    ],
    skill: '배구 서브와 패스', context: '기록 과제',
    explanation: '기능이 익숙하지 않은 학생은 배드민턴 코트와 소프트 발리볼로 연습 공간과 공을 바꾸어 성공 경험을 먼저 갖게 한다.',
  }),
  plan({
    id: 'd-m2-volley-overhand', title: '배구 오버핸드 패스와 서브', level: '중학교', grade: 2, sport: '배구',
    standards: ['9체02-17', '9체02-18'],
    intent: '오버핸드 패스와 언더핸드 서브의 수행 원리를 적용하여 경기 기능을 향상할 수 있다.',
    devices: ['태블릿', '삼각대'], apps: ['패들렛'], digital: '패스 동작을 촬영해 패들렛에 올리고 친구와 관절 반동 사용을 비교',
    types: T, evaluators: ['교사평가', '동료평가'], modes: ['개인별 수행'],
    contents: ['2인 1조로 마주 보고 오버핸드 패스를 연속으로 주고받는다.', '언더핸드 서브를 상대 코트 안에 넣는다.'],
    scoring: [
      numTable({ title: '오버핸드 연속 패스(2인 1조)', elements: ['3m 거리에서 마주 보고 실시', '머리 위에서 손가락으로 밀어낸 패스만 인정'], measure: 'count', unit: '회', levels: 5, male: [20, 15, 10, 6], female: [16, 12, 8, 5] }),
      numTable({ title: '언더핸드 서브', elements: ['엔드 라인 뒤에서 10회', '상대 코트 안에 떨어진 횟수'], measure: 'count', unit: '회', levels: 5, male: [8, 6, 4, 2], female: [7, 5, 3, 2] }),
    ],
    skill: '배구 오버핸드 패스와 서브', context: '연속 패스와 서브 과제',
  }),
  plan({
    id: 'd-m1-baseball', title: '야구 캐치볼과 티 배팅', level: '중학교', grade: 1, sport: '야구',
    standards: ['9체02-14', '9체02-15'],
    intent: '던지기·받기와 타격의 수행 원리를 이해하고 필드형 경기에서 활용할 수 있다.',
    devices: ['태블릿'], apps: ['Kinovea'], digital: '타격 동작을 느린 화면으로 촬영해 체중 이동과 배트 궤적을 분석',
    types: ['실기평가'], evaluators: ['교사평가', '동료평가'], modes: ['개인별 수행', '모둠별 수행'],
    contents: ['2인 1조로 일정 거리에서 캐치볼을 주고받는다.', '배팅 티에 놓인 공을 4회 타격해 가장 멀리 간 거리를 잰다.', '경기 중 동료를 배려하고 규칙을 지킨다.'],
    scoring: [
      numTable({ title: '캐치볼 (15m)', elements: ['10회 던지기 중 짝이 제자리에서 잡은 횟수', '글러브 착용, 소프트볼 사용'], measure: 'count', unit: '회', levels: 5, male: [9, 7, 5, 3], female: [8, 6, 4, 2] }),
      numTable({ title: '티 배팅 비거리', elements: ['4회 타격 중 최고 기록', '파울 지역은 기록하지 않음'], measure: 'distance', unit: 'm', levels: 5, male: [35, 28, 21, 14], female: [25, 20, 15, 10] }),
      rubric('경기 태도(배려)', ['동료 격려와 배려', '규칙 준수'], [
        '동료를 적극적으로 격려·배려하고 규칙을 스스로 지키며 모범을 보인다.',
        '동료를 배려하고 규칙을 지킨다.',
        '대체로 규칙을 지키나 동료 배려가 부족할 때가 있다.',
        '규칙을 지키는 데 교사의 지도가 필요하다.',
        '경기 태도가 미흡하다.',
      ]),
    ],
    skill: '야구 던지기·받기와 타격', context: '캐치볼과 티 배팅',
  }),
  plan({
    id: 'd-e5-kickball', title: '발야구 킥과 주루 판단', level: '초등학교', grade: 5, sport: '발야구',
    standards: ['6체02-05', '6체02-06'],
    intent: '필드형 게임에서 공을 정확하게 차고, 상황에 맞게 진루를 판단할 수 있다.',
    devices: ['태블릿'], apps: ['띵커벨'], digital: '주자 상황 퀴즈로 진루 판단을 미리 연습하고 게임에 적용',
    types: ['실기평가', '구술'], evaluators: ['교사평가', '자기평가'], modes: ['모둠별 수행', '개인별 수행'],
    contents: ['굴러오는 공을 차서 페어 지역 안으로 보낸다.', '주자 상황을 보고 진루 여부를 판단한다.'],
    scoring: [
      numTable({ title: '킥 성공', elements: ['5회 중 페어 지역 안으로 보낸 횟수'], measure: 'count', unit: '회', levels: 3, male: [4, 2] }),
      rubric('주루 판단', ['타구 방향을 보고 진루 결정', '판단 이유 말하기'], [
        '타구와 수비 위치를 보고 진루를 알맞게 판단하고 이유를 설명한다.',
        '대체로 알맞게 판단하나 이유 설명이 부족하다.',
        '진루 판단에 도움이 필요하다.',
      ]),
    ],
    skill: '발야구 킥과 주루', context: '간이 게임',
  }),
  plan({
    id: 'd-e6-soccer-pass', title: '축구형 게임 패스와 공간 이동', level: '초등학교', grade: 6, sport: '축구',
    standards: ['6체02-05', '6체02-06', '6체02-11'],
    intent: '인사이드 패스를 정확하게 하고, 빈 공간으로 움직여 패스를 받을 수 있다.',
    devices: ['크롬북'], apps: ['패들렛'], digital: '모둠 게임 장면을 촬영해 빈 공간으로 움직인 장면을 찾아 패들렛에 공유',
    types: ['실기평가'], evaluators: ['교사평가', '동료평가'], modes: ['모둠별 수행', '개인별 수행'],
    contents: ['5m 떨어진 콘 게이트 사이로 인사이드 패스를 보낸다.', '3:2 게임에서 빈 공간으로 이동해 패스를 받는다.'],
    scoring: [
      numTable({ title: '게이트 패스', elements: ['폭 1m 게이트, 10회 시도', '게이트를 통과한 횟수'], measure: 'count', unit: '회', levels: 3, male: [7, 4] }),
      rubric('공간 이동', ['공이 없을 때 빈 공간 찾기', '팀원과 협력'], [
        '빈 공간을 스스로 찾아 움직이며 팀원과 패스를 주고받는다.',
        '안내를 받아 빈 공간으로 움직인다.',
        '공을 따라다니며 공간 이동이 어렵다.',
      ]),
    ],
    skill: '인사이드 패스와 공간 이동', context: '3:2 게임',
  }),
  plan({
    id: 'd-m3-layup', title: '농구 왕복 레이업슛', level: '중학교', grade: 3, sport: '농구',
    standards: ['9체02-11', '9체02-12'],
    intent: '드리블에서 레이업슛으로 이어지는 동작의 원리를 적용해 빠르고 정확하게 득점할 수 있다.',
    devices: ['갤럭시 탭'], apps: ['훈코치'], digital: '모션 인식 카운터로 1분 동안 성공한 레이업슛 수를 세고 기록 그래프 확인',
    types: T, evaluators: P, modes: I,
    contents: ['1분 동안 양쪽 골대를 오가며 레이업슛을 한다.', '스텝(하나-둘)과 백보드 활용을 바르게 수행한다.'],
    scoring: [
      numTable({ title: '1분 왕복 레이업슛', elements: ['하프 코트 왕복, 성공한 슛만 셈', '트래블링은 성공으로 치지 않음'], measure: 'count', unit: '개', levels: 5, male: [12, 10, 8, 6], female: [10, 8, 6, 4] }),
      rubric('레이업 동작', ['두 걸음 스텝', '반대발 도약과 백보드 조준'], [
        '스텝과 도약이 자연스럽고 백보드를 정확히 활용한다.',
        '스텝과 도약을 바르게 하나 조준이 가끔 흔들린다.',
        '스텝은 맞으나 도약 발이 자주 바뀐다.',
        '스텝 순서를 자주 놓친다.',
        '레이업 동작 연결이 어렵다.',
      ]),
    ],
    skill: '농구 드리블과 레이업슛', context: '1분 왕복 과제',
  }),
  plan({
    id: 'd-m2-handball', title: '핸드볼 스텝 슛', level: '중학교', grade: 2, sport: '핸드볼',
    standards: ['9체02-11', '9체02-12'],
    intent: '3스텝 후 점프 슛의 수행 원리를 적용하여 목표 구역에 정확하게 슛할 수 있다.',
    devices: ['태블릿'], apps: ['Kinovea'], digital: '점프 슛 동작을 촬영해 팔 휘두르기 각도 확인',
    types: T, evaluators: ['교사평가', '자기평가'], modes: I,
    contents: ['9m 라인에서 3스텝 후 점프 슛을 한다.', '골대 네 모서리 표적 구역을 노린다.'],
    scoring: [numTable({ title: '표적 구역 슛', elements: ['10회 시도', '골대 모서리 표적(60×60cm)에 들어간 횟수'], measure: 'count', unit: '회', levels: 5, male: [7, 5, 4, 2], female: [6, 4, 3, 1] })],
    skill: '핸드볼 스텝 슛', context: '표적 구역 슛',
  }),
  plan({
    id: 'd-h2-baseball-analysis', title: '야구 경기 기록 분석 프로젝트', level: '고등학교', grade: 2, course: '스포츠 생활2', sport: '야구',
    standards: ['12스생2-02-02', '12스생2-02-03'],
    intent: '필드형 경기 기록을 분석해 타격·수비 기능을 개선하고, 경기 전략을 창의적으로 세울 수 있다.',
    devices: ['크롬북', '태블릿'], apps: ['구글 시트', '캔바'], digital: '학급 리그 기록(타율, 출루율, 실책)을 시트로 정리해 그래프를 만들고 전략 보고서 발표',
    types: ['프로젝트', '실기평가'], evaluators: ['교사평가', '동료평가'], modes: ['모둠별 수행'],
    contents: ['학급 리그 경기 기록을 모둠별로 정리하고 분석한다.', '분석 결과에 근거한 타순·수비 전략을 세워 다음 경기에 적용한다.'],
    scoring: [rubric('기록 분석과 전략 보고서', ['기록 정리의 정확성', '분석에 근거한 전략', '경기 적용과 되돌아보기'], [
      '기록을 정확히 정리하고 근거 있는 전략을 세워 경기에 적용한 결과까지 분석한다.',
      '기록을 정리하고 전략을 세우나 근거나 적용 분석이 부분적이다.',
      '기록 정리나 전략 수립이 미흡하다.',
    ])],
    skill: '필드형 경기 기록 분석', context: '학급 리그 경기',
  }),
];

const all = [sample, ...dummies];

// 이미 실제 제출본(dummy/sample 이 아닌 것)이 들어 있으면 지우지 않고 유지한다
let real: EvalPlan[] = [];
if (existsSync(OUT)) {
  try {
    real = (JSON.parse(readFileSync(OUT, 'utf-8')) as EvalPlan[]).filter((p) => !p.dummy && !p.sample);
  } catch {
    real = [];
  }
}
writeFileSync(OUT, JSON.stringify([...real, ...all], null, 1), 'utf-8');
console.log(`plans.json: 실제 ${real.length}건 + 예시 1건 + 더미 ${dummies.length}건`);
