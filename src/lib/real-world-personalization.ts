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
import type { PersonalityInput } from "@/lib/personality-check";
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
    whenTrue: "평소에는 주변 의견을 먼저 살피지만, 이 시기에는 스스로 밀어붙이려는 마음이 더 강해집니다.",
    whenFalse: "원래도 스스로 판단하고 움직이는 편인데, 이 시기에는 그 색이 한층 짙어집니다.",
  },
  식상: {
    label: "표현하고 새로 만들어내는 힘",
    axis: "structured",
    whenTrue: "미리 계획하고 준비해온 것을 실제로 밀고 나가면 결과로 이어지는 시기입니다.",
    whenFalse: "즉흥적으로 떠오른 생각을 바로 행동으로 옮기는 쪽이 오히려 잘 먹히는 시기입니다.",
  },
  재성: {
    label: "돈과 기회를 직접 다루는 힘",
    axis: "structured",
    whenTrue: "미리 준비해둔 만큼 이 시기의 기회를 실제로 붙잡습니다.",
    whenFalse: "예상 밖에서 오는 기회에 빠르게 올라타는 쪽이 이 시기에는 더 맞습니다.",
  },
  관성: {
    label: "책임과 규율, 조직의 힘",
    axis: "structured",
    whenTrue: "원래 구조와 계획을 선호하는 사람이라, 이 시기의 책임과 규율이 오히려 편하게 느껴집니다.",
    whenFalse: "원래 열어두고 움직이는 사람이라, 이 시기의 규율과 책임이 평소보다 답답하게 느껴질 수 있습니다.",
  },
  인성: {
    label: "배우고 도움받는 힘",
    axis: "relational",
    whenTrue: "주변 도움을 잘 받는 사람이라, 이 시기에는 그 도움이 유독 크게 작용합니다.",
    whenFalse: "스스로 판단하는 사람이라, 이 시기에 누군가의 도움을 받는 게 오히려 낯설 수 있습니다.",
  },
};

/** "지금 무엇을 해야 하는가"에 직접 답하는 행동형 문장 1개씩 — GROUP_SIGNAL과
 * 같은 그룹 분류를 쓰되, 서술이 아니라 행동을 말한다(무료 결과 nextMove용). */
const GROUP_ACTION_HINT: Record<TenGodGroup, string> = {
  비겁: "지금은 남 눈치보다 하고 싶은 것을 직접 밀어붙이는 쪽이 유리합니다. 경쟁을 피하기보다 정면으로 부딪히는 게 순서입니다.",
  식상: "머릿속에만 있던 것을 지금 실제로 꺼내 보이는 게 순서입니다. 완성도보다 일단 보여주는 쪽이 이 시기의 힘이 됩니다.",
  재성: "지금 들어오는 제안이나 기회는 미루지 말고 바로 검토해야 합니다. 망설이는 사이 다른 사람이 먼저 잡습니다.",
  관성: "지금은 확실한 자리와 역할을 만드는 데 집중해야 합니다. 승진이나 계약처럼 인정받는 자리를 먼저 챙기면 나머지는 따라옵니다.",
  인성: "지금은 혼자 다 하려 하지 말고 배우거나 도와줄 사람을 곁에 두는 게 순서입니다. 그 관계가 이 시기의 실제 자산이 됩니다.",
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
  return item ? item.text : null;
}

/** 대운 한 구간 = 사주 신호(대운 십성 그룹) + 원국과의 합충형파해 + 성향
 * fit + (있으면) 손금 정렬까지 한 몸으로 묶은 문단 본문. 현재/다음
 * 대운(buildRealWorldPersonalization)과 생애 10구간(buildLifetimeStory)이
 * 이 조합 로직을 그대로 공유한다 — 같은 사람·같은 시기인데 두 함수가
 * 다른 이야기를 하면 안 되므로. group이 없으면(십성 매핑 실패, 이론상
 * 없음) null. */
