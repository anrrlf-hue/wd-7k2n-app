import type { SajuFacts, TenGodGroup } from "@/lib/saju-facts";
import { TEN_GOD_GROUP } from "@/lib/saju-facts";

export const PERSON_COMPARE_PURPOSES = [
  "love_marriage",
  "friend_family",
  "work_colleague",
  "business_partner",
] as const;

export type PersonComparePurpose = (typeof PERSON_COMPARE_PURPOSES)[number];

export const PERSON_COMPARE_PURPOSE_LABELS: Record<PersonComparePurpose, string> = {
  love_marriage: "연애·결혼",
  friend_family: "친구·가족",
  work_colleague: "직장·동료",
  business_partner: "동업·사업",
};

export interface PersonCompareInput {
  name: string;
  facts: SajuFacts;
}

export interface PersonCompareSection {
  title: string;
  text: string;
}

export interface PersonCompareFollowUp {
  question: string;
  answer: string;
}

export interface PersonCompareResult {
  purpose: PersonComparePurpose;
  purposeLabel: string;
  meName: string;
  otherName: string;
  headline: string;
  intro: string;
  strengths: PersonCompareSection[];
  friction: PersonCompareSection[];
  roles: PersonCompareSection[];
  timing: PersonCompareSection[];
  nextQuestions: string[];
  followUps: PersonCompareFollowUp[];
  shareText: string;
  note: string;
}

const PRODUCES: Record<string, string> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

const CONTROLS: Record<string, string> = {
  목: "토",
  토: "수",
  수: "화",
  화: "금",
  금: "목",
};

const SIX_HARMONY = new Set(["子丑", "丑子", "寅亥", "亥寅", "卯戌", "戌卯", "辰酉", "酉辰", "巳申", "申巳", "午未", "未午"]);
const CLASH = new Set(["子午", "午子", "丑未", "未丑", "寅申", "申寅", "卯酉", "酉卯", "辰戌", "戌辰", "巳亥", "亥巳"]);

type WorkRole = "direction" | "execution" | "relationship" | "stability";

const WORK_ROLE_LABELS: Record<WorkRole, string> = {
  direction: "기획·판단",
  execution: "실행·확장",
  relationship: "고객·거래",
  stability: "정리·운영",
};

function safeName(value: string, fallback: string): string {
  const cleaned = value.trim().slice(0, 12);
  return cleaned || fallback;
}

function personLabel(name: string): string {
  return name === "나" ? "나" : `${name}님`;
}

function subjectLabel(name: string): string {
  return name === "나" ? "나는" : `${name}님은`;
}

function dayBranch(facts: SajuFacts): string | null {
  return facts.pillars.find((p) => p.pillar === "day")?.branchHanja ?? null;
}

function currentGroups(facts: SajuFacts): TenGodGroup[] {
  const d = facts.currentDaeun;
  if (!d) return [];
  return [TEN_GOD_GROUP[d.stemTenGod], TEN_GOD_GROUP[d.branchTenGod]].filter(
    (v): v is TenGodGroup => Boolean(v),
  );
}

function strongestRoles(facts: SajuFacts): WorkRole[] {
  const scores: Record<WorkRole, number> = {
    direction:
      facts.resourceStarCount * 2 +
      facts.officerStarCount +
      (facts.dayStrengthReliable && facts.dayStrength === "strong" ? 1 : 0),
    execution: facts.outputStarCount * 2 + facts.peerStarCount,
    relationship: facts.wealthStarCount * 2 + facts.outputStarCount + facts.peerStarCount,
    stability: facts.officerStarCount * 2 + facts.resourceStarCount,
  };
  return (Object.entries(scores) as Array<[WorkRole, number]>)
    .sort((a, b) => b[1] - a[1])
    .map(([role]) => role);
}

function elementRelation(a: SajuFacts, b: SajuFacts): "same" | "a_produces_b" | "b_produces_a" | "a_controls_b" | "b_controls_a" | "other" {
  if (a.dayElement === b.dayElement) return "same";
  if (PRODUCES[a.dayElement] === b.dayElement) return "a_produces_b";
  if (PRODUCES[b.dayElement] === a.dayElement) return "b_produces_a";
  if (CONTROLS[a.dayElement] === b.dayElement) return "a_controls_b";
  if (CONTROLS[b.dayElement] === a.dayElement) return "b_controls_a";
  return "other";
}

