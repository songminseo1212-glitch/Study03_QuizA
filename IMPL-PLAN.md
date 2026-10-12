# 상식 퀴즈 웹 앱 구현 계획서

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in the current session. Do not use subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **실행 방식:** 사람이 고른 방식은 "이 세션에서 직접 실행"이다. 단계 하나를 마치면 멈추고 사람의 확인을 기다린다. 다음 단계는 사람이 시작하라고 할 때만 진행한다.

**Goal:** PRD.md의 4지선다 상식 퀴즈 앱을 3단계로 나눠 만든다. 1단계는 연습 모드와 점수, 2단계는 스피드 모드·힌트 모드·틀린 문제 다시 풀기, 3단계는 점수 저장과 순위표다.

**Architecture:** `index.html`에 화면 `<section>`을 모두 두고 하나만 보인다. `script.js`는 모드 설정 표 `MODES`, 상태 객체 하나, DOM과 무관한 규칙 함수, 렌더 함수, 이벤트 처리로 나뉜다. 규칙 함수는 `script.js` 안의 자체 점검(`check(...)` 목록)으로 확인한다. 이 점검은 Node 명령 한 줄로도, 브라우저 주소 끝 `?test`로도 실행된다.

**Tech Stack:** HTML, CSS, 바닐라 JavaScript(일반 `<script>`, ES 모듈 아님), 점검 실행용 Node.js. 라이브러리 없음.

**Spec:** `PRD.md`. 실행자는 이 계획서와 PRD.md를 함께 읽는다. 화면 문구와 규칙의 정확한 값은 PRD.md를 따른다.

## 전역 제약

- 앱 파일은 `index.html`, `style.css`, `script.js`, `questions.js` 4개뿐이다. 테스트 파일, 빌드 도구, 라이브러리, CDN을 추가하지 않는다(PRD 2절).
- `index.html`은 `<script src="questions.js"></script>`, `<script src="script.js"></script>` 순서로 불러온다. `type="module"`을 쓰지 않는다.
- `questions.js`에는 전역 상수 `CATEGORIES`와 `QUESTIONS`만 둔다(PRD 4.1).
- 모드별 차이는 `MODES` 표에서만 읽는다. 모드 이름으로 분기하는 `if (mode === "speed")` 같은 코드를 렌더 밖에 흩뿌리지 않는다(PRD 5.2).
- 화면 문구는 한국어이며 PRD 3절의 문구를 그대로 쓴다. 예: "연습 모드 · 순위표에 기록되지 않음", "시간 초과", "모두 맞혔습니다".
- `file://`로 열어도, GitHub Pages(https)로 열어도 동작해야 한다.
- **점검 명령**(작업 폴더에서 실행):
  ```bash
  node -e "const fs=require('fs');const src=fs.readFileSync('questions.js','utf8')+'\n'+fs.readFileSync('script.js','utf8')+'\n;runSelfTests();';const r=eval(src);process.exitCode=r.fail?1:0"
  ```
  통과 기준은 마지막 줄 `자체 점검 결과: 통과 N, 실패 0`과 종료 코드 0이다.
- **커밋 규칙:** 태스크마다 점검 명령이 기대한 결과로 끝난 뒤, 그 태스크에서 바꾼 파일만 커밋한다. 메시지는 `feat: <태스크 이름>` 형식이다.
- **브랜치 규칙:** 단계마다 master에서 `stage-1`, `stage-2`, `stage-3` 브랜치를 만들어 그 브랜치에 커밋한다. master에서 바로 구현하지 않는다. 사람이 브라우저 확인을 마친 뒤에만 master에 병합한다.
- **단계 경계:** 각 단계의 마지막 태스크를 마치면 **멈추고**, 그 단계의 "브라우저에서 직접 확인할 항목"을 사람에게 알린다. 사람이 다음 단계를 시작하라고 할 때까지 다음 단계를 시작하지 않는다.
- 계획과 다르게 정해야 할 일이 생기면, 혼자 정하지 말고 먼저 사람에게 묻는다.

## 리뷰 초점

어느 태스크의 테스트도 직접 다루지 않지만 사용자를 괴롭히기 쉬운 경우들이다. 각 줄의 테스트는 담당 태스크에 넣었다.

1. 답을 고른 직후 시간 초과가 나거나 같은 보기를 두 번 누르면, 그 문항은 한 번만 채점되어야 한다 → Task 3, Task 7
2. [다음]이나 [같은 카테고리 다시]를 여러 번 누른 뒤에도 타이머는 하나만 돌아야 한다(1초에 1씩 줄어듦) → Task 7
3. 힌트로 지운 보기를 누르면 아무 일도 없어야 한다 → Task 8
4. `localStorage`가 막혔거나 저장값이 깨져 있어도 게임은 끝까지 진행되고 순위표는 비어 보이거나 안내 문구를 보여야 한다 → Task 10
5. 다시 풀기를 해도 처음 판 점수는 바뀌지 않고, 다 맞히면 버튼이 사라져야 한다 → Task 9

## 파일 구조

| 파일 | 책임 |
|---|---|
| `index.html` | 화면 `<section>`: `#screen-category`, `#screen-mode`(2단계), `#screen-quiz`, `#screen-result`, `#screen-board`(3단계) |
| `style.css` | 레이아웃, 보기 버튼 상태(`.correct`, `.wrong`, `.removed`), 타이머, 폭 320px 이상 대응 |
| `questions.js` | `CATEGORIES`, `QUESTIONS` 데이터 |
| `script.js` | 위에서부터 차례로 ① 자체 점검 틀, ② `MODES`와 규칙 함수, ③ 게임 상태 함수, ④ 저장 함수, ⑤ 렌더와 이벤트, ⑥ 점검 목록(`check(...)`), ⑦ 브라우저 시작 코드 |

