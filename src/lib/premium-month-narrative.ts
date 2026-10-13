import { TEN_GOD_GROUP, type PillarFact, type SajuFacts, type TenGodGroup } from "@/lib/saju-facts";
import { describeAnnualMonthSymbols, type AnnualMonthSymbols, type SajuAnnualMonthOutlook } from "@/lib/saju-timing";
import { buildContextualMonthReading } from "@/lib/premium-context-reading";
import { validateReadingPlan, type ReadingPlan } from "@/lib/reading-plan";
import { eunNeun, eulReul, gwaWa } from "@/lib/korean-particle";

type SymbolMeaning = { subject: string; question: string; scene: string };

/** These are traditional interpretive questions, not predicted experiences.
 * Keep 정/편 and the stem/branch roles intact instead of flattening both into
 * one of five large groups. */
const MEANING: Record<string, SymbolMeaning> = {
  비견: { subject: "자기 판단과 동등한 몫", question: "내가 직접 정할 부분은 무엇인가", scene: "가령 둘 이상의 방법 가운데 하나를 먼저 골라야 한다면, 자기 기준을 말로 설명해볼 수 있습니다." },
  겁재: { subject: "함께 움직일 사람과 나눌 몫", question: "누구와 어떤 몫을 나눌 것인가", scene: "가령 함께 진행하는 일의 속도가 달라졌다면, 각자가 맡을 부분을 다시 바라볼 수 있습니다." },
  식신: { subject: "꾸준히 만들어 보여줄 결과", question: "계속 만들 수 있는 결과는 무엇인가", scene: "가령 이미 익숙한 일을 이어간다면, 한 번 잘된 결과와 반복해 낼 수 있는 결과를 나눠볼 수 있습니다." },
  상관: { subject: "기존 설명을 고쳐 새롭게 표현하는 일", question: "무엇을 다르게 설명하거나 고칠 것인가", scene: "가령 기존 제안을 수정하고 싶다면, 무엇이 달라졌는지를 상대가 볼 수 있는 예로 설명해볼 수 있습니다." },
  편재: { subject: "여러 가능성 사이의 자원과 쓰임", question: "어느 가능성에 시간과 자원을 둘 것인가", scene: "가령 한 결과에 여러 쓰임이 떠오른다면, 반응의 크기와 실제 들일 자원을 따로 살펴볼 수 있습니다." },
  정재: { subject: "반복할 수 있는 쓰임과 교환 조건", question: "계속 쓰거나 지킬 조건은 무엇인가", scene: "가령 자주 쓰는 방법의 조건을 검토한다면, 한 번의 만족과 지속할 비용을 구분해볼 수 있습니다." },
  편관: { subject: "낯선 요구와 압박 속의 책임", question: "새 요구에 답할 권한과 지원은 있는가", scene: "가령 낯선 기준이 제시됐다면, 요구의 크기를 자신의 능력 평가로 옮기기 전에 필요한 권한을 살펴볼 수 있습니다." },
  정관: { subject: "정해진 역할과 일관된 약속", question: "이미 정한 약속의 기준은 무엇인가", scene: "가령 이미 정한 역할을 이어간다면, 지킬 기준과 새로 더해진 요구를 구분해볼 수 있습니다." },
  편인: { subject: "익숙한 설명 밖의 다른 이해", question: "기존 설명과 다른 관점이 선택을 바꾸는가", scene: "가령 익숙한 설명과 다른 조언을 들었다면, 그것이 실제 판단을 바꿀 근거인지 살펴볼 수 있습니다." },
  정인: { subject: "검증해 익힐 설명과 도움", question: "무엇을 배우거나 누구의 도움을 확인할 것인가", scene: "가령 배운 내용을 적용할 자리를 고른다면, 이미 확인한 설명과 아직 필요한 도움을 나눠볼 수 있습니다." },
};

const PILLAR_LABEL: Record<PillarFact["pillar"], string> = { year: "연", month: "월", day: "일", hour: "시" };

