// 손금 사진에서 확인된 주요 선과 보조 선 후보를 생활 언어로 풀이한다.
// 학습 모델이 직접 분류하는 것은 감정선·두뇌선·생명선이며,
// 운명선·태양선·재물선은 지정 영역의 실제 영상 신호를 보조적으로 본다.
// 보조 선은 "선명 / 희미 / 확인 안 됨"으로만 사용하며, 없는 선을 있다고 단정하지 않는다.

import type {
  PalmFacts,
  OnnxLineDetail,
  OnnxPalmLines,
} from "@/lib/palm-facts";

const LINE_LABEL = { heartLine: "감정선", headLine: "두뇌선", lifeLine: "생명선" } as const;
const LENGTH = { 김: "길게 뻗은", 보통: "중간 길이의", 짧음: "짧게 이어진" } as const;
const CURVE = { "완만한 곡선": "완만한 곡선을 이루는", "직선에 가까움": "직선에 가까운" } as const;

function observation(label: string, d: OnnxLineDetail): string {
  if (!d.detected) return `${label}은 이번 사진에서 뚜렷하게 확인되지 않았습니다.`;
  if (d.length && d.curve) return `${label}은 ${LENGTH[d.length]} 형태이고 ${CURVE[d.curve]} 모습입니다.`;
  if (d.length) return `${label}은 ${LENGTH[d.length]} 형태로 보입니다.`;
  if (d.curve) return `${label}은 ${CURVE[d.curve]} 모습입니다.`;
  return `${label}의 위치는 보이지만 세부 모양은 이번 사진에서 선명하게 확인되지 않았습니다.`;
}

function clarityReading(d: OnnxLineDetail): string | null {
  if (!d.detected) return null;
  if (d.depthStrength === "강함") {
    return "사진에서도 이 선이 비교적 뚜렷하게 잡혀, 이 주제가 다른 특징보다 눈에 띄는 편입니다.";
  }
  if (d.depthStrength === "약함") {
    return "선은 확인되지만 비교적 가늘게 잡혀, 강한 단정거리보다 보조적인 성향으로 보는 편이 자연스럽습니다.";
  }
  return null;
}

export interface PalmReadingContext {
  handShape?: PalmFacts["handShape"];
  handSide?: PalmFacts["handSide"];
}

function handOverviewReading(context?: PalmReadingContext): string | null {
  const shape = context?.handShape;
  if (!shape || shape === "unknown") return null;

  const side =
    context?.handSide === "left"
      ? "이번 사진은 왼손으로 인식됐습니다. "
      : context?.handSide === "right"
        ? "이번 사진은 오른손으로 인식됐습니다. "
        : "";

  const shapeText: Record<Exclude<PalmFacts["handShape"], "unknown">, string> = {
    square:
      "손바닥 폭과 길이의 균형이 비교적 단단한 형태입니다. 전통 손금에서는 생각만 오래 끌기보다 현실에서 정리하고 처리하는 힘이 있는 손으로 봅니다.",
    rectangular:
      "손바닥은 비교적 단단한데 손가락 길이가 있는 형태입니다. 전통 손금에서는 현실 감각과 생각의 깊이를 같이 쓰는 손으로 봅니다.",
    elongated:
      "손바닥이 길고 손가락은 상대적으로 짧은 형태입니다. 전통 손금에서는 전체 흐름을 길게 보기보다 상황을 빠르게 읽고 움직이는 쪽으로 풀이합니다.",
    slender:
      "손바닥과 손가락이 모두 길쭉한 형태입니다. 전통 손금에서는 세부를 오래 관찰하고 생각을 안에서 충분히 정리한 뒤 움직이는 쪽으로 봅니다.",
  };

  return `${side}${shapeText[shape]}`;
}

