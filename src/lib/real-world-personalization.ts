// MBTI + 6문항을 "사주에서 계산된 구조가 현실에서 어떻게 나타나는지"를
// 구체화하는 개인화 문단으로 쓴다. 이전 라운드는 MBTI를 triple-compare의
// 네 번째 boolean 신호("J=빠른 결정, F=감정적")로 넣었는데, 이번 요구는
// 그 방식을 명시적으로 금지한다 — 그래서 여기서는 비교/투표가 아니라
// "이 사람의 현실 모습을 설명하는 문장"으로만 쓴다.
//
// MBTI 4축의 정의는 이번에 지어낸 게 아니라 MBTI 자체의 표준 정의를 그대로
// 옮긴 것이다:
//   E/I → 에너지·외부 상호작용 선호
//   S/N → 정보·가능성을 받아들이는 방식
//   T/F → 판단할 때 우선 고려하는 기준
//   J/P → 구조화·계획 선호 vs 열린 선택·유연성
//
// 우선순위 규칙: 6문항(speed/plan/autonomy)이 실제로 답변됐으면 그 직접
// 응답이 "지금 이 사람이 어떻게 움직이는지"의 1차 근거가 된다. MBTI는
// 6문항이 직접 묻지 않는 축(E/I, S/N)을 채우고, 6문항과 겹치는 축(J/P↔
// plan/speed, F/T↔autonomy)에서는 "설명을 더하는 두 번째 시선"으로만
// 쓴다. 둘이 다르면 오류로 취급하지 않고 "상황에 따라 다르게 나타나는
// 두 얼굴"로 그대로 보여준다 — 사주 계산값도, 6문항 응답도 고치지 않는다.

import type { SajuFacts, DaeunAnalysis, TenGodGroup } from "@/lib/saju-facts";
import { TEN_GOD_GROUP } from "@/lib/saju-facts";
import type { ReportParagraph } from "@/lib/free-report-schema";
import { PERSONALITY_CHECK_ITEMS, type PersonalityInput } from "@/lib/personality-check";
import type { MbtiType } from "@/lib/mbti-facts";
import type { OnnxPalmLines } from "@/lib/palm-facts";
import { buildTripleCompare } from "@/lib/triple-compare";
import { daeunFlavor, deriveDaeunShift } from "@/lib/fortune-candidates";
import { dayStemImagery, dayStrengthLabel } from "@/lib/saju-labels";

// 이번 라운드: 원국+대운(daeunAnalysis)+MBTI/6문항+손금을 "지금 이 시기엔
// 이렇게 나타난다"는 하나의 문단으로 묶는다. 손금은 별도 해석을 새로
// 만들지 않고, 이미 있는 triple-compare.ts의 일치/차이/보완 판정을 그대로
// 인용한다 — "손금은 사주와 독립된 두 번째 분석"이라는 기존 원칙을
// 유지하면서, 그 판정 결과를 이 문단 안에서 시기와 엮어 보여주기만 한다.
// 새 점수/판정식은 만들지 않았다: 대운 십성 → 오행 그룹 매핑은 앱 전체가
// 이미 쓰는 비겁/식상/재성/관성/인성 분류 그대로이고, "구조화/관계" 두 축도
// 위에서 이미 계산된 structured/relational 값을 그대로 재사용한다.

/** 대운 십성이 어떤 축(구조화/관계)과 실제로 맞닿는지 + 그 축에서
 * structured·relational이 각각 true/false일 때 이 시기가 어떻게 느껴지는지.
 * 지어낸 점수가 아니라 위에서 이미 derive된 두 boolean을 문장으로만 옮긴다. */