function subject(god: string | null): string {
  return MEANING[god ?? ""]?.subject ?? "확인되지 않은 주제";
}

export function traditionalSymbolSubject(god: string | null): string {
  return subject(god);
}

function group(god: string | null): TenGodGroup | null {
  return god ? TEN_GOD_GROUP[god] ?? null : null;
}

function natalAnchor(facts: SajuFacts, god: string | null) {
  if (!god) return null;
  const candidates = facts.pillars.filter(p => facts.hasTimeInput || p.pillar !== "hour");
  for (const pillar of candidates) {
    for (const [part, tenGod] of [["stem", pillar.stemTenGod], ["branch", pillar.branchTenGod]] as const) {
      if (tenGod === god) return { pillar, part, exact: true };
    }
  }
  for (const pillar of candidates) {
    for (const [part, tenGod] of [["stem", pillar.stemTenGod], ["branch", pillar.branchTenGod]] as const) {
      if (group(tenGod) === group(god)) return { pillar, part, exact: false };
    }
  }
  return null;
}

/** The public monthly score remains unchanged. This layer allocates distinct
 * meaning to its exact month stem, branch, year background and confirmed natal
 * positions, so adjacent months are not copies with a changed date. */
export function buildPremiumMonthNarrative(
  facts: SajuFacts,
  month: SajuAnnualMonthOutlook,
  previous: SajuAnnualMonthOutlook | null,
): { plan: ReadingPlan; symbols: AnnualMonthSymbols } {
  const base = buildContextualMonthReading(facts, month);
  const symbols = describeAnnualMonthSymbols(facts, month);
  const before = previous ? describeAnnualMonthSymbols(facts, previous) : null;
  const { stemTenGod: stem, branchTenGod: branch } = symbols.month;
  const stemMeaning = MEANING[stem ?? ""], branchMeaning = MEANING[branch ?? ""];
  if (!stem || !branch || !stemMeaning || !branchMeaning) return { plan: base, symbols };

  const evidence = [...base.evidence,
    { id: "month-stem", kind: "calculated" as const, source: "monthly pillar stem compared with facts.dayStem", value: `${symbols.month.stem}:${stem}` },
    { id: "month-branch", kind: "calculated" as const, source: "monthly branch main hidden stem compared with facts.dayStem", value: `${symbols.month.branch}:${branch}` },
    { id: "year-symbols", kind: "calculated" as const, source: "annual pillar compared with facts.dayStem", value: `${symbols.year.ganzhi}:${symbols.year.stemTenGod ?? "미확인"}/${symbols.year.branchTenGod ?? "미확인"}` },
  ];
  const passages: ReadingPlan["passages"] = [];
  const add = (id: string, text: string, evidenceIds: string[], kind: "traditional" | "reflection" = "traditional") =>
    passages.push({ id, text, evidenceIds, kind });

  const sameGroup = group(stem) === group(branch);
  add("month-symbol-composition",
    `월운 ${symbols.month.ganzhi}에서는 천간의 ${stem}에서 ${stemMeaning.subject}${eulReul(stemMeaning.subject)} 먼저 읽고, 지지의 ${branch}에서 ${branchMeaning.subject}${eulReul(branchMeaning.subject)} 그 바탕으로 읽습니다.${sameGroup ? " 같은 큰 주제라도 정편과 자리의 차이를 함께 살핍니다." : ""}`,
    ["month-stem", "month-branch"]);

  const stemAnchor = natalAnchor(facts, stem);
  const anchor = stemAnchor ?? natalAnchor(facts, branch);
  const anchorTarget = stemAnchor ? stem : branch;
  if (anchor) {
    const anchorGod = anchor.part === "stem" ? anchor.pillar.stemTenGod : anchor.pillar.branchTenGod;
    const label = `${PILLAR_LABEL[anchor.pillar.pillar]}${anchor.part === "stem" ? "간" : "지"} ${Array.from(anchor.pillar.ganzhi)[anchor.part === "stem" ? 0 : 1]}`;
    evidence.push({ id: "natal-anchor", kind: "calculated", source: `facts.pillars.${anchor.pillar.pillar}.${anchor.part}TenGod`, value: `${label}:${anchorGod}` });
    const area = { year: "익숙한 환경", month: "사회적 역할", day: "가까운 관계", hour: "생각을 마무리하는 방식" }[anchor.pillar.pillar];
    add("month-natal-link", anchor.exact
      ? `원국의 ${label}에도 ${anchorGod}이 보입니다. ${area}의 자리와 이달의 질문을 연결해 읽는 근거입니다.`
      : `원국의 ${label}에는 같은 큰 범주의 ${anchorGod}이 있습니다. 정편이 다르므로 ${subject(anchorGod)}${gwaWa(subject(anchorGod))} ${subject(anchorTarget)}${eulReul(subject(anchorTarget))} 같은 방식으로 다루지 않는 참고가 됩니다.`,
      ["natal-anchor", "month-stem", "month-branch"]);
  }

  if (before && group(before.month.stemTenGod) === group(stem) && group(before.month.branchTenGod) === group(branch)
    && (before.month.stemTenGod !== stem || before.month.branchTenGod !== branch)) {
    evidence.push({ id: "previous-month-symbols", kind: "calculated", source: "previous annual month pillar compared with facts.dayStem", value: `${before.month.ganzhi}:${before.month.stemTenGod ?? "미확인"}/${before.month.branchTenGod ?? "미확인"}` });
    add("month-precise-contrast", `앞 구간 월운 ${before.month.ganzhi}와 다섯 큰 범주는 같아도 정편은 다릅니다. 앞 구간은 ${before.month.stemTenGod}·${before.month.branchTenGod}, 이번 구간은 ${stem}·${branch}입니다. 이번 월간에서는 ${subject(before.month.stemTenGod)} 대신 ${stemMeaning.subject}${eulReul(stemMeaning.subject)}, 월지에서는 ${subject(before.month.branchTenGod)} 대신 ${branchMeaning.subject}${eulReul(branchMeaning.subject)} 묻습니다.`,
      ["previous-month-symbols", "month-stem", "month-branch"], "reflection");
  }
  if (before && before.year.ganzhi !== symbols.year.ganzhi) {
    evidence.push({ id: "previous-year-symbols", kind: "calculated", source: "previous annual pillar compared with facts.dayStem", value: `${before.year.ganzhi}:${before.year.stemTenGod ?? "미확인"}/${before.year.branchTenGod ?? "미확인"}` });
    add("year-background-change", `세운의 계산 배경이 앞 구간 ${before.year.ganzhi}에서 이번 ${symbols.year.ganzhi}로 바뀝니다. 앞에서는 ${subject(before.year.stemTenGod)}${gwaWa(subject(before.year.stemTenGod))} ${subject(before.year.branchTenGod)}${eulReul(subject(before.year.branchTenGod))}, 이제는 ${subject(symbols.year.stemTenGod)}${gwaWa(subject(symbols.year.stemTenGod))} ${subject(symbols.year.branchTenGod)}${eulReul(subject(symbols.year.branchTenGod))} 배경으로 둡니다. 같은 월별 주제도 이전 연 배경의 연장으로만 읽지 않습니다.`,
      ["previous-year-symbols", "year-symbols"], "traditional");
  }
  add("month-decision-scene", `${stemMeaning.scene} 월지의 ${branch}${eunNeun(branch)} 이때 ‘${branchMeaning.question}’도 묻게 합니다.`,
    ["month-stem", "month-branch"], "reflection");

  const plan: ReadingPlan = {
    ...base,
    headline: `${stemMeaning.subject} · ${branchMeaning.subject}`,
    evidence, passages,
  };
  validateReadingPlan(plan);
  return { plan, symbols };
}
