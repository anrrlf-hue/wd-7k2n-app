// 실제 사진에서 확인된 선의 모양을 바탕으로 생활 언어로 풀이한다.
// 선을 공부시키는 설명보다 "내 손금이 나에게 무엇을 말하는지"를 우선한다.
// 모델이 직접 검출하지 못하는 재물선/운명선은 있다고 가정하지 않는다.

import type { PalmFacts, OnnxLineDetail, OnnxPalmLines } from "@/lib/palm-facts";

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

export function buildRealObservationText(facts: PalmFacts): string {
  if (!facts.onnxLines) return "손바닥 전체가 밝고 선명하게 나오도록 다시 촬영해 주세요.";
  return (["heartLine", "headLine", "lifeLine"] as const)
    .map((key) => observation(LINE_LABEL[key], facts.onnxLines![key]))
    .join(" ");
}

export interface PalmReadingSection {
  key: "heartLine" | "headLine" | "lifeLine" | "together" | "wealth";
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
  parts.push("생명선은 수명이나 건강을 예측하는 선으로 단정하지 않고, 생활 리듬과 활동 방식의 전통적 해석으로만 봅니다.");
  return parts.join(" ");
}

function wealthReading(lines: OnnxPalmLines): string {
  const head = lines.headLine;
  const life = lines.lifeLine;
  const heart = lines.heartLine;
  const parts: string[] = [];

  if (head.detected) {
    if (head.curve === "직선에 가까움") {
      parts.push("돈과 관련된 선택에서는 감보다 기준을 세우고 비교한 뒤 움직일 때 강점이 살아나는 편으로 읽힙니다.");
    } else if (head.curve === "완만한 곡선") {
      parts.push("정해진 한 가지 방식보다 아이디어·사람·기회를 연결하면서 돈의 가능성을 찾는 쪽에 더 가까울 수 있습니다.");
    }
    if (head.length === "김") parts.push("큰 결정을 하기 전 충분히 알아보려는 성향이 있어, 성급한 선택보다 준비된 기회에서 힘을 쓰는 편입니다.");
    if (head.length === "짧음") parts.push("기회를 보면 빠르게 움직일 수 있는 대신, 금액이 큰 선택일수록 한 번 더 확인하는 습관이 필요합니다.");
  }

  if (life.detected) {
    if (life.length === "김") parts.push("재물은 한 번에 크게 움직이기보다 오래 유지할 수 있는 일이나 반복 수입 구조와 궁합이 좋은 편으로 볼 수 있습니다.");
    if (life.length === "짧음") parts.push("환경 변화에 맞춰 수입 방식도 바꾸는 편일 수 있어, 한 가지 수입원에만 기대지 않는 방식이 더 편할 수 있습니다.");
  }

  if (heart.detected) {
    if (heart.curve === "완만한 곡선") parts.push("사람과의 관계가 일이나 기회로 이어질 가능성을 중요하게 보는 편이라, 혼자 판단하는 것보다 좋은 관계를 오래 쌓는 것이 재물 흐름에도 도움이 될 수 있습니다.");
    if (heart.curve === "직선에 가까움") parts.push("사람 때문에 돈의 기준이 흔들리기보다 약속과 조건을 분명히 할 때 재물을 지키는 힘이 더 살아나는 편입니다.");
  }

  parts.push("재물선 자체는 현재 사진 분석 모델이 독립적으로 검출하지 않기 때문에 있다고 단정하지 않습니다. 이번 재물운은 실제로 확인된 주요 손금의 결을 함께 읽은 결과입니다.");
  return parts.join(" ");
}

export function buildPalmReadingSections(lines: OnnxPalmLines | null | undefined): PalmReadingSection[] {
  if (!lines?.modelExecuted) return [];
  const sections: PalmReadingSection[] = [];
  const heart = lines.heartLine;
  const head = lines.headLine;
  const life = lines.lifeLine;

  if (heart.detected && (heart.length || heart.curve)) {
    const text = heartReading(heart);
    sections.push({ key: "heartLine", title: "관계와 감정 — 나는 마음을 어떻게 주는 사람인가", observation: observation("감정선", heart), summary: text, text });
  }
  if (head.detected && (head.length || head.curve)) {
    const text = headReading(head);
    sections.push({ key: "headLine", title: "생각과 결정 — 나는 어떤 방식으로 판단하는가", observation: observation("두뇌선", head), summary: text, text });
  }
  if (life.detected && (life.length || life.curve)) {
    const text = lifeReading(life);
    sections.push({ key: "lifeLine", title: "생활의 흐름 — 나는 에너지를 어떻게 쓰는가", observation: observation("생명선", life), summary: text, text });
  }

  if (heart.detected && head.detected) {
    const text =
      heart.curve === head.curve
        ? "마음을 표현하는 방식과 생각을 정리하는 방식의 결이 비슷한 편입니다. 그래서 내가 느끼는 것과 실제 선택이 비교적 한 방향으로 움직일 수 있습니다. 반대로 확신이 생기면 다른 시각을 늦게 받아들일 수도 있으니 큰 결정에서는 한 사람의 다른 의견을 들어보는 것이 좋습니다."
        : "마음을 쓰는 방식과 판단하는 방식이 서로 다른 결을 보입니다. 관계에서는 감정적으로 반응하면서도 중요한 결정에서는 냉정해지거나, 반대로 마음은 조심스럽지만 생각은 자유롭게 펼치는 모습이 함께 나타날 수 있습니다. 이 차이는 모순이라기보다 상황에 따라 다른 강점을 쓰는 방식에 가깝습니다.";
    sections.push({ key: "together", title: "세 선을 함께 보면 — 내 안의 균형", observation: `${observation("감정선", heart)} ${observation("두뇌선", head)}`, summary: text, text });
  }

  const wealthText = wealthReading(lines);
  sections.push({
    key: "wealth",
    title: "재물운 — 돈을 벌고 지키는 나의 방식",
    observation: "현재 확인된 감정선·두뇌선·생명선을 함께 읽었습니다.",
    summary: wealthText,
    text: wealthText,
  });

  return sections;
}

export function buildTraditionalReadingText(facts: PalmFacts): string {
  const sections = buildPalmReadingSections(facts.onnxLines);
  return sections.length
    ? sections.map((s) => s.text).join(" ")
    : "손의 주요 선이 보이도록 밝은 곳에서 손바닥 전체를 다시 촬영해 주세요.";
}
