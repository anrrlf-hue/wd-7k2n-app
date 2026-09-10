// "실제 관측값"과 "손금 자체 해석"을 분리해서 문장으로 만든다.
// 관측값 문장은 오직 실제 ONNX 추론 결과(palm-line-onnx.ts)의 수치만 쓴다.
// 해석 문장은 명시적으로 "전통적으로/관상학적으로 보는 편"이라고 표현해,
// 과학적으로 검증된 사실처럼 말하지 않는다. 검출되지 않은 선에는 해석도
// 붙이지 않는다("있다고 말하지 않는다").
//
// 이번 라운드 변경 — 두 가지:
// (1) depthStrength(마스크 굵기 근사치)로 활력/지구력/컨디션/변화 대응력을
//     추론하지 않는다(§5). 생명선은 전통 손금에서도 그런 추론이 건강·수명
//     쪽으로 흐르기 쉬워, 실제 근거가 약한데 단정하는 위험이 가장 크다 —
//     그래서 생명선은 ①실제 관측(사실 그대로)에만 담고, ②해석에서는 뺐다.
// (2) 곡률(curve)만 쓰던 걸 길이(length)까지 함께 써서 감정선·두뇌선 해석을
//     더 깊게 만들었다(§4) — "찍으니 실제로 새 내용을 하나 더 봤다"를
//     만드는 게 목적이라, 한 줄짜리 해석에서 두 특징을 엮은 해석으로,
//     그리고 두 선을 합쳐 보는 문장까지 더했다(이미 나온 두 해석을
//     논리적으로 묶을 뿐 새 데이터를 지어내지 않는다).

import type { PalmFacts, OnnxLineDetail } from "@/lib/palm-facts";

const LINE_LABEL = { heartLine: "감정선", headLine: "두뇌선", lifeLine: "생명선" } as const;

/** ① 실제 이미지 관측 — ONNX 모델이 실제로 반환한 수치만, 분석 용어 없이 */
export function buildRealObservationText(facts: PalmFacts): string {
  if (!facts.onnxLines) {
    return "이번 사진은 실제 이미지 분석 모델이 결과를 내지 못했어요. 아래 내용은 보조 신호만으로 채운 참고 수준이에요.";
  }
  const parts = (["heartLine", "headLine", "lifeLine"] as const).map((key) => {
    const d: OnnxLineDetail = facts.onnxLines![key];
    const label = LINE_LABEL[key];
    if (!d.detected) return `${label}은 이번 사진에서 뚜렷하게 보이지 않았어요`;
    return `${label}은 ${d.length} 길이에 ${d.curve}으로 나타났어요`;
  });
  return parts.join(". ") + ".";
}

/** ② 손금 자체 해석 — 감정선·두뇌선은 길이+곡률을 함께 엮어 읽고, 마지막에
 * 둘을 합쳐 보는 문장을 한 번 더 더한다. 생명선은 실제 근거(depthStrength)가
 * 활력·건강 쪽 단정으로 흐르기 쉬워 해석에서 제외했다 — ①에서 사실만
 * 전달한다. 검출된 선에만 붙이고, 항상 "전통적으로 보는 편" 톤을 유지한다. */
export function buildTraditionalReadingText(facts: PalmFacts): string {
  if (!facts.onnxLines) return "실제 관측 결과가 없어 해석도 이번엔 생략할게요.";

  const heart = facts.onnxLines.heartLine;
  const head = facts.onnxLines.headLine;
  const notes: string[] = [];

  if (heart.detected) {
    const lengthNote =
      heart.length === "김"
        ? "감정 표현이 풍부하고 관계에 마음을 많이 쓰는 편으로"
        : heart.length === "짧음"
          ? "감정을 크게 드러내기보다 실용적으로 관계를 대하는 편으로"
          : "감정을 상황에 맞게 적당히 조절해 표현하는 편으로";
    const curveNote =
      heart.curve === "완만한 곡선" ? "표현 방식 자체는 유연한 쪽" : "표현보다는 원칙과 기준이 앞서는 쪽";
    notes.push(`감정선은 ${lengthNote} 보고, ${curveNote}으로 보는 게 전통적인 해석이에요.`);
  }

  if (head.detected) {
    const lengthNote =
      head.length === "김"
        ? "여러 각도로 오래 따져보고 결정하는 편으로"
        : head.length === "짧음"
          ? "판단이 빠르고 실용적인 편으로"
          : "필요한 만큼만 재고 결정하는 편으로";
    const curveNote = head.curve === "완만한 곡선" ? "직관적이고 유연한 사고와" : "논리적이고 현실적인 사고와";
    notes.push(`두뇌선은 ${lengthNote} 보고, ${curveNote} 연결해서 보는 편이에요.`);
  }

  if (heart.detected && head.detected) {
    const bothFlexible = heart.curve === "완만한 곡선" && head.curve === "완만한 곡선";
    const bothLinear = heart.curve !== "완만한 곡선" && head.curve !== "완만한 곡선";
    if (bothFlexible) {
      notes.push("감정선과 두뇌선이 둘 다 완만한 곡선이라, 감정과 사고 모두 유연하게 움직이는 결로 함께 읽혀요.");
    } else if (bothLinear) {
      notes.push("감정선과 두뇌선이 둘 다 직선에 가까워서, 감정과 사고 모두 원칙·기준을 앞세우는 결로 함께 읽혀요.");
    } else {
      notes.push("감정선과 두뇌선이 서로 다른 결이라, 감정과 사고가 늘 같은 방향으로 움직이지는 않는 편일 수 있어요.");
    }
  }

  if (notes.length === 0) {
    return "이번 사진에서는 해석을 붙일 만큼 뚜렷하게 보인 선이 적어요 — 억지로 해석을 만들지 않을게요.";
  }
  return notes.join(" ");
}
