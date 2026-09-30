import type {
  RealityAnswer,
  RealityEvidence,
  RealityQuestion,
  RealityTiming,
} from "@/lib/reality-answer-contract";
import { daeunFlavor } from "@/lib/fortune-candidates";
import type { PersonalityInput } from "@/lib/personality-check";
import type { SajuFacts } from "@/lib/saju-facts";
import { buildSajuTimingOutlook } from "@/lib/saju-timing";

export interface RealityAnswerBuildInput {
  question: RealityQuestion;
  facts: SajuFacts;
  evidence: RealityEvidence[];
  personality?: PersonalityInput | null;
}

function level(personality: PersonalityInput | null | undefined, key: string): string | null {
  const value = personality?.check?.levels?.[key];
  return value && value !== "미확인" ? value : null;
}

function timingFor(question: RealityQuestion, facts: SajuFacts): RealityTiming {
  const outlook = buildSajuTimingOutlook(facts, question.domain);

  if (outlook) {
    return {
      now: outlook.summary,
      nextCheckpoint:
        "이 시기는 사건을 보장하는 날짜가 아니라, 질문과 관련된 흐름이 상대적으로 더 강해지는 구간입니다.",
      precision: outlook.precision,
      windows: outlook.windows.map((window) => ({
        label: window.label,
        reason: window.reason,
      })),
      basis: outlook.basis,
    };
  }

  const now = facts.currentDaeun
    ? `현재는 ${facts.currentDaeun.ageRange}세부터 이어지는 ${daeunFlavor(facts.currentDaeun)} 흐름입니다.`
    : "출생시간이 없거나 현재 대운 정보가 충분하지 않아 연도·월까지 시기를 좁히지는 않습니다.";

  return {
    now,
    nextCheckpoint: facts.hasTimeInput
      ? "현재 확인 가능한 큰 흐름까지만 봅니다."
      : "출생시간을 알면 현재 흐름과 시기를 더 세밀하게 볼 수 있습니다.",
    precision: "daeun_only",
  };
}

function timingLead(timing: RealityTiming): string | null {
  return timing.windows?.[0]?.label ?? null;
}

function directAnswerFor(question: RealityQuestion, facts: SajuFacts, timing: RealityTiming): string {
  const first = timingLead(timing);
  const q = question.raw;

  if (question.domain === "love") {
    if (/재회|헤어진|이별/.test(q)) {
      return first
        ? `관계가 다시 움직이기 쉬운 시기는 ${first}을 먼저 눈여겨볼 수 있습니다. 다만 실제 재회는 상대방의 의사가 함께 맞아야 합니다.`
        : "재회 가능성 자체는 사주만으로 확정하기 어렵고, 현재는 관계의 큰 흐름까지만 볼 수 있습니다.";
    }
    if (/결혼/.test(q)) {
      return first
        ? `결혼·관계 진전 흐름은 ${first}을 먼저 눈여겨볼 수 있습니다.`
        : "결혼 시기를 연도·월까지 좁힐 근거는 부족하지만 관계운의 큰 흐름은 볼 수 있습니다.";
    }
    if (/여자친구|남자친구|연애|인연|소개팅|썸/.test(q)) {
      return first
        ? `새 인연이 들어오기 쉬운 흐름은 ${first}을 가장 먼저 눈여겨볼 수 있습니다.`
        : "새 인연의 정확한 시기를 좁히기는 어렵지만, 관계운의 큰 흐름은 볼 수 있습니다.";
    }
    return first
      ? `연애·관계 흐름은 ${first}에 상대적으로 더 살아나는 편입니다.`
      : "연애·관계는 현재 큰 흐름과 타고난 관계 패턴을 중심으로 볼 수 있습니다.";
  }

  if (question.domain === "career") {
    return first
      ? `취업·이직과 같은 일의 이동 흐름은 ${first}을 먼저 눈여겨볼 수 있습니다.`
      : "취업·이직의 정확한 월을 좁히기는 어렵지만, 일의 큰 변화 흐름은 볼 수 있습니다.";
  }

  if (question.domain === "work_business") {
    return first
      ? `직장·사업에서 변화나 기회가 부각되는 시기는 ${first}을 먼저 눈여겨볼 수 있습니다.`
      : "직장·사업의 정확한 시기를 좁히기는 어렵지만, 현재 큰 흐름은 볼 수 있습니다.";
  }

  if (question.domain === "money") {
    if (/(안 모|모이지|저축|새는)/.test(q)) {
      const structural =
        facts.wealthStarCount + facts.outputStarCount > facts.officerStarCount + facts.resourceStarCount
          ? "돈을 만들 기회에는 반응이 빠른 편이지만, 들어온 흐름을 오래 유지하는 방식에서 차이가 생기기 쉬운 사주입니다."
          : "한 번의 큰 기회보다 안정적으로 쌓이는 흐름에서 재물운이 더 잘 드러나는 사주입니다.";
      return first ? `${structural} 재물 흐름은 ${first}을 먼저 눈여겨볼 수 있습니다.` : structural;
    }
    return first
      ? `재물 흐름이 상대적으로 강해지는 시기는 ${first}을 먼저 눈여겨볼 수 있습니다.`
      : "재물운의 정확한 월을 좁히기는 어렵지만, 재물의 큰 흐름은 볼 수 있습니다.";
  }

  if (question.domain === "relationship") {
    return first
      ? `새 관계나 기존 관계의 변화가 부각되는 시기는 ${first}을 먼저 눈여겨볼 수 있습니다.`
      : "인간관계의 정확한 시기를 좁히기는 어렵지만, 관계 변화의 큰 흐름은 볼 수 있습니다.";
  }

  if (question.domain === "wellbeing") {
    return first
      ? `생활 리듬과 에너지 변화가 크게 느껴질 수 있는 시기는 ${first}을 먼저 눈여겨볼 수 있습니다.`
      : "생활·건강은 질병을 예측하지 않고, 현재 생활 리듬과 큰 변화 흐름까지만 봅니다.";
  }

  return first
    ? `전체 흐름에서 변화가 상대적으로 크게 부각되는 시기는 ${first}을 먼저 눈여겨볼 수 있습니다.`
    : "현재는 앞으로의 큰 흐름과 변화 방향을 중심으로 볼 수 있습니다.";
}