`script.js`의 끝은 다음 꼴로 둔다. Node에서는 DOM 코드가 실행되지 않는다.

```js
if (typeof document !== "undefined") {
  init();
  if (new URLSearchParams(location.search).has("test")) runSelfTests();
}
```

DOM 요소 id (태스크끼리 같은 이름을 쓴다)

| 화면 | 요소 |
|---|---|
| 카테고리 | `#category-notice`, `#category-list`(카테고리 버튼), `#btn-board`(3단계) |
| 모드 | `#mode-title`, `#mode-list`(모드 버튼), `#btn-mode-back` |
| 퀴즈 | `#quiz-meta`, `#quiz-progress`, `#quiz-score`, `#quiz-timer`, `#quiz-question`, `#quiz-choices`(`button.choice[data-index]`), `#btn-hint`, `#quiz-feedback`, `#feedback-verdict`, `#feedback-explanation`, `#feedback-source`, `#btn-next`, `#btn-quit` |
| 결과 | `#result-title`, `#result-score`, `#result-count`, `#result-note`, `#result-rank`(3단계), `#btn-retry`, `#btn-again`, `#btn-home` |
| 순위표 | `#board-tables`, `#board-notice`, `#btn-board-back` |

---

# 1단계: 연습 모드와 점수

**만들 것:** 카테고리 선택(시작) 화면, 연습 모드 퀴즈, 해설·출처 표시, 결과 화면, 40문항, 데이터 자체 점검, 자체 점검 틀
**시작:** master에서 `stage-1` 브랜치를 만든다.

### Task 1: 뼈대와 자체 점검 틀

**Files:**
- Create: `index.html`, `style.css`, `script.js`, `questions.js`

**Interfaces:**
- Produces:
  - `check(name: string, fn: () => void)`: 점검 항목을 등록한다.
  - `assertEqual(actual, expected, label: string)`: 다르면 `Error`를 던진다. 배열과 객체는 `JSON.stringify`로 비교한다.
  - `runSelfTests(): { pass: number, fail: number }`: 항목마다 `console.log("통과: " + name)` 또는 `console.error("실패: " + name + " - " + message)`를 찍고, 마지막에 `자체 점검 결과: 통과 N, 실패 M`을 찍는다.
  - `seededRandom(seed: number): () => number`: 같은 seed면 같은 수열을 내는 [0,1) 난수 함수(mulberry32).
  - `shuffle(list: any[], random: () => number): any[]`: 원본을 바꾸지 않고 섞은 새 배열을 돌려준다(Fisher–Yates).
  - `formatScore(score: number): string`
  - `MODES`: 이 단계에서는 `practice`만 둔다. `{ name: "연습", timeLimit: null, hint: false, correctPoint: 1, hintPoint: null, ranked: false, retry: true }`
  - `scoreAnswer(modeKey: string, isCorrect: boolean, usedHint: boolean): number`
- `questions.js`: PRD 4.1의 `CATEGORIES` 4개 전부와 `QUESTIONS = []`. 문항은 Task 2에서 채운다.

- [ ] **Step 1: 점검 항목을 먼저 쓴다**

```js
check("shuffle은 원소를 보존하고 원본을 바꾸지 않는다", () => {
  const a = [1, 2, 3, 4, 5];
  const b = shuffle(a, seededRandom(1));
  assertEqual(a, [1, 2, 3, 4, 5], "원본");
  assertEqual([...b].sort(), [1, 2, 3, 4, 5], "원소");
});
check("seededRandom은 같은 seed에서 같은 수열", () => {
  const r1 = seededRandom(7), r2 = seededRandom(7);
  assertEqual([r1(), r1(), r1()], [r2(), r2(), r2()], "수열");
});
check("formatScore", () => {
  assertEqual(formatScore(8), "8", "정수");
  assertEqual(formatScore(7.5), "7.5", "0.5 단위");
  assertEqual(formatScore(0), "0", "0점");
});
check("scoreAnswer 연습 모드", () => {
  assertEqual(scoreAnswer("practice", true, false), 1, "정답");
  assertEqual(scoreAnswer("practice", false, false), 0, "오답");
});
```

- [ ] **Step 2: 점검 명령을 실행해 실패를 본다**

Expected: `runSelfTests`나 대상 함수가 없어 오류로 끝나거나 실패가 나온다.

- [ ] **Step 3: 함수와 화면 뼈대를 만든다**

`index.html`에는 파일 구조 표의 1단계 화면 3개(`#screen-category`, `#screen-quiz`, `#screen-result`)를 만든다. `style.css`에는 기본 레이아웃만 둔다. `init()`은 빈 함수로 둔다.

- [ ] **Step 4: 점검 명령 실행**

Expected: `자체 점검 결과: 통과 4, 실패 0`

- [ ] **Step 5: 커밋** — `feat: 뼈대와 자체 점검 틀`

### Task 2: 문항 40개와 데이터 점검

**Files:**
- Modify: `questions.js`(문항 40개), `script.js`(`validateQuestions`, 점검 항목, 브라우저 시작 시 데이터 점검)

**Interfaces:**
- Produces: `validateQuestions(categories, questions): string[]`. 문제 하나마다 `"<id>: <이유>"` 문자열 하나를 돌려준다. 카테고리 단위의 문제는 `"<category id>: <이유>"`로 쓴다.
- 브라우저에서 `init()`이 시작될 때 `validateQuestions(CATEGORIES, QUESTIONS)`의 결과를 하나씩 `console.error`로 찍는다. 앱 실행은 막지 않는다(PRD 4.4).

- [ ] **Step 1: 점검 항목을 먼저 쓴다**

