import type {
  RealityAnswer,
  RealityAnswerDomain,
  RealityEvidence,
} from "@/lib/reality-answer-contract";
import type { QuestionFollowUp } from "@/lib/question-engine-v0";

export const READING_STYLE_V1_ORDER = [
  "direct_answer",
  "personal_meaning",
  "current_flow",
  "future_timing",
  "caution",
  "next_question",
] as const;

export interface ReadingStyleV1View {
  title: string;
  directAnswer: string;
  personalTitle: string;
  personalMeaning: string;
  currentTitle: string;
  currentFlow: string;
  futureTitle: string;
  futureMeaning: string;
  patternTitle: string;
  pattern: string;
  cautionTitle: string;
  caution: string;
  realityChecks: string[];
  nextTitle: string;
  nextQuestions: QuestionFollowUp[];
}

function evidenceText(
  evidence: RealityEvidence[],
  labelIncludes: string,
): string | null {
  const item = evidence.find((entry) => entry.label.includes(labelIncludes));
  return item?.detail?.trim() || null;
}

function has(value: string | null, pattern: RegExp): boolean {
  return Boolean(value && pattern.test(value));
}

function majorLineStory(
  domain: RealityAnswerDomain,
  evidence: RealityEvidence[],
): string | null {
  const head = evidenceText(evidence, "두뇌선 비교");
  const heart = evidenceText(evidence, "감정선 비교");
  const life =
    evidenceText(evidence, "생활 지속선 비교") ??
    evidenceText(evidence, "생활 리듬 참고") ??
    evidenceText(evidence, "생명선 비교");

  if (domain === "career" || domain === "work_business" || domain === "money") {
    if (head) {
      if (has(head, /직선에 가까움/)) {
        return "양손의 두뇌선에서는 생각을 오래 흩어놓기보다 기준을 세워 정리하고 결정하는 쪽이 더 두드러집니다. 그래서 기회가 와도 막연한 기대보다 조건·역할·숫자를 분명히 했을 때 현재의 강점이 더 잘 살아날 수 있습니다.";
      }
      if (has(head, /완만한 곡선/)) {
        return "양손의 두뇌선에서는 정답 하나만 고집하기보다 여러 가능성을 연결해서 보는 쪽이 더 두드러집니다. 그래서 일이나 돈 문제에서도 기존 방식만 반복하기보다 새로운 조합이나 다른 방법을 찾을 때 현재의 강점이 살아날 수 있습니다.";
      }
    }
  }

  if (domain === "love" || domain === "relationship") {
    if (heart) {
      if (has(heart, /완만한 곡선/)) {
        return "양손의 감정선에서는 마음을 안에만 두기보다 관계 속에서 반응하고 표현하는 쪽이 비교적 잘 드러납니다. 가까운 관계에서는 감정의 크기보다 서로의 표현 속도가 맞는지가 더 중요하게 느껴질 수 있습니다.";
      }
      if (has(heart, /직선에 가까움/)) {
        return "양손의 감정선에서는 감정을 크게 드러내기보다 관계의 기준과 약속을 확인하는 쪽이 더 두드러집니다. 그래서 마음이 있어도 표현이 늦어지거나, 상대가 내 마음을 실제보다 차갑게 받아들일 수 있습니다.";
      }
    }
  }

  if (domain === "wellbeing" && life) {
    if (has(life, /길이 김/)) {
      return "양손의 생명선은 생활 리듬을 한 번 잡으면 오래 이어가려는 쪽으로 읽힙니다. 바쁜 시기에는 버티는 힘이 장점이 되지만, 쉬어야 할 때도 계속 같은 속도로 가는지만 살펴보는 편이 좋습니다.";
    }
  }

  return null;
}

function secondaryLineStory(
  domain: RealityAnswerDomain,
  evidence: RealityEvidence[],
): string | null {
  const work = evidenceText(evidence, "양손 일·성과선 비교");
  const wealth = evidenceText(evidence, "양손 재물선 비교");

  if (domain === "career" || domain === "work_business") {
    if (!work) return null;

    const rightFateClear = /오른손 운명선 선명/.test(work);
    const leftFateClear = /왼손 운명선 선명/.test(work);
    const sunClear = /태양선 선명/.test(work);
    const wealthClear = /재물선 선명/.test(work);

    const parts: string[] = [];
    if (rightFateClear !== leftFateClear) {
      parts.push(
        rightFateClear
          ? "오른손에서 일의 방향을 나타내는 세로 흐름이 왼손보다 더 또렷하게 잡혀, 지금 생활에서 스스로 방향을 정하려는 모습이 더 강하게 드러나는 편입니다."
          : "왼손에서 일의 방향을 나타내는 세로 흐름이 오른손보다 더 또렷하게 잡혀, 기본적으로 가지고 있던 일의 기준을 현재 생활에서 어떻게 꺼내 쓰느냐가 중요한 편입니다.",
      );
    } else if (rightFateClear && leftFateClear) {
      parts.push("양손에서 일의 방향을 나타내는 세로 흐름이 함께 확인돼, 일과 역할의 방향을 오래 붙드는 힘이 비교적 일관되게 보입니다.");
    }
    if (sunClear) {
      parts.push("성과가 밖으로 드러나고 평가받는 방식도 같이 보여, 혼자 준비하는 것만큼 결과를 밖으로 보여주는 과정이 중요할 수 있습니다.");
    }
    if (wealthClear && domain === "work_business") {
      parts.push("재물선 후보도 함께 보여, 일의 방향과 보상·거래 문제를 따로 떼기보다 함께 움직이는 흐름으로 보는 편이 자연스럽습니다.");
    }

    return parts.length ? parts.join(" ") : null;
  }

  if (domain === "money") {
    if (!wealth) return null;
    const rightWealth = /오른손 재물선 선명/.test(wealth);
    const leftWealth = /왼손 재물선 선명/.test(wealth);
    const fateClear = /운명선 선명/.test(wealth);

    const parts: string[] = [];
    if (rightWealth || leftWealth) {
      parts.push(
        rightWealth && leftWealth
          ? "양손에서 재물선 후보가 비교적 또렷하게 보여, 돈을 우연한 행운보다 기회·거래·보상으로 연결하는 방식에 관심이 가는 손으로 읽을 수 있습니다."
          : "한쪽 손에서 재물선 후보가 더 또렷하게 보여, 돈을 다루는 방식이 타고난 성향과 현재 생활에서 조금 다르게 나타날 수 있습니다.",
      );
    }
    if (fateClear) {
      parts.push("운명선 흐름도 같이 보여, 돈 문제는 일의 방향이나 역할 변화와 연결해서 볼 때 더 자연스럽습니다.");
    }
    return parts.length ? parts.join(" ") : null;
  }

  return null;
}