function repeatingPatternFor(
  question: RealityQuestion,
  facts: SajuFacts,
  personality: PersonalityInput | null | undefined,
): string {
  const speed = level(personality, "speed");
  const plan = level(personality, "plan");
  const autonomy = level(personality, "autonomy");
  const change = level(personality, "change");
  const emotion = level(personality, "emotionExpression");

  if (question.domain === "love" || question.domain === "relationship") {
    if (emotion === "오른쪽") {
      return "마음이 생겨도 바로 드러내기보다 안에서 오래 정리하는 편이라, 관계가 시작되기 전 상대가 내 마음을 알아차리기 어려울 수 있습니다.";
    }
    if (autonomy === "오른쪽") {
      return "관계에서는 내 마음만큼 상대의 반응과 분위기를 함께 보는 편이라, 관계의 속도가 상대 상황에 따라 달라질 수 있습니다.";
    }
    return "관계가 시작되면 애매한 상태를 오래 끌기보다 내 기준을 빨리 세우는 편이라, 시작과 정리의 경계가 비교적 분명한 편입니다.";
  }

  if (question.domain === "career" || question.domain === "work_business") {
    if (change === "왼쪽") {
      return "익숙한 자리에 오래 머무르기보다 새로운 역할이나 가능성이 보일 때 마음이 먼저 움직이는 편입니다.";
    }
    if (plan === "왼쪽") {
      return "일에서는 준비와 구조를 먼저 잡는 편이라, 변화가 와도 기준이 분명할수록 힘을 쓰기 쉽습니다.";
    }
    return "일에서는 정해진 틀과 내 방식대로 움직일 여지를 모두 필요로 해서, 둘 중 하나만 강한 환경에서는 답답함을 느끼기 쉽습니다.";
  }

  if (question.domain === "money") {
    if (change === "왼쪽") {
      return "재물에서는 새로운 기회나 변화에 관심이 빠르게 가는 편이라, 기회가 여러 개 겹칠 때 흐름이 분산될 수 있습니다.";
    }
    return "재물에서는 큰 한 번보다 반복해서 이어지는 흐름에서 안정감을 느끼는 편입니다.";
  }

  if (question.domain === "wellbeing") {
    if (speed === "왼쪽") {
      return "생각이 생기면 빠르게 움직이는 편이라 바쁜 시기에는 피로를 뒤늦게 느낄 수 있습니다.";
    }
    return "생활에서는 충분히 정리하고 쉬는 시간이 있어야 다시 힘이 붙는 편입니다.";
  }

  return "변화가 필요하다고 느낄 때 한 영역만 따로 보기보다 여러 문제를 한꺼번에 연결해서 생각하기 쉬운 편입니다.";
}

