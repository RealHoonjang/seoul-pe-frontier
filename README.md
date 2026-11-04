# 체육 평가계획 나눔터

2022 개정 체육과 교육과정에 맞춘 수행평가 계획서를 **검색 → 양식 그대로 미리보기 → 내려받기** 하는 웹 프로그램입니다.
서버 없이 정적 파일만으로 동작하므로 GitHub Pages, Netlify 같은 무료 호스팅에 올릴 수 있습니다.

## 할 수 있는 일

| 기능 | 내용 |
|---|---|
| 검색 축 | 교육과정(학교급·학년·영역·세부 유형·고교 과목·성취기준), 종목, 평가(유형·주체·방식·측정 방식), 에듀테크(기기·앱), 낱말 검색 |
| 미리보기 | 연구회 평가계획서 양식을 웹에서 그대로 그림 (검색어 노란색 표시) |
| 내려받기 | 한글(HWPX, 연구회 양식 틀 사용) · 원본 HWP/PDF · PDF로 저장(인쇄) · 채점기준·기록지 엑셀(성취수준 자동 판정) · 여러 건 ZIP |
| 부가 기능 | 성취기준 원문·해설 화면과 그 성취기준을 쓴 계획서 목록 · 남녀 기준 비교 그래프 · 비슷한 계획서 · 내 학교용으로 가져오기(고쳐서 내려받기) |

## 실행

```bash
npm install
npm run dev      # http://localhost:5180
npm run build    # dist/ 폴더를 호스팅에 올리면 끝
```

## 폴더

```
public/data/plans.json       계획서 데이터 (EvalPlan 배열, 구조는 src/types.ts)
public/data/standards.json   2022 개정 체육과 성취기준 148개 + 해설
public/template/plan-template.hwpx   HWPX를 만들 때 쓰는 연구회 양식 틀
public/files/                원본 파일(HWP, PDF), 평가 설명 그림
tools/import_plan.py         제출본(HWP/HWPX) → plans.json
tools/hwp_convert.ps1        한글 자동화로 HWP ↔ HWPX/PDF 변환
tools/build_standards.py     교육과정 문서 → standards.json
tools/make_template.py       양식 HWPX → 빈 틀
tools/make_og_image.py       공유 미리보기 그림 만들기
public/og-image.png          공유 미리보기 그림 (1200×630)
.env.production              배포 주소 (공유 미리보기 그림 주소에 쓰임)
scripts/make-dummy.ts        더미 데이터 만들기 (npm run dummy)
scripts/test-hwpx.ts         HWPX 생성 점검 (npm run test:hwpx -- 출력폴더)
```

## 배포 전 설정 (`.env.production`)

| 설정 | 하는 일 |
|---|---|
| `VITE_SITE_URL` | 배포 주소(예: `https://아이디.github.io/frontier`). 카카오톡 공유 미리보기에 그림이 나오려면 필요 |

값을 바꾸면 `npm run build`를 다시 하고 `dist/`를 올립니다.

### 카카오톡 공유 미리보기
- 그림: `public/og-image.png` (1200×630). 문구를 바꾸려면 `tools/make_og_image.py`를 고쳐 `python tools/make_og_image.py`
- 제목·설명: `vite.config.ts`의 `TITLE`, `DESC`
- 카카오톡은 미리보기를 한동안 저장해 둡니다. 바꾼 내용이 안 보이면 [카카오 공유 디버거](https://developers.kakao.com/tool/debugger/sharing)에서 주소를 넣고 '캐시 초기화'를 누르세요.
- 주소의 `#/plan/…` 부분은 서버로 가지 않으므로, 어떤 계획서 링크를 공유해도 미리보기는 사이트 공통 카드로 나옵니다.

## 제출본 넣기

1. 제출 파일 이름을 `평가계획(학교 이름).hwp` 형태로 맞추면 작성자가 자동으로 들어갑니다.
2. 한글 창을 모두 닫은 뒤 실행합니다(한글이 설치된 Windows PC 필요, HWPX 파일은 한글 없이도 읽음).

```bash
python tools/import_plan.py 제출폴더 --office 강서양천
```

3. 마지막에 나오는 **확인 필요** 목록(종목을 못 찾음 등)을 보고 `public/data/plans.json`을 고칩니다.
4. 더미 자료 지우기: `python tools/import_plan.py --remove-dummy`
5. `npm run build` 후 `dist/`를 다시 올립니다.

> 같은 파일을 다시 넣으면 같은 항목을 덮어씁니다(파일 이름으로 구분).
