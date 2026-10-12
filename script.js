// 상식 퀴즈 앱. 구조는 PRD.md 5절, 작업 순서는 IMPL-PLAN.md를 따른다.

// ① 자체 점검 틀 ---------------------------------------------------------

const SELF_TESTS = [];

function check(name, fn) {
  SELF_TESTS.push({ name, fn });
}

function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(label + ": 기대 " + e + ", 실제 " + a);
}

function runSelfTests() {
  let pass = 0;
  let fail = 0;
  for (const t of SELF_TESTS) {
    try {
      t.fn();
      pass++;
      console.log("통과: " + t.name);
    } catch (err) {
      fail++;
      console.error("실패: " + t.name + " - " + err.message);
    }
  }
  console.log("자체 점검 결과: 통과 " + pass + ", 실패 " + fail);
  return { pass, fail };
}

// ② 모드 설정과 규칙 함수 ----------------------------------------------------

// 모드별 차이는 이 표에서만 읽는다(PRD 5.2).
const MODES = {
  practice: { name: "연습",   timeLimit: null, hint: false, correctPoint: 1, hintPoint: null, ranked: false, retry: true,
              rule: "시간 제한과 힌트 없음, 맞히면 1점, 틀린 문제만 다시 풀 수 있음" },
  speed:    { name: "스피드", timeLimit: 15,   hint: false, correctPoint: 1, hintPoint: null, ranked: true,  retry: false,
              rule: "문항마다 15초, 시간이 지나면 오답, 맞히면 1점" },
  hint:     { name: "힌트",   timeLimit: null, hint: true,  correctPoint: 1, hintPoint: 0.5,  ranked: true,  retry: false,
              rule: "문항마다 힌트 1번(오답 2개 지우기), 힌트를 쓰고 맞히면 0.5점" },
};

// 같은 seed면 같은 수열을 내는 [0, 1) 난수(mulberry32). 점검에서 결과를 고정할 때 쓴다.
function seededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, random) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function formatScore(score) {
  return String(score);
}

function scoreAnswer(modeKey, isCorrect, usedHint) {
  if (!isCorrect) return 0;
  const mode = MODES[modeKey];
  return usedHint && mode.hint ? mode.hintPoint : mode.correctPoint;
}

// 스피드 모드 타이머. 남은 시간은 마감 시각 기준으로 계산해 화면 갱신이 밀려도 어긋나지 않는다.
function remainingSeconds(deadlineMs, nowMs) {
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

// 시계 함수를 주입받아 점검에서 가짜 시계를 쓸 수 있게 한다. start는 항상 이전 타이머를 먼저 지운다.
function createTimer({ setInterval, clearInterval, now, onTick, onTimeout }) {
  let handle = null;
  let deadline = 0;
  let pausedMs = null;

  function clear() {
    if (handle !== null) {
      clearInterval(handle);
      handle = null;
    }
  }

  function tick() {
    const left = remainingSeconds(deadline, now());
    onTick(left);
    if (left <= 0) {
      clear();
      onTimeout();
    }
  }

  function run() {
    clear();
    handle = setInterval(tick, 250);
  }

  return {
    start(seconds) {
      pausedMs = null;
      deadline = now() + seconds * 1000;
      run();
      onTick(seconds);
    },
    stop() {
      clear();
      pausedMs = null;
    },
    pause() {
      if (handle === null) return;
      pausedMs = Math.max(0, deadline - now());
      clear();
    },
    resume() {
      if (pausedMs === null) return;
      deadline = now() + pausedMs;
      pausedMs = null;
      run();
    },
    isRunning() {
      return handle !== null;
    },
  };
}

// 문항 데이터 점검(PRD 4.4). 문제 하나마다 "<id>: <이유>" 한 줄을 돌려준다.
function validateQuestions(categories, questions) {
  const problems = [];
  const categoryIds = categories.map((c) => c.id);
  const seenIds = new Set();

  for (const q of questions) {
    const id = q.id || "(id 없음)";
    if (seenIds.has(q.id)) problems.push(id + ": id가 중복됨");
    seenIds.add(q.id);
    if (!categoryIds.includes(q.category)) problems.push(id + ": 없는 카테고리 " + q.category);
    if (!Array.isArray(q.choices) || q.choices.length !== 4) {
      problems.push(id + ": 보기가 4개가 아님");
    } else if (new Set(q.choices).size !== 4) {
      problems.push(id + ": 보기가 서로 다르지 않음");
    }
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) problems.push(id + ": answer가 0~3이 아님");
    if (!q.explanation || !String(q.explanation).trim()) problems.push(id + ": 해설이 비어 있음");
    if (!Array.isArray(q.sources) || q.sources.length === 0) {
      problems.push(id + ": 출처가 없음");
    } else if (q.sources.some((s) => !s || !s.title || !s.url)) {
      problems.push(id + ": 출처에 title이나 url이 없음");
    }
  }

  for (const c of categories) {
    const count = questions.filter((q) => q.category === c.id).length;
    if (count !== 10) problems.push(c.id + ": 문항이 " + count + "개임(10개여야 함)");
  }
  return problems;
}

