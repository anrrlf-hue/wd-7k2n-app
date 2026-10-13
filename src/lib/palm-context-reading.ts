import type { PalmFacts, OnnxLineDetail } from "@/lib/palm-facts";
import type { DominantHand } from "@/lib/palm-bilateral";
import { validateReadingPlan, type ReadingPlan } from "@/lib/reading-plan";

const LINES = { headLine: "두뇌선", heartLine: "감정선", lifeLine: "생명선" } as const;
type LineKey = keyof typeof LINES;
function describe(line: OnnxLineDetail | undefined): string {
  if (!line?.detected) return "판독하지 못함";
  const source = line.sourceVariant === "enhanced" ? "보정 영상 검출" : line.sourceVariant === "raw" ? "원본 사진 검출" : "검출";
  const segmentLength = line.length && line.attributeSupport?.length !== "not_supported" ? `검출 구간 ${line.length}` : null;
  const signal = line.depthStrength && line.attributeSupport?.depth !== "not_supported" ? `마스크 신호 ${line.depthStrength}` : null;
  return [source, segmentLength, line.curve, signal].filter(Boolean).join(" · ") || "선 후보만 확인";
}

const LINE_LOCATIONS = {
  headLine: "손바닥 중앙을 가로지르는 두뇌선으로 부르는 자리",
  heartLine: "손가락 아래쪽을 가로지르는 감정선으로 부르는 자리",
  lifeLine: "엄지 밑을 감싸 손목 쪽으로 내려가는 생명선으로 부르는 자리",
} as const;

function sourcePhrase(line: OnnxLineDetail): string {
  return line.sourceVariant === "enhanced" ? "보정 영상의" : line.sourceVariant === "raw" ? "원본 사진의" : "사진의";
}

function lineNarrative(key: LineKey, line: OnnxLineDetail): string {
  const curve = line.curve && line.attributeSupport?.curve !== "not_supported" ? line.curve : null;
  const shape = curve
    ? `${curve === "직선에 가까움" ? "직선에 가까운" : "완만한 곡선의"} 검출 구간`
    : "확인된 검출 구간";
  if (key === "heartLine") {
    return `${sourcePhrase(line)} ${LINE_LOCATIONS[key]}에서 ${shape}이 확인됩니다. 전통 손금에서는 이 위치를 마음을 표현하고 관계의 기대를 주고받는 방식과 연결해 봅니다. 예를 들어 상대가 기쁜 소식을 전했을 때 축하를 먼저 말하고 내 반응도 짧게 덧붙이는 장면으로 옮겨볼 수 있습니다.`;
  }
  if (key === "headLine") {
    return `${sourcePhrase(line)} ${LINE_LOCATIONS[key]}에서 ${shape}이 확인됩니다. 전통 손금에서는 이 위치를 생각을 정리하고 선택 조건을 세우는 방식과 연결해 봅니다. 예를 들어 목적은 유지한 채 비교할 조건을 먼저 정하고, 그 조건 안에서 방법을 바꾸어 보는 장면으로 옮겨볼 수 있습니다.`;
  }
  return `${sourcePhrase(line)} ${LINE_LOCATIONS[key]}에서 ${shape}이 확인됩니다. 전통 손금에서는 이 위치를 생활 기반과 활동 리듬을 살펴보는 자리로 연결해 봅니다. 예를 들어 일정이나 역할이 바뀔 때 지키고 싶은 생활 조건 하나를 먼저 정한 뒤, 나머지 방법은 상황에 맞게 조정하는 장면으로 옮겨볼 수 있습니다.`;
}

/** One composition from observed features, with traceable interpretation rules.
 * Image confidence/depth never becomes confidence in a personality prediction. */