function relationBetweenDayBranches(a: SajuFacts, b: SajuFacts): "harmony" | "clash" | "neutral" {
  const ab = `${dayBranch(a) ?? ""}${dayBranch(b) ?? ""}`;
  if (SIX_HARMONY.has(ab)) return "harmony";
  if (CLASH.has(ab)) return "clash";
  return "neutral";
}

function elementStrengthText(me: PersonCompareInput, other: PersonCompareInput): PersonCompareSection {
  const rel = elementRelation(me.facts, other.facts);
  if (rel === "same") {
    return {
      title: "기본 결",
      text: `두 사람은 일간의 오행이 같아 기본 판단 기준이나 반응 방식에서 서로 알아듣기 쉬운 부분이 생길 수 있습니다. 반대로 비슷한 방식으로 고집이 겹치면 누가 방향을 바꿀지 정하기 어려울 수 있어 역할과 결정권을 나누는 편이 좋습니다.`,
    };
  }
  if (rel === "a_produces_b" || rel === "b_produces_a") {
    const giver = rel === "a_produces_b" ? me.name : other.name;
    const receiver = rel === "a_produces_b" ? other.name : me.name;
    return {
      title: "서로 보완되는 흐름",
      text: `전통 사주에서 두 일간의 오행 관계를 보면 ${personLabel(giver)} 쪽의 방식이 ${personLabel(receiver)} 쪽의 움직임을 받쳐주는 흐름으로 읽을 수 있습니다. 한 사람이 계속 맞춰주는 관계로 고정하기보다, 실제 관계에서는 누가 아이디어를 내고 누가 마무리하는지 자연스럽게 나눠보는 것이 좋습니다.`,
    };
  }
  if (rel === "a_controls_b" || rel === "b_controls_a") {
    return {
      title: "긴장감이 생기는 지점",
      text: `두 사람의 일간 오행은 서로 기준을 조정하거나 밀고 당기는 관계로 읽힙니다. 잘 쓰면 서로의 빈틈을 잡아주는 조합이지만, 한 사람이 계속 상대의 방식을 고치려 들면 피로가 커질 수 있습니다. 관계의 목적과 최종 결정권을 미리 정할수록 장점이 살아납니다.`,
    };
  }
  return {
    title: "서로 다른 방식",
    text: `두 사람은 기본 반응 방식이 한쪽으로 완전히 겹치기보다 서로 다른 결을 보입니다. 같은 방식으로 맞추려 하기보다 각자 잘하는 장면을 분리해 쓸 때 관계가 편해질 수 있습니다.`,
  };
}

function branchStrengthText(me: PersonCompareInput, other: PersonCompareInput): PersonCompareSection {
  const rel = relationBetweenDayBranches(me.facts, other.facts);
  if (rel === "harmony") {
    return {
      title: "관계를 이어가는 방식",
      text: "일지끼리 육합 관계가 잡혀 전통 사주에서는 서로의 생활 방식이나 관계 리듬이 비교적 자연스럽게 이어질 수 있는 신호로 봅니다. 다만 이 한 가지 신호만으로 관계 전체가 맞는다고 판단하지 않고, 실제 역할·대화·돈 문제를 함께 보는 것이 중요합니다.",
    };
  }
  if (rel === "clash") {
    return {
      title: "부딪히기 쉬운 생활 리듬",
      text: "일지끼리 충 관계가 잡혀 전통 사주에서는 가까워질수록 생활 방식이나 결정 시점에서 차이가 크게 느껴질 수 있는 신호로 봅니다. 나쁜 궁합이라는 뜻은 아니고, 중요한 결정에서 서로의 속도와 기준을 분리해 확인하는 편이 좋습니다.",
    };
  }
  return {
    title: "생활 리듬",
    text: "일지 사이에 강한 합·충 하나로 관계가 결정되는 구조는 아닙니다. 그래서 이 두 사람은 한 가지 궁합 신호보다 실제 역할, 감정표현, 돈과 결정 방식의 차이를 함께 보는 편이 더 자연스럽습니다.",
  };
}

