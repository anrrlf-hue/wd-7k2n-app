// /api/saju(실제 화면이 호출하는 통합 엔드포인트)를 10개 대표 입력으로
// 검증한다: 개인화(서로 다름), 일관성(동일 입력), 근거 연결, 응답 시간,
// 성향정보(Big5/MBTI) 반영 여부.

const BASE = "http://localhost:3000";

const CASES = [
  { label: "1", year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" },
  { label: "2", year: 1985, month: 11, day: 2, hour: 9, minute: 10, gender: "여" },
  { label: "3", year: 2000, month: 1, day: 1, hour: 0, minute: 0, gender: "남" },
  { label: "4", year: 1978, month: 7, day: 20, hour: null, minute: null, gender: "여" },
  { label: "5", year: 1995, month: 3, day: 8, hour: 23, minute: 45, gender: "남" },
  { label: "6", year: 1972, month: 9, day: 30, hour: 6, minute: 0, gender: "여" },
  { label: "7", year: 2003, month: 12, day: 25, hour: 12, minute: 0, gender: "남" },
  { label: "8", year: 1988, month: 6, day: 17, hour: null, minute: null, gender: "여" },
  { label: "9", year: 1965, month: 2, day: 14, hour: 18, minute: 20, gender: "남" },
  { label: "10", year: 2010, month: 8, day: 3, hour: 4, minute: 15, gender: "여" },
  { label: "1-repeat", year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" },
  {
    label: "1-with-personality",
    year: 1990,
    month: 5,
    day: 15,
    hour: 14,
    minute: 30,
    gender: "남",
    personalityAnswers: { speed: 1, plan: 2, risk: 1, autonomy: 2, spendAwareness: 4, savingConsistency: 1 },
    mbti: "ENTJ",
  },
];

async function call(input) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/saju`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const ms = Date.now() - t0;
  const json = await res.json();
  return { status: res.status, ms, json };
}

async function main() {
  const results = [];
  for (const c of CASES) {
    const r = await call(c);
    results.push({ label: c.label, ...r });
    console.log(`\n=== ${c.label} (${r.ms}ms) ===`);
    if (r.status !== 200) {
      console.log("FAILED", JSON.stringify(r.json, null, 2));
      continue;
    }
    const { resultSource, deep, freeReport, dayPillar } = r.json;
    console.log(`dayPillar=${dayPillar} resultSource=${resultSource} deepSource=${deep?.source ?? "-"} freeReportSource=${freeReport?.source ?? "-"}`);
    if (freeReport) {
      const rep = freeReport.report;
      console.log(`snapshot: ${rep.snapshot.text}`);
      console.log(`temperament: ${rep.temperament.text}`);
      console.log(`wealthStructure: ${rep.wealthStructure.text}`);
      console.log(`bigMoneyAffinity: ${rep.bigMoneyAffinity.text}`);
      console.log(`teamStrength: ${rep.teamStrength.text}`);
      console.log(`soloStrength: ${rep.soloStrength.text}`);
      console.log(`opportunityStyle: ${rep.opportunityStyle.text}`);
      console.log(`strengths: ${rep.strengths.map((s) => s.title).join(", ")}`);
      console.log(`cautions: ${rep.cautions.map((c) => c.title).join(", ")}`);
      console.log(`decisionStyle: ${rep.decisionStyle.text}`);
      console.log(`peopleAndMoney: ${rep.peopleAndMoney.text}`);
    } else {
      console.log("freeReport: 없음(실패)");
    }
  }

  console.log("\n\n=== 검증 ===");
  const distinct = new Set(results.slice(0, 10).map((r) => JSON.stringify(r.json.freeReport?.report)));
  console.log(`서로 다른 10개 입력의 freeReport 고유 결과 개수: ${distinct.size} / 10`);

  const a = results.find((r) => r.label === "1");
  const d = results.find((r) => r.label === "1-repeat");
  const sameFree = JSON.stringify(a.json.freeReport) === JSON.stringify(d.json.freeReport);
  console.log(`1과 1-repeat(동일 입력) freeReport 일관성: ${sameFree ? "일치" : "불일치"}`);

  // 이번 라운드부터 /api/saju의 무료 리포트는 사주 사실만 본다(§3: 손금·
  // 자기응답 비교는 /api/palm/interpret의 triple-compare로 이동) — 그래서
  // personalityAnswers를 보내도 1과 1-with-personality의 freeReport는
  // 동일해야 정상이다(사주 계산 입력 자체가 같으므로).
  const withP = results.find((r) => r.label === "1-with-personality");
  const sameAsBase = JSON.stringify(withP?.json?.freeReport) === JSON.stringify(a?.json?.freeReport);
  console.log(`1-with-personality의 freeReport가 기본 1과 동일한가(성향이 무료 리포트를 더 이상 왜곡하지 않는지) = ${sameAsBase}`);

  // JARGON_IN_TEXT_PATTERNS와 동일한 검사를 mock 출력 10개 전체에 직접
  // 돌려서, LLM 검증 경로를 안 타는 mock도 실제로 전문용어가 안 새는지
  // 확인한다(free-report-schema.ts와 동일 패턴을 수동으로 재현).
  const JARGON_PATTERNS = [
    /재성\s*\d/, /식상\s*\d/, /관성\s*\d/, /비겁\s*\d/, /인성\s*\d/,
    /비겁\+관성/, /재성\+식상/, /건록·제왕/, /격국/, /용신/, /ONNX/i, /MediaPipe/i,
  ];
  const PARAGRAPH_KEYS = [
    "snapshot", "temperament", "wealthStructure", "earningStyle", "keepingStyle", "leakPattern",
    "bigMoneyAffinity", "jobOrientation", "teamStrength", "soloStrength", "peopleAndMoney",
    "decisionStyle", "opportunityStyle",
  ];
  let jargonLeaks = 0;
  for (const r of results) {
    const rep = r.json?.freeReport?.report;
    if (!rep) continue;
    const texts = [
      ...PARAGRAPH_KEYS.map((k) => rep[k]?.text ?? ""),
      ...(rep.strengths ?? []).map((s) => s.detail),
      ...(rep.cautions ?? []).map((c) => c.detail),
    ];
    for (const t of texts) {
      for (const re of JARGON_PATTERNS) {
        if (re.test(t)) {
          jargonLeaks++;
          console.log(`  [jargon leak] case=${r.label} pattern=${re.source} text="${t}"`);
        }
      }
    }
  }
  console.log(`전문용어 노출 검사(text 필드, mock 10개): ${jargonLeaks === 0 ? "PASS (누출 없음)" : `FAIL (${jargonLeaks}건 누출)`}`);

  const latencies = results.filter((r) => r.status === 200).map((r) => r.ms);
  console.log(`응답 시간: min=${Math.min(...latencies)}ms max=${Math.max(...latencies)}ms avg=${Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)}ms`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
