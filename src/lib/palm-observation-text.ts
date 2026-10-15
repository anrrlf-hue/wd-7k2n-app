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
const CURVE = { "완만한 곡선": "완만한 곡선을 이루는", "직선에 가까움": "직선에 가까운" } as const;
const COMMON_SCOPE_NOTE = "사진에서 추정한 검출 구간의 모양을 전통적 상징으로 읽는 참고 풀이입니다. 곡률·구간 길이 분류는 자동 검출 참고값이라 독립 육안으로 확정하지 않았고, 실제 성격·적성·건강·수명·미래를 판정하지 않습니다. 검출 구간의 양끝도 손금 전체 경로와 실제 끝점·전체 길이를 뜻하지 않습니다.";

function observation(label: string, d: OnnxLineDetail): string {
  if (!d.detected) return `${label}은 이번 사진에서 뚜렷하게 확인되지 않았습니다.`;
  const source = d.sourceVariant === "enhanced" ? "보정 영상에서" : d.sourceVariant === "raw" ? "원본 사진에서" : "사진에서";
  const curve = d.curve && d.attributeSupport?.curve !== "not_supported" ? `검출 구간은 ${CURVE[d.curve]} 모습` : "검출 구간의 세부 모양";
  return `${label}은 ${source} ${curve}으로 자동 분류됐습니다. 전체 경로와 길이는 확인되지 않았습니다.`;
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
      ? "앱에서 왼손 슬롯으로 입력한 사진입니다. 실제 좌우는 사진 방향만으로 확정하지 않습니다. "
      : context?.handSide === "right"
        ? "앱에서 오른손 슬롯으로 입력한 사진입니다. 실제 좌우는 사진 방향만으로 확정하지 않습니다. "
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

function coreStoryReading(lines: OnnxPalmLines): string | null {
  const head = lines.headLine;
  const heart = lines.heartLine;
  const life = lines.lifeLine;
  const observed = [head.detected ? "두뇌선" : null, heart.detected ? "감정선" : null, life.detected ? "생명선" : null].filter(Boolean);
  if (!observed.length) return null;
  if (head.detected && heart.detected && head.curve && heart.curve && head.curve !== heart.curve) {
    return "이번 사진에서 두뇌선과 감정선으로 확인한 가장 직접적인 조합은 생각을 정리하는 방식과 마음을 표현하는 방식의 차이입니다. 판단을 빨리 닫기보다 상대가 어떻게 받아들였는지 한 번 확인하는 장면에서 이 차이가 실제 선택으로 드러날 수 있습니다. 이는 일·관계·재물의 결과를 예고하는 판정이 아니라, 확인된 주요선 모양을 생활 장면에 옮긴 참고입니다.";
  }
  if (head.detected && heart.detected && head.curve === heart.curve) {
    return "이번 사진에서 두뇌선과 감정선의 방향이 비슷하게 분류된 점은 생각과 감정이 비슷한 속도로 움직이는 조합으로 읽을 수 있습니다. 마음이 정해진 뒤 행동을 한 흐름으로 이어가기 쉽지만, 중요한 선택에서는 다른 사람의 조건도 별도로 확인하는 식으로 균형을 잡을 수 있습니다.";
  }
  return `${observed.join("·")}에서 확인된 자동 검출 구간만으로는 하나의 성향으로 넓히지 않습니다. 각 선의 보조 해석은 해당 문단의 범위에 두고, 실제 생활 판단은 경험과 조건을 함께 확인해야 합니다.`;
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
  parts.push("손가락 아래쪽의 감정선으로 부르는 위치에서 확인된 검출 구간을 마음을 표현하고 관계의 기대를 주고받는 방식과 연결해 봅니다.");
  if (d.curve === "완만한 곡선") parts.push("마음을 느끼는 것에서 끝나지 않고 표정이나 말로 반응해주는 편이라, 친해질수록 따뜻함이 더 잘 드러날 수 있습니다.");
  if (d.curve === "직선에 가까움") parts.push("감정을 크게 드러내기보다 약속을 지키거나 필요한 일을 챙기는 방식으로 마음을 보여주는 쪽에 가깝습니다.");
  parts.push("예를 들어 상대가 기쁜 소식을 전했을 때 축하를 먼저 말하고 내 반응도 짧게 덧붙이는 장면으로 옮겨볼 수 있습니다.");
  return parts.join(" ");
}

function headReading(d: OnnxLineDetail): string {
  const parts: string[] = [];
  parts.push("손바닥 중앙의 두뇌선으로 부르는 위치에서 확인된 검출 구간을 생각을 정리하고 선택 조건을 세우는 방식과 연결해 봅니다.");
  if (d.curve === "완만한 곡선") parts.push("정답 하나만 찾기보다 직감과 아이디어를 함께 쓰는 편이라 새로운 방식이나 창의적인 해결책에 강점이 생길 수 있습니다.");
  if (d.curve === "직선에 가까움") parts.push("기준과 근거를 세워 판단하는 편이라 숫자, 비교, 순서를 정리하면 결정이 빨라질 수 있습니다.");
  parts.push("예를 들어 회의에서 선택 기준 세 가지를 먼저 적고, 그 기준 안에서 방법을 바꾸어 보는 장면으로 옮겨볼 수 있습니다.");
  return parts.join(" ");
}

function lifeReading(d: OnnxLineDetail): string {
  const parts: string[] = [];
  parts.push("엄지 밑을 감싸 손목 쪽으로 내려가는 생명선으로 부르는 위치의 검출 구간을 생활 기반과 활동 리듬을 살펴보는 전통적 상징으로 연결해 봅니다.");
  if (d.curve === "완만한 곡선") parts.push("익숙한 환경 안에서도 활동 반경을 넓히거나 새로운 경험을 받아들이는 편으로 볼 수 있습니다.");
  if (d.curve === "직선에 가까움") parts.push("에너지를 여러 곳에 흩기보다 필요한 곳에 집중해서 쓰는 편으로 볼 수 있습니다.");
  parts.push("예를 들어 일정이나 역할이 바뀔 때 지키고 싶은 생활 조건 하나를 먼저 정한 뒤, 나머지 방법은 상황에 맞게 조정하는 장면으로 옮겨볼 수 있습니다.");
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
  lines: OnnxPalmLines,
  fateClear: boolean,
): string {
  const parts: string[] = [];

  parts.push("새끼손가락 아래쪽에서 재물선 후보 신호가 보였지만, 전체 경로·길이·깊이를 확인한 관측은 아닙니다.");
  parts.push("전통 손금에서는 이런 후보를 수입 기회·거래·보상을 알아보는 관심과 연결해 보기도 하지만, 실제 재물선 관측이나 수입·투자 결과의 근거로 읽지 않습니다.");
  if (lines.headLine.detected && lines.heartLine.detected) {
    parts.push("돈에 관한 판단은 이 후보보다 두뇌선과 감정선에서 읽은 기준·관계의 조합을 참고하되, 금액과 계약 조건은 현실 자료로 따로 확인해야 합니다.");
  } else if (fateClear) {
    parts.push("운명선 후보와의 동시 신호도 일·보상 주제를 생각해 보는 참고일 뿐, 진로 변화나 실제 수입을 예고하지 않습니다.");
  }
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
    return "운명선·태양선·재물선 후보 신호가 같은 사진에서 함께 잡혔습니다. 이 조합은 일·성과·돈을 한 문단에서 연결해 살펴볼 참고 순서만 제시하며, 후보의 전체 경로가 확인됐거나 성공·수입이 보장됐다는 뜻은 아닙니다.";
  }
  if (fate && sun) {
    return "운명선과 태양선 후보 신호가 함께 잡혔습니다. 일의 방향과 결과를 어떻게 보여줄지 연결해 살펴볼 수 있지만, 후보의 경로·시기·평가 결과를 확정하는 근거는 아닙니다.";
  }
  if (fate && wealth) {
    return "운명선과 재물선 후보 신호가 함께 잡혔습니다. 일의 방향과 보상·거래 조건을 함께 점검하는 참고가 되지만, 재물선의 전체 경로나 실제 금액을 보여주는 관측은 아닙니다.";
  }
  if (sun && wealth) {
    return "태양선과 재물선 후보 신호가 함께 잡혔습니다. 만든 결과가 보이는 방식과 보상 조건을 나누어 살펴보는 참고일 뿐, 인정이 실제 수익으로 이어진다는 뜻은 아닙니다.";
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
      summary: `${overview} ${COMMON_SCOPE_NOTE}`,
      text: `${overview} ${COMMON_SCOPE_NOTE}`,
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
    const text = wealthLineReading(lines, fateClear);
    sections.push({
      key: "wealthLine",
      title: "재물선 — 돈과 기회를 다루는 방식",
      observation: secondaryObservation("재물선", secondaryLines.wealth),
      summary: text,
      text,
    });
  }

  if (heart.detected && head.detected) {
    const text = heart.curve === head.curve
      ? "두 선의 방향이 비슷하게 분류된 점은 마음이 정해진 뒤 생각과 행동을 한 흐름으로 이어 가는 조합으로 읽을 수 있습니다. 다만 같은 방향으로 움직일수록 주변 조건을 생략하기 쉬우므로, 중요한 약속이나 돈의 선택에서는 상대의 실제 필요를 한 번 확인하는 장면을 함께 둡니다."
      : "두 선의 방향이 다르게 분류된 점은 감정이 움직이는 속도와 판단을 닫는 속도가 어긋날 수 있는 조합으로 읽을 수 있습니다. 관계에서는 공감한 뒤 결론을 늦추고, 일·재물에서는 조건을 정리한 뒤 마음의 반응을 다시 듣는 식으로 두 흐름을 이어 볼 수 있습니다.";

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

  const coreStory = coreStoryReading(lines);
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
