// 사진에서 관찰한 모양과 전통 손금 해석을 구분한다.
// 검출되지 않은 선/속성은 채우지 않는다. 굵기로 건강·수명·재력을 추론하지 않는다.
import type { PalmFacts, OnnxLineDetail, OnnxPalmLines } from "@/lib/palm-facts";

const LINE_LABEL = { heartLine: "감정선", headLine: "두뇌선", lifeLine: "생명선" } as const;
const LENGTH = { 김: "길게 뻗은", 보통: "중간 길이의", 짧음: "짧게 이어진" } as const;
const CURVE = { "완만한 곡선": "완만한 곡선을 이루고", "직선에 가까움": "직선에 가깝게 이어져" } as const;

function observation(label: string, d: OnnxLineDetail): string {
  if (!d.detected) return `${label}은 이번 사진에서 뚜렷하게 보이지 않습니다.`;
  if (d.length && d.curve) return `${label}은 ${LENGTH[d.length]} 형태로, ${CURVE[d.curve]} 있습니다.`;
  if (d.length) return `${label}은 ${LENGTH[d.length]} 형태로 보입니다.`;
  if (d.curve) return `${label}은 ${CURVE[d.curve]} 있습니다.`;
  return `${label}의 위치는 보이지만 세부 모양은 더 선명한 사진에서 확인할 수 있습니다.`;
}

export function buildRealObservationText(facts: PalmFacts): string {
  if (!facts.onnxLines) return "손바닥 전체가 밝고 선명하게 나오도록 다시 촬영해 주세요.";
  return (["heartLine", "headLine", "lifeLine"] as const)
    .map(key => observation(LINE_LABEL[key], facts.onnxLines![key])).join(" ");
}

export interface PalmReadingSection {
  key: "heartLine" | "headLine" | "together";
  title: string;
  observation: string;
  summary: string;
  text: string;
}

const HEART_LENGTH = {
  김: "길게 뻗은 감정선은 관계에 마음을 깊이 싣고, 가까워진 사람과의 연결을 소중히 여기는 결로 읽습니다.",
  짧음: "짧게 이어진 감정선은 마음을 크게 드러내기보다, 자신이 편안한 거리 안에서 관계를 가꾸는 결로 읽습니다.",
  보통: "중간 길이의 감정선은 친밀함과 자신의 공간을 함께 챙기는 관계의 결로 읽습니다.",
};
const HEAD_LENGTH = {
  김: "길게 뻗은 두뇌선은 한 가지 주제의 배경과 연결 고리를 넓게 살펴보는 사고의 결로 읽습니다.",
  짧음: "짧게 이어진 두뇌선은 복잡한 이야기에서 당장 다룰 핵심과 구체적인 쓰임을 찾는 사고의 결로 읽습니다.",
  보통: "중간 길이의 두뇌선은 전체 맥락과 눈앞의 구체적인 문제를 함께 살피는 사고의 결로 읽습니다.",
};

/** Existing length/curve readings, presented as distinct, useful paragraphs.
 * Missing attributes never become average/straight attributes via an else branch. */