function coreStoryReading(
  lines: OnnxPalmLines,
  secondaryLines?: PalmFacts["secondaryLines"],
): string | null {
  const parts: string[] = [];
  const head = lines.headLine;
  const heart = lines.heartLine;
  const life = lines.lifeLine;
  const fateClear = Boolean(
    secondaryLines?.fate.status === "clear" && secondaryLines.fate.corroborated,
  );
  const sunClear = secondaryLines?.sun.status === "clear";
  const wealthClear = secondaryLines?.wealth.status === "clear";

  if (head.detected) {
    if (head.length === "김" && head.curve === "완만한 곡선") {
      parts.push("생각을 깊게 확장하면서 직감과 아이디어까지 함께 쓰는 두뇌선이 중심에 있습니다.");
    } else if (head.length === "김" && head.curve === "직선에 가까움") {
      parts.push("한 번 판단을 시작하면 충분히 따져보고 기준을 세운 뒤 결론 내리려는 두뇌선이 중심에 있습니다.");
    } else if (head.curve === "완만한 곡선") {
      parts.push("정답 하나만 찾기보다 상황과 아이디어를 함께 보려는 두뇌선이 눈에 띕니다.");
    } else if (head.curve === "직선에 가까움") {
      parts.push("감보다 기준과 순서를 세워 판단하려는 두뇌선이 눈에 띕니다.");
    }
  }

  if (heart.detected && head.detected) {
    parts.push(
      heart.curve === head.curve
        ? "감정을 쓰는 방식과 판단하는 방식의 결이 비슷해서, 마음이 정해지면 행동도 한 방향으로 모이기 쉬운 조합입니다."
        : "감정을 쓰는 방식과 판단하는 방식의 결이 달라, 사람 문제에서는 마음이 움직여도 중요한 선택에서는 다시 머리로 확인하는 모습이 함께 나타날 수 있습니다.",
    );
  }

  if (life.detected) {
    if (life.length === "김") {
      parts.push("생명선도 길게 잡혀, 한 번 정한 생활 방식이나 목표를 오래 이어가는 힘을 같이 보는 편입니다.");
    } else if (life.length === "짧음") {
      parts.push("생명선은 비교적 짧게 잡혀, 한 방향만 오래 붙들기보다 상황 변화에 맞춰 생활 방식을 바꾸는 편으로 볼 수 있습니다.");
    }
  }

  if (fateClear) {
    parts.push(
      "여기에 운명선이 함께 확인돼, 생각으로만 끝내기보다 결국 자기 일·진로의 방향으로 연결하려는 흐름이 더해집니다.",
    );
  }
  if (sunClear) {
    parts.push(
      "태양선 후보까지 보이면 만든 결과를 밖으로 보여주고 평가받는 과정이 중요한 손으로 읽을 수 있습니다.",
    );
  }
  if (wealthClear) {
    parts.push(
      "재물선 후보까지 보이면 일의 결과를 거래·보상·수입 기회로 연결하는 방식에도 관심이 실리는 손으로 봅니다.",
    );
  }

  if (parts.length === 0) return null;
  parts.push(
    "전통 손금식으로 한 번에 보면, 한 선의 좋고 나쁨보다 생각·관계·생활·일의 흐름이 어떻게 연결되는지가 이 손의 핵심입니다.",
  );
  return parts.join(" ");
}

export function buildRealObservationText(facts: PalmFacts): string {
  if (!facts.onnxLines) return "손바닥 전체가 밝고 선명하게 나오도록 다시 촬영해 주세요.";
  return (["heartLine", "headLine", "lifeLine"] as const)
    .map((key) => observation(LINE_LABEL[key], facts.onnxLines![key]))
    .join(" ");
}

export interface PalmReadingSection {
  key:
    | "overview"
    | "heartLine"
    | "headLine"
    | "lifeLine"
    | "fate"
    | "sun"
    | "wealthLine"
    | "together"
    | "secondaryTogether"
    | "coreStory"
    | "wealth";
  title: string;
  observation: string;
  summary: string;
  text: string;
}