```js
check("실제 문항 데이터에 문제가 없다", () => {
  assertEqual(validateQuestions(CATEGORIES, QUESTIONS), [], "문제 목록");
});
check("망가뜨린 데이터에서 문제를 찾는다", () => {
  const q = JSON.parse(JSON.stringify(QUESTIONS));
  q[0].choices = q[0].choices.slice(0, 3);   // 보기 3개
  q[1].answer = 4;                           // 범위 밖
  q[2].id = q[3].id;                         // id 중복
  q[4].sources = [];                         // 출처 없음
  q[5].choices[1] = q[5].choices[0];         // 보기 중복
  q.pop();                                   // 한 카테고리 9문항
  const problems = validateQuestions(CATEGORIES, q);
  if (problems.length < 6) throw new Error("찾은 문제 " + problems.length + "개");
});
```

- [ ] **Step 2: 점검 명령으로 실패를 본다**

Expected: `validateQuestions`가 없거나 문항이 0개라서 실패한다.

- [ ] **Step 3: `validateQuestions`를 구현한다**

PRD 4.4의 여섯 가지(카테고리마다 10문항, id 유일·category 유효, 보기 4개·서로 다름, answer 0~3, explanation 비어 있지 않음, sources 1개 이상·각 title과 url)를 검사한다.

- [ ] **Step 4: 문항 40개를 쓴다**

PRD 4.1의 형식, CLAUDE.md의 문항 작성 규칙, PRD 4.2의 해설 규칙, 4.3의 작성·검증 절차를 따른다.
- id는 `kh-01`~`kh-10`, `geo-01`~`geo-10`, `sci-01`~`sci-10`, `art-01`~`art-10`이다.
- 문항마다 웹에서 출처 페이지를 **실제로 열어** 정답 사실을 확인한다. 연 페이지만 `sources`에 적고, 오늘 날짜를 `checkedAt`에 적는다.
- 페이지를 열 수 없으면 그 주제를 쓰지 않고, 열어서 확인할 수 있는 주제로 바꾼다.
- 위키백과, 나무위키, 블로그는 단독 출처로 쓰지 않는다.
- 자료마다 값이 갈리는 연도나 수치, 학계에 이견이 있는 사실은 쓰지 않는다.
- 해설은 한 줄로, 대략 80자 이내로 쓴다.

- [ ] **Step 5: 점검 명령 실행**

Expected: `자체 점검 결과: 통과 6, 실패 0`

- [ ] **Step 6: 커밋** — `feat: 문항 40개와 데이터 점검`
- 1단계 완료 보고에 **문항 검수표**를 붙인다. 문항마다 id, 정답, 출처에서 확인한 내용 한 줄, 출처 주소를 적는다. 5.4절에서 사람이 문항을 확인할 때 쓴다.

### Task 3: 판 만들기와 진행 상태

**Files:**
- Modify: `script.js`

**Interfaces:**
- Consumes: `shuffle`, `seededRandom`, `scoreAnswer`, `MODES`, `QUESTIONS`
- Produces:
  - `buildRound(questions, random): Item[]`
    - `Item = { id, question, choices: string[4], answer: number, explanation, sources }`
    - 문항 순서를 섞는다. 각 문항의 보기도 섞되, 정답 위치를 함께 옮겨 `answer`가 섞인 보기에서의 위치를 가리키게 한다.
  - `startGame(modeKey, categoryId, random): State`
    - `State = { mode, categoryId, items, index: 0, results: [], isRetry: false, removed: [] }`
    - `results[i] = { choice: number|null, correct: boolean, usedHint: boolean, points: number, timedOut: boolean }`
    - `removed`는 현재 문항에서 힌트로 지운 보기 위치 목록이다.
  - `answerCurrent(state, choiceIndex: number|null): Result|null`
    - `choiceIndex`가 `null`이면 시간 초과다.
    - 이미 답한 문항이거나, 지운 보기를 골랐으면 `null`을 돌려주고 아무것도 바꾸지 않는다.
  - `nextQuestion(state): boolean`: 다음 문항으로 넘어가고 `removed`를 비운다. 판이 끝났으면 `true`를 돌려준다.
  - `totalScore(state): number`, `correctCount(state): number`

- [ ] **Step 1: 점검 항목을 먼저 쓴다**

```js
check("buildRound는 정답 보기를 따라 옮긴다", () => {
  const src = QUESTIONS.filter(q => q.category === "science");
  const items = buildRound(src, seededRandom(3));
  assertEqual(items.length, 10, "문항 수");
  for (const it of items) {
    const orig = src.find(q => q.id === it.id);
    assertEqual(it.choices[it.answer], orig.choices[orig.answer], it.id);
    assertEqual([...it.choices].sort(), [...orig.choices].sort(), it.id + " 보기");
  }
});
check("같은 문항은 한 번만 채점된다", () => {
  const s = startGame("practice", "science", seededRandom(5));
  const a = s.items[0].answer;
  assertEqual(answerCurrent(s, a).points, 1, "첫 답");
  assertEqual(answerCurrent(s, a), null, "두 번째 답");
  assertEqual(answerCurrent(s, null), null, "답한 뒤 시간 초과");
  assertEqual(totalScore(s), 1, "점수");
});
check("10문항 뒤에 판이 끝난다", () => {
  const s = startGame("practice", "korean-history", seededRandom(9));
  let finished = false;
  for (let i = 0; i < 10; i++) {
    const it = s.items[s.index];
    answerCurrent(s, i < 7 ? it.answer : (it.answer + 1) % 4);
    finished = nextQuestion(s);
  }
  assertEqual(finished, true, "끝남");
  assertEqual(totalScore(s), 7, "점수");
  assertEqual(correctCount(s), 7, "맞힌 수");
});
```