export function buildPalmReadingSections(lines: OnnxPalmLines | null | undefined): PalmReadingSection[] {
  if (!lines?.modelExecuted) return [];
  const sections: PalmReadingSection[] = [];
  const heart = lines.heartLine;
  const head = lines.headLine;
  if (heart.detected && (heart.length || heart.curve)) {
    const parts = ["전통 손금에서 감정선은 마음을 주고 표현하는 방식을 살펴보는 선입니다."];
    if (heart.length) parts.push(HEART_LENGTH[heart.length]);
    if (heart.curve === "완만한 곡선") parts.push("완만한 곡선은 상대의 분위기를 받아들이고, 말과 반응으로 마음을 전하는 표현과 연결합니다. 친한 사람을 배려할 때 내 바람도 한 문장으로 함께 전해 보세요.");
    else if (heart.curve === "직선에 가까움") parts.push("직선에 가까운 모양은 감정의 크기를 드러내기보다, 약속을 지키거나 꾸준히 챙기는 방식으로 마음을 전하는 결입니다. 행동에 짧은 설명을 보태면 내 뜻을 상대에게 더 잘 전할 수 있습니다.");
    else parts.push("가까운 사람에게 마음을 전할 때 말, 행동, 함께 보내는 시간 중 무엇이 가장 자연스러운지 떠올려 보세요.");
    sections.push({ key: "heartLine", title: "감정선 · 마음을 주고 표현하는 방식", observation: observation("감정선", heart), summary: heart.length ? HEART_LENGTH[heart.length] : parts[1], text: parts.join(" ") });
  }
  if (head.detected && (head.length || head.curve)) {
    const parts = ["전통 손금에서 두뇌선은 생각을 펼치고 정리하는 방식을 살펴보는 선입니다."];
    if (head.length) parts.push(HEAD_LENGTH[head.length]);
    if (head.curve === "완만한 곡선") parts.push("완만한 곡선은 직관과 상상으로 여러 가능성을 연결하는 사고와 어울립니다. 새로운 일을 구상할 때는 아이디어를 펼친 뒤, 먼저 해볼 한 가지를 골라 구체화해 보세요.");
    else if (head.curve === "직선에 가까움") parts.push("직선에 가까운 모양은 근거와 순서를 잡아 생각을 정리하는 결입니다. 복잡한 선택 앞에서는 비교 기준을 먼저 적고, 각 선택이 그 기준에 어떻게 맞는지 풀어보는 방식을 떠올릴 수 있습니다.");
    else parts.push("새로운 문제를 만났을 때 큰 그림부터 그리는지, 필요한 정보를 하나씩 모으는지 자신의 방식을 돌아보세요.");
    sections.push({ key: "headLine", title: "두뇌선 · 생각을 펼치고 정리하는 방식", observation: observation("두뇌선", head), summary: head.length ? HEAD_LENGTH[head.length] : parts[1], text: parts.join(" ") });
  }
  if (heart.detected && head.detected && heart.curve && head.curve) {
    const heartFlexible = heart.curve === "완만한 곡선";
    const headFlexible = head.curve === "완만한 곡선";
    const text = heartFlexible && headFlexible
      ? "두 선의 곡선을 함께 읽으면, 관계에서는 상대의 반응을 살피고 생각에서는 여러 가능성을 열어두는 모습이 하나의 주제로 이어집니다. 이 전통 해석을 일상에 비춰본다면, 넓게 받아들인 마음과 아이디어 중 내가 꼭 지킬 기준 하나를 정해 보는 것이 좋은 질문이 됩니다."
      : !heartFlexible && !headFlexible
        ? "두 선의 직선적인 결을 함께 읽으면, 관계에서는 꾸준한 행동과 약속을, 생각에서는 근거와 정돈된 순서를 중요하게 보는 주제로 이어집니다. 이 전통 해석을 일상에 비춰본다면, 기준을 설명할 때 그 안에 담긴 마음도 함께 말하는지 돌아볼 수 있습니다."
        : heartFlexible
          ? "감정선의 곡선과 두뇌선의 직선적인 결은, 마음은 상대에게 열어두면서 생각은 기준에 맞춰 정리하는 두 모습을 함께 보여주는 전통 해석입니다. 이를 일상에 비춰본다면 상대의 마음을 먼저 듣고, 내가 할 수 있는 범위와 약속을 구체적으로 말하는 장면을 떠올릴 수 있습니다."
          : "감정선은 직선에 가깝고 두뇌선은 곡선을 이루어, 마음은 꾸준한 행동으로 전하고 생각은 여러 가능성으로 펼치는 두 모습으로 함께 읽습니다. 이 전통 해석을 일상에 비춰본다면 새로운 생각을 제안할 때도 상대와 이미 나눈 약속을 함께 짚어주는 장면을 떠올릴 수 있습니다.";
    sections.push({ key: "together", title: "두 선을 함께 읽으면", observation: `${observation("감정선", heart)} ${observation("두뇌선", head)}`, summary: text, text });
  }
  return sections;
}

export function buildTraditionalReadingText(facts: PalmFacts): string {
  const sections = buildPalmReadingSections(facts.onnxLines);
  return sections.length ? sections.map(s => s.text).join(" ") : "선의 세부 모양을 더 살펴볼 수 있도록 밝은 곳에서 손바닥 전체를 다시 촬영해 주세요.";
}
