import type { PalmFacts, OnnxLineDetail } from "@/lib/palm-facts";

export type DominantHand = "left" | "right";
export interface PalmBilateralItem {
  title: string;
  observation: string;
  text: string;
}
export interface PalmBilateralReading {
  summary: string;
  items: PalmBilateralItem[];
  note: string;
}

function observed(line: OnnxLineDetail | null | undefined): string {
  if (!line?.detected) return "판독하지 못함";
  const parts = [line.length && `길이 ${line.length}`, line.curve, line.depthStrength && `사진에서의 선명도 ${line.depthStrength}`].filter(Boolean);
  return parts.length ? parts.join(" · ") : "선 후보 확인, 세부 모양 미확인";
}

/** Compare each observed feature once. Absence is never a low personality score.
 * The dominant-hand convention is a traditional lens, not evidence of change
 * over time: both photos were taken now, under potentially different lighting. */
export function buildPalmBilateralReading(left: PalmFacts, right: PalmFacts, dominantHand: DominantHand): PalmBilateralReading {
  const current = dominantHand === "right" ? right : left;
  const currentLabel = dominantHand === "right" ? "오른손" : "왼손";
  const items: PalmBilateralItem[] = [];
  const guides = [
    { key: "headLine", title: "두뇌선 · 생각을 정리하는 방식",
      straight: "직선에 가까운 두뇌선은 전통적으로 기준을 세워 판단하는 모습에 연결합니다. 중요한 선택 앞에서 가격·시간·원하는 결과 세 가지를 나란히 적어보는 방식이 맞는지 살펴보세요.",
      curved: "곡선형 두뇌선은 전통적으로 여러 가능성을 떠올리는 모습에 연결합니다. 아이디어가 많을 때는 말로만 비교하기보다 작은 시안 하나를 만들어 반응을 받아보세요." },
    { key: "heartLine", title: "감정선 · 마음을 전하는 방식",
      straight: "직선형 감정선은 전통적으로 행동과 약속으로 마음을 전하는 모습에 연결합니다. 상대가 알아주기를 기다리기보다 ‘고마웠던 행동’ 하나를 구체적으로 말해보세요.",
      curved: "곡선형 감정선은 전통적으로 감정을 표현하고 교류하는 모습에 연결합니다. 대화가 길어질 때는 상대가 원하는 것이 공감인지 해결책인지 먼저 물어보세요." },
    { key: "lifeLine", title: "생명선 · 생활 리듬을 바라보는 방식",
      straight: "생명선은 전통적으로 생활의 지속성에 연결하는 선입니다. 길이나 선명도로 수명·건강을 판단할 수는 없습니다.",
      curved: "생명선은 전통적으로 생활의 지속성에 연결하는 선입니다. 길이나 선명도로 수명·건강을 판단할 수는 없습니다." },
  ] as const;
  for (const guide of guides) {
    const l = left.onnxLines?.[guide.key];
    const r = right.onnxLines?.[guide.key];
    const selected = current.onnxLines?.[guide.key];
    const lText = observed(l), rText = observed(r);
    const observation = lText === rText
      ? `양손: ${lText}.`
      : `왼손: ${lText}. 오른손: ${rText}.`;
    let text: string;
    if (!selected?.detected || (!selected.curve && guide.key !== "lifeLine")) {
      text = `${currentLabel}의 ${guide.title.split(" · ")[0]} 모양을 충분히 읽지 못해 이 항목의 해석은 보류합니다.`;
    } else if (guide.key === "lifeLine") {
      text = guide.straight;
    } else {
      text = `${currentLabel}을 기준으로 보면, ${selected.curve === "직선에 가까움" ? guide.straight : guide.curved}`;
    }
    items.push({ title: guide.title, observation, text });
  }
  // Only corroborated fate candidates support an extra work reflection. Faint
  // or absent candidates are not filled with a generic success narrative.
  if (current.secondaryLines?.fate.status === "clear" && current.secondaryLines.fate.corroborated) {
    items.push({
      title: "운명선 후보 · 일에서 맡는 역할",
      observation: `${currentLabel}에서 운명선 후보를 두 분석 방식이 함께 찾았습니다.`,
      text: "전통적으로 일의 방향을 스스로 세우려는 모습에 연결합니다. 운영·기획·프로젝트 관리 같은 일을 떠올리되, 직업 이름보다 실제로 맡을 권한과 책임이 맞는지 확인하는 예시로 읽어주세요.",
    });
  }
  return {
    summary: `주로 쓰는 ${currentLabel}을 중심으로 양손의 같은 선을 비교했습니다. 다른 모양이 보이더라도 조명과 촬영 각도의 영향이 있을 수 있습니다.`,
    items,
    note: "손금 해석은 전통적 참고입니다. 사진에서 보이는 선만으로 성격·건강·미래를 확정할 수 없습니다.",
  };
}