// ③ 게임 상태 ---------------------------------------------------------------

// 문항 순서와 보기 순서를 섞는다. 정답 위치(answer)도 섞인 보기를 따라간다.
function buildRound(questions, random) {
  return shuffle(questions, random).map((q) => {
    const order = shuffle([0, 1, 2, 3], random);
    return {
      id: q.id,
      question: q.question,
      choices: order.map((i) => q.choices[i]),
      answer: order.indexOf(q.answer),
      explanation: q.explanation,
      sources: q.sources,
    };
  });
}

function startGame(modeKey, categoryId, random) {
  const questions = QUESTIONS.filter((q) => q.category === categoryId);
  return {
    mode: modeKey,
    categoryId,
    items: buildRound(questions, random),
    index: 0,
    results: [],
    isRetry: false,
    removed: [],
    hintUsedAt: null,
  };
}

// 정답이 아닌 보기 3개 중 2개의 위치를 고른다.
function pickHintRemovals(item, random) {
  const wrong = [0, 1, 2, 3].filter((i) => i !== item.answer);
  return shuffle(wrong, random).slice(0, 2);
}

// 힌트를 쓸 수 없으면(힌트 없는 모드, 이미 씀, 이미 답함) null을 돌려준다.
function useHint(state, random) {
  if (!MODES[state.mode].hint) return null;
  if (state.hintUsedAt === state.index || state.results[state.index]) return null;
  state.removed = pickHintRemovals(state.items[state.index], random);
  state.hintUsedAt = state.index;
  return state.removed;
}

// choiceIndex가 null이면 시간 초과다. 이미 답한 문항이거나 힌트로 지운 보기면
// null을 돌려주고 아무것도 바꾸지 않는다.
function answerCurrent(state, choiceIndex) {
  if (state.results[state.index]) return null;
  if (choiceIndex !== null && state.removed.includes(choiceIndex)) return null;
  const item = state.items[state.index];
  const correct = choiceIndex === item.answer;
  const usedHint = state.hintUsedAt === state.index;
  const result = {
    choice: choiceIndex,
    correct,
    usedHint,
    points: scoreAnswer(state.mode, correct, usedHint),
    timedOut: choiceIndex === null,
  };
  state.results[state.index] = result;
  return result;
}

// 다음 문항으로 넘어간다. 판이 끝났으면 true를 돌려준다.
function nextQuestion(state) {
  state.index++;
  state.removed = [];
  return state.index >= state.items.length;
}

function wrongItems(state) {
  return state.items.filter((_, i) => !(state.results[i] && state.results[i].correct));
}