const GROUP_SIGNAL: Record<TenGodGroup, { label: string; axis: "structured" | "relational"; whenTrue: string; whenFalse: string }> = {
  비겁: {
    label: "스스로 밀어붙이고 경쟁하는 힘",
    axis: "relational",
    whenTrue: "주변 의견을 참고한다고 답했다면, 그중 직접 정하고 싶은 부분도 있는지 돌아볼 수 있습니다.",
    whenFalse: "스스로 판단한다고 답했다면, 도움을 받을 부분과 직접 할 부분을 나눠 볼 수 있습니다.",
  },
  식상: {
    label: "표현하고 새로 만들어내는 힘",
    axis: "structured",
    whenTrue: "계획을 선호한다는 응답과 연결하면, 표현하고 싶은 생각을 실행 순서로 적어보는 질문이 됩니다.",
    whenFalse: "유연하게 움직인다는 응답과 연결하면, 떠오른 생각 중 작게 확인할 부분을 골라보는 질문이 됩니다.",
  },
  재성: {
    label: "돈과 기회를 직접 다루는 힘",
    axis: "structured",
    whenTrue: "준비한 기준이 실제 제안을 검토할 때도 쓰이는지 살펴보세요. 수익을 예측한 해석은 아닙니다.",
    whenFalse: "열린 선택을 선호하더라도 돈이 걸린 제안은 조건을 따로 확인해야 합니다. 빠른 실행이 유리하다는 뜻은 아닙니다.",
  },
  관성: {
    label: "책임과 규율, 조직의 힘",
    axis: "structured",
    whenTrue: "계획을 선호한다는 응답을 바탕으로, 현재 역할과 완료 기준이 분명한지 살펴보세요.",
    whenFalse: "유연함을 선호한다는 응답을 바탕으로, 역할은 분명히 하되 방법에는 재량을 둘 수 있는지 살펴보세요.",
  },
  인성: {
    label: "배우고 도움받는 힘",
    axis: "relational",
    whenTrue: "주변 의견을 참고한다고 답했다면, 그 정보의 근거까지 확인하는지 돌아보세요.",
    whenFalse: "혼자 결정한다고 답했다면, 결정권을 유지하면서도 필요한 정보를 구할 수 있는지 돌아보세요.",
  },
};

/** "지금 무엇을 해야 하는가"에 직접 답하는 행동형 문장 1개씩 — GROUP_SIGNAL과
 * 같은 그룹 분류를 쓰되, 서술이 아니라 행동을 말한다(무료 결과 nextMove용). */
const GROUP_ACTION_HINT: Record<TenGodGroup, string> = {
  비겁: "스스로 결정하고 싶은 일과 함께 확인해야 할 일을 나눠 보세요. 이 해석만으로 경쟁이나 독립이 유리하다고 정하지 않습니다.",
  식상: "표현해 보고 싶은 생각이 있다면 부담이 작은 형태로 정리해 보세요. 성과가 보장된다는 뜻은 아닙니다.",
  재성: "돈이 걸린 제안은 조건과 감당할 수 있는 범위를 확인해 보세요. 사주 시기만으로 투자나 계약을 결정하지 않습니다.",
  관성: "현재 맡은 역할과 필요한 약속을 적어보세요. 실행 방법의 자율성과 역할의 명확함은 함께 둘 수 있습니다.",
  인성: "배우거나 확인할 정보가 있다면 출처와 도움받을 범위를 정해 보세요. 도움의 결과를 예측하는 해석은 아닙니다.",
};

function dominantGroup(d: DaeunAnalysis): TenGodGroup | null {
  return TEN_GOD_GROUP[d.tenGods.stem] ?? TEN_GOD_GROUP[d.tenGods.branch] ?? null;
}

function relationsClause(d: DaeunAnalysis): string {
  if (d.relations.length === 0) {
    return "원국과 크게 부딪히거나 합쳐지는 자리는 없어, 비교적 무난하게 흘러가는 시기입니다.";
  }
  return `원국과는 ${d.relations.map((r) => r.detail).join(", ")}이 걸려 있어, 평소와 다르게 움직이는 시기입니다.`;
}

/** 이 시기(대운)와 손금이 같은 방향을 보여주는지, 다른 면을 보여주는지 —
 * 새로 판정하지 않고 triple-compare.ts의 기존 일치/차이/보완 결과를 그대로
 * 가져온다. "손금까지 보면" 같은 도구 라벨 없이, 이미 앞에서 짚은 이야기에
 * 자연스럽게 이어지는 한 문장으로만 얹는다. palm이 없거나 해당 축 비교가
 * 없으면 null. */
function palmAlignmentClause(
  facts: SajuFacts,
  palm: OnnxPalmLines | null,
  check: PersonalityInput["check"],
  axis: "structured" | "relational",
): string | null {
  if (!palm) return null;
  const compareItems = buildTripleCompare(facts, palm, check);
  const topic = axis === "structured" ? "결정하는 방식" : "관계에서 감정이 작용하는 정도";
  const item = compareItems.find((c) => c.topic === topic);
  return item && ["일치", "차이", "보완"].includes(item.kind) ? item.text : null;
}