export function buildPalmContextReading(left: PalmFacts, right: PalmFacts, dominantHand: DominantHand): ReadingPlan {
  const primary = dominantHand === "right" ? right : left;
  const label = dominantHand === "right" ? "오른손" : "왼손";
  const head = primary.onnxLines?.headLine;
  const heart = primary.onnxLines?.heartLine;
  const plan: ReadingPlan = {
    headline: "양손에서 확인한 모양을 함께 읽기",
    passages: [], evidence: [],
    limits: ["사진에서 추정한 선의 모양을 전통적 상징으로 읽는 참고 풀이이며, 실제 성격·적성·수명·건강·미래를 판정하지 않습니다. 사용자가 선택한 주손을 기준으로 읽고 반대 사진은 비교 참고로 둡니다. 검출 구간의 양끝은 모델이 잡은 구간 끝점일 뿐, 손금 전체 경로와 실제 끝점·전체 길이는 확인하지 않았습니다."],
  };
  for (const hand of ["left", "right"] as const) {
    const facts = hand === "left" ? left : right;
    for (const key of Object.keys(LINES) as LineKey[]) {
      const line = facts.onnxLines?.[key];
      for (const field of ["detected", "length", "curve", "depthStrength", "sourceVariant", "rawDetected", "enhancedDetected", "endpointEvidence", "pathCompleteness", "attributeSupport"] as const) {
        const rawValue = line?.[field];
        const value = rawValue == null ? null : typeof rawValue === "object" ? JSON.stringify(rawValue) : rawValue;
        plan.evidence.push({ id: `${hand}.${key}.${field}`, kind: "observed", source: `${hand}PalmFacts.onnxLines.${key}.${field}`, value });
      }
    }
  }
  const refs = (key: LineKey) => (["left", "right"] as const).flatMap(hand => ["detected", "length", "curve", "depthStrength", "sourceVariant", "rawDetected", "enhancedDetected", "endpointEvidence", "pathCompleteness", "attributeSupport"].map(field => `${hand}.${key}.${field}`));
  const usableHead = head?.detected && head.curve;
  const usableHeart = heart?.detected && heart.curve;
  const curvedHead = head?.curve === "완만한 곡선";
  const curvedHeart = heart?.curve === "완만한 곡선";
  if (usableHead && usableHeart) {
    const text = curvedHead && curvedHeart
      ? "생각을 여러 방향으로 펼쳐보고, 사람과 주고받는 과정에서 그 생각이 더 선명해지는 모습으로 읽어볼 수 있습니다. 주로 쓰는 손의 두뇌선과 감정선이 모두 완만하게 휘어 있어, 사고의 유연함과 마음을 표현하는 방식을 함께 연결한 해석입니다. 예를 들어 혼자 완성한 답을 전달하기보다 대화 중 나온 반응에서 새로운 방향을 찾는 장면에 가깝습니다. 반응을 받아들이는 유연함이 장점이 되는 한편, 반응에 맞춰 방법을 바꾸는 동안 처음 중요하게 여겼던 기준까지 흐려질 수 있다는 긴장도 함께 봅니다."
      : !curvedHead && !curvedHeart
        ? "생각을 정리하는 방식과 마음을 전하는 방식 모두 일관된 기준을 중시하는 쪽으로 읽어볼 수 있습니다. 주손의 두뇌선과 감정선이 함께 직선에 가까워, 판단에서는 이유를 분명히 하고 관계에서는 말보다 행동의 일치를 살피는 이야기로 연결했습니다. 약속한 일을 꾸준히 해주는 모습은 신뢰가 되지만, 상대에게는 그 행동에 담긴 마음이 설명되지 않아 무심하게 느껴질 여지도 있습니다."
        : curvedHead
          ? "생각에서는 여러 가능성을 열어두지만, 마음을 표현할 때는 한층 절제된 모습으로 읽어볼 수 있습니다. 곡선형 두뇌선과 직선에 가까운 감정선의 조합을 그렇게 해석했습니다. 새로운 이야기를 활발하게 나누면서도 정작 자신의 감정에 대해서는 말을 아끼는 장면을 떠올릴 수 있습니다. 상대는 대화가 잘 통한다고 느끼면서도 무엇을 원하는지는 몰라 답답할 수 있다는 양면을 함께 봅니다."
          : "판단할 때는 기준을 분명히 세우고, 사람을 대할 때는 표정과 말로 반응하는 모습으로 읽어볼 수 있습니다. 직선에 가까운 두뇌선과 곡선형 감정선의 차이를 함께 읽은 것입니다. 관계를 따뜻하게 이어가고 싶으면서도 의견을 정할 때에는 논리와 일관성을 요구하는 장면이 가능합니다. 상대에게 공감하는 일과 상대의 의견에 동의하는 일이 서로 다를 수 있다는 점이 이 조합의 핵심입니다.";
    plan.headline = curvedHead && curvedHeart ? "대화 속에서 생각과 마음이 함께 움직이는 모습" : !curvedHead && !curvedHeart ? "기준과 행동의 일치를 소중히 여기는 모습" : "생각하는 방식과 마음을 전하는 방식의 차이";
    plan.passages.push({ id: "head-heart-composition", kind: "traditional", text, evidenceIds: [...refs("headLine"), ...refs("heartLine")] });
  }
  for (const key of Object.keys(LINES) as LineKey[]) {
    const l = left.onnxLines?.[key], r = right.onnxLines?.[key];
    const line = primary.onnxLines?.[key];
    const ld = describe(l), rd = describe(r);
    const observation = ld === rd ? `${LINES[key]}은 양손에서 ${ld}으로 분류됐습니다.` : `${LINES[key]}은 왼손에서 ${ld}, 오른손에서 ${rd}으로 분류됐습니다.`;
    plan.passages.push({ id: `${key}-observation`, kind: "observation", text: observation, evidenceIds: refs(key) });
    if (!line?.detected) {
      plan.passages.push({ id: `${key}-unread`, kind: "observation", text: `${label}의 ${LINES[key]}을 충분히 읽지 못해 이 선의 해석은 보류합니다.`, evidenceIds: refs(key) });
      continue;
    }
    if (line?.detected) {
      plan.passages.push({ id: `${key}-reading`, kind: "traditional", text: lineNarrative(key, line), evidenceIds: refs(key) });
    }
    if (l?.detected && r?.detected && l.curve === r.curve) {
      plan.passages.push({ id: `${key}-bilateral-common`, kind: "observation", text: `${LINES[key]}은 두 사진의 검출 구간에서 같은 방향(${l.curve ?? "확인 안 됨"})으로 관찰됩니다. 두 사진에서 공통으로 보이는 참고점으로 사용합니다.`, evidenceIds: refs(key) });
    } else if (l?.detected && r?.detected && l.curve !== r.curve) {
      plan.passages.push({ id: `${key}-bilateral-difference`, kind: "observation", text: `${LINES[key]}의 두 검출 구간은 서로 다른 방향으로 분류됐습니다. 사진 각도·조명·보정 차이의 영향도 있어, 이번 비교에서는 두 관측의 차이로만 남깁니다.`, evidenceIds: refs(key) });
    }
  }
  const detected = (Object.keys(LINES) as LineKey[]).filter(key => primary.onnxLines?.[key].detected);
  const faint = detected.filter(key => primary.onnxLines?.[key].depthStrength === "약함");
  if (faint.length) plan.passages.push({ id: "visibility", kind: "observation", text: `${faint.map(key => LINES[key]).join("·")}은 사진에서 흐리게 읽혔습니다. 촬영 조건 때문에 선이 짧거나 끊겨 보일 수 있어 세부 모양은 확인이 더 필요합니다.`, evidenceIds: faint.flatMap(refs) });
  validateReadingPlan(plan);
  return plan;
}