// 틀린 문항만 순서와 보기를 다시 섞어 연습 규칙으로 푸는 새 판. 원래 판은 바꾸지 않는다.
function startRetry(state, random) {
  const ids = wrongItems(state).map((it) => it.id);
  if (ids.length === 0) return null;
  const questions = QUESTIONS.filter((q) => ids.includes(q.id));
  return {
    mode: "practice",
    categoryId: state.categoryId,
    items: buildRound(questions, random),
    index: 0,
    results: [],
    isRetry: true,
    removed: [],
    hintUsedAt: null,
  };
}

function totalScore(state) {
  return state.results.reduce((sum, r) => sum + (r ? r.points : 0), 0);
}

function correctCount(state) {
  return state.results.filter((r) => r && r.correct).length;
}

// ⑤ 렌더와 이벤트 -----------------------------------------------------------

let state = null;

function $(id) {
  return document.getElementById(id);
}

function categoryName(categoryId) {
  const c = CATEGORIES.find((cat) => cat.id === categoryId);
  return c ? c.name : categoryId;
}

function showScreen(id) {
  for (const section of document.querySelectorAll(".screen")) {
    section.hidden = section.id !== id;
  }
  window.scrollTo(0, 0);
}

function renderCategory() {
  const list = $("category-list");
  list.replaceChildren();
  for (const c of CATEGORIES) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = c.name;
    button.addEventListener("click", () => renderMode(c.id));
    list.appendChild(button);
  }
  showScreen("screen-category");
}

function renderMode(categoryId) {
  $("mode-title").textContent = categoryName(categoryId) + " · 모드를 고르세요";
  const list = $("mode-list");
  list.replaceChildren();
  for (const [key, mode] of Object.entries(MODES)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mode-card";
    const name = document.createElement("strong");
    name.textContent = mode.name;
    const rule = document.createElement("span");
    rule.className = "mode-rule";
    rule.textContent = mode.rule;
    button.append(name, rule);
    if (!mode.ranked) {
      const note = document.createElement("span");
      note.className = "mode-note";
      note.textContent = "순위표에 기록되지 않음";
      button.append(note);
    }
    button.addEventListener("click", () => startPlay(key, categoryId));
    list.appendChild(button);
  }
  showScreen("screen-mode");
}

let timer = null;

function getTimer() {
  if (!timer) {
    timer = createTimer({
      setInterval: window.setInterval.bind(window),
      clearInterval: window.clearInterval.bind(window),
      now: Date.now,
      onTick: renderTimer,
      onTimeout: () => {
        if (answerCurrent(state, null)) renderQuiz();
      },
    });
  }
  return timer;
}

function renderTimer(seconds) {
  const el = $("quiz-timer");
  el.textContent = "남은 시간 " + seconds + "초";
  el.classList.toggle("low", seconds <= 5);
}

// 새 문항을 보여 주고, 스피드 모드면 15초부터 센다.
function showQuestion() {
  renderQuiz();
  const limit = MODES[state.mode].timeLimit;
  $("quiz-timer").hidden = limit === null;
  if (limit !== null) getTimer().start(limit);
}

function stopTimer() {
  if (timer) timer.stop();
}

function startPlay(modeKey, categoryId) {
  state = startGame(modeKey, categoryId, Math.random);
  showQuestion();
  showScreen("screen-quiz");
}

