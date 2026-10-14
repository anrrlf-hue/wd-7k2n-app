// Deterministic, offline review artifact for the two launch-quality cases.
import fs from "node:fs";
import "./register-test-typescript.mjs";
import { palmFixture } from "./fixtures/palm-analysis.mjs";

const { computeSajuFacts } = await import("../src/lib/saju-facts.ts");
const { enrichSajuFacts } = await import("../src/lib/oh-my-saju-adapter.ts");
const { buildFreeSajuReport } = await import("../src/lib/free-report-mock.ts");
const { buildPremiumReport } = await import("../src/lib/premium-report.ts");

const referenceDate = new Date("2026-10-13T00:00:00Z");
const cases = [
  { id: "A", year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" },
  { id: "B", year: 1988, month: 12, day: 2, hour: 6, minute: 15, gender: "여" },
];
const leftPalm = { ...structuredClone(palmFixture), handSide: "left" };
const rightPalm = structuredClone(palmFixture);

function renderFree(free) {
  const out = [];
  for (const [key, value] of Object.entries(free)) {
    if (value && typeof value === "object" && "text" in value) out.push(`- ${key}: ${value.text}\n  - 근거: ${value.evidence}`);
    else if (Array.isArray(value)) out.push(`- ${key}:\n${value.map(item => `  - ${item.title}: ${item.detail}\n    - 근거: ${item.evidence}`).join("\n")}`);
    else if (value !== null && value !== undefined) out.push(`- ${key}: ${String(value)}`);
  }
  return out.join("\n");
}
function renderPremium(premium) {
  const out = [
    `버전: ${premium.version}`,
    `제목: ${premium.title}`,
    `요약: ${premium.summary}`,
    `총운: ${premium.overall.paragraphs.join(" ")}`,
    `총운 기회: ${premium.overall.opportunity || "없음"}`,
    `총운 주의: ${premium.overall.caution || "없음"}`,
    `총운 팁: ${premium.overall.tip || "없음"}`,
    `총운 근거: ${premium.overall.basis}`,
  ];
  for (const domain of premium.domains) {
    out.push(`${domain.label} (${domain.key}): ${domain.paragraphs.join(" ")}`, `${domain.label} 기회: ${domain.opportunity || "없음"}`, `${domain.label} 주의: ${domain.caution || "없음"}`, `${domain.label} 팁: ${domain.tip || "없음"}`, `${domain.label} 근거: ${domain.basis}`);
  }
  out.push(`연간 소개: ${premium.annualIntroduction}`, `연간 배경: ${premium.annualBackground ?? "없음"}`, `연간 주요 구간: ${(premium.annualHighlights ?? []).join(", ") || "없음"}`, `연간 방법: ${premium.annualMethod ?? "없음"}`);
  out.push("월별:");
  for (const period of premium.periods) {
    out.push(`- ${period.label}: ${period.reading}\n  - 근거: ${period.basis}`);
    for (const domain of period.domains) out.push(`  - ${domain.label} (${domain.key}): ${domain.text}`);
  }
  out.push(`주의 안내: ${premium.note}`);
  if (premium.closing) out.push(`마무리 기억할 점: ${premium.closing.remember}`, `마무리 질문: ${premium.closing.question}`, `마무리 근거: ${premium.closing.basis}`);
  if (premium.palmConnections?.length) for (const connection of premium.palmConnections) out.push(`손금 연결 ${connection.kind} / ${connection.topic}: ${connection.text}`, `손금 연결 근거: ${connection.evidence.map(e => e.label ?? e.id ?? String(e)).join(", ")}`);
  return out.join("\n");
}

const results = cases.map(({ id, ...birth }) => {
  const facts = enrichSajuFacts(computeSajuFacts(birth), birth);
  const free = buildFreeSajuReport(facts, { mbti: null, check: null });
  const premium = buildPremiumReport({ facts, freeReport: free, referenceDate, leftPalm, rightPalm, dominantHand: "right" });
  return { id, birth, facts, free, premium };
});

const lines = [
  "# 고객 풀이 품질 검수 A/B",
  "",
  `생성 기준일: ${referenceDate.toISOString()}`,
  "생성 방식: ssaju 계산 + 결정론적 오프라인 서술기; MBTI/성향 응답 없음; 합성 손금 fixture만 사용; 사진 인식·외부 전송 없음.",
  "",
];
for (const result of results) {
  const f = result.facts;
  lines.push(`## 사례 ${result.id}`, "", `입력: ${JSON.stringify(result.birth)}`, `명식: ${f.pillars.map(p => p.ganzhi).join(" ")}`,
    `오행: ${JSON.stringify(f.fiveElements)}`, `십성 그룹 수: 비겁 ${f.peerStarCount}, 식상 ${f.outputStarCount}, 재성 ${f.wealthStarCount}, 관성 ${f.officerStarCount}, 인성 ${f.resourceStarCount}`,
    `확인 관계: ${f.keyRelations.join(" / ") || "없음"}`, "", "### 무료 전체 본문", "", renderFree(result.free), "", "### 프리미엄 전체 본문", "", renderPremium(result.premium), "", "### 영역별 근거 매핑", "",
    `- 총운: 오행/강약 및 확인된 관계 → 총운 중심·긴장·일 밖 배움/표현/휴식`,
    `- 연애: 일지·관성·인성·비겁·식상·재성 조합 → ${result.premium.domains.find(d => d.key === "love_relationship")?.paragraphs.join(" ")}`,
    `- 재물: 재성·식상·비겁·관성·인성 수 → 획득/유지/지출`,
    `- 직장: 월주 십성·식상·비겁·인성 → 역할/환경/갈등·완료`,
    `- 월별: 기준일 이후 계산된 세운·월운의 천간/지지 십성 → 기간별 reading/basis`, "");
}
fs.mkdirSync("artifacts", { recursive: true });
fs.writeFileSync("artifacts/customer-reading-quality-20261014.md", lines.join("\n"));
console.log("WROTE artifacts/customer-reading-quality-20261014.md");
