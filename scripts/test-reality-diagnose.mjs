// /api/reality/diagnose(현실정보 입력 후 화면이 호출하는 결제 직전 다리
// 엔드포인트)를 검증한다: 다양한 현실정보 조합에서 진단이 항상 채워지는지,
// matchText/blockedText가 규칙대로 갈리는지, 같은 입력에 결정론적인지.

const BASE = "http://localhost:3000";

const BIRTH = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" };

const BASE_REALITY = {
  jobType: "employee",
  incomeRange: "400_700",
  expenseLevel: "similar",
  savings: "under_10",
  debt: "none",
  mainConcern: "not_saving",
  considering: "none",
};

const CASES = [
  { label: "기본(직장인·빚 없음)", reality: BASE_REALITY },
  { label: "빚 규모 큼(막힘 지점 기대)", reality: { ...BASE_REALITY, debt: "1000_5000" } },
  { label: "막연한 불안(막힘 지점 기대)", reality: { ...BASE_REALITY, mainConcern: "vague_anxiety", debt: "none" } },
  { label: "프리랜서(일치 지점 기대)", reality: { ...BASE_REALITY, jobType: "freelancer", debt: "none" } },
];

async function call(reality) {
  const res = await fetch(`${BASE}/api/reality/diagnose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...BIRTH, reality }),
  });
  return { status: res.status, json: await res.json() };
}

async function main() {
  let allPass = true;

  for (const c of CASES) {
    const { status, json } = await call(c.reality);
    console.log(`\n=== ${c.label} ===`);
    console.log(`status=${status}`);

    const d = json.diagnosis;
    const basicOk = typeof d?.directionText === "string" && d.directionText.length > 5;
    const bridgeOk = typeof d?.bridgeText === "string" && d.bridgeText.length > 5;
    console.log(`directionText/bridgeText 존재: ${basicOk && bridgeOk ? "PASS" : "FAIL"}`);
    if (!(basicOk && bridgeOk)) allPass = false;
    console.log(`directionText: ${d?.directionText}`);
    console.log(`matchText: ${d?.matchText}`);
    console.log(`blockedText: ${d?.blockedText}`);

    const second = await call(c.reality);
    const stable = JSON.stringify(second.json.diagnosis) === JSON.stringify(d);
    console.log(`동일 입력 재호출 결정론: ${stable ? "PASS" : "FAIL"}`);
    if (!stable) allPass = false;
  }

  const debtCase = await call({ ...BASE_REALITY, debt: "over_5000" });
  const debtBlockedOk = typeof debtCase.json.diagnosis?.blockedText === "string" && debtCase.json.diagnosis.blockedText.includes("빚");
  console.log(`\n빚 규모 큼 -> blockedText가 빚을 언급: ${debtBlockedOk ? "PASS" : "FAIL"}`);
  if (!debtBlockedOk) allPass = false;

  const invalid = await fetch(`${BASE}/api/reality/diagnose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...BIRTH, reality: { jobType: "employee" } }),
  });
  const invalidOk = invalid.status === 400;
  console.log(`불완전한 reality 입력 -> 400: ${invalidOk ? "PASS" : "FAIL"}`);
  if (!invalidOk) allPass = false;

  console.log(`\n\n=== 결과: ${allPass ? "ALL PASS" : "일부 FAIL"} ===`);
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
