// 대표 입력 여러 건으로 AI 해석 파이프라인을 검증한다.
// 확인 항목: (1) 서로 다른 입력이 서로 다른 결과를 내는지 (2) 같은 입력은
// 일관적인지 (3) 스키마/금지표현 검증을 통과하는지 (4) evidence가 실제
// facts 필드와 연결되는지. dev 서버(localhost:3000)가 떠 있어야 한다.

const BASE = "http://localhost:3000";

const CASES = [
  { label: "A: 1990-05-15 14:30 남", year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" },
  { label: "B: 1985-11-02 09:10 여", year: 1985, month: 11, day: 2, hour: 9, minute: 10, gender: "여" },
  { label: "C: 2000-01-01 00:00 남", year: 2000, month: 1, day: 1, hour: 0, minute: 0, gender: "남" },
  { label: "D: 1990-05-15 14:30 남 (A와 동일 입력 - 일관성 체크)", year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" },
  { label: "E: 1978-07-20 시간모름 여", year: 1978, month: 7, day: 20, hour: null, minute: null, gender: "여" },
];

async function callInterpret(input) {
  const res = await fetch(`${BASE}/api/saju/interpret`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  return { status: res.status, json };
}

function printResult(label, result) {
  console.log(`\n=== ${label} ===`);
  if (result.status !== 200) {
    console.log("FAILED", result.status, JSON.stringify(result.json, null, 2));
    return;
  }
  const { source, interpretation, facts } = result.json;
  console.log(`source=${source}`);
  console.log(`facts: dayStem=${facts.dayStemKo} strength=${facts.dayStrength} geukguk=${facts.geukguk} wealthStars=${facts.wealthStarCount} peerStars=${facts.peerStarCount} outputStars=${facts.outputStarCount}`);
  console.log(`summary: ${interpretation.summary}`);
  console.log(`money_style: ${interpretation.money_style}`);
  console.log(`earning_style: ${interpretation.earning_style}`);
  console.log(`career_business: ${interpretation.career_business}`);
  console.log(`timing: ${interpretation.timing}`);
  console.log(`action: ${interpretation.action}`);
  console.log(`evidence: ${JSON.stringify(interpretation.evidence)}`);
}

async function main() {
  const results = [];
  for (const c of CASES) {
    const r = await callInterpret(c);
    results.push({ label: c.label, ...r });
    printResult(c.label, r);
  }

  console.log("\n\n=== 검증 ===");

  // 1) 서로 다른 입력(A,B,C,E)이 서로 다른 summary를 내는지
  const distinctSummaries = new Set(
    results.filter((r) => ["A", "B", "C", "E"].some((k) => r.label.startsWith(k))).map((r) => r.json.interpretation?.summary),
  );
  console.log(`서로 다른 입력의 고유 summary 개수: ${distinctSummaries.size} / 4 (4개면 전부 다름)`);

  // 2) 같은 입력(A vs D)이 같은 결과인지
  const a = results.find((r) => r.label.startsWith("A"));
  const d = results.find((r) => r.label.startsWith("D"));
  const consistent = JSON.stringify(a.json.interpretation) === JSON.stringify(d.json.interpretation);
  console.log(`A와 D(동일 입력) 일관성: ${consistent ? "일치 (통과)" : "불일치 (실패)"}`);

  // 3) evidence가 실제 facts 필드값을 포함하는지 (dayStemKo가 evidence 어딘가에 등장하는지)
  for (const r of results) {
    if (r.status !== 200) continue;
    const { facts, interpretation } = r.json;
    const evidenceText = interpretation.evidence.join(" ");
    const linked = evidenceText.includes(facts.dayStemKo) && evidenceText.includes(facts.geukguk);
    console.log(`${r.label}: evidence가 dayStem/geukguk과 연결됨 = ${linked}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