- [ ] **Step 2: 점검 명령으로 실패를 본다** — Expected: `buildRound is not defined`
- [ ] **Step 3: 위 Interfaces대로 구현한다**
- [ ] **Step 4: 점검 명령 실행** — Expected: `통과 9, 실패 0`
- [ ] **Step 5: 커밋** — `feat: 판 만들기와 진행 상태`

### Task 4: 시작 화면과 퀴즈 화면

**Files:**
- Modify: `index.html`, `style.css`, `script.js`

**Interfaces:**
- Consumes: `startGame`, `answerCurrent`, `nextQuestion`, `totalScore`, `formatScore`, `CATEGORIES`
- Produces:
  - `showScreen(id: string)`
  - `renderCategory()`, `renderQuiz()`
  - 전역 `state`(현재 판, 없으면 `null`)

이 태스크는 DOM 동작이라 자체 점검 항목을 늘리지 않는다. 대신 Step 3에서 브라우저로 확인한다.

- [ ] **Step 1: 시작 화면을 만든다**
  - `renderCategory()`는 `CATEGORIES`로 버튼 4개를 그린다.
  - `#category-notice`에 "연습 모드 · 순위표에 기록되지 않음"을 표시한다.
  - 버튼을 누르면 `startGame("practice", id, Math.random)`을 실행하고 퀴즈 화면으로 간다.
- [ ] **Step 2: 퀴즈 화면을 만든다**
  - `#quiz-meta`에 "한국사 · 연습", `#quiz-progress`에 "1 / 10", `#quiz-score`에 "점수 0"을 표시한다.
  - 보기를 누르면 `answerCurrent`를 실행한다. 그다음 보기를 모두 잠그고, 정답 보기에 `.correct`와 글자 "정답", 고른 오답에 `.wrong`과 글자 "선택"을 붙인다.
  - "정답!" 또는 "오답", 해설, "출처: 제목" 링크(`target="_blank" rel="noopener"`)를 보여 준다.
  - [다음]을 보여 주고, 마지막 문항이면 [결과 보기]로 바꾼다.
  - [그만두기]는 `confirm("그만두면 이 판은 기록되지 않습니다. 그만둘까요?")`로 확인한 뒤 시작 화면으로 간다.
- [ ] **Step 3: 확인**
  - 점검 명령: Expected `통과 9, 실패 0`
  - 브라우저: 내장 브라우저로 http://localhost에서 한 판의 처음 세 문항을 풀어 정답·오답 표시와 해설이 나오는지 본다. 콘솔 오류가 없어야 한다.
- [ ] **Step 4: 커밋** — `feat: 시작 화면과 퀴즈 화면`

### Task 5: 결과 화면과 휴대폰 화면

**Files:**
- Modify: `index.html`, `style.css`, `script.js`

**Interfaces:**
- Consumes: `state`, `totalScore`, `correctCount`, `formatScore`
- Produces: `renderResult()`

- [ ] **Step 1: 결과 화면을 만든다**
  - 점수 "7.5 / 10" 꼴, "10문항 중 7개 맞힘", 카테고리와 모드를 보여 준다.
  - `MODES[mode].ranked`가 false이면 `#result-note`에 "순위표에 기록되지 않음"을 표시한다.
  - [같은 카테고리 다시]는 같은 카테고리와 모드로 새 판을 시작한다. [처음으로]는 시작 화면으로 간다.
- [ ] **Step 2: 휴대폰 화면을 맞춘다** — 폭 320px에서 가로 스크롤이 생기지 않게 한다. 보기 버튼은 한 줄에 하나씩 놓고 긴 낱말도 줄바꿈되게 한다.
- [ ] **Step 3: 확인**
  - 점검 명령: Expected `통과 9, 실패 0`
  - 브라우저: 한 판을 끝까지 풀어 결과 화면과 두 버튼을 확인하고, 폭 360px에서 가로 스크롤이 없는지 본다.
  - `index.html?test`의 콘솔이 `통과 9, 실패 0`인지 본다.
- [ ] **Step 4: 커밋** — `feat: 결과 화면과 휴대폰 화면`

## 1단계 완료 기준 (클로드가 점검)
- 점검 명령이 `통과 9, 실패 0`이다.
- `validateQuestions` 결과가 빈 배열이고, 문항 검수표를 보고에 붙였다.
- 내장 브라우저로 한 판을 끝까지 풀어 콘솔 오류가 없다.

## 1단계: 브라우저에서 직접 확인할 항목 (사람)
`index.html`을 탐색기에서 더블클릭해 연다.
1. 시작 화면에 카테고리 버튼 4개와 "연습 모드 · 순위표에 기록되지 않음"이 보인다.
2. [한국사]를 누르면 위쪽에 "한국사 · 연습", "1 / 10", "점수 0"이 보인다.
3. 정답을 고르면 그 보기가 초록색과 "정답"으로 바뀌고, 해설 한 줄과 출처 링크가 나온다.
4. 오답을 고르면 고른 보기는 빨간색과 "선택", 정답 보기는 초록색으로 표시된다.
5. 답을 고른 뒤에는 다른 보기를 눌러도 아무 변화가 없다.
6. 출처 링크를 누르면 새 탭에서 출처가 열린다.
7. 맞히면 점수가 1 오르고, 틀리면 그대로다.
8. 10번째 문항에서는 [다음]이 [결과 보기]로 바뀐다.
9. 결과 화면의 점수와 맞힌 수가 실제와 같고, "순위표에 기록되지 않음"이 보인다.
10. [같은 카테고리 다시]를 누르면 문항 순서와 보기 순서가 앞 판과 다르다. [처음으로]를 누르면 시작 화면으로 간다.
11. 문제를 풀다가 [그만두기]를 누르고 확인하면 시작 화면으로 간다.
12. 개발자 도구(F12)의 기기 툴바에서 폭 360px로 바꿔도 가로 스크롤이 생기지 않는다.
13. 주소 끝에 `?test`를 붙여 열면 콘솔에 `자체 점검 결과: 통과 9, 실패 0`이 나온다.