export function buildPalmEvidenceBridge(
  domain: RealityAnswerDomain,
  evidence: RealityEvidence[],
): string | null {
  const palmEvidence = evidence.filter((entry) => entry.source === "palm");
  if (palmEvidence.length === 0) return null;

  const major = majorLineStory(domain, palmEvidence);
  const secondary = secondaryLineStory(domain, palmEvidence);
  const parts = [major, secondary].filter((item): item is string => Boolean(item));

  if (parts.length === 0) {
    if (domain === "career" || domain === "work_business") {
      return "손금을 함께 보면 현재의 판단 방식과 일 처리 방식이 사주에서 보이는 일의 흐름을 보완해서 보여줍니다. 사주는 변화가 부각되는 시기를 보고, 손금은 지금 그 변화를 어떤 방식으로 받아들이는지를 보는 쪽에 가깝습니다.";
    }
    if (domain === "money") {
      return "손금을 함께 보면 돈과 관련된 현재 판단 방식과 생활의 지속력이 사주의 재물 흐름을 보완해서 보여줍니다. 손금 자체로 수익이나 시기를 새로 만들지는 않습니다.";
    }
    if (domain === "love" || domain === "relationship") {
      return "손금을 함께 보면 지금 관계에서 감정을 표현하고 받아들이는 방식이 사주의 관계 흐름을 보완해서 보여줍니다. 상대방의 마음을 손금으로 대신 판단하지는 않습니다.";
    }
    if (domain === "wellbeing") {
      return "손금을 함께 보면 현재 생활 리듬을 유지하고 에너지를 쓰는 방식이 사주의 생활 흐름을 보완해서 보여줍니다. 건강 상태나 수명을 손금으로 판단하지는 않습니다.";
    }
    return "손금은 지금 드러난 판단·관계·생활 방식을 보완해 보여주고, 사주는 큰 흐름과 시기를 보는 역할을 합니다.";
  }

  return parts.join(" ");
}

export function buildReadingStyleV1View(
  answer: RealityAnswer,
  nextQuestions: QuestionFollowUp[] = [],
): ReadingStyleV1View {
  const report = answer.report;

  return {
    title: answer.question.raw,
    directAnswer: answer.headline,
    personalTitle: "당신에게는 이렇게 나타나요",
    personalMeaning: report?.questionReading ?? answer.repeatingPattern,
    currentTitle: "지금은 이런 흐름입니다",
    currentFlow: report?.currentFlow ?? answer.whyNow,
    futureTitle: "앞으로는 이렇게 볼 수 있어요",
    futureMeaning: report?.solutionReading ?? answer.choose,
    patternTitle: "이런 패턴은 반복될 수 있어요",
    pattern: answer.repeatingPattern,
    cautionTitle: "여기서는 이것만 조심해서 보세요",
    caution: answer.avoid,
    realityChecks: answer.realityChecks,
    nextTitle: "이어서 무엇이 더 궁금하세요?",
    nextQuestions,
  };
}

export const READING_STYLE_V1_RULES = [
  "첫 문장은 사용자의 질문에 직접 답한다.",
  "전문용어를 설명하기보다 그 사람에게 어떻게 나타나는지를 생활 언어로 말한다.",
  "사주에서 계산된 사실과 사용자가 알려준 현실 정보는 출처를 섞지 않는다.",
  "사주는 흐름과 시기, 손금은 현재 드러난 방식을 맡는다.",
  "사주와 손금이 다르게 보이면 억지로 일치시키지 않고 그 차이를 설명한다.",
  "미래는 계산된 시기 안에서만 말하고 사건을 확정하지 않는다.",
  "한 번의 답에 모든 주제를 넣지 않고 다음 질문으로 자연스럽게 이어간다.",
] as const;