/** 대운 한 구간 = 사주 신호(대운 십성 그룹) + 원국과의 합충형파해 + 성향
 * fit + (있으면) 손금 정렬까지 한 몸으로 묶은 문단 본문. 현재/다음
 * 대운(buildRealWorldPersonalization)과 생애 10구간(buildLifetimeStory)이
 * 이 조합 로직을 그대로 공유한다 — 같은 사람·같은 시기인데 두 함수가
 * 다른 이야기를 하면 안 되므로. group이 없으면(십성 매핑 실패, 이론상
 * 없음) null. */
function composePeriodNarrative(
  d: DaeunAnalysis,
  structured: boolean | null,
  relational: boolean | null,
  facts: SajuFacts,
  palm: OnnxPalmLines | null,
  check: PersonalityInput["check"],
): { text: string; group: TenGodGroup } | null {
  const group = dominantGroup(d);
  if (!group) return null;
  const signal = GROUP_SIGNAL[group];
  const axisValue = signal.axis === "structured" ? structured : relational;
  const parts = [`지금 이 시기에는 ${signal.label}이 평소보다 더 중요하게 드러납니다.`, relationsClause(d), axisValue === null ? "직접 응답은 한쪽으로 치우치지 않아 행동 방식도 하나로 단정하지 않습니다." : axisValue ? signal.whenTrue : signal.whenFalse];
  const palmClause = palmAlignmentClause(facts, palm, check, signal.axis);
  if (palmClause) parts.push(palmClause);
  return { text: parts.join(" "), group };
}

function ei(mbti: MbtiType): string {
  return mbti[0] === "E"
    ? "사람들과 부딪히고 이야기하면서 에너지를 얻는 사람"
    : "혼자 정리할 시간이 있어야 에너지가 차는 사람";
}

function sn(mbti: MbtiType): string {
  return mbti[1] === "S"
    ? "눈앞의 사실과 경험을 먼저 보고 판단하는 사람"
    : "가능성과 패턴을 먼저 읽고 판단하는 사람";
}

/** plan/speed 6문항 응답 → "구조화 선호" 서술. 6문항이 없으면 null(MBTI로 대체). */
function structureFromCheck(check: PersonalityInput["check"]): string | null {
  if (!check) return null;
  if (check.levels.plan === "중간" || check.levels.speed === "중간") return "계획 또는 결정속도 응답이 중간이어서 양극 중 하나로 묶지 않은 상태";
  if (!["왼쪽", "오른쪽"].includes(check.levels.plan) || !["왼쪽", "오른쪽"].includes(check.levels.speed)) return "계획 또는 결정속도 응답이 미확인인 상태";
  const planned = check.levels.plan === "왼쪽";
  const fast = check.levels.speed === "왼쪽";
  if (planned && fast) return "미리 계획을 세우고 빠르게 결정을 닫는 사람";
  if (planned && !fast) return "계획은 세워두되 결정은 충분히 생각하고 내리는 사람";
  if (!planned && fast) return "즉흥적으로 움직이면서도 결정만큼은 빠르게 내리는 사람";
  return "즉흥적으로 움직이면서 결정도 천천히 여지를 두는 사람";
}

function structureFromMbti(mbti: MbtiType): string {
  return mbti[3] === "J" ? "미리 구조를 짜고 계획대로 움직이는 사람" : "열어두고 상황에 맞춰 움직이는 사람";
}

/** autonomy 6문항 응답 → "관계 영향" 서술. 6문항이 없으면 null(MBTI로 대체). */
function relationFromCheck(check: PersonalityInput["check"]): string | null {
  if (!check) return null;
  if (check.levels.autonomy === "중간") return "관계·의견 영향 응답이 중간이어서 혼자 또는 타인 중심으로 정하지 않은 상태";
  if (!["왼쪽", "오른쪽"].includes(check.levels.autonomy)) return "관계·의견 영향 응답이 미확인인 상태";
  return check.levels.autonomy === "오른쪽"
    ? "결정을 내릴 때 주변 의견에 실제로 영향받는 사람"
    : "결정을 내릴 때 주변 의견보다 스스로 판단을 우선하는 사람";
}

function relationFromMbti(mbti: MbtiType): string {
  return mbti[2] === "F" ? "관계와 그 결정이 미칠 영향을 먼저 헤아리는 사람" : "원칙과 논리를 먼저 따지는 사람";
}