function questionReadingFor(
  question: RealityQuestion,
  facts: SajuFacts,
  personality: PersonalityInput | null | undefined,
): string {
  const elementTone: Record<string, string> = {
    목: "성장할 방향과 다음 가능성이 보일 때 마음이 움직이는 편입니다.",
    화: "표현하고 움직이며 반응을 확인할 때 기운이 살아나는 편입니다.",
    토: "기준을 세우고 안정적으로 쌓아갈 때 힘이 붙는 편입니다.",
    금: "무엇을 할지보다 무엇을 남기고 정리할지 분명할 때 판단이 선명해지는 편입니다.",
    수: "상황을 충분히 읽고 여러 가능성을 비교할 때 감각이 살아나는 편입니다.",
  };
  const opening = elementTone[facts.dayElement] ?? "상황을 읽고 자기 기준을 세울 때 강점이 살아나는 편입니다.";
  const pattern = repeatingPatternFor(question, facts, personality);

  if (question.domain === "love") {
    return `${opening} 연애에서는 마음이 생기는 것과 실제 관계가 시작되는 속도가 꼭 같지는 않은 편입니다. ${pattern} 그래서 인연운이 들어오는 시기에는 새로운 만남 자체뿐 아니라 기존 관계가 갑자기 가까워지는 모습으로도 나타날 수 있습니다.`;
  }

  if (question.domain === "relationship") {
    return `${opening} 사람관계에서는 가까워질수록 서로의 방식 차이가 더 또렷하게 보이는 편입니다. ${pattern} 관계운이 움직이는 시기에는 새로운 사람이 들어오기도 하고, 기존 관계의 거리감이나 역할이 달라지는 모습으로 나타날 수도 있습니다.`;
  }

  if (question.domain === "career") {
    return `${opening} 일에서는 단순히 직장을 옮기는 것보다 어떤 역할에서 내 힘을 제대로 쓰는지가 중요하게 나타나는 편입니다. ${pattern} 이동운이 강한 때에는 실제 이직뿐 아니라 역할 변경, 새로운 제안, 준비하던 기회의 가시화로 나타날 수 있습니다.`;
  }

  if (question.domain === "work_business") {
    return `${opening} 직장·사업에서는 내 판단으로 움직일 수 있는 범위와 결과가 눈에 보일 때 힘이 붙는 편입니다. ${pattern} 흐름이 강해지는 시기에는 새 역할, 사업 기회, 고객이나 제안이 늘어나는 형태처럼 여러 방식으로 나타날 수 있습니다.`;
  }

  if (question.domain === "money") {
    const moneyTone =
      facts.wealthStarCount + facts.outputStarCount > facts.officerStarCount + facts.resourceStarCount
        ? "재물에서는 기회를 발견하고 움직이는 힘이 먼저 드러나는 편입니다."
        : "재물에서는 크게 움직이기보다 흐름을 안정적으로 이어가는 쪽이 더 잘 맞는 편입니다.";
    return `${opening} ${moneyTone} ${pattern} 재물운이 강해지는 시기에는 수입 자체뿐 아니라 새로운 일거리, 거래, 보상, 돈과 관련된 결정이 많아지는 방식으로 나타날 수 있습니다.`;
  }

  if (question.domain === "wellbeing") {
    return `${opening} 생활·건강에서는 질병을 맞히는 방식이 아니라 에너지를 쓰고 회복하는 리듬을 봅니다. ${pattern} 흐름이 크게 바뀌는 때에는 일정, 수면, 활동량, 스트레스 체감이 평소와 달라지는 모습으로 느껴질 수 있습니다.`;
  }

  return `${opening} 전체 사주에서는 한 분야만 떼기보다 관계·일·재물·생활의 흐름이 어느 시기에 함께 바뀌는지를 봅니다. ${pattern} 변화운이 강한 구간은 실제 사건 하나보다 여러 영역에서 생각과 선택이 동시에 달라지는 형태로 나타날 수 있습니다.`;
}

