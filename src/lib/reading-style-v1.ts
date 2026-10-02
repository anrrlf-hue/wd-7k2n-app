import type {
  RealityAnswer,
  RealityAnswerDomain,
  RealityEvidence,
} from "@/lib/reality-answer-contract";
import type { QuestionFollowUp } from "@/lib/question-engine-v0";
import type { RealityPalmContext, RealityPalmHandContext } from "@/lib/reality-palm-context";

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
        return "관찰된 두뇌선에서는 생각을 오래 흩어놓기보다 기준을 세워 정리하고 결정하는 쪽이 두드러집니다. 양손 여부가 확인되지 않으면 한 손 관찰로만 해석합니다.";
      }
      if (has(head, /완만한 곡선/)) {
        return "관찰된 두뇌선에서는 정답 하나만 고집하기보다 여러 가능성을 연결해서 보는 쪽이 두드러집니다. 양손 여부가 확인되지 않으면 한 손 관찰로만 해석합니다.";
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

function palmHandName(side: "left" | "right" | "unknown"): string {
  return side === "left" ? "왼손" : side === "right" ? "오른손" : "촬영한 손";
}

function contextHands(
  context: RealityPalmContext,
): Array<{ side: "left" | "right" | "unknown"; hand: RealityPalmHandContext }> {
  const hands: Array<{ side: "left" | "right" | "unknown"; hand: RealityPalmHandContext }> = [];
  if (context.right) hands.push({ side: "right", hand: context.right });
  if (context.left) hands.push({ side: "left", hand: context.left });
  if (hands.length === 0 && context.primary) {
    hands.push({ side: context.primary.handSide, hand: context.primary });
  }
  return hands;
}

function dominantNote(context: RealityPalmContext): string | null {
  if (!context.dominantHand) return null;
  return `주로 쓰는 손은 ${context.dominantHand === "right" ? "오른손" : "왼손"}입니다.`;
}

function lineCurveText(
  hand: RealityPalmHandContext,
  key: "headLine" | "heartLine" | "lifeLine",
): string | null {
  const line = hand.onnxLines?.[key];
  if (!line?.detected) return null;
  const parts = [
    line.curve,
    line.length ? `길이 ${line.length}` : null,
    line.depthStrength ? `선명도 ${line.depthStrength}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

function contextMajorLineStory(
  domain: RealityAnswerDomain,
  context: RealityPalmContext,
): string | null {
  const key =
    domain === "love" || domain === "relationship"
      ? "heartLine"
      : domain === "wellbeing"
        ? "lifeLine"
        : "headLine";
  const label =
    key === "heartLine" ? "감정선" : key === "lifeLine" ? "생명선" : "두뇌선";

  const observed = contextHands(context)
    .map((item) => ({ ...item, line: lineCurveText(item.hand, key) }))
    .filter((item): item is typeof item & { line: string } => Boolean(item.line));

  if (observed.length === 0) return null;

  if (observed.length === 1) {
    const only = observed[0];
    return `${palmHandName(only.side)} ${label}에서는 ${only.line}이 관찰됩니다. 다른 손의 관찰값이 없어 촬영된 이 손만 해석합니다.`;
  }

  const right = observed.find((item) => item.side === "right");
  const left = observed.find((item) => item.side === "left");
  if (!right || !left) {
    return observed
      .map((item) => `${palmHandName(item.side)} ${label}: ${item.line}`)
      .join(" / ");
  }

  const rightCurve = right.hand.onnxLines?.[key]?.curve ?? null;
  const leftCurve = left.hand.onnxLines?.[key]?.curve ?? null;
  const note = dominantNote(context);

  if (rightCurve && leftCurve && rightCurve !== leftCurve) {
    return `오른손 ${label}은 ${right.line}이고, 왼손 ${label}은 ${left.line}으로 서로 다르게 관찰됩니다. 두 손이 다르므로 한쪽 특징을 양손 전체 성향처럼 단정하지 않습니다.${note ? ` ${note}` : ""}`;
  }

  return `양손 ${label}에서 비슷한 흐름이 확인됩니다. 오른손은 ${right.line}, 왼손은 ${left.line}입니다.${note ? ` ${note}` : ""}`;
}

function secondaryStatus(
  hand: RealityPalmHandContext,
  key: "fate" | "sun" | "wealth",
): "선명" | "희미" | "확인 안 됨" | "미확인" {
  const signal = hand.secondaryLines?.[key];
  if (!signal) return "미확인";
  if (signal.status === "clear") return "선명";
  if (signal.status === "faint") return "희미";
  return "확인 안 됨";
}

function contextSecondaryStory(
  domain: RealityAnswerDomain,
  context: RealityPalmContext,
): string | null {
  const hands = contextHands(context);
  if (hands.length === 0) return null;

  const keys: Array<["fate" | "sun" | "wealth", string]> =
    domain === "money"
      ? [["wealth", "재물선"], ["fate", "운명선"]]
      : domain === "career" || domain === "work_business"
        ? [["fate", "운명선"], ["sun", "태양선"], ["wealth", "재물선"]]
        : [];

  if (keys.length === 0) return null;

  const rows = hands.map((item) => ({
    side: item.side,
    text: keys.map(([key, label]) => `${label} ${secondaryStatus(item.hand, key)}`).join(" · "),
  }));

  if (rows.length === 1) {
    return `${palmHandName(rows[0].side)}에서 ${rows[0].text}으로 관찰됩니다. 다른 손은 관찰값이 없어 강약을 비교하지 않습니다.`;
  }

  return `${rows.map((row) => `${palmHandName(row.side)}은 ${row.text}`).join(", ")}. 한쪽을 타고난 모습이나 현재 모습으로 고정하지 않고, 관찰된 차이 자체만 참고합니다.`;
}

function contextPalmStory(
  domain: RealityAnswerDomain,
  context: RealityPalmContext,
): string | null {
  const major = contextMajorLineStory(domain, context);
  const secondary = contextSecondaryStory(domain, context);
  const parts = [major, secondary].filter((item): item is string => Boolean(item));
  return parts.length > 0 ? parts.join(" ") : null;
}

export function buildPalmEvidenceBridge(
  domain: RealityAnswerDomain,
  evidence: RealityEvidence[],
  context: RealityPalmContext | null = null,
): string | null {
  const palmEvidence = evidence.filter((entry) => entry.source === "palm");
  if (palmEvidence.length === 0 && !context) return null;

  if (context) {
    const structured = contextPalmStory(domain, context);
    if (structured) return structured;
  }

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