/** 사주 영역(재물/일/관계)마다 이 성향이 다르게 나타나는 실제 장면.
 * structured(계획적)·relational(관계영향) 두 축의 조합 4가지로 나눈다 —
 * MBTI/6문항 자체가 아니라 그 결과로 나온 두 축을 보고 장면을 고른다. */
function realLifeScene(structured: boolean | null, relational: boolean | null, domain: "money" | "work" | "relationship"): string {
  if (structured === null || relational === null) return domain === "money" ? "돈을 쓰는 실제 방식은 거래내역과 따로 비교해 보세요." : "일하는 실제 방식은 업무 상황과 경험을 확인한 뒤 연결할 수 있습니다.";
  const scenes: Record<"money" | "work" | "relationship", [string, string, string, string]> = {
    money: [
      // structured & relational
      "돈 쓰는 계획을 미리 세우고, 그 계획도 가족이나 파트너와 맞춰서 조정합니다.",
      // structured & !relational
      "예산을 스스로 정해두고, 누가 뭐라 해도 그 기준대로 밀고 나갑니다.",
      // !structured & relational
      "정해둔 예산보다 그때그때 주변 상황과 사람에 맞춰 지출이 오갑니다.",
      // !structured & !relational
      "예산을 미리 짜두기보다 필요할 때 스스로 판단해서 씁니다.",
    ],
    work: [
      "일정을 촘촘히 짜두고 팀과 계속 맞춰가며 진행하는 방식이 맞습니다.",
      "혼자 계획을 세우고 그 계획대로 끝까지 밀어붙이는 방식이 맞습니다.",
      "정해진 절차보다 그때그때 분위기에 맞춰 유연하게 움직이는 방식이 맞습니다.",
      "정해진 틀 없이 혼자 판단해서 즉흥적으로 처리하는 방식이 맞습니다.",
    ],
    relationship: [
      "관계에서도 미리 약속을 정해두고, 그 약속을 상대와 함께 지켜나갑니다.",
      "관계에서 자기 기준이 뚜렷해, 상대가 흔들어도 잘 흔들리지 않습니다.",
      "정해진 게 없어도 상대 상황에 맞춰 유연하게 관계를 맞춰갑니다.",
      "관계에서도 자기 리듬대로 움직이고, 상대에게 크게 맞추지 않습니다.",
    ],
  };
  const idx = structured ? (relational ? 0 : 1) : relational ? 2 : 3;
  return `응답을 바탕으로 떠올려 볼 장면: “${scenes[domain][idx]}” 실제 경험과 맞는지 확인해 보세요.`;
}

/** 강점이 약점으로 뒤집히는 지점 — structured/relational 조합별로 다른
 * 문장을 준다(모든 조합에 "과유불급"이 있다는 걸 보여주기 위함). */
function strengthFlip(structured: boolean | null, relational: boolean | null): string {
  if (structured === null || relational === null) return "중립·미확인 응답으로 강점이나 약점을 만들어내지 않았습니다.";
  if (structured && relational) return "다만 계획도 관계도 다 챙기려다 정작 자기 결정을 뒤로 미루는 순간을 조심해야 합니다.";
  if (structured && !relational) return "다만 계획이 틀어지는 상황에서 유독 완고해져, 주변 도움을 놓치기 쉽습니다.";
  if (!structured && relational) return "다만 상황과 사람에 맞추다 보면 정작 자기 기준이 흐려질 때가 있습니다.";
  return "다만 혼자 판단하고 즉흥적으로 움직이다 보면, 중요한 순간에 필요한 정보를 놓치기 쉽습니다.";
}

/** structured(계획적)/relational(관계영향) 두 축을 한 번만 derive해서
 * buildRealWorldPersonalization과 buildLifetimeStory가 똑같이 재사용한다 —
 * 같은 사람인데 두 곳에서 다르게 계산되면 안 되므로 로직을 한 곳에 둔다. */
function derivePersonalityAxes(
  _facts: SajuFacts,
  personality: PersonalityInput,
): { structured: boolean | null; relational: boolean | null } {
  const { mbti, check } = personality;
  void _facts; // Birth information is deliberately not a fallback for missing self-report.
  const structured = check ? check.levels.plan === "왼쪽" ? true : check.levels.plan === "오른쪽" ? false : null : mbti ? mbti[3] === "J" : null;
  // MBTI T/F, saju counts and interpersonal influence are not interchangeable.
  const relational = check?.levels.autonomy === "오른쪽" ? true : check?.levels.autonomy === "왼쪽" ? false : null;

  return { structured, relational };
}

