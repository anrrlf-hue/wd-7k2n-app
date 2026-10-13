import type { PalmFacts, OnnxLineDetail } from "@/lib/palm-facts";
import type { DominantHand } from "@/lib/palm-bilateral";
import { validateReadingPlan, type ReadingPlan } from "@/lib/reading-plan";

const LINES = { headLine: "두뇌선", heartLine: "감정선", lifeLine: "생명선" } as const;
type LineKey = keyof typeof LINES;
function describe(line: OnnxLineDetail | undefined): string {
  if (!line?.detected) return "판독하지 못함";
  return [line.length && `길이 ${line.length}`, line.curve, line.depthStrength && `사진에서의 선명도 ${line.depthStrength}`].filter(Boolean).join(" · ") || "선 후보만 확인";
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
    limits: ["사진에서 추정한 선의 모양을 전통적 상징으로 읽는 참고 풀이이며, 실제 성격·적성·수명·건강·미래를 판정하지 않습니다. 양손 사진은 현재의 관측으로, 좌우 차이가 시간에 따른 변화의 증거는 아닙니다."],
  };
  for (const hand of ["left", "right"] as const) {
    const facts = hand === "left" ? left : right;
    for (const key of Object.keys(LINES) as LineKey[]) {
      const line = facts.onnxLines?.[key];
      for (const field of ["detected", "length", "curve", "depthStrength"] as const) {
        plan.evidence.push({ id: `${hand}.${key}.${field}`, kind: "observed", source: `${hand}PalmFacts.onnxLines.${key}.${field}`, value: line?.[field] ?? null });
      }
    }
  }
  const refs = (key: LineKey) => (["left", "right"] as const).flatMap(hand => ["detected", "length", "curve", "depthStrength"].map(field => `${hand}.${key}.${field}`));
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
      plan.passages.push({ id: `${key}-unread`, kind: "observation", text: `${label}의 ${LINES[key]}을 충분히 읽지 못해 이 선을 이용한 해석은 보류합니다. 반대 손에 보이는 모양으로 주손의 특징을 대신 채우지는 않았습니다.`, evidenceIds: refs(key) });
      continue;
    }
    if (!(usableHead && usableHeart) && line.curve && (key === "headLine" || key === "heartLine") && line.length !== "김" && line.length !== "짧음") {
      const text = key === "headLine"
        ? line.curve === "완만한 곡선" ? "확인된 두뇌선의 곡선은 생각을 한 답으로 고정하기보다 여러 가능성을 비교하는 모습으로 읽어볼 수 있습니다. 다른 선과의 조합은 확인하지 못해 사고와 감정이 함께 움직이는 방식까지 연결하지는 않습니다." : "확인된 두뇌선의 직선에 가까운 모양은 이유와 기준을 정리하며 판단하는 모습으로 읽어볼 수 있습니다. 이 관측만으로 마음을 표현하는 방식도 같다고 보지는 않습니다."
        : line.curve === "완만한 곡선" ? "확인된 감정선의 곡선은 마음이 표정과 말의 반응에 실리는 모습으로 읽어볼 수 있습니다. 사고방식과의 조합은 확인하지 못했으므로 생각까지 같은 방식으로 움직인다고 연결하지는 않습니다." : "확인된 감정선의 직선에 가까운 모양은 애정을 꾸준한 행동과 약속에 담는 모습으로 읽어볼 수 있습니다. 이 선만으로 판단 방식이나 표현 능력을 정하지는 않습니다.";
      plan.passages.push({ id: `${key}-standalone`, kind: "traditional", text, evidenceIds: refs(key) });
    }
    if (key === "headLine" && line.curve && (line.length === "김" || line.length === "짧음")) {
      const lengthText = line.length === "김" ? "길게 이어진 형태는 한 가지 선택의 앞뒤 맥락까지 생각하는 이야기로 연결합니다." : line.length === "짧음" ? "짧게 읽힌 형태는 생각의 범위를 좁혀 눈앞의 문제부터 다루는 이야기로 연결합니다." : "";
      plan.passages.push({ id: "head-length-curve", kind: "traditional", text: `${lengthText} ${line.curve === "완만한 곡선" ? "곡선 모양과 함께 보면, 정답을 하나로 고정하기보다 가능한 방법을 비교해보는 쪽에 해석의 무게가 있습니다." : "직선에 가까운 모양과 함께 보면, 떠오르는 생각을 일관된 기준으로 정리하는 쪽에 해석의 무게가 있습니다."}`, evidenceIds: refs(key) });
    } else if (key === "heartLine" && line.curve && (line.length === "김" || line.length === "짧음")) {
      const lengthText = line.length === "김" ? "길게 이어지는 형태는 관계에서 중요하게 여기는 기대를 쉽게 접지 않는 이야기로 읽습니다." : line.length === "짧음" ? "짧게 읽힌 형태는 마음을 넓게 드러내기보다 가까운 관계의 범위를 정해두는 이야기로 읽습니다." : "";
      plan.passages.push({ id: "heart-length-curve", kind: "traditional", text: `${lengthText} ${line.curve === "완만한 곡선" ? "이 손에서는 곡선이라는 관측을 중심으로, 마음이 표정이나 말의 반응에 실리는 모습을 읽을 수 있습니다. 표현을 했다는 것과 상대가 같은 뜻으로 받아들였다는 것은 다를 수 있습니다." : "이 손에서는 직선에 가까운 관측을 중심으로, 애정을 꾸준한 행동과 약속에 담는 모습을 읽을 수 있습니다. 충분히 챙겼다고 느껴도 상대는 마음을 말로 듣고 싶을 수 있습니다."}`, evidenceIds: refs(key) });
    }
    if (l?.detected && r?.detected && (l.length !== r.length || l.curve !== r.curve)) {
      plan.passages.push({ id: `${key}-bilateral-difference`, kind: "observation", text: `${LINES[key]}의 좌우 모양이 같지 않아 ${label}의 관측을 중심으로 해석하고, 반대 손은 차이를 확인하는 자료로 남겼습니다. 이 차이만으로 성격이 바뀌었다거나 앞으로 변화할 것이라고 읽지는 않았습니다.`, evidenceIds: refs(key) });
    }
  }
  const detected = (Object.keys(LINES) as LineKey[]).filter(key => primary.onnxLines?.[key].detected);
  const faint = detected.filter(key => primary.onnxLines?.[key].depthStrength === "약함");
  if (detected.length) plan.passages.push({ id: "visibility", kind: "observation", text: faint.length
    ? `${faint.map(key => LINES[key]).join("·")}은 사진에서 약하게 읽혔습니다. 끊겨 보이거나 짧게 잡힌 부분에 촬영 조건이 영향을 줄 수 있어 세부 해석을 확정하지 않습니다.`
    : "사진의 선명도는 판독에만 사용하며, 성격이나 의지의 강약으로 환산하지 않습니다.", evidenceIds: detected.flatMap(refs) });
  validateReadingPlan(plan);
  return plan;
}