**여기서 멈춘다.** 사람이 확인한 뒤 `stage-1`을 master에 병합하고 GitHub Pages로 배포한다(노트 5.3.3).

---

# 2단계: 스피드 모드, 힌트 모드, 틀린 문제 다시 풀기

**만들 것:** 모드 선택 화면, 스피드 모드 타이머, 힌트 모드, 연습 모드의 틀린 문제 다시 풀기
**시작:** master에서 `stage-2` 브랜치를 만든다.

### Task 6: 모드 선택 화면

**Files:**
- Modify: `index.html`, `style.css`, `script.js`

**Interfaces:**
- Produces: `MODES`를 PRD 5.2의 세 모드 전체로 늘린다(`speed`: `timeLimit: 15, ranked: true, retry: false`, `hint`: `hint: true, hintPoint: 0.5, ranked: true, retry: false`). `renderMode()`도 만든다.

- [ ] **Step 1: 점검 항목을 먼저 쓴다**

```js
check("scoreAnswer 모드별 점수", () => {
  assertEqual(scoreAnswer("speed", true, false), 1, "스피드 정답");
  assertEqual(scoreAnswer("speed", false, false), 0, "스피드 오답");
  assertEqual(scoreAnswer("hint", true, false), 1, "힌트 안 쓰고 정답");
  assertEqual(scoreAnswer("hint", true, true), 0.5, "힌트 쓰고 정답");
  assertEqual(scoreAnswer("hint", false, true), 0, "힌트 쓰고 오답");
});
```

- [ ] **Step 2: 점검 명령으로 실패를 본다** — Expected: `MODES.speed`가 없어 실패한다.
- [ ] **Step 3: 구현**
  - 시작 화면의 `#category-notice` 문구를 지운다.
  - 카테고리를 누르면 `#screen-mode`로 간다. `#mode-title`에 "과학 · 모드를 고르세요"를 표시하고, `MODES`로 버튼 3개를 그린다.
  - 버튼마다 규칙을 한 줄로 쓴다. 연습 모드 버튼에만 "순위표에 기록되지 않음"을 붙인다.
  - [뒤로]는 시작 화면으로 간다. 모드를 누르면 `startGame(modeKey, categoryId, Math.random)`을 실행한다.
- [ ] **Step 4: 점검 명령 실행** — Expected: `통과 10, 실패 0`
- [ ] **Step 5: 커밋** — `feat: 모드 선택 화면`

### Task 7: 스피드 모드

**Files:**
- Modify: `index.html`, `style.css`, `script.js`

**Interfaces:**
- Produces:
  - `remainingSeconds(deadlineMs, nowMs): number`: `Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000))`
  - `createTimer({ setInterval, clearInterval, now, onTick, onTimeout }): { start(seconds), stop(), pause(), resume(), isRunning() }`
    - `start`는 항상 이전 interval을 먼저 지운다.
    - `pause`는 남은 밀리초를 저장하고, `resume`은 그 시간부터 다시 센다.
    - 250ms마다 `onTick(remainingSeconds)`를 부르고, 0초가 되면 멈춘 뒤 `onTimeout()`을 한 번 부른다.
  - 화면에서는 `createTimer({ setInterval: window.setInterval.bind(window), clearInterval: window.clearInterval.bind(window), now: Date.now, ... })` 하나만 쓴다.

- [ ] **Step 1: 점검 항목을 먼저 쓴다**

```js
check("remainingSeconds", () => {
  assertEqual(remainingSeconds(15000, 0), 15, "시작");
  assertEqual(remainingSeconds(15000, 14001), 1, "1초 남음");
  assertEqual(remainingSeconds(15000, 15000), 0, "0초");
  assertEqual(remainingSeconds(15000, 20000), 0, "지남");
});
check("타이머는 하나만 돈다", () => {
  let active = 0, nextId = 1;
  const t = createTimer({
    setInterval: () => { active++; return nextId++; },
    clearInterval: () => { active--; },
    now: () => 0, onTick: () => {}, onTimeout: () => {},
  });
  t.start(15); t.start(15); t.start(15);
  assertEqual(active, 1, "start 세 번");
  t.stop();
  assertEqual(active, 0, "stop 뒤");
});
check("시간 초과는 0점 오답이고, 그 뒤 답은 무시된다", () => {
  const s = startGame("speed", "science", seededRandom(2));
  const r = answerCurrent(s, null);
  assertEqual([r.correct, r.points, r.timedOut], [false, 0, true], "시간 초과");
  assertEqual(answerCurrent(s, s.items[0].answer), null, "늦은 답");
});
```

- [ ] **Step 2: 점검 명령으로 실패를 본다** — Expected: `remainingSeconds is not defined`
- [ ] **Step 3: 구현**
  - 스피드 모드 문항이 나오면 `#quiz-timer`에 "남은 시간 15초"를 보여 주고 타이머를 시작한다.
  - 0초가 되면 `answerCurrent(state, null)`을 실행하고 "시간 초과"와 정답, 해설을 보여 준다.
  - 답을 고르거나 시간이 다 되면 타이머를 멈춘다. [다음]을 누르면 15초부터 다시 센다.
  - [그만두기] 확인 창 앞뒤로 `pause()`/`resume()`을 부른다.
  - 결과 화면이나 시작 화면으로 갈 때는 `stop()`을 부른다.
- [ ] **Step 4: 점검 명령 실행** — Expected: `통과 13, 실패 0`
- [ ] **Step 5: 커밋** — `feat: 스피드 모드`

### Task 8: 힌트 모드