export function buildRealWorldPersonalization(
  facts: SajuFacts,
  personality: PersonalityInput,
): ReportParagraph | null {
  const { mbti, check } = personality;
  if (!mbti && !check) return null;

  const sentences: string[] = [];
  const evidenceParts: string[] = [];

  if (mbti) {
    sentences.push(`입력한 MBTI의 설명으로는 ${ei(mbti)}이고, ${sn(mbti)}에 가깝습니다. 실제 행동을 확인한 정보는 아닙니다.`);
    evidenceParts.push(`MBTI ${mbti}`);
  }

  const structuredText = structureFromCheck(check) ?? (mbti ? structureFromMbti(mbti) : null);
  const relationText = relationFromCheck(check) ?? (mbti ? relationFromMbti(mbti) : null);

  if (structuredText) {
    const fromCheck = structureFromCheck(check) !== null;
    sentences.push(`${fromCheck ? "직접 응답에서는" : "입력한 MBTI 설명에서는"} ${structuredText}입니다.`);
    if (fromCheck && mbti && ["왼쪽", "오른쪽"].includes(check!.levels.plan)) {
      const mbtiStructured = mbti[3] === "J";
      const checkStructured = check!.levels.plan === "왼쪽";
      if (mbtiStructured !== checkStructured) {
        sentences.push("MBTI의 계획 선호 설명과 이번 직접 응답은 다릅니다. 어느 상황을 떠올렸는지 확인해 보세요.");
      }
    }
    evidenceParts.push(fromCheck ? "6문항 speed/plan" : `MBTI ${mbti![3]}`);
  }

  if (relationText) {
    const fromCheck = relationFromCheck(check) !== null;
    sentences.push(`${fromCheck ? "직접 응답에서는" : "입력한 MBTI의 판단 기준 설명에서는"} ${relationText}입니다.`);
    evidenceParts.push(fromCheck ? "6문항 autonomy" : `MBTI ${mbti![2]}`);
  }

  // 두 축(구조화/관계) 조합으로 재물·일·관계 장면을 각각 다르게 만든다 —
  // "사주 본문"에 실제로 personalization이 반영되는 지점.
  const { structured, relational } = derivePersonalityAxes(facts, personality);

  sentences.push(realLifeScene(structured, relational, "money"));
  sentences.push(realLifeScene(structured, relational, "work"));
  sentences.push(strengthFlip(structured, relational));
  if (check) {
    for (const id of ["risk", "spendAwareness", "savingConsistency"]) {
      const item = PERSONALITY_CHECK_ITEMS.find(item => item.id === id)!;
      const level = check.levels[id];
      const response = level === "왼쪽" ? item.leftLabel : level === "오른쪽" ? item.rightLabel : level === "중간" ? "중간" : "미확인";
      sentences.push(`“${item.leftLabel} / ${item.rightLabel}” 문항의 직접 응답은 ${response}입니다.`);
    }
    sentences.push("체감 응답이므로 실제 지출·저축 내역이나 감당 가능한 위험과 구분해 확인하세요.");
  }

  // 대운(지금/다음 시기) 이야기는 nextMove/timingShift 두 필드가 전담한다 —
  // 여기서 같은 사실을 또 말하면 "세 군데서 반복 설명"이 되므로, 이 문단은
  // MBTI/6문항 자체의 특성·장면에만 집중한다.

  return {
    text: sentences.join(" "),
    evidence: evidenceParts.length > 0 ? evidenceParts.join(", ") : "성향체크 없음",
  };
}

export interface LifetimePeriodStory {
  age: number;
  ageRange: string;
  ganzhi: string;
  tenGodGroup: TenGodGroup;
  text: string;
  isCurrent: boolean;
  isNext: boolean;
}

/** 대운 10구간 전체를 MBTI+6문항+손금과 결합한 생애 전체 통합 서사.
 * 무료 결과의 nextMove/timingShift는 현재+다음 대운만 행동/시기 관점으로
 * 짧게 다루고, 이건 그 뒤에 이어지는 심층 해석용 원자료 — composePeriodNarrative/
 * derivePersonalityAxes를 그대로 재사용해 같은 시기를 다르게 설명하는 일이
 * 없게 한다. personality가 전혀 없으면 개인화가 안 되므로 null(사주+대운만
 * 으로는 "통합 서사"라고 부르지 않는다). */
