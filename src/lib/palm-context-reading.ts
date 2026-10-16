import type { PalmFacts, OnnxLineDetail } from "@/lib/palm-facts";
import { normalizePalmFactsObservation } from "@/lib/palm-facts";
import type { DominantHand } from "@/lib/palm-bilateral";
import { validateReadingPlan, type ReadingPlan } from "@/lib/reading-plan";
import { isPalmLineAccepted, palmPersonalLineReading } from "@/lib/palm-customer-reading";

const LINES = { headLine: "두뇌선", heartLine: "감정선", lifeLine: "생명선" } as const;
type LineKey = keyof typeof LINES;
function describe(line: OnnxLineDetail | undefined): string {
  if (!line?.detected) return "판독하지 못함";
  const source = line.sourceVariant === "enhanced" ? "보정 영상 검출" : line.sourceVariant === "raw" ? "원본 사진 검출" : "검출";
  const curve = line.curve && line.attributeSupport?.curve !== "not_supported" ? `자동 분류 ${line.curve}` : null;
  return [source, curve].filter(Boolean).join(" · ") || "선 후보만 확인";
}

function lineNarrative(key: LineKey, line: OnnxLineDetail): string {
  return palmPersonalLineReading(key, line) ?? "";
}

/** One composition from observed features, with traceable interpretation rules.
 * Image confidence/depth never becomes confidence in a personality prediction. */