function heartReading(d: OnnxLineDetail): string {
  const parts: string[] = [];
  if (d.length === "김") parts.push("한번 마음을 주면 관계를 가볍게 끊기보다 오래 가져가려는 편으로 읽힙니다.");
  if (d.length === "보통") parts.push("가까워질 사람과 거리를 둘 사람을 비교적 자연스럽게 구분하는 편으로 읽힙니다.");
  if (d.length === "짧음") parts.push("관계에서 내 공간과 기준을 중요하게 여기고, 쉽게 마음을 다 보여주지는 않는 편으로 읽힙니다.");
  if (d.curve === "완만한 곡선") parts.push("마음을 느끼는 것에서 끝나지 않고 표정이나 말로 반응해주는 편이라, 친해질수록 따뜻함이 더 잘 드러날 수 있습니다.");
  if (d.curve === "직선에 가까움") parts.push("감정을 크게 드러내기보다 약속을 지키거나 필요한 일을 챙기는 방식으로 마음을 보여주는 쪽에 가깝습니다.");
  const clarity = clarityReading(d);
  if (clarity) parts.push(clarity);
  parts.push("관계에서는 내가 얼마나 좋아하는지보다, 상대가 내 표현 방식을 제대로 알아듣고 있는지가 더 중요할 수 있습니다.");
  return parts.join(" ");
}

function headReading(d: OnnxLineDetail): string {
  const parts: string[] = [];
  if (d.length === "김") parts.push("결정을 내리기 전에 앞뒤 맥락과 가능성을 충분히 살펴보는 편으로 읽힙니다.");
  if (d.length === "보통") parts.push("전체 흐름을 보면서도 당장 해결해야 할 현실적인 문제를 놓치지 않는 편으로 읽힙니다.");
  if (d.length === "짧음") parts.push("복잡하게 오래 고민하기보다 핵심을 잡고 빨리 움직이는 쪽에 가까울 수 있습니다.");
  if (d.curve === "완만한 곡선") parts.push("정답 하나만 찾기보다 직감과 아이디어를 함께 쓰는 편이라 새로운 방식이나 창의적인 해결책에 강점이 생길 수 있습니다.");
  if (d.curve === "직선에 가까움") parts.push("기준과 근거를 세워 판단하는 편이라 숫자, 비교, 순서를 정리하면 결정이 빨라질 수 있습니다.");
  const clarity = clarityReading(d);
  if (clarity) parts.push(clarity);
  parts.push("중요한 선택에서는 평소 강점이 과해져 너무 오래 고민하거나 반대로 너무 빨리 결론 내리는지만 살펴보면 좋습니다.");
  return parts.join(" ");
}

function lifeReading(d: OnnxLineDetail): string {
  const parts: string[] = [];
  if (d.length === "김") parts.push("생활의 흐름을 한 번 잡으면 오래 이어가는 힘이 있는 편으로 읽힙니다.");
  if (d.length === "보통") parts.push("안정과 변화를 한쪽으로 몰지 않고 상황에 맞춰 조절하는 편으로 읽힙니다.");
  if (d.length === "짧음") parts.push("한 가지 생활 패턴을 오래 유지하기보다 변화가 생길 때 빠르게 맞춰가는 쪽에 가까울 수 있습니다.");
  if (d.curve === "완만한 곡선") parts.push("익숙한 환경 안에서도 활동 반경을 넓히거나 새로운 경험을 받아들이는 편으로 볼 수 있습니다.");
  if (d.curve === "직선에 가까움") parts.push("에너지를 여러 곳에 흩기보다 필요한 곳에 집중해서 쓰는 편으로 볼 수 있습니다.");
  const clarity = clarityReading(d);
  if (clarity) parts.push(clarity);
  parts.push("생활 리듬에서는 한 가지 흐름을 오래 이어가는 편인지, 변화에 맞춰 빠르게 전환하는 편인지가 함께 드러납니다.");
  return parts.join(" ");
}