**Files:**
- Modify: `index.html`, `style.css`, `script.js`

**Interfaces:**
- Produces:
  - `pickHintRemovals(item, random): number[]`: 정답이 아닌 위치 3개 중 2개를 고른다.
  - `useHint(state, random): number[]|null`: 다음 경우에는 `null`을 돌려준다. ① `MODES[mode].hint`가 false일 때 ② 이 문항에서 이미 썼을 때 ③ 이미 답했을 때. 쓸 수 있으면 `state.removed`를 채우고, 이 문항의 `usedHint`를 기록한다. 기록 방식은 `results`가 아직 비어 있으므로 `state.hintUsedAt = state.index`로 둔다.
  - `answerCurrent`는 `state.hintUsedAt === state.index`이면 `usedHint: true`로 채점한다.

- [ ] **Step 1: 점검 항목을 먼저 쓴다**

```js
check("힌트는 오답 2개만 지운다", () => {
  const it = { choices: ["a", "b", "c", "d"], answer: 2 };
  for (let seed = 1; seed <= 50; seed++) {
    const r = pickHintRemovals(it, seededRandom(seed));
    assertEqual(r.length, 2, "개수");
    if (r.includes(2) || r[0] === r[1]) throw new Error("seed " + seed + ": " + r);
  }
});
check("힌트 모드 점수와 사용 제한", () => {
  const s = startGame("hint", "arts-culture", seededRandom(4));
  const removed = useHint(s, seededRandom(1));
  assertEqual(removed.length, 2, "지운 수");
  assertEqual(useHint(s, seededRandom(1)), null, "두 번째 힌트");
  assertEqual(answerCurrent(s, removed[0]), null, "지운 보기 선택");
  assertEqual(answerCurrent(s, s.items[0].answer).points, 0.5, "힌트 쓰고 정답");
  nextQuestion(s);
  assertEqual(answerCurrent(s, s.items[1].answer).points, 1, "힌트 없이 정답");
});
check("연습 모드에서는 힌트를 쓸 수 없다", () => {
  assertEqual(useHint(startGame("practice", "science", seededRandom(1)), seededRandom(1)), null, "연습");
});
```

- [ ] **Step 2: 점검 명령으로 실패를 본다** — Expected: `pickHintRemovals is not defined`
- [ ] **Step 3: 구현**
  - 힌트 모드에서만 `#btn-hint` "힌트 (오답 2개 지우기)"를 보여 준다.
  - 누르면 지운 보기에 `.removed`(흐림과 취소선)를 붙이고 `disabled`로 만든다. 버튼은 "힌트 사용함"으로 바꿔 잠근다.
  - 답을 고른 뒤에도 버튼을 잠근다. 다음 문항에서는 다시 쓸 수 있다.
- [ ] **Step 4: 점검 명령 실행** — Expected: `통과 16, 실패 0`
- [ ] **Step 5: 커밋** — `feat: 힌트 모드`

### Task 9: 틀린 문제 다시 풀기

**Files:**
- Modify: `index.html`, `script.js`

**Interfaces:**
- Produces:
  - `wrongItems(state): Item[]`
  - `startRetry(state, random): State|null`: 틀린 문항이 없으면 `null`이다. 있으면 `{ mode: "practice", isRetry: true, items: 틀린 문항의 순서와 보기를 다시 섞은 것, ... }`인 새 상태를 돌려준다. 원래 상태는 바꾸지 않는다.

- [ ] **Step 1: 점검 항목을 먼저 쓴다**

```js
check("다시 풀기는 틀린 문항만, 처음 점수는 그대로", () => {
  const s = startGame("practice", "world-geography", seededRandom(6));
  for (let i = 0; i < 10; i++) {
    const it = s.items[s.index];
    answerCurrent(s, i < 6 ? it.answer : (it.answer + 1) % 4);
    nextQuestion(s);
  }
  const r = startRetry(s, seededRandom(8));
  assertEqual(r.items.map(x => x.id).sort(), wrongItems(s).map(x => x.id).sort(), "문항");
  assertEqual(r.isRetry, true, "다시 풀기 표시");
  for (const it of r.items) {
    const orig = QUESTIONS.find(q => q.id === it.id);
    assertEqual(it.choices[it.answer], orig.choices[orig.answer], it.id);
  }
  answerCurrent(r, r.items[0].answer);
  assertEqual(totalScore(s), 6, "처음 점수");
});
check("틀린 문항이 없으면 다시 풀기 없음", () => {
  const s = startGame("practice", "science", seededRandom(1));
  for (let i = 0; i < 10; i++) { answerCurrent(s, s.items[s.index].answer); nextQuestion(s); }
  assertEqual(startRetry(s, seededRandom(1)), null, "다시 풀기");
});
```

- [ ] **Step 2: 점검 명령으로 실패를 본다** — Expected: `startRetry is not defined`
- [ ] **Step 3: 구현**
  - `MODES[mode].retry`이고 틀린 문항이 있으면 결과 화면에 [틀린 문제 다시 풀기]를 보여 준다. 누르면 `startRetry`로 푼다.
  - 다시 풀기 판의 결과 화면은 점수 대신 "n문항 중 m개 맞힘"을 보여 준다.
  - 또 틀리면 버튼을 다시 보여 준다. 모두 맞히면 "모두 맞혔습니다"를 표시하고 버튼을 숨긴다.
  - [같은 카테고리 다시]는 다시 풀기 판에서도 같은 카테고리의 연습 모드 새 판(10문항)을 시작한다.
- [ ] **Step 4: 점검 명령 실행** — Expected: `통과 18, 실패 0`
- [ ] **Step 5: 커밋** — `feat: 틀린 문제 다시 풀기`