function businessRoles(me: PersonCompareInput, other: PersonCompareInput): PersonCompareSection[] {
  const meRoles = strongestRoles(me.facts);
  const otherRoles = strongestRoles(other.facts);
  const meTop = meRoles[0];
  const otherTop = otherRoles[0];

  if (meTop === otherTop) {
    return [
      {
        title: "두 사람에게 공통으로 강한 역할",
        text: `두 사람 모두 ${WORK_ROLE_LABELS[meTop]} 쪽 신호가 가장 강하게 잡힙니다. 같은 계산 근거에서 한 사람만 다른 역할로 밀어내는 것은 근거가 없으므로, 사주만으로 서로 다른 직책을 지정하지 않습니다.`,
      },
      {
        title: "역할을 실제로 나눈다면",
        text: "겹치는 강점은 공통 자산으로 두고, 실제 경험·선호·보유 고객·숫자 관리 능력을 기준으로 책임 영역을 나누는 편이 맞습니다. 한 사람은 방향을 정하고 다른 사람은 검증하는 식의 분담은 실행 제안일 뿐, 사주가 특정 사람에게 강제로 배정한 역할은 아닙니다.",
      },
    ];
  }

  return [
    {
      title: "역할을 나눈다면",
      text: `${subjectLabel(me.name)} ${WORK_ROLE_LABELS[meTop]}, ${subjectLabel(other.name)} ${WORK_ROLE_LABELS[otherTop]} 쪽이 각각 상대적으로 먼저 보입니다. 두 사람의 계산 결과가 실제로 다를 때만 이 차이를 참고하며, 최종 역할은 경험과 선호를 함께 봐야 합니다.`,
    },
    {
      title: "보완해서 쓰는 방법",
      text: "두 사람의 강한 역할이 완전히 같지 않아, 한 사람이 모든 일을 같이 하기보다 각자의 책임 영역을 분명히 할수록 보완 관계가 살아날 수 있습니다.",
    },
  ];
}

function relationshipRoles(me: PersonCompareInput, other: PersonCompareInput, purpose: PersonComparePurpose): PersonCompareSection[] {
  if (purpose === "business_partner" || purpose === "work_colleague") {
    return businessRoles(me, other);
  }

  if (purpose === "love_marriage") {
    return [
      {
        title: "관계에서 역할을 보면",
        text: `${subjectLabel(me.name)} ${me.facts.outputStarCount >= me.facts.resourceStarCount ? "표현하고 움직이는 편" : "생각을 정리하고 확인하는 편"}이 상대적으로 강하고, ${subjectLabel(other.name)} ${other.facts.outputStarCount >= other.facts.resourceStarCount ? "표현하고 움직이는 편" : "생각을 정리하고 확인하는 편"}이 상대적으로 강합니다. 둘이 같은 속도를 요구하기보다 표현 방식이 다를 수 있다는 전제로 대화하는 편이 좋습니다.`,
      },
    ];
  }

  return [
    {
      title: "편하게 지내는 방법",
      text: "친구·가족 관계에서는 누가 더 맞는지를 정하기보다, 서로 다른 반응 속도와 표현 방식을 알고 필요할 때 역할을 나누는 쪽이 자연스럽습니다. 중요한 일은 누가 먼저 말하고 누가 정리하는지 정해두면 갈등을 줄이는 데 도움이 됩니다.",
    },
  ];
}

function timingSections(me: PersonCompareInput, other: PersonCompareInput, purpose: PersonComparePurpose): PersonCompareSection[] {
  const meGroups = currentGroups(me.facts);
  const otherGroups = currentGroups(other.facts);

  if (meGroups.length === 0 || otherGroups.length === 0) {
    return [{
      title: "지금 둘의 시기",
      text: "둘 중 한 사람이라도 출생시간을 모르는 경우 현재 대운을 억지로 맞춰 비교하지 않습니다. 관계의 기본 구조는 볼 수 있지만, 지금 같이 움직일 시기는 출생시간이 확인될 때 더 세밀하게 볼 수 있습니다.",
    }];
  }

  const label: Record<TenGodGroup, string> = {
    비겁: "자기 기준·경쟁·독립",
    식상: "실행·표현·성과",
    재성: "거래·수입·현실 결과",
    관성: "책임·직책·공식 결정",
    인성: "준비·정보·학습",
  };

  const meText = [...new Set(meGroups)].map((g) => label[g]).join("·");
  const otherText = [...new Set(otherGroups)].map((g) => label[g]).join("·");

  if (purpose === "business_partner" || purpose === "work_colleague") {
    if (meText === otherText) {
      return [{
        title: "지금 같이 움직인다면",
        text: `두 사람 모두 현재 ${meText} 흐름이 강조됩니다. 현재 흐름까지 같은 경우 사주만으로 한쪽을 확장, 다른 쪽을 정리·검증 역할로 나눌 근거는 없습니다. 실제 역할은 경험·선호·고객 접점·숫자 관리 능력처럼 현실에서 확인되는 차이로 정하는 편이 맞습니다.`,
      }];
    }
    return [{
      title: "지금 같이 움직인다면",
      text: `${subjectLabel(me.name)} 현재 ${meText} 흐름, ${subjectLabel(other.name)} ${otherText} 흐름이 강조됩니다. 두 사람의 현재 흐름이 실제로 다를 때만 그 차이를 역할 분담의 참고로 쓰고, 시작 여부와 최종 역할은 현실 조건을 함께 봐야 합니다.`,
    }];
  }

  return [{
    title: "지금 두 사람의 흐름",
    text: `${subjectLabel(me.name)} 현재 ${meText}, ${subjectLabel(other.name)} ${otherText} 흐름이 상대적으로 강조됩니다. 서로 같은 시기에 같은 반응을 해야 한다고 보기보다, 지금 각자가 무엇에 더 민감한지를 이해하는 참고로 보는 편이 자연스럽습니다.`,
  }];
}

