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
  practice: { name: "연습", timeLimit: null, hint: false, correctPoint: 1, hintPoint: null, ranked: false, retry: true },
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

// ⑤ 렌더와 이벤트 -----------------------------------------------------------

function init() {}

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

// ⑦ 브라우저 시작 -----------------------------------------------------------

if (typeof document !== "undefined") {
  init();
  if (new URLSearchParams(location.search).has("test")) runSelfTests();
}