export function buildPalmContextReading(left: PalmFacts, right: PalmFacts, dominantHand: DominantHand): ReadingPlan {
  left = normalizePalmFactsObservation(left);
  right = normalizePalmFactsObservation(right);
  const primary = dominantHand === "right" ? right : left;
  const label = dominantHand === "right" ? "오른손" : "왼손";
  const head = primary.onnxLines?.headLine;
  const heart = primary.onnxLines?.heartLine;
  const plan: ReadingPlan = {
    headline: "양손에서 확인한 모양을 함께 읽기",
    passages: [], evidence: [],
    limits: ["사진에서 추정한 검출 구간의 자동 분류를 전통적 상징으로 읽는 참고 풀이이며, 곡률·길이·깊이는 독립 육안으로 확정하지 않습니다. 실제 성격·적성·수명·건강·미래를 판정하지 않습니다. 사용자가 선택한 주손을 기준으로 읽고 반대 사진은 비교 참고로 둡니다."],
  };
  for (const hand of ["left", "right"] as const) {
    const facts = hand === "left" ? left : right;
    for (const key of Object.keys(LINES) as LineKey[]) {
      const line = facts.onnxLines?.[key];
      const accepted = isPalmLineAccepted(facts, key);
      const fields = accepted
        ? ["detected", "length", "curve", "depthStrength", "sourceVariant", "rawDetected", "enhancedDetected", "endpointEvidence", "pathCompleteness", "attributeSupport"] as const
        : ["detected"] as const;
      for (const field of fields) {
        const rawValue = line?.[field];
        const value = rawValue == null ? null : typeof rawValue === "object" ? JSON.stringify(rawValue) : rawValue;
        plan.evidence.push({ id: `${hand}.${key}.${field}`, kind: "observed", source: `${hand}PalmFacts.onnxLines.${key}.${field}`, value });
      }
      if (!accepted) plan.evidence.push({ id: `${hand}.${key}.accepted`, kind: "observed", source: `${hand}PalmFacts.lineFeatures.${key}.accepted`, value: false });
    }
  }
  const refs = (key: LineKey) => (["left", "right"] as const).flatMap(hand => {
    const facts = hand === "left" ? left : right;
    return isPalmLineAccepted(facts, key)
      ? ["detected", "length", "curve", "depthStrength", "sourceVariant", "rawDetected", "enhancedDetected", "endpointEvidence", "pathCompleteness", "attributeSupport"].map(field => `${hand}.${key}.${field}`)
      : [`${hand}.${key}.detected`, `${hand}.${key}.accepted`];
  });
  const usableHead = isPalmLineAccepted(primary, "headLine") ? palmPersonalLineReading("headLine", head) : null;
  const usableHeart = isPalmLineAccepted(primary, "heartLine") ? palmPersonalLineReading("heartLine", heart) : null;
  const curvedHead = head?.curve === "완만한 곡선";
  const curvedHeart = heart?.curve === "완만한 곡선";
  if (usableHead && usableHeart) {
    const text = curvedHead && curvedHeart
      ? "주손의 두뇌선과 감정선에서 함께 확인한 곡선 구간은, 대화하면서 생각의 윤곽을 찾고 그 대화의 온도에도 마음이 움직이는 조합으로 읽어볼 수 있습니다. 가령 혼자서는 막연했던 계획이 누군가에게 말하는 동안 구체적인 모습이 될 수 있습니다. 이때 상대의 질문은 생각을 발전시키는 데 도움이 되지만, 좋은 소식을 전했는데 짧은 답이 돌아오면 내용에 대한 평가와 마음을 함께 기뻐해 주는 반응이 다르다는 것을 느낄 수도 있습니다. 더 잘 설명하면 풀릴 문제인지, 잠깐 함께 기뻐해 주기를 바랐던 것인지 나누어 말해보면 대화 뒤에 남는 서운함의 이유를 살피기 쉽습니다."
      : !curvedHead && !curvedHeart
        ? "주손의 두뇌선과 감정선에서 함께 확인한 직선에 가까운 구간은, 이유가 분명한 선택과 꾸준한 행동을 이어 놓는 조합으로 읽어볼 수 있습니다. 가령 가까운 사람이 곤란해할 때 필요한 것을 찾아 해결해 주고 나면, 이미 마음도 충분히 전했다고 느끼는 장면을 떠올릴 수 있습니다. 그런데 상대가 원한 것이 해결책에 앞서 자신의 속상함을 들어주는 시간이었으면, 도움이 되었는데도 두 사람의 대화는 끝나지 않을 수 있습니다. 해결할 일을 알아본 마음과 그 일을 겪는 사람에게 머문 마음은 함께 갈 수 있습니다. 무엇을 해줄지 묻기 전에 그 순간이 어땠는지 한 번 듣는 선택은 행동에 담긴 애정을 상대가 알아볼 통로를 더합니다."
        : curvedHead
          ? "곡선 구간의 두뇌선과 직선에 가까운 감정선은, 이야기를 넓혀 가는 생각과 조용히 남겨 두는 마음을 함께 읽게 합니다. 가령 여행 이야기는 여러 갈래로 즐겁게 나누면서도 정작 자신이 함께 가고 싶은 이유는 말하지 않는 장면을 떠올릴 수 있습니다. 상대는 아이디어가 많다는 것은 알아도 자신과 보내는 시간을 바라는 마음까지는 듣지 못할 수 있습니다. 제안을 더 늘리기보다 ‘너와 그 시간을 보내고 싶다’는 뜻을 덧붙이는 선택은 좋은 계획이 개인적인 초대가 되는 차이를 만듭니다. 생각을 나누는 말과 애정을 전하는 말이 서로 다른 마음을 남길 수 있습니다."
          : "직선에 가까운 두뇌선과 곡선 구간의 감정선은, 판단의 이유를 정리하는 과정과 사람의 마음에 반응하는 과정이 함께 놓인 조합으로 읽어볼 수 있습니다. 가령 친구의 선택이 걱정돼 다른 방법을 권하면서도 그 친구가 왜 기대했는지는 따뜻하게 들어주는 장면입니다. 상대가 그 따뜻함을 찬성으로 받아들이면, 나중에 다른 의견을 들었을 때 갑자기 마음이 바뀌었다고 느낄 여지가 있습니다. 마음을 이해한다는 말에 내 의견도 짧게 보태면, 동의하지 않아도 곁에 있고 싶다는 뜻이 더 선명해질 수 있습니다. 공감하는 말과 자신의 판단을 전하는 말은 서로 다른 마음을 함께 남길 수 있습니다.";
    plan.headline = curvedHead && curvedHeart ? "대화 속에서 생각과 마음이 함께 움직이는 모습" : !curvedHead && !curvedHeart ? "기준과 행동의 일치를 소중히 여기는 모습" : "생각하는 방식과 마음을 전하는 방식의 차이";
    plan.passages.push({ id: "head-heart-composition", kind: "traditional", text, evidenceIds: [...refs("headLine"), ...refs("heartLine")] });
  }
  for (const key of Object.keys(LINES) as LineKey[]) {
    const l = left.onnxLines?.[key], r = right.onnxLines?.[key];
    const line = primary.onnxLines?.[key];
    const leftAccepted = isPalmLineAccepted(left, key), rightAccepted = isPalmLineAccepted(right, key);
    const ld = leftAccepted ? describe(l) : "line not confirmed";
    const rd = rightAccepted ? describe(r) : "line not confirmed";
    const observation = ld === rd ? `${LINES[key]}은 양손에서 ${ld}으로 분류됐습니다.` : `${LINES[key]}은 왼손에서 ${ld}, 오른손에서 ${rd}으로 분류됐습니다.`;
    plan.passages.push({ id: `${key}-observation`, kind: "observation", text: observation, evidenceIds: refs(key) });
    if (!isPalmLineAccepted(primary, key)) {
      plan.passages.push({ id: `${key}-unread`, kind: "observation", text: `${label}의 ${LINES[key]}을 충분히 읽지 못해 이 선의 해석은 보류합니다.`, evidenceIds: refs(key) });
      continue;
    }
    if (!line) continue;
    const reading = lineNarrative(key, line);
    if (reading) plan.passages.push({ id: `${key}-reading`, kind: "traditional", text: reading, evidenceIds: refs(key) });
    if (leftAccepted && rightAccepted && l?.curve === r?.curve) {
      plan.passages.push({ id: `${key}-bilateral-common`, kind: "observation", text: `${LINES[key]}은 두 사진에서 같은 방향(${l?.curve ?? "확인 안 됨"})으로 보입니다. 두 손에서 공통으로 읽힌 특징입니다.`, evidenceIds: refs(key) });
    } else if (leftAccepted && rightAccepted && l?.curve !== r?.curve) {
      plan.passages.push({ id: `${key}-bilateral-difference`, kind: "observation", text: `${LINES[key]}은 두 사진에서 서로 다른 방향으로 보입니다. 사진 각도와 조명의 영향도 있어 실제로 변했다는 뜻으로 해석하지 않습니다.`, evidenceIds: refs(key) });
    }
  }
  const detected = (Object.keys(LINES) as LineKey[]).filter(key => primary.onnxLines?.[key].detected);
  const faint = detected.filter(key => primary.onnxLines?.[key].depthStrength === "약함");
  if (faint.length) plan.passages.push({ id: "visibility", kind: "observation", text: `${faint.map(key => LINES[key]).join("·")}은 사진에서 흐리게 읽혔습니다. 촬영 조건 때문에 선이 짧거나 끊겨 보일 수 있어 세부 모양은 확인이 더 필요합니다.`, evidenceIds: faint.flatMap(refs) });
  validateReadingPlan(plan);
  return plan;
}
