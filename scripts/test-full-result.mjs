// /api/saju(실제 화면이 호출하는 통합 엔드포인트)를 5개 대표 입력으로
// 검증한다: 개인화(서로 다름), 일관성(동일 입력), 근거 연결, 응답 시간.

const BASE = "http://localhost:3000";

const CASES = [
  { label: "A", year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" },
  { label: "B", year: 1985, month: 11, day: 2, hour: 9, minute: 10, gender: "여" },
  { label: "C", year: 2000, month: 1, day: 1, hour: 0, minute: 0, gender: "남" },
  { label: "D(=A 재실행)", year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" },
  { label: "E(시간모름)", year: 1978, month: 7, day: 20, hour: null, minute: null, gender: "여" },
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
    const { resultSource, deep, tendency, dayPillar } = r.json;
    console.log(`dayPillar=${dayPillar} resultSource=${resultSource} deepSource=${deep?.source ?? "-"}`);
    if (deep) {
      console.log(`summary: ${deep.interpretation.summary}`);
      console.log(`evidencePreview: ${JSON.stringify(deep.evidencePreview)}`);
    } else {
      console.log(`fallback tendency.wealthType: ${tendency.wealthType}`);
    }
  }

  console.log("\n\n=== 검증 ===");
  const distinct = new Set(
    results.filter((r) => ["A", "B", "C", "E"].includes(r.label.replace(/\(.*\)/, ""))).map((r) => JSON.stringify(r.json.deep?.interpretation ?? r.json.tendency)),
  );
  console.log(`서로 다른 4개 입력의 고유 결과 개수: ${distinct.size} / 4`);

  const a = results.find((r) => r.label === "A");
  const d = results.find((r) => r.label.startsWith("D"));
  const same = JSON.stringify(a.json.deep) === JSON.stringify(d.json.deep) && a.json.dayPillar === d.json.dayPillar;
  console.log(`A와 D(동일 입력) 일관성: ${same ? "일치" : "불일치"}`);

  const latencies = results.filter((r) => r.status === 200).map((r) => r.ms);
  console.log(`응답 시간: min=${Math.min(...latencies)}ms max=${Math.max(...latencies)}ms avg=${Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)}ms`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