function composePeriodNarrative(
  d: DaeunAnalysis,
  structured: boolean,
  relational: boolean,
  facts: SajuFacts,
  palm: OnnxPalmLines | null,
  check: PersonalityInput["check"],
): { text: string; group: TenGodGroup } | null {
  const group = dominantGroup(d);
  if (!group) return null;
  const signal = GROUP_SIGNAL[group];
  const axisValue = signal.axis === "structured" ? structured : relational;
  const parts = [`${signal.label}이 강해지는 시기입니다.`, relationsClause(d), axisValue ? signal.whenTrue : signal.whenFalse];
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
function realLifeScene(structured: boolean, relational: boolean, domain: "money" | "work" | "relationship"): string {
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
  return scenes[domain][idx];
}

/** 강점이 약점으로 뒤집히는 지점 — structured/relational 조합별로 다른
 * 문장을 준다(모든 조합에 "과유불급"이 있다는 걸 보여주기 위함). */
function strengthFlip(structured: boolean, relational: boolean): string {
  if (structured && relational) return "다만 계획도 관계도 다 챙기려다 정작 자기 결정을 뒤로 미루는 순간을 조심해야 합니다.";
  if (structured && !relational) return "다만 계획이 틀어지는 상황에서 유독 완고해져, 주변 도움을 놓치기 쉽습니다.";
  if (!structured && relational) return "다만 상황과 사람에 맞추다 보면 정작 자기 기준이 흐려질 때가 있습니다.";
  return "다만 혼자 판단하고 즉흥적으로 움직이다 보면, 중요한 순간에 필요한 정보를 놓치기 쉽습니다.";
}

/** structured(계획적)/relational(관계영향) 두 축을 한 번만 derive해서
 * buildRealWorldPersonalization과 buildLifetimeStory가 똑같이 재사용한다 —
 * 같은 사람인데 두 곳에서 다르게 계산되면 안 되므로 로직을 한 곳에 둔다. */
function derivePersonalityAxes(
  facts: SajuFacts,
  personality: PersonalityInput,
): { structured: boolean; relational: boolean } {
  const { mbti, check } = personality;
  const structuredText = structureFromCheck(check) ?? (mbti ? structureFromMbti(mbti) : null);
  const relationText = relationFromCheck(check) ?? (mbti ? relationFromMbti(mbti) : null);

  const structured = structuredText
    ? (structureFromCheck(check) !== null ? check!.levels.plan === "왼쪽" : mbti![3] === "J")
    : facts.dayStrength === "strong";
  const relational = relationText
    ? (relationFromCheck(check) !== null ? check!.levels.autonomy === "오른쪽" : mbti![2] === "F")
    : facts.officerStarCount + facts.resourceStarCount > facts.peerStarCount + facts.outputStarCount;

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
    sentences.push(`${ei(mbti)}이고, ${sn(mbti)}입니다.`);
    evidenceParts.push(`MBTI ${mbti}`);
  }

  const structuredText = structureFromCheck(check) ?? (mbti ? structureFromMbti(mbti) : null);
  const relationText = relationFromCheck(check) ?? (mbti ? relationFromMbti(mbti) : null);

  if (structuredText) {
    const fromCheck = structureFromCheck(check) !== null;
    sentences.push(`${structuredText}입니다.`);
    if (fromCheck && mbti) {
      const mbtiStructured = mbti[3] === "J";
      const checkStructured = check!.levels.plan === "왼쪽";
      if (mbtiStructured !== checkStructured) {
        sentences.push("다만 익숙한 일과 낯선 일에서는 태도가 갈립니다 — 상황에 따라 다른 얼굴이 나올 수 있습니다.");
      }
    }
    evidenceParts.push(fromCheck ? "6문항 speed/plan" : `MBTI ${mbti![3]}`);
  }

  if (relationText) {
    const fromCheck = relationFromCheck(check) !== null;
    sentences.push(`${relationText}입니다.`);
    evidenceParts.push(fromCheck ? "6문항 autonomy" : `MBTI ${mbti![2]}`);
  }

  // 두 축(구조화/관계) 조합으로 재물·일·관계 장면을 각각 다르게 만든다 —
  // "사주 본문"에 실제로 personalization이 반영되는 지점.
  const { structured, relational } = derivePersonalityAxes(facts, personality);

  sentences.push(realLifeScene(structured, relational, "money"));
  sentences.push(realLifeScene(structured, relational, "work"));
  sentences.push(strengthFlip(structured, relational));

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
      text: "출생시간이 없어 지금 대운까지는 짚어드리기 어렵습니다. 다만 이 사주는 성과가 눈에 보이는 쪽으로 움직이는 것이 유리합니다.",
      evidence: "대운 정보 없음(출생시간 미상)",
    };
  }

  const group = TEN_GOD_GROUP[currentDaeun.stemTenGod] ?? TEN_GOD_GROUP[currentDaeun.branchTenGod] ?? null;
  const sentences = [`${currentDaeun.ageRange}세부터 이어지는 지금 대운은 ${daeunFlavor(currentDaeun)} 시기입니다.`];

  if (group) {
    sentences.push(GROUP_ACTION_HINT[group]);
    if (personality && (personality.mbti || personality.check)) {
      const { structured } = derivePersonalityAxes(facts, personality);
      sentences.push(
        structured
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
      text: "다음 대운은 아직 계산되지 않았습니다. 지금 흐름이 당분간 그대로 이어진다고 보시면 됩니다.",
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
  sentences.push(`이 사주는 ${imagery.image}처럼 ${imagery.core} 사람의 사주입니다. ${dayStrengthLabel(facts.dayStrength)}이고, ${facts.geukguk}을 타고났습니다.`);

  sentences.push(
    facts.wealthOpportunityDaeunCount > 0
      ? "평생 대운을 보면 재물이 크게 움직이는 시기가 여러 번 옵니다. 돈과 인연이 없는 사주는 아닙니다."
      : "재물이 저절로 붙는 사주는 아니지만, 그만큼 본업과 전문성을 무기로 버는 힘이 큽니다.",
  );

  const currentPeriod = facts.daeunAnalysis?.find((d) => d.isCurrent) ?? null;
  let group: TenGodGroup | null = null;
  if (currentPeriod) {
    group = dominantGroup(currentPeriod);
    if (group) {
      sentences.push(`지금 대운에서는 ${GROUP_SIGNAL[group].label}이 강해집니다. ${relationsClause(currentPeriod)}`);
      evidenceParts.push(`현재 대운 ${currentPeriod.ganzhi}(${currentPeriod.tenGods.stem})`);
    }
  } else if (facts.currentDaeun) {
    sentences.push(`${facts.currentDaeun.ageRange}세부터 이어지는 지금 대운은 ${daeunFlavor(facts.currentDaeun)} 시기입니다.`);
  }

  if (personality && (personality.mbti || personality.check) && group) {
    const { structured, relational } = derivePersonalityAxes(facts, personality);
    const axisValue = GROUP_SIGNAL[group].axis === "structured" ? structured : relational;
    sentences.push(axisValue ? GROUP_SIGNAL[group].whenTrue : GROUP_SIGNAL[group].whenFalse);
  }

  if (palm && group) {
    const palmClause = palmAlignmentClause(facts, palm, personality?.check ?? null, GROUP_SIGNAL[group].axis);
    if (palmClause) sentences.push(palmClause);
  }

  sentences.push("지금 이 사주에서 가장 먼저 봐야 할 부분은 정해졌습니다. 이어서 그 흐름부터 구체적으로 짚어드리겠습니다.");

  return {
    text: sentences.join(" "),
    evidence: evidenceParts.join(", "),
  };
}