function fateReading(signal: NonNullable<PalmFacts["secondaryLines"]>["fate"]): string {
  const parts: string[] = [];
  if (signal.span >= 0.65) {
    parts.push("손바닥 중앙을 따라 운명선이 비교적 길게 이어지는 모습입니다.");
  } else {
    parts.push("손바닥 중앙에서 운명선이 비교적 또렷하게 이어지는 구간이 보입니다.");
  }
  parts.push("손금에서는 이런 선을 일과 진로의 흐름을 스스로 이어가려는 힘과 연결해 보는 편입니다.");
  parts.push("한 방향을 오래 붙드는 힘이 장점이 될 수 있지만, 방향을 바꿔야 할 때도 기존 흐름을 너무 오래 끌고 가지 않는지가 중요할 수 있습니다.");
  return parts.join(" ");
}

function secondaryObservation(
  label: string,
  signal: NonNullable<PalmFacts["secondaryLines"]>["sun"],
): string {
  if (signal.status === "clear") {
    return `${label} 후보가 원본 사진과 보정 영상에서 함께 이어져 확인됐습니다.`;
  }
  if (signal.status === "faint") {
    return `${label} 후보가 일부 보이지만 별도 풀이에 사용할 만큼 뚜렷하지는 않습니다.`;
  }
  return `${label} 후보는 이번 사진에서 충분히 확인되지 않았습니다.`;
}

function sunReading(
  signal: NonNullable<PalmFacts["secondaryLines"]>["sun"],
  lines: OnnxPalmLines,
  fateClear: boolean,
): string {
  const parts: string[] = [];

  parts.push(
    signal.span >= 0.55
      ? "약지 아래로 이어지는 태양선 후보가 비교적 길게 잡힙니다."
      : "약지 아래에서 태양선 후보가 또렷하게 이어지는 구간이 보입니다.",
  );
  parts.push(
    "전통 손금에서는 태양선을 내가 만든 결과가 밖으로 드러나고, 인정·평판·표현으로 연결되는 방식을 보는 선으로 해석합니다.",
  );

  if (lines.headLine.detected) {
    if (lines.headLine.curve === "직선에 가까움") {
      parts.push(
        "두뇌선이 직선에 가까워, 아이디어 자체보다 정리된 결과·실적·완성도를 보여줄 때 평가를 받는 흐름과 더 잘 맞습니다.",
      );
    } else if (lines.headLine.curve === "완만한 곡선") {
      parts.push(
        "두뇌선이 곡선형이라, 정해진 방식만 따르기보다 아이디어·표현·창의적인 결과물을 밖으로 보여줄 때 강점이 살아나는 쪽으로 볼 수 있습니다.",
      );
    }
  }

  if (fateClear) {
    parts.push(
      "운명선도 함께 확인되면, 일의 방향을 잡는 힘과 그 결과가 밖에서 인정받는 방식이 서로 연결되는 조합으로 봅니다.",
    );
  }

  parts.push(
    "이 선은 유명해지거나 성공을 보장한다는 뜻이 아니라, 성과를 어떻게 드러내고 평가받는지를 보는 전통적 해석입니다.",
  );
  return parts.join(" ");
}