export function buildLifetimeStory(
  facts: SajuFacts,
  personality: PersonalityInput,
  palm: OnnxPalmLines | null = null,
): LifetimePeriodStory[] | null {
  const { mbti, check } = personality;
  if (!mbti && !check) return null;
  if (!facts.daeunAnalysis || facts.daeunAnalysis.length === 0) return null;

  const { structured, relational } = derivePersonalityAxes(facts, personality);

  const stories: LifetimePeriodStory[] = [];
  for (const d of facts.daeunAnalysis) {
    const narrative = composePeriodNarrative(d, structured, relational, facts, palm, check);
    if (!narrative) continue;
    stories.push({
      age: d.age,
      ageRange: `${d.age}세~${d.age + 9}세`,
      ganzhi: d.ganzhi,
      tenGodGroup: narrative.group,
      text: narrative.text,
      isCurrent: d.isCurrent,
      isNext: d.isNext,
    });
  }
  return stories;
}

/** "지금 무엇을 해야 하는가"에 답하는 행동형 문단. facts.currentDaeun(ssaju,
 * 태어난 시간이 있으면 항상 존재)만으로 동작하고, oh-my-saju의
 * daeunAnalysis가 없어도(호출 실패 등) 폴백 없이 정상 작동한다 — "지금 뭘
 * 해야 하는가"는 대운 십성 하나만으로도 답할 수 있는 사실이라, 굳이
 * daeunAnalysis에 의존하게 만들지 않았다. personality가 있으면 구조화 축을
 * 한 문장 더 얹는다. */
export function buildNextMove(facts: SajuFacts, personality: PersonalityInput | null = null): ReportParagraph {
  const { currentDaeun } = facts;
  if (!currentDaeun) {
    return {
      text: "현재 대운 정보가 없어 시기별 행동을 정하지 않았습니다. 지금 하고 싶은 일과 필요한 조건을 실제 상황에서 먼저 확인해 보세요.",
      evidence: "현재 대운 정보 없음 — 원인이나 성과 유불리 추정 안 함",
    };
  }

  const group = TEN_GOD_GROUP[currentDaeun.stemTenGod] ?? TEN_GOD_GROUP[currentDaeun.branchTenGod] ?? null;
  const sentences = [`지금 만 ${facts.currentAge}세, ${currentDaeun.ageRange}세 전후부터 이어지는 이 대운은 ${daeunFlavor(currentDaeun)} 시기입니다.`];

  if (group) {
    sentences.push(GROUP_ACTION_HINT[group]);
    if (personality && (personality.mbti || personality.check)) {
      const { structured } = derivePersonalityAxes(facts, personality);
      sentences.push(
        structured === null ? "계획 선호가 중립 또는 미확인이므로 실행 방식을 정하지 않았습니다. 가능한 일정부터 확인해 보세요." : structured
          ? "평소 계획을 세워두는 사람이니, 이번에는 그 계획을 실행에 옮길 날짜까지 정해두는 게 순서입니다."
          : "평소 즉흥적으로 움직이는 사람이니, 이번에는 마음먹은 그 순간 첫걸음부터 떼는 게 순서입니다.",
      );
    }
  }

  return {
    text: sentences.join(" "),
    evidence: `현재 대운 ${currentDaeun.ganzhi}(${currentDaeun.stemTenGod})`,
  };
}

/** "앞으로 언제 큰 변화가 오는가"에 답하는 문단. facts.nextDaeun(ssaju)만
 * 인용하고, 그 시기가 정말 결이 바뀌는 전환점인지는 fortune-candidates.ts의
 * deriveDaeunShift를 그대로 재사용해 판정한다(새 기준 없음). */
export function buildTimingShift(facts: SajuFacts): ReportParagraph {
  const { nextDaeun } = facts;
  if (!nextDaeun) {
    return {
      text: "다음 대운 정보가 없어 변화 시점이나 현재 흐름의 지속 여부를 판단하지 않았습니다.",
      evidence: "다음 대운 정보 없음",
    };
  }

  const shifts = deriveDaeunShift(facts);
  const text = shifts
    ? `${nextDaeun.ageRange}세부터는 ${daeunFlavor(nextDaeun)} 쪽으로 넘어가면서 결이 한 번 크게 바뀝니다. 지금 익숙한 방식 하나가 그 무렵부터는 슬슬 맞지 않기 시작할 수 있습니다.`
    : `${nextDaeun.ageRange}세로 넘어가도 ${daeunFlavor(nextDaeun)} 흐름은 계속 이어집니다. 큰 전환보다는 지금 방식을 더 깊게 파고드는 것이 맞는 시기입니다.`;

  return { text, evidence: `다음 대운 ${nextDaeun.ganzhi}(${nextDaeun.stemTenGod})` };
}