function currentFlowReadingFor(question: RealityQuestion, facts: SajuFacts): string {
  if (!facts.currentDaeun) {
    return "출생시간이 없거나 현재 대운 정보가 충분하지 않아 지금의 시기를 세밀하게 나누어 말하기는 어렵습니다. 이 경우 타고난 사주 구조와 현재 질문의 성격을 중심으로 풀이합니다. 정확한 연도·월은 출생시간이 있을 때보다 넓게 봐야 합니다.";
  }

  const current = daeunFlavor(facts.currentDaeun);
  const next = facts.nextDaeun ? daeunFlavor(facts.nextDaeun) : null;
  const domainLine: Record<RealityQuestion["domain"], string> = {
    love: "연애·인연에서는 만남의 시작과 기존 관계의 변화가 평소보다 더 크게 느껴질 수 있는 흐름입니다.",
    career: "취업·이직에서는 새로운 자리나 역할에 대한 생각이 커지고, 실제 이동 가능성을 보게 되는 흐름입니다.",
    work_business: "직장·사업에서는 역할과 기회가 바뀌거나 새로운 제안이 들어오는 문제에 시선이 가는 흐름입니다.",
    money: "재물에서는 돈 자체보다 기회와 보상, 거래의 움직임이 평소보다 더 크게 느껴질 수 있는 흐름입니다.",
    relationship: "사람관계에서는 새로운 연결과 기존 관계의 거리 변화가 눈에 띄기 쉬운 흐름입니다.",
    wellbeing: "생활에서는 평소 유지하던 리듬이 달라지거나 에너지 사용 방식의 변화를 느끼기 쉬운 흐름입니다.",
    overall: "전체적으로는 익숙한 흐름을 그대로 갈지 새로운 방향으로 옮길지에 대한 변화감이 커지는 시기입니다.",
  };

  const nextLine = facts.nextDaeun
    ? `다음 대운에서는 ${next} 쪽으로 결이 바뀌기 때문에 지금과는 다른 방식으로 같은 주제가 다시 나타날 수 있습니다.`
    : "다음 대운의 세부 정보는 현재 답변에서 넓게만 봅니다.";

  return `${facts.currentDaeun.ageRange}세부터 이어지는 현재 대운은 ${current} 흐름입니다. ${domainLine[question.domain]} ${nextLine}`;
}

function solutionReadingFor(
  question: RealityQuestion,
  timing: RealityTiming,
  repeatingPattern: string,
): string {
  const first = timingLead(timing);
  const timingText = first
    ? `${first}을 가장 먼저 눈여겨볼 수 있고, 이후 후보 시기는 ${(timing.windows ?? []).slice(1).map((x) => x.label).join(", ") || "현재 큰 흐름"}입니다.`
    : "연도·월까지 좁힌 시기보다 현재 큰 흐름을 중심으로 보는 편이 맞습니다.";

  if (question.domain === "love" || question.domain === "relationship") {
    return `${timingText} 이 시기에 관계가 반드시 시작되거나 끝난다는 뜻은 아니지만, 만남과 관계 변화가 평소보다 부각되기 쉬운 구간으로 볼 수 있습니다. ${repeatingPattern} 실제 결과는 상대방의 의사와 만남 환경에 따라 달라질 수 있습니다.`;
  }

  if (question.domain === "career" || question.domain === "work_business") {
    return `${timingText} 이 시기에는 일의 이동, 역할 변화, 제안이나 기회가 평소보다 눈에 띄기 쉬운 흐름으로 볼 수 있습니다. ${repeatingPattern} 실제 변화의 형태는 회사 상황과 시장 조건에 따라 달라질 수 있습니다.`;
  }

  if (question.domain === "money") {
    return `${timingText} 재물운이 강하다는 것은 돈이 자동으로 늘어난다는 뜻보다 돈과 관련된 기회·보상·결정이 더 많이 움직일 수 있다는 의미에 가깝습니다. ${repeatingPattern} 실제 금액의 결과는 소득과 지출, 계약과 시장 상황에 따라 달라질 수 있습니다.`;
  }

  if (question.domain === "wellbeing") {
    return `${timingText} 생활 리듬의 변화가 크게 느껴질 수 있는 구간으로 참고할 수 있습니다. ${repeatingPattern} 질병이나 치료 시기를 뜻하는 것은 아니며 실제 증상은 사주와 분리해 확인해야 합니다.`;
  }

  return `${timingText} 이 구간은 한 가지 사건을 예고한다기보다 관계·일·재물·생활 중 여러 영역에서 변화가 겹쳐 보일 수 있는 시기입니다. ${repeatingPattern} 실제로 어떤 변화가 나타나는지는 현재 생활 조건에 따라 달라질 수 있습니다.`;
}