function wealthLineReading(
  signal: NonNullable<PalmFacts["secondaryLines"]>["wealth"],
  lines: OnnxPalmLines,
  fateClear: boolean,
): string {
  const parts: string[] = [];

  parts.push(
    signal.span >= 0.5
      ? "새끼손가락 아래쪽의 재물선 후보가 비교적 길게 이어지는 모습입니다."
      : "새끼손가락 아래쪽에서 재물선 후보가 또렷하게 이어지는 구간이 보입니다.",
  );
  parts.push(
    "전통 손금에서 재물선은 돈이 저절로 들어온다는 뜻보다, 수입 기회·거래·보상을 알아보고 다루는 방식과 연결해 보는 선입니다.",
  );

  if (lines.headLine.detected) {
    if (lines.headLine.curve === "직선에 가까움") {
      parts.push(
        "두뇌선이 직선에 가까워, 돈과 관련된 선택에서는 감보다 숫자·조건·비교 기준을 세울수록 강점이 살아나는 편으로 읽을 수 있습니다.",
      );
    } else if (lines.headLine.curve === "완만한 곡선") {
      parts.push(
        "두뇌선이 곡선형이라, 한 가지 고정된 방식보다 아이디어·사람·기회를 연결하면서 새로운 수입 가능성을 찾는 쪽으로 볼 수 있습니다.",
      );
    }
  }

  if (fateClear) {
    parts.push(
      "운명선도 함께 확인되면, 일이나 진로의 변화가 돈과 관련된 기회·보상 문제와 함께 움직이는 조합으로 해석할 수 있습니다.",
    );
  }

  parts.push(
    "재물선이 보여도 실제 수입·투자 결과를 뜻하지 않으며, 금액과 성과는 현실 조건을 따로 확인해야 합니다.",
  );
  return parts.join(" ");
}

function secondaryCombinationReading(
  secondaryLines: NonNullable<PalmFacts["secondaryLines"]>,
): string | null {
  const fate = secondaryLines.fate.status === "clear" && secondaryLines.fate.corroborated;
  const sun = secondaryLines.sun.status === "clear";
  const wealth = secondaryLines.wealth.status === "clear";
  const count = [fate, sun, wealth].filter(Boolean).length;
  if (count < 2) return null;

  if (fate && sun && wealth) {
    return "운명선·태양선·재물선 후보가 함께 확인됩니다. 전통 손금에서는 일의 방향, 성과가 드러나는 방식, 돈과 관련된 기회가 따로 떨어지기보다 서로 연결되어 움직이는 성향으로 봅니다. 다만 세 선이 함께 보여도 성공이나 수입을 보장한다는 뜻은 아니며, 실제 결과는 현재의 선택과 환경에 따라 달라집니다.";
  }
  if (fate && sun) {
    return "운명선과 태양선 후보가 함께 확인됩니다. 전통 손금에서는 내가 잡은 일의 방향이 결과물·평판·인정으로 이어지는 방식을 중요하게 보는 조합입니다. 방향을 오래 유지하는 것만큼 결과를 밖으로 보여주는 방식도 중요할 수 있습니다.";
  }
  if (fate && wealth) {
    return "운명선과 재물선 후보가 함께 확인됩니다. 전통 손금에서는 일과 진로의 흐름이 돈과 관련된 기회·거래·보상 문제와 연결되기 쉬운 조합으로 봅니다. 좋은 흐름처럼 보여도 실제 금액과 계약 조건은 따로 확인해야 합니다.";
  }
  if (sun && wealth) {
    return "태양선과 재물선 후보가 함께 확인됩니다. 전통 손금에서는 만든 결과가 밖에서 평가받고, 그 평가가 일거리·보상·거래 기회로 연결되는 방식을 중요하게 보는 조합입니다. 인정과 실제 수익은 같은 뜻이 아니므로 둘을 구분해서 보는 것이 좋습니다.";
  }
  return null;
}

