import fs from "node:fs";

const source = "docs/verification/saju-product-quality-2026-10-14.json";
const artifact = JSON.parse(fs.readFileSync(source, "utf8"));
const lines = [
  "# 사주 종합 상품 품질 — 실제 실행 결과",
  "",
  `기준일: ${artifact.referenceDate}`,
  "실행: 결정론적 오프라인 계산; MBTI/성향 응답 없음; 외부 API·개인정보 전송 없음.",
  "이 문서는 합성 사례의 실제 고객 출력과 계산 근거를 보존한 검증 artifact입니다. 예측 보장이나 90점 달성 주장이 아닙니다.",
  "",
];
for (const output of artifact.outputs) {
  const facts = output.premium.periods[0]?.symbols ? output.premium.periods[0].symbols : null;
  lines.push(`## ${output.id}`, "", `입력: ${JSON.stringify(output.birth)}`, `계산 집계: ${JSON.stringify(artifact.cases.find(item => item.id === output.id)?.counts)}`, `현재 대운: ${JSON.stringify(artifact.cases.find(item => item.id === output.id)?.currentDaeun)}`, "");
  lines.push("### 무료 전체 출력", "");
  for (const [key, value] of Object.entries(output.free)) {
    if (value && typeof value === "object" && "text" in value) lines.push(`#### ${key}`, "", value.text, "", `근거: ${value.evidence}`, "");
  }
  lines.push("### 프리미엄 종합 출력", "", `버전: ${output.premium.version}`, `제목: ${output.premium.title}`, "", "#### 전체", "", ...output.premium.overall.paragraphs, "", `근거: ${output.premium.overall.basis}`, "");
  for (const domain of output.premium.domains) {
    lines.push(`#### ${domain.label}`, "", `소제목: ${domain.headline}`, "", ...domain.paragraphs, "", `근거: ${domain.basis}`, "");
  }
  lines.push("#### 12개월", "");
  for (const period of output.premium.periods) {
    lines.push(`##### ${period.label}`, "", period.reading, "", `근거: ${period.basis}`, "");
    for (const domain of period.domains ?? []) lines.push(`- ${domain.label}: ${domain.text}`);
    lines.push("");
  }
}
lines.push("## 검증 경계", "", artifact.boundary, "", "손금 전체 인식 품질·다른 명식 전반·실서비스 배포 상태는 이 artifact의 검증 범위가 아닙니다.");
fs.writeFileSync("docs/verification/saju-product-quality-2026-10-14.md", lines.join("\n"));
console.log("WROTE docs/verification/saju-product-quality-2026-10-14.md");