function cautionFor(question: RealityQuestion): string {
  switch (question.domain) {
    case "love":
    case "relationship":
      return "상대방의 마음이나 행동을 내 사주만으로 확정할 수는 없습니다.";
    case "career":
      return "사주 시기가 실제 합격이나 채용 결과를 보장하는 것은 아닙니다.";
    case "work_business":
      return "사주 시기가 실제 사업 성공이나 계약 결과를 보장하는 것은 아닙니다.";
    case "money":
      return "재물운이 강한 시기와 실제 투자·수익 결과는 같은 뜻이 아닙니다.";
    case "wellbeing":
      return "사주로 질병이나 치료 결과를 판단하지 않습니다.";
    case "overall":
      return "좋은 흐름이 보여도 모든 영역이 동시에 같은 결과로 움직인다는 뜻은 아닙니다.";
  }
}

function keyPointFor(question: RealityQuestion, timing: RealityTiming): string {
  const first = timingLead(timing);
  if (first) return `${first}이 이 질문에서 가장 먼저 눈여겨볼 시기입니다.`;
  return "현재는 정확한 월보다 큰 흐름을 중심으로 보는 것이 맞습니다.";
}

function realityChecksFor(question: RealityQuestion): string[] {
  switch (question.domain) {
    case "love":
      return ["실제 만남 환경", "상대방의 의사와 현재 관계 상태"];
    case "relationship":
      return ["상대방의 실제 반응", "현재 관계의 거리와 상황"];
    case "career":
      return ["실제 채용시장과 지원 조건", "현재 경력과 준비 상태"];
    case "work_business":
      return ["실제 조직·시장 상황", "제안·고객·계약 같은 현실 조건"];
    case "money":
      return ["실제 소득·지출·자산 상태", "계약·시장·금융 조건"];
    case "wellbeing":
      return ["실제 수면·피로·생활 리듬", "증상이 있으면 의료적 확인"];
    case "overall":
      return ["현재 생활환경", "관계·일·재물에서 실제로 바뀌고 있는 조건"];
  }
}

export function buildRealityAnswerFallback(input: RealityAnswerBuildInput): RealityAnswer {
  const timing = timingFor(input.question, input.facts);
  const repeatingPattern = repeatingPatternFor(input.question, input.facts, input.personality);
  const report = {
    questionReading: questionReadingFor(input.question, input.facts, input.personality),
    currentFlow: currentFlowReadingFor(input.question, input.facts),
    solutionReading: solutionReadingFor(input.question, timing, repeatingPattern),
    timingReading: timing.windows?.length
      ? timing.now + " " + timing.windows.map((window) => window.label + ": " + window.reason).join(" ")
      : timing.now,
  };

  const uncertainty = [
    "표시한 시기는 사건을 보장하는 날짜가 아니라 해당 주제가 상대적으로 부각되는 구간입니다.",
  ];
  if (!input.facts.hasTimeInput) {
    uncertainty.push("출생시간이 없어 시주와 세밀한 시기 해석에는 제한이 있습니다.");
  }

  return {
    question: input.question,
    headline: directAnswerFor(input.question, input.facts, timing),
    report,
    whyNow: report.currentFlow,
    repeatingPattern,
    avoid: cautionFor(input.question),
    choose: keyPointFor(input.question, timing),
    timing,
    realityChecks: realityChecksFor(input.question),
    evidence: input.evidence,
    uncertainty,
    safetyNote:
      input.question.domain === "wellbeing"
        ? "이 답변은 질병 진단이나 치료를 대신하지 않습니다."
        : undefined,
  };
}