## 2단계 완료 기준 (클로드가 점검)
- 점검 명령이 `통과 18, 실패 0`이다.
- 내장 브라우저에서 세 모드로 한 판씩 풀어 콘솔 오류가 없다.

## 2단계: 브라우저에서 직접 확인할 항목 (사람)
**모드 선택**
1. 시작 화면에 "연습 모드 · 순위표에 기록되지 않음" 문구가 없다.
2. [과학]을 누르면 "과학 · 모드를 고르세요"와 연습, 스피드, 힌트 3개가 규칙 한 줄씩과 함께 나온다. "순위표에 기록되지 않음"은 연습에만 있다.
3. [뒤로]를 누르면 시작 화면으로 간다.

**스피드 모드**

4. 남은 시간이 15초부터 1초에 1씩 줄어든다.
5. 아무것도 누르지 않으면 0초에 "시간 초과"가 나오고, 정답 보기가 초록색이 되며, 해설이 보인다.
6. 답을 고르면 남은 시간이 그 자리에서 멈춘다.
7. [다음]을 누르면 다음 문항에서 15초부터 다시 센다.
8. [다음]을 여러 번 누른 뒤와 [같은 카테고리 다시]로 새 판을 시작한 뒤에도 1초에 1씩 줄어든다. 2씩 줄면 타이머가 겹친 것이다.
9. [그만두기] 확인 창이 떠 있는 동안 남은 시간이 줄지 않고, [취소]하면 이어서 센다.

**힌트 모드**

10. [힌트 (오답 2개 지우기)]를 누르면 오답 2개가 흐려지고 취소선이 그어진다. 그 보기는 눌리지 않는다.
11. 버튼이 "힌트 사용함"으로 바뀌고 다시 눌리지 않는다. 다음 문항에서는 다시 쓸 수 있다.
12. 힌트를 쓰고 맞히면 점수가 0.5 오르고, 쓰지 않고 맞히면 1 오른다.
13. 결과 점수가 "7.5 / 10"처럼 0.5 단위로 맞게 나온다.

**연습 모드와 다시 풀기**

14. 연습 모드에서 일부러 몇 개 틀리면 결과 화면에 [틀린 문제 다시 풀기]가 나온다. 스피드·힌트 모드 결과에는 없다.
15. 누르면 틀린 문항만 나온다(보기 순서는 바뀌어 있음).
16. 다시 풀기 결과는 "n문항 중 m개 맞힘"이고, 처음 판의 점수는 바뀌지 않는다.
17. 또 틀리면 버튼이 다시 나오고, 모두 맞히면 "모두 맞혔습니다"가 나오며 버튼이 사라진다.

**여기서 멈춘다.** 사람이 확인한 뒤 `stage-2`를 master에 병합하고 Pages를 갱신한다(노트 5.5.3).

---

# 3단계: 점수 저장과 순위표

**만들 것:** 순위표 규칙과 저장, 결과 화면의 순위 표시, 순위표 화면
**시작:** master에서 `stage-3` 브랜치를 만든다.

### Task 10: 순위표 규칙과 저장

**Files:**
- Modify: `script.js`

**Interfaces:**
- Produces:
  - `LEADERBOARD_KEY = "quizA.leaderboard.v1"`, `LEADERBOARD_SIZE = 5`
  - `boardKey(modeKey, categoryId): string`: 예: `"speed:science"`
  - `insertRecord(list, record): { list, rank: number|null }`
    - 원본을 바꾸지 않는다. 점수가 높은 순서로 둔다.
    - 같은 점수면 새 기록을 기존 기록 뒤에 둔다. 최대 5개다.
    - 5위 밖이면 `rank`는 `null`이고 목록은 그대로다.
  - `loadLeaderboard(storage): { available: boolean, board: object }`
    - 읽다가 예외가 나면 `available: false, board: {}`를 돌려준다.
    - 값이 없거나 JSON이 깨졌으면 `available: true, board: {}`를 돌려준다.
  - `saveLeaderboard(storage, board): boolean`: 예외가 나면 `false`를 돌려준다.
  - 브라우저에서는 `storage`로 `window.localStorage`를 넘긴다. 접근 자체가 예외를 던질 수 있으므로 `try`로 얻는다.

- [ ] **Step 1: 점검 항목을 먼저 쓴다**

```js
function fakeStorage(initial) {
  const data = { ...initial };
  return { getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data };
}
check("insertRecord 순위와 동점", () => {
  assertEqual(insertRecord([], { score: 5, date: "d1" }).rank, 1, "빈 목록");
  const full = [9, 8, 7, 6, 5].map((s, i) => ({ score: s, date: "d" + i }));
  const out = insertRecord(full, { score: 4, date: "x" });
  assertEqual([out.rank, out.list.length], [null, 5], "순위권 밖");
  const tie = insertRecord(full, { score: 7, date: "new" });
  assertEqual(tie.rank, 4, "동점은 먼저 세운 기록 뒤");
  assertEqual(tie.list.map(r => r.date), ["d0", "d1", "d2", "new", "d3"], "목록");
});
check("깨진 저장값과 막힌 저장소", () => {
  assertEqual(loadLeaderboard(fakeStorage({ [LEADERBOARD_KEY]: "{깨짐" })), { available: true, board: {} }, "깨짐");
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assertEqual(loadLeaderboard(blocked), { available: false, board: {} }, "막힘");
  assertEqual(saveLeaderboard(blocked, {}), false, "저장 실패");
});
check("저장한 순위표를 다시 읽는다", () => {
  const st = fakeStorage({});
  const board = { "hint:science": [{ score: 8, date: "d" }] };
  assertEqual(saveLeaderboard(st, board), true, "저장");
  assertEqual(loadLeaderboard(st), { available: true, board }, "읽기");
});
```