function purposeHeadline(purpose: PersonComparePurpose, _me: string, _other: string): string {
  if (purpose === "business_partner") return "두 사람은 ‘누가 더 맞는가’보다 역할을 어떻게 나누느냐가 더 중요한 조합입니다.";
  if (purpose === "work_colleague") return "두 사람은 같이 일할 때 각자의 강한 업무 영역을 분리해서 보는 것이 핵심입니다.";
  if (purpose === "love_marriage") return "두 사람은 감정의 크기보다 표현 방식과 생활 리듬이 어떻게 맞물리는지를 보는 것이 중요합니다.";
  return "두 사람은 누가 더 좋은 사람이냐보다 서로 어떤 방식으로 편해지고 부딪히는지를 보는 것이 중요합니다.";
}

function nextQuestionsFor(purpose: PersonComparePurpose): string[] {
  if (purpose === "business_partner") {
    return ["같이 사업하면 누가 무엇을 맡는 게 좋은가?", "둘이 돈 관리는 어떻게 나누는 게 좋은가?", "지금 같이 시작해도 되는 흐름인가?"];
  }
  if (purpose === "work_colleague") {
    return ["같이 일할 때 역할은 어떻게 나누면 좋은가?", "의견이 부딪힐 때 누가 최종 결정을 맡는 게 좋은가?", "둘이 성과를 내기 좋은 방식은 무엇인가?"];
  }
  if (purpose === "love_marriage") {
    return ["둘이 자주 부딪힐 수 있는 지점은 어디인가?", "결혼 생활에서는 어떤 역할 차이가 생길 수 있나?", "지금 관계 흐름은 서로 같은 방향인가?"];
  }
  return ["서로 편하게 지내려면 어떤 점을 알아야 하나?", "중요한 일을 같이 할 때 역할을 어떻게 나누면 좋나?", "지금 두 사람의 관계 흐름은 어떤가?"];
}
function buildPersonCompareFollowUps(
  purpose: PersonComparePurpose,
  roles: PersonCompareSection[],
  friction: PersonCompareSection[],
  timing: PersonCompareSection[],
): PersonCompareFollowUp[] {
  const roleAnswer = roles.map((item) => item.text).join(" ");
  const frictionAnswer = friction.map((item) => item.text).join(" ");
  const timingAnswer = timing.map((item) => item.text).join(" ");

  if (purpose === "business_partner") {
    return [
      { question: "같이 사업하면 누가 무엇을 맡는 게 좋은가?", answer: roleAnswer },
      { question: "둘이 돈 관리는 어떻게 나누는 게 좋은가?", answer: friction.find((item) => item.title.includes("동업"))?.text ?? frictionAnswer },
      { question: "지금 같이 시작해도 되는 흐름인가?", answer: timingAnswer },
    ];
  }
  if (purpose === "work_colleague") {
    return [
      { question: "같이 일할 때 역할은 어떻게 나누면 좋은가?", answer: roleAnswer },
      { question: "의견이 부딪힐 때 누가 최종 결정을 맡는 게 좋은가?", answer: frictionAnswer },
      { question: "둘이 성과를 내기 좋은 방식은 무엇인가?", answer: roleAnswer },
    ];
  }
  if (purpose === "love_marriage") {
    return [
      { question: "둘이 자주 부딪힐 수 있는 지점은 어디인가?", answer: frictionAnswer },
      { question: "결혼 생활에서는 어떤 역할 차이가 생길 수 있나?", answer: roleAnswer },
      { question: "지금 관계 흐름은 서로 같은 방향인가?", answer: timingAnswer },
    ];
  }
  return [
    { question: "서로 편하게 지내려면 어떤 점을 알아야 하나?", answer: roleAnswer },
    { question: "중요한 일을 같이 할 때 역할을 어떻게 나누면 좋나?", answer: roleAnswer },
    { question: "지금 두 사람의 관계 흐름은 어떤가?", answer: timingAnswer },
  ];
}