function wealthReading(lines: OnnxPalmLines): string {
  const head = lines.headLine;
  const life = lines.lifeLine;
  const heart = lines.heartLine;
  const parts: string[] = [];

  if (head.detected) {
    if (head.curve === "직선에 가까움") {
      parts.push("돈과 관련된 판단에서는 감보다 기준을 세우고 비교한 뒤 움직일 때 강점이 살아나는 편입니다.");
    } else if (head.curve === "완만한 곡선") {
      parts.push("정해진 한 가지 방식보다 아이디어·사람·기회를 연결하면서 돈의 가능성을 찾는 쪽에 더 가까울 수 있습니다.");
    }

    if (head.length === "김") {
      parts.push("큰 결정을 하기 전 충분히 알아보려는 성향이 있어, 준비된 기회에서 힘을 쓰는 편입니다.");
    }
    if (head.length === "짧음") {
      parts.push("기회를 보면 빠르게 움직일 수 있는 대신, 금액이 큰 선택일수록 한 번 더 확인하는 습관이 필요합니다.");
    }
  }

  if (life.detected) {
    if (life.length === "김") {
      parts.push("재물은 오래 유지할 수 있는 일이나 반복 수입 구조와 궁합이 좋은 편으로 볼 수 있습니다.");
    }
    if (life.length === "짧음") {
      parts.push("환경 변화에 맞춰 수입 방식도 바꾸는 편일 수 있어, 한 가지 수입원에만 기대지 않는 방식이 더 편할 수 있습니다.");
    }
  }

  if (heart.detected) {
    if (heart.curve === "완만한 곡선") {
      parts.push("사람과의 관계가 일이나 기회로 이어질 가능성을 중요하게 보는 편이라, 좋은 관계를 오래 쌓는 것이 재물 흐름에도 도움이 될 수 있습니다.");
    }
    if (heart.curve === "직선에 가까움") {
      parts.push("사람 때문에 돈의 기준이 흔들리기보다 약속과 조건을 분명히 할 때 재물을 지키는 힘이 더 살아나는 편입니다.");
    }
  }


  return parts.join(" ");
}