function renderQuiz() {
  const item = state.items[state.index];
  const result = state.results[state.index];
  const isLast = state.index === state.items.length - 1;

  $("quiz-meta").textContent = categoryName(state.categoryId) + " · " + MODES[state.mode].name;
  $("quiz-progress").textContent = state.index + 1 + " / " + state.items.length;
  $("quiz-score").textContent = state.isRetry ? "다시 풀기" : "점수 " + formatScore(totalScore(state));
  $("quiz-question").textContent = item.question;

  const list = $("quiz-choices");
  list.replaceChildren();
  item.choices.forEach((text, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.dataset.index = String(i);
    button.textContent = text;
    const removed = state.removed.includes(i);
    if (removed) button.classList.add("removed");
    if (result) {
      button.disabled = true;
      if (i === item.answer) {
        button.classList.add("correct");
        button.append(tag("정답"));
      } else if (i === result.choice) {
        button.classList.add("wrong");
        button.append(tag("선택"));
      }
    } else if (removed) {
      button.disabled = true;
    } else {
      button.addEventListener("click", () => chooseAnswer(i));
    }
    list.appendChild(button);
  });

  const hintButton = $("btn-hint");
  hintButton.hidden = !MODES[state.mode].hint;
  const hintUsed = state.hintUsedAt === state.index;
  hintButton.textContent = hintUsed ? "힌트 사용함" : "힌트 (오답 2개 지우기)";
  hintButton.disabled = hintUsed || Boolean(result);

  $("quiz-feedback").hidden = !result;
  $("btn-next").hidden = !result;
  if (result) {
    const verdict = result.timedOut ? "시간 초과" : result.correct ? "정답!" : "오답";
    $("feedback-verdict").textContent = verdict;
    $("feedback-verdict").className = "verdict " + (result.correct ? "is-correct" : "is-wrong");
    $("feedback-explanation").textContent = item.explanation;
    renderSources(item.sources);
    $("btn-next").textContent = isLast ? "결과 보기" : "다음";
  }
}

function tag(text) {
  const span = document.createElement("span");
  span.className = "tag";
  span.textContent = text;
  return span;
}

function renderSources(sources) {
  const p = $("feedback-source");
  p.replaceChildren("출처: ");
  sources.forEach((s, i) => {
    if (i > 0) p.append(", ");
    const a = document.createElement("a");
    a.href = s.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = s.title;
    p.append(a);
  });
}

function chooseAnswer(choiceIndex) {
  if (answerCurrent(state, choiceIndex)) {
    stopTimer();
    renderQuiz();
  }
}

function takeHint() {
  if (useHint(state, Math.random)) renderQuiz();
}

function goNext() {
  stopTimer();
  if (nextQuestion(state)) {
    renderResult();
    showScreen("screen-result");
  } else {
    showQuestion();
  }
}

function renderResult() {
  const mode = MODES[state.mode];
  const counted = state.items.length + "문항 중 " + correctCount(state) + "개 맞힘";
  const wrongCount = wrongItems(state).length;

  if (state.isRetry) {
    // 다시 풀기 판은 점수를 매기지 않는다(PRD 3.7.5).
    $("result-title").textContent = categoryName(state.categoryId) + " · 틀린 문제 다시 풀기";
    $("result-score").textContent = counted;
    $("result-count").textContent = "처음 판의 점수는 바뀌지 않습니다.";
  } else {
    $("result-title").textContent = categoryName(state.categoryId) + " · " + mode.name;
    $("result-score").textContent = formatScore(totalScore(state)) + " / " + state.items.length;
    $("result-count").textContent = counted;
  }

  const allCorrectInRetry = state.isRetry && wrongCount === 0;
  $("result-message").hidden = !allCorrectInRetry;
  $("result-message").textContent = allCorrectInRetry ? "모두 맞혔습니다" : "";
  $("btn-retry").hidden = !(mode.retry && wrongCount > 0);
  $("result-note").textContent = mode.ranked ? "" : "순위표에 기록되지 않음";
}

function playRetry() {
  const next = startRetry(state, Math.random);
  if (!next) return;
  state = next;
  showQuestion();
  showScreen("screen-quiz");
}

function playAgain() {
  startPlay(state.mode, state.categoryId);
}

function goHome() {
  stopTimer();
  state = null;
  renderCategory();
}

// 확인 창이 떠 있는 동안 스피드 모드 타이머를 멈춘다(PRD 3.4).
function quit() {
  if (timer) timer.pause();
  if (confirm("그만두면 이 판은 기록되지 않습니다. 그만둘까요?")) {
    goHome();
  } else if (timer) {
    timer.resume();
  }
}

