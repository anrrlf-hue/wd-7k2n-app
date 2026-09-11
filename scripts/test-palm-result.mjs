// /api/palm/interpret(손금 완료 후 화면이 호출하는 엔드포인트)를 검증한다:
// 종합판정(verdict)이 항상 채워지는지, 추천 흐름(primaryCandidateId)이
// 3개 후보 중 하나이고 동일 입력에서 결정론적인지, 손금 스킵/성향 없음
// 등 데이터가 부분적으로 빠진 경우에도 안전하게 동작하는지.

const BASE = "http://localhost:3000";

const BIRTH = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" };

const SAMPLE_ONNX_LINES = {
  modelExecuted: true,
  heartLine: { detected: true, length: "보통", curve: "직선에 가까움", depthStrength: "보통", start: { x: 1, y: 1 }, end: { x: 2, y: 2 }, branchDetected: null },
  headLine: { detected: true, length: "보통", curve: "직선에 가까움", depthStrength: "보통", start: { x: 1, y: 1 }, end: { x: 2, y: 2 }, branchDetected: null },
  lifeLine: { detected: true, length: "보통", curve: "완만한 곡선", depthStrength: "보통", start: { x: 1, y: 1 }, end: { x: 2, y: 2 }, branchDetected: null },
  fateLine: { presence: "unknown", note: "" },
  mounts: "unknown",
  marks: "unknown",
};

const SAMPLE_PALM_FACTS = {
  handSide: "right",
  imageQuality: "good",
  handShape: "square",
  majorLines: ["생명선", "감정선", "두뇌선"],
  lineFeatures: [
    { name: "생명선", detected: true, length: "보통", direction: "완만한 곡선", confidence: 0.8 },
    { name: "감정선", detected: true, length: "보통", direction: "직선에 가까움", confidence: 0.8 },
    { name: "두뇌선", detected: true, length: "보통", direction: "직선에 가까움", confidence: 0.8 },
  ],
  onnxLines: SAMPLE_ONNX_LINES,
  confidence: 0.8,
  warnings: [],
};

const CASES = [
  {
    label: "손금+성향 있음",
    body: {
      ...BIRTH,
      palmFacts: SAMPLE_PALM_FACTS,
      mbti: "ENTJ",
      personalityAnswers: { speed: 1, plan: 1, risk: 1, autonomy: 1, spendAwareness: 4, savingConsistency: 1 },
    },
  },
  {
    label: "손금 스킵+성향 없음",
    body: { ...BIRTH, palmFacts: null },
  },
  {
    label: "손금 있음+성향 없음",
    body: { ...BIRTH, palmFacts: SAMPLE_PALM_FACTS },
  },
];

const VALID_IDS = new Set(["wealth_timing", "career_business", "change_opportunity"]);

async function call(body) {
  const res = await fetch(`${BASE}/api/palm/interpret`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function main() {
  let allPass = true;

  for (const c of CASES) {
    const { status, json } = await call(c.body);
    console.log(`\n=== ${c.label} ===`);
    console.log(`status=${status} usable=${json.usable} palmSkipped=${json.palmSkipped}`);

    if (!json.usable) {
      console.log("FAIL: usable=false", JSON.stringify(json));
      allPass = false;
      continue;
    }

    const verdictOk = typeof json.verdict?.text === "string" && json.verdict.text.length > 10;
    console.log(`verdict 존재: ${verdictOk ? "PASS" : "FAIL"} — "${json.verdict?.text?.slice(0, 60)}..."`);
    if (!verdictOk) allPass = false;

    const idOk = VALID_IDS.has(json.primaryCandidateId);
    console.log(`primaryCandidateId(${json.primaryCandidateId}) 유효: ${idOk ? "PASS" : "FAIL"}`);
    if (!idOk) allPass = false;

    const cautionsOk = Array.isArray(json.freeReport?.report?.cautions) && json.freeReport.report.cautions.length >= 1;
    const strengthsOk = Array.isArray(json.freeReport?.report?.strengths) && json.freeReport.report.strengths.length >= 1;
    console.log(`cautions/strengths 존재(미니리딩 티저용): ${cautionsOk && strengthsOk ? "PASS" : "FAIL"}`);
    if (!(cautionsOk && strengthsOk)) allPass = false;

    // 재호출 결정론 확인
    const second = await call(c.body);
    const stable = second.json.primaryCandidateId === json.primaryCandidateId && second.json.verdict?.text === json.verdict?.text;
    console.log(`동일 입력 재호출 결정론: ${stable ? "PASS" : "FAIL"}`);
    if (!stable) allPass = false;
  }

  console.log(`\n\n=== 결과: ${allPass ? "ALL PASS" : "일부 FAIL"} ===`);
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