export function buildPalmReadingSections(
  lines: OnnxPalmLines | null | undefined,
  secondaryLines?: PalmFacts["secondaryLines"],
  context?: PalmReadingContext,
): PalmReadingSection[] {
  if (!lines?.modelExecuted) return [];

  const sections: PalmReadingSection[] = [];
  const overview = handOverviewReading(context);
  if (overview) {
    sections.push({
      key: "overview",
      title: "먼저 보이는 전체 인상",
      observation: context?.handSide === "left" ? "왼손 사진 기준" : context?.handSide === "right" ? "오른손 사진 기준" : "이번 손 사진 기준",
      summary: overview,
      text: overview,
    });
  }

  const heart = lines.heartLine;
  const head = lines.headLine;
  const life = lines.lifeLine;

  if (heart.detected && (heart.length || heart.curve)) {
    const text = heartReading(heart);
    sections.push({
      key: "heartLine",
      title: "관계와 감정 — 나는 마음을 어떻게 주는 사람인가",
      observation: observation("감정선", heart),
      summary: text,
      text,
    });
  }

  if (head.detected && (head.length || head.curve)) {
    const text = headReading(head);
    sections.push({
      key: "headLine",
      title: "생각과 결정 — 나는 어떤 방식으로 판단하는가",
      observation: observation("두뇌선", head),
      summary: text,
      text,
    });
  }

  if (life.detected && (life.length || life.curve)) {
    const text = lifeReading(life);
    sections.push({
      key: "lifeLine",
      title: "생활의 흐름 — 나는 에너지를 어떻게 쓰는가",
      observation: observation("생명선", life),
      summary: text,
      text,
    });
  }

  if (secondaryLines?.fate.status === "clear" && secondaryLines.fate.corroborated) {
    const text = fateReading(secondaryLines.fate);
    sections.push({
      key: "fate",
      title: "운명선 — 일과 진로의 흐름",
      observation: "손바닥 중앙의 세로 흐름이 영상 신호와 별도 운명선 모델에서 함께 확인됐습니다.",
      summary: text,
      text,
    });
  }

  const fateClear = Boolean(
    secondaryLines?.fate.status === "clear" && secondaryLines.fate.corroborated,
  );

  if (secondaryLines?.sun.status === "clear") {
    const text = sunReading(secondaryLines.sun, lines, fateClear);
    sections.push({
      key: "sun",
      title: "태양선 — 성과·인정이 드러나는 방식",
      observation: secondaryObservation("태양선", secondaryLines.sun),
      summary: text,
      text,
    });
  }

  if (secondaryLines?.wealth.status === "clear") {
    const text = wealthLineReading(secondaryLines.wealth, lines, fateClear);
    sections.push({
      key: "wealthLine",
      title: "재물선 — 돈과 기회를 다루는 방식",
      observation: secondaryObservation("재물선", secondaryLines.wealth),
      summary: text,
      text,
    });
  }

  if (heart.detected && head.detected) {
    const parts = [
      heart.curve === head.curve
        ? "마음을 표현하는 방식과 생각을 정리하는 방식의 결이 비슷한 편입니다. 그래서 내가 느끼는 것과 실제 선택이 비교적 한 방향으로 움직일 수 있습니다."
        : "마음을 쓰는 방식과 판단하는 방식이 서로 다른 결을 보입니다. 관계에서는 감정적으로 반응하면서도 중요한 결정에서는 냉정해지거나, 반대로 마음은 조심스럽지만 생각은 자유롭게 펼치는 모습이 함께 나타날 수 있습니다.",
    ];
    if (life.detected) {
      if (life.length === "김") {
        parts.push("생명선도 길게 이어져, 마음과 판단으로 정한 방향을 생활 속에서 오래 이어가는 힘을 함께 보는 편입니다.");
      } else if (life.length === "짧음") {
        parts.push("생명선은 비교적 짧게 잡혀, 마음과 판단이 정해져도 생활 방식은 상황 변화에 맞춰 빠르게 바꾸는 쪽으로 볼 수 있습니다.");
      } else {
        parts.push("생명선까지 함께 보면 감정·판단·생활 리듬을 한쪽으로 몰기보다 상황에 맞춰 조절하는 모습이 더 잘 드러납니다.");
      }
    }
    parts.push("강점이 한 방향으로 너무 세게 몰릴 때는 다른 시각을 한 번 더 확인하는 것이 균형을 잡는 데 도움이 됩니다.");
    const text = parts.join(" ");

    sections.push({
      key: "together",
      title: "주요 선을 함께 보면 — 내 안의 균형",
      observation: [observation("감정선", heart), observation("두뇌선", head), life.detected ? observation("생명선", life) : ""]
        .filter(Boolean)
        .join(" "),
      summary: text,
      text,
    });
  }

  if (secondaryLines) {
    const combinedText = secondaryCombinationReading(secondaryLines);
    if (combinedText) {
      const observed = [
        fateClear ? "운명선" : null,
        secondaryLines.sun.status === "clear" ? "태양선" : null,
        secondaryLines.wealth.status === "clear" ? "재물선" : null,
      ].filter((item): item is string => Boolean(item));

      sections.push({
        key: "secondaryTogether",
        title: "보조선을 함께 보면 — 일·성과·재물의 연결",
        observation: `${observed.join("·")} 후보가 이번 사진에서 함께 확인됐습니다.`,
        summary: combinedText,
        text: combinedText,
      });
    }
  }

  const coreStory = coreStoryReading(lines, secondaryLines);
  if (coreStory) {
    sections.push({
      key: "coreStory",
      title: "한 번에 정리하면 — 이 손의 핵심",
      observation: "확인된 주요선과 보조선을 서로 연결해서 본 종합풀이입니다.",
      summary: coreStory,
      text: coreStory,
    });
  }

  const wealthText = wealthReading(lines);
  sections.push({
    key: "wealth",
    title: "재물운 — 돈을 벌고 지키는 나의 방식",
    observation: "현재 확인된 감정선·두뇌선·생명선만 해석 근거로 사용했습니다.",
    summary: wealthText,
    text: wealthText,
  });

  return sections;
}

export function buildTraditionalReadingText(facts: PalmFacts): string {
  const sections = buildPalmReadingSections(facts.onnxLines, facts.secondaryLines, {
    handShape: facts.handShape,
    handSide: facts.handSide,
  });
  return sections.length
    ? sections.map((s) => s.text).join(" ")
    : "손의 주요 선이 보이도록 밝은 곳에서 손바닥 전체를 다시 촬영해 주세요.";
}