function init() {
  for (const problem of validateQuestions(CATEGORIES, QUESTIONS)) {
    console.error("문항 데이터 문제 - " + problem);
  }
  $("btn-next").addEventListener("click", goNext);
  $("btn-quit").addEventListener("click", quit);
  $("btn-again").addEventListener("click", playAgain);
  $("btn-home").addEventListener("click", goHome);
  $("btn-mode-back").addEventListener("click", renderCategory);
  $("btn-hint").addEventListener("click", takeHint);
  $("btn-retry").addEventListener("click", playRetry);
  renderCategory();
}

// ⑥ 점검 목록 -------------------------------------------------------------

check("shuffle은 원소를 보존하고 원본을 바꾸지 않는다", () => {
  const a = [1, 2, 3, 4, 5];
  const b = shuffle(a, seededRandom(1));
  assertEqual(a, [1, 2, 3, 4, 5], "원본");
  assertEqual([...b].sort(), [1, 2, 3, 4, 5], "원소");
});

check("seededRandom은 같은 seed에서 같은 수열", () => {
  const r1 = seededRandom(7);
  const r2 = seededRandom(7);
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

check("buildRound는 정답 보기를 따라 옮긴다", () => {
  const src = QUESTIONS.filter((q) => q.category === "science");
  const items = buildRound(src, seededRandom(3));
  assertEqual(items.length, 10, "문항 수");
  for (const it of items) {
    const orig = src.find((q) => q.id === it.id);
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

check("scoreAnswer 모드별 점수", () => {
  assertEqual(scoreAnswer("speed", true, false), 1, "스피드 정답");
  assertEqual(scoreAnswer("speed", false, false), 0, "스피드 오답");
  assertEqual(scoreAnswer("hint", true, false), 1, "힌트 안 쓰고 정답");
  assertEqual(scoreAnswer("hint", true, true), 0.5, "힌트 쓰고 정답");
  assertEqual(scoreAnswer("hint", false, true), 0, "힌트 쓰고 오답");
});

check("remainingSeconds", () => {
  assertEqual(remainingSeconds(15000, 0), 15, "시작");
  assertEqual(remainingSeconds(15000, 14001), 1, "1초 남음");
  assertEqual(remainingSeconds(15000, 15000), 0, "0초");
  assertEqual(remainingSeconds(15000, 20000), 0, "지남");
});

check("타이머는 하나만 돈다", () => {
  let active = 0;
  let nextId = 1;
  const t = createTimer({
    setInterval: () => { active++; return nextId++; },
    clearInterval: () => { active--; },
    now: () => 0,
    onTick: () => {},
    onTimeout: () => {},
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

check("다시 풀기는 틀린 문항만, 처음 점수는 그대로", () => {
  const s = startGame("practice", "world-geography", seededRandom(6));
  for (let i = 0; i < 10; i++) {
    const it = s.items[s.index];
    answerCurrent(s, i < 6 ? it.answer : (it.answer + 1) % 4);
    nextQuestion(s);
  }
  const r = startRetry(s, seededRandom(8));
  assertEqual(r.items.map((x) => x.id).sort(), wrongItems(s).map((x) => x.id).sort(), "문항");
  assertEqual(r.isRetry, true, "다시 풀기 표시");
  for (const it of r.items) {
    const orig = QUESTIONS.find((q) => q.id === it.id);
    assertEqual(it.choices[it.answer], orig.choices[orig.answer], it.id);
  }
  answerCurrent(r, r.items[0].answer);
  assertEqual(totalScore(s), 6, "처음 점수");
});

check("틀린 문항이 없으면 다시 풀기 없음", () => {
  const s = startGame("practice", "science", seededRandom(1));
  for (let i = 0; i < 10; i++) {
    answerCurrent(s, s.items[s.index].answer);
    nextQuestion(s);
  }
  assertEqual(startRetry(s, seededRandom(1)), null, "다시 풀기");
});

// ⑦ 브라우저 시작 -----------------------------------------------------------

if (typeof document !== "undefined") {
  init();
  if (new URLSearchParams(location.search).has("test")) runSelfTests();
}
