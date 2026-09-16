// 재물 유형(작업 B) 분포 검증. wealthType.code는 4개 값(ACCUM/LEAK/HOLD/
// TIGHT)만 가능한데, 이 4개가 실제로 다 나오는(=버는힘/지키는힘 공식이
// 한쪽으로 쏠려있지 않은) 생년월일 조합이 있는지 규칙적으로(무작위 아님)
// 순회해서 확인한다.

const BASE = "http://localhost:3000";

function makeCase(i) {
  return {
    year: 1960 + i,
    month: (i % 12) + 1,
    day: (i % 28) + 1,
    hour: i % 2 === 0 ? (i * 3) % 24 : null,
    minute: 0,
    gender: i % 2 === 0 ? "남" : "여",
  };
}

async function call(body) {
  const res = await fetch(`${BASE}/api/saju`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function main() {
  const N = 40;
  const distribution = { ACCUM: 0, LEAK: 0, HOLD: 0, TIGHT: 0, missing: 0 };

  for (let i = 0; i < N; i++) {
    const { status, json } = await call(makeCase(i));
    if (status !== 200 || !json.wealthType) {
      distribution.missing++;
      continue;
    }
    distribution[json.wealthType.code] = (distribution[json.wealthType.code] ?? 0) + 1;
  }

  console.log(`\n=== 재물 유형 분포 (${N}건 규칙적 순회) ===`);
  console.log(JSON.stringify(distribution, null, 2));

  const allFourAppeared = ["ACCUM", "LEAK", "HOLD", "TIGHT"].every((code) => distribution[code] > 0);
  console.log(`\n4개 유형 전부 최소 1회 이상 등장: ${allFourAppeared ? "PASS" : "FAIL"}`);

  process.exit(allFourAppeared ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