- [ ] **Step 2: 점검 명령으로 실패를 본다** — Expected: `insertRecord is not defined`
- [ ] **Step 3: 위 Interfaces대로 구현한다**
- [ ] **Step 4: 점검 명령 실행** — Expected: `통과 21, 실패 0`
- [ ] **Step 5: 커밋** — `feat: 순위표 규칙과 저장`

### Task 11: 결과 순위 표시와 순위표 화면

**Files:**
- Modify: `index.html`, `style.css`, `script.js`

**Interfaces:**
- Consumes: `boardKey`, `insertRecord`, `loadLeaderboard`, `saveLeaderboard`, `CATEGORIES`, `MODES`
- Produces:
  - `recordResult(state, storage, nowDate): { rank: number|null, available: boolean }|null`: 순위표에 기록하지 않는 판(연습 모드, 다시 풀기)이면 `null`을 돌려주고 저장소를 건드리지 않는다. `date`는 `nowDate`를 `"YYYY-MM-DDTHH:mm:ss"` 꼴의 로컬 시각 문자열로 바꾼 것이다.
  - `renderBoard()`

- [ ] **Step 1: 점검 항목을 먼저 쓴다**

```js
check("기록 대상이 아닌 판은 저장하지 않는다", () => {
  const st = fakeStorage({});
  const p = startGame("practice", "science", seededRandom(1));
  assertEqual(recordResult(p, st, new Date(2026, 9, 12, 14, 3, 0)), null, "연습");
  const h = startGame("hint", "science", seededRandom(1));
  for (let i = 0; i < 10; i++) { answerCurrent(h, h.items[h.index].answer); nextQuestion(h); }
  assertEqual(recordResult(h, st, new Date(2026, 9, 12, 14, 3, 0)), { rank: 1, available: true }, "힌트");
  assertEqual(loadLeaderboard(st).board["hint:science"], [{ score: 10, date: "2026-10-12T14:03:00" }], "저장값");
});
```

- [ ] **Step 2: 점검 명령으로 실패를 본다** — Expected: `recordResult is not defined`
- [ ] **Step 3: 구현**
  - 스피드·힌트 모드 판이 끝나면 결과 화면을 그리기 전에 `recordResult`를 한 번만 부른다.
  - `#result-rank`에 "순위표 n위" 또는 "순위권 밖"을 보여 준다. 저장소를 쓸 수 없으면 "이 브라우저에서는 순위표를 저장할 수 없음"을 보여 준다.
  - 시작 화면에 [순위표] 버튼을 둔다.
  - 순위표 화면에는 스피드·힌트 × 카테고리 4개, 표 8개를 그린다. 표마다 순위, 점수(`formatScore`), 날짜·시각을 보여 주고, 기록이 없으면 "아직 기록 없음"을 표시한다.
  - 저장소를 쓸 수 없으면 `#board-notice`에 안내 문구를 보여 준다. [뒤로]는 시작 화면으로 간다.
  - [그만두기]로 끝난 판은 결과 화면을 거치지 않으므로 기록되지 않는다.
- [ ] **Step 4: 점검 명령 실행** — Expected: `통과 22, 실패 0`
- [ ] **Step 5: 커밋** — `feat: 순위표 화면`

## 3단계 완료 기준 (클로드가 점검)
- 점검 명령이 `통과 22, 실패 0`이다.
- 내장 브라우저에서 스피드·힌트 판을 끝내고 순위표 화면에 기록이 보인다.

## 3단계: 브라우저에서 직접 확인할 항목 (사람)
1. 시작 화면에 [순위표] 버튼이 있다.
2. 스피드 모드 한 판을 끝내면 결과 화면에 "순위표 n위"가 나온다.
3. 순위표 화면에 표 8개(스피드·힌트 × 카테고리 4개)가 있고, 방금 기록이 그 표에 점수와 날짜·시각으로 보인다.
4. 기록이 없는 표에는 "아직 기록 없음"이 보인다.
5. 같은 표에 6번째 기록을 저장하면 표에는 5개만 남는다. 낮은 점수로 끝내면 "순위권 밖"이 나온다.
6. 점수가 같은 기록은 먼저 세운 기록이 위에 있다.
7. 연습 모드, 다시 풀기, [그만두기]로 끝낸 판은 순위표에 나오지 않는다.
8. 브라우저를 닫았다가 다시 열어도 순위표가 남아 있다.

**여기서 멈춘다.** 사람이 확인한 뒤 `stage-3`을 master에 병합하고 Pages를 갱신한다.

---

## PRD 대응표

| PRD | 태스크 |
|---|---|
| 3.1~3.2 화면 흐름, 시작 화면 | Task 4, Task 6 |
| 3.3 모드 선택 화면 | Task 6 |
| 3.4 퀴즈 화면, 해설 상태 | Task 4 |
| 3.5 결과 화면 | Task 5, Task 9, Task 11 |
| 3.6 순위표 화면 | Task 11 |
| 3.7.1 한 판, 섞기 | Task 3 |
| 3.7.2 모드별 규칙 | Task 1, Task 6 |
| 3.7.3 스피드 타이머 | Task 7 |
| 3.7.4 힌트 | Task 8 |
| 3.7.5 다시 풀기 | Task 9 |
| 3.7.6, 4.5 순위표 기록과 저장 | Task 10, Task 11 |
| 4.1~4.3 문항 형식, 규칙, 작성 절차 | Task 2 |
| 4.4 데이터 자체 점검 | Task 2 |
| 2절 제약, 휴대폰 폭 | 전역 제약, Task 5 |
| 6절 단계별 완료 기준 | 단계별 "완료 기준"과 "브라우저에서 직접 확인할 항목" |
| 7절 검증 방법 | 점검 명령, `?test`, 브라우저 확인 항목 |