/** 손금 완료 직후에 보여줄 종합판정 — 지금까지 모인 원국+대운+성향+손금을
 * 하나의 결정적인 문단으로 묶는다. 절대 null을 반환하지 않는다(무료
 * 경험의 클라이맥스라 항상 떠야 한다). personality/palm/daeunAnalysis 중
 * 없는 게 있으면 해당 문장만 조용히 생략한다. 마지막 문장은 이 다음에
 * 나올 "지금 가장 궁금할 흐름" 추천으로 자연스럽게 이어지는 다리 역할을
 * 한다 — 무엇을 더 풀어줄지 예고하되, 광고 카피처럼 부풀리지 않는다. */
export function buildComprehensiveVerdict(
  facts: SajuFacts,
  personality: PersonalityInput | null,
  palm: OnnxPalmLines | null = null,
): ReportParagraph {
  const sentences: string[] = [];
  const evidenceParts: string[] = [`일간 ${facts.dayStemKo}(${facts.dayElement})`, `격국 ${facts.geukguk}`];

  const imagery = dayStemImagery(facts.dayStemKo);
  sentences.push(`당신은 ${imagery.image}처럼 ${imagery.core} 사람입니다. ${dayStrengthLabel(facts.dayStrength)}의 기질이 깔려 있어, 평소에는 유연해 보여도 중요한 순간에는 자기 방식이 분명해질 수 있습니다.`);

  sentences.push(
    facts.wealthOpportunityDaeunCount > 0
      ? "삶의 흐름을 길게 보면 재물과 기회가 부각되는 구간이 몇 차례 들어옵니다. 다만 그 시기 자체보다, 그때 어떤 기준으로 선택하느냐가 더 중요합니다."
      : "한 번의 큰 기회를 기다리기보다, 잘하는 일과 전문성을 오래 쌓아 현실적인 성과로 연결하는 쪽이 더 잘 맞습니다.",
  );

  const currentPeriod = facts.daeunAnalysis?.find((d) => d.isCurrent) ?? null;
  let group: TenGodGroup | null = null;
  if (currentPeriod) {
    group = dominantGroup(currentPeriod);
    if (group) {
      sentences.push(`지금 만 ${facts.currentAge}세, ${currentPeriod.age}세 전후부터 이어지는 흐름에서는 ${GROUP_SIGNAL[group].label}이 평소보다 더 중요하게 작용합니다. ${relationsClause(currentPeriod)}`);
      evidenceParts.push(`현재 대운 ${currentPeriod.ganzhi}(${currentPeriod.tenGods.stem})`);
    }
  } else if (facts.currentDaeun) {
    sentences.push(`지금 만 ${facts.currentAge}세, ${facts.currentDaeun.ageRange}세 전후부터 이어지는 흐름은 ${daeunFlavor(facts.currentDaeun)} 쪽에 무게가 실리는 시기입니다.`);
  }

  if (personality && (personality.mbti || personality.check) && group) {
    const { structured, relational } = derivePersonalityAxes(facts, personality);
    const axisValue = GROUP_SIGNAL[group].axis === "structured" ? structured : relational;
    sentences.push(axisValue === null ? "직접 응답이 중립 또는 미확인이어서 한쪽 행동 성향으로 연결하지 않았습니다." : axisValue ? GROUP_SIGNAL[group].whenTrue : GROUP_SIGNAL[group].whenFalse);
  }

  if (palm && group) {
    const palmClause = palmAlignmentClause(facts, palm, personality?.check ?? null, GROUP_SIGNAL[group].axis);
    if (palmClause) sentences.push(palmClause);
  }

  sentences.push("정리하면, 타고난 성향과 지금의 흐름은 같은 방향만 보여주지는 않습니다. 잘하는 방식은 분명하지만, 그 강점이 과해질 때 어디서 흔들리는지도 함께 보는 것이 이 사람을 더 정확하게 이해하는 핵심입니다.");

  return {
    text: sentences.join(" "),
    evidence: evidenceParts.join(", "),
  };
}