export function buildPersonCompareResult(
  meInput: PersonCompareInput,
  otherInput: PersonCompareInput,
  purpose: PersonComparePurpose,
): PersonCompareResult {
  const me: PersonCompareInput = { ...meInput, name: safeName(meInput.name, "나") };
  const other: PersonCompareInput = { ...otherInput, name: safeName(otherInput.name, "상대") };

  const strengths = [
    elementStrengthText(me, other),
    branchStrengthText(me, other),
  ];

  const friction: PersonCompareSection[] = [];
  const sameDominant = me.facts.dominantElement === other.facts.dominantElement;
  if (sameDominant) {
    friction.push({
      title: "비슷해서 부딪힐 수 있는 부분",
      text: `두 사람 모두 ${me.facts.dominantElement} 기운이 상대적으로 두드러져 비슷한 기준을 빠르게 공유할 수 있지만, 같은 방식으로 밀어붙이려 할 때 충돌이 생길 수 있습니다. 중요한 결정은 ‘누가 맞느냐’보다 결정 영역을 나누는 편이 좋습니다.`,
    });
  } else {
    friction.push({
      title: "다르게 느껴질 수 있는 부분",
      text: `두 사람의 오행 분포에서 중심이 되는 기운이 서로 달라 같은 상황에서도 먼저 보는 포인트가 다를 수 있습니다. 차이를 틀린 것으로 보기보다 한 사람은 시작, 다른 사람은 점검처럼 실제 역할로 바꾸면 장점이 됩니다.`,
    });
  }

  if (purpose === "business_partner") {
    friction.push({
      title: "동업에서 꼭 분리할 것",
      text: "사주보다 더 중요한 현실 조건은 지분, 돈 관리, 최종 의사결정권, 일을 그만둘 때의 기준입니다. 두 사람이 잘 맞아 보여도 이 네 가지가 불분명하면 관계가 흔들릴 수 있으니 별도로 정해야 합니다.",
    });
  } else if (purpose === "love_marriage") {
    friction.push({
      title: "관계에서 따로 확인할 것",
      text: "사주가 잘 맞는다고 생활 습관·돈·가족관계가 자동으로 맞는 것은 아닙니다. 가까운 관계일수록 실제 대화 방식과 생활 기준을 함께 확인하는 것이 중요합니다.",
    });
  }

  const roles = relationshipRoles(me, other, purpose);
  const timing = timingSections(me, other, purpose);
  const headline = purposeHeadline(purpose, me.name, other.name);
  const nextQuestions = nextQuestionsFor(purpose);
  const followUps = buildPersonCompareFollowUps(purpose, roles, friction, timing);
  const shareText = [
    `[운·돈 · 나와 이 사람]`,
    `${me.name} × ${other.name} · ${PERSON_COMPARE_PURPOSE_LABELS[purpose]}`,
    headline,
    strengths[0]?.text ?? "",
    roles[0]?.text ?? "",
  ].filter(Boolean).join("\n\n");

  return {
    purpose,
    purposeLabel: PERSON_COMPARE_PURPOSE_LABELS[purpose],
    meName: me.name,
    otherName: other.name,
    headline,
    intro: "두 사람을 한 줄의 궁합점수로 줄이지 않고, 서로 잘 맞는 장면·부딪히는 장면·역할을 나누는 방법·현재 흐름을 따로 봅니다.",
    strengths,
    friction,
    roles,
    timing,
    nextQuestions,
    followUps,
    shareText,
    note: "사주 비교는 전통 해석을 바탕으로 한 참고입니다. 사람의 관계와 실제 성과를 보장하거나 특정 사람을 선택·배제하는 판단을 대신하지 않습니다.",
  };
}
