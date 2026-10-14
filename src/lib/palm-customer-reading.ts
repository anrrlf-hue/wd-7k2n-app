import type { PalmFacts, OnnxLineDetail, SecondaryPalmLineSignal } from "@/lib/palm-facts";

export const PALM_LINE_NAMES = { headLine: "두뇌선", heartLine: "감정선", lifeLine: "생명선" } as const;
export type PalmLineKey = keyof typeof PALM_LINE_NAMES;
export interface PalmCustomerPassage { key: string; title: string; text: string; observation: string }
export type SecondaryObservationState = "observed" | "not_observed" | "error" | "unsupported" | "unconfirmed";

export function secondaryObservationState(key: "fate" | "sun" | "wealth", signal?: SecondaryPalmLineSignal): SecondaryObservationState {
  if (key !== "fate") return "unsupported";
  if (signal?.assessment === "observed") return signal.status === "clear" && signal.corroborated ? "observed" : "unconfirmed";
  if (signal?.assessment) return signal.assessment;
  return signal?.status === "clear" && signal.corroborated ? "observed" : "unconfirmed";
}

export function palmLineObservation(line?: OnnxLineDetail): string {
  if (!line?.detected) return "이번 사진에서는 선의 모양을 확인하지 못했습니다.";
  const source = line.sourceVariant === "enhanced" ? "밝기를 보완한 사진" : "사진";
  const shape = line.curve === "직선에 가까움" ? "직선에 가까운" : line.curve === "완만한 곡선" ? "완만하게 휜" : "선의";
  return `${source}에서 ${shape} 구간을 확인했습니다.`;
}

export function palmPersonalLineReading(key: PalmLineKey, line?: OnnxLineDetail): string | null {
  if (!line?.detected || !line.curve || line.attributeSupport?.curve === "not_supported") return null;
  const curved = line.curve === "완만한 곡선";
  if (key === "headLine") return curved
    ? "생각을 한 가지 답에 빨리 묶기보다 여러 가능성을 연결하며 풀어가는 모습으로 읽습니다. 익숙한 방법이 막혔을 때 다른 예나 관점을 떠올리는 쪽에 의미가 있습니다. 선택지가 열려 있는 자리에서는 그 유연함을 쓰기 좋지만, 방향을 자주 바꾸다 처음에 해결하려던 문제까지 달라지는 순간은 살펴볼 만합니다."
    : "생각을 정리할 때 기준과 순서를 분명히 세우려는 모습으로 읽습니다. 이유를 설명할 수 있는 선택에서 마음이 놓이고, 이미 정한 원칙을 실제 문제에 적용하는 장면이 어울립니다. 기준이 버팀목이 되는 한편, 새 정보가 들어왔는데도 같은 답을 유지하는 상황에서는 다른 설명을 들을 여지도 필요할 수 있습니다.";
  if (key === "heartLine") return curved
    ? "마음이 움직이면 말과 표정에 담아 주고받는 쪽으로 읽습니다. 함께 기뻐하거나 서운했던 일을 이야기하는 과정이 가까움을 만드는 통로가 될 수 있습니다. 다만 상대가 바로 같은 크기로 반응하지 않을 때 마음이 덜하다고 느끼기 쉬운 장면도 있어, 표현의 양과 관계의 깊이를 같은 것으로 보지는 않습니다."
    : "애정을 큰 말보다 꾸준한 행동으로 전하는 모습으로 읽습니다. 약속을 기억하고 실제로 챙기는 일이 믿음의 표현이 될 수 있습니다. 반면 상대는 그 행동에 담긴 마음을 듣고 싶어 할 수 있어, 서로 잘 지내고 있어도 원하는 표현이 다를 때 서운함이 남을 수 있습니다.";
  return curved
    ? "생활에서는 익숙한 기반을 지키면서도 상황에 맞게 활동 방식을 바꾸는 모습으로 읽습니다. 새 일정이 생겼을 때 모든 것을 바꾸기보다 지키고 싶은 일상의 리듬을 남기는 쪽에 의미가 있습니다. 활동이 늘어나는 때와 쉬어야 하는 때를 구별하는 이야기가 되며, 이 선으로 건강이나 수명을 판단하지 않습니다."
    : "생활에서는 일정한 방식으로 일상을 이어가는 쪽에 의미를 둡니다. 반복하는 일정이 있을 때 생활의 중심을 잡는 모습으로 읽으며, 바쁜 시기에도 익숙한 순서가 버팀목이 될 수 있습니다. 환경이 달라졌다면 기존 순서를 모두 지키려 하기보다 무엇이 실제로 필요한지 돌아볼 여지가 있습니다. 건강이나 수명의 예측은 아닙니다.";
}

const SHAPE_TEXT: Record<PalmFacts["handShape"], string> = {
  square: "손가락이 시작되는 부분의 간격과 손바닥 길이가 비교적 비슷하고 중지가 손바닥에 비해 짧게 보이는 형태입니다. 전통 손금에서는 생각을 실제 일에 적용하고 손에 잡히는 결과에서 만족을 찾는 모습으로 읽습니다. 익숙한 일을 차근차근 처리하는 장면이 어울리지만, 아직 경험하지 못한 방법을 받아들일 때에는 비교할 예가 도움이 될 수 있습니다.",
  rectangular: "손가락이 시작되는 부분의 간격과 손바닥 길이가 비교적 비슷하면서 중지는 길게 보이는 형태입니다. 현실에서 쓸 수 있는지 살피는 관점과 세부를 이해하려는 관점을 함께 읽습니다. 바로 쓸 결과도 중요하지만 이유를 충분히 살필 여지가 있을 때 선택의 만족을 찾는 모습입니다.",
  elongated: "손바닥이 길쭉하고 중지는 손바닥에 비해 짧게 보이는 형태입니다. 전체를 오래 검토하기보다 먼저 상황을 파악하고 움직여 보는 모습으로 읽습니다. 새 일을 시작할 때의 활기가 장점이 될 수 있는 한편, 시작 뒤 반복해서 이어갈 조건은 다른 질문으로 남습니다.",
  slender: "손바닥과 중지가 모두 길쭉하게 보이는 형태입니다. 작은 차이를 살피고 충분히 이해한 뒤 자기 답을 정리하는 모습으로 읽습니다. 깊게 파고들 자리가 있을 때 의미를 찾기 좋지만, 모든 세부가 정리될 때까지 마음을 쓰는 상황에서는 결정할 부분과 남겨둘 부분을 나눌 여지가 있습니다.",
  unknown: "",
};

export function buildPalmCustomerPassages(facts: PalmFacts): PalmCustomerPassage[] {
  if (facts.imageQuality !== "good") return [];
  const passages: PalmCustomerPassage[] = [];
  for (const key of Object.keys(PALM_LINE_NAMES) as PalmLineKey[]) {
    const line = facts.onnxLines?.modelExecuted ? facts.onnxLines[key] : undefined;
    const text = palmPersonalLineReading(key, line);
    if (text) passages.push({ key, title: `${PALM_LINE_NAMES[key]} · ${key === "headLine" ? "생각과 결정" : key === "heartLine" ? "마음을 주고받는 방식" : "생활과 활동 리듬"}`, text, observation: palmLineObservation(line) });
  }
  if ((passages.length || facts.handGeometry?.status === "observed") && facts.handShape !== "unknown") {
    passages.push({ key: "handShape", title: "손 형태에서 읽는 기질", text: SHAPE_TEXT[facts.handShape], observation: "사진에서 손가락이 시작되는 부분의 간격, 손목에서 중지 시작점까지의 거리, 중지 길이를 함께 봤습니다. 손바닥 바깥 너비를 직접 잰 값은 아닙니다." });
  }
  const geometry = facts.handGeometry;
  if (geometry?.status === "observed" && geometry.indexRing) {
    const text = geometry.indexRing === "index_longer"
      ? "검지가 약지보다 길게 보이는 조합은 자기 의견과 맡을 역할을 분명히 하고 싶은 모습으로 읽습니다. 함께하는 일에서도 어디에 자신의 판단을 보탤지 중요하게 느낄 수 있습니다. 상대가 다른 방향을 제안했을 때에는 내 의견을 설명하는 일과 상대가 고를 여지를 남기는 일이 함께 필요할 수 있습니다."
      : geometry.indexRing === "ring_longer"
        ? "약지가 검지보다 길게 보이는 조합은 생각한 것을 표현하고 반응을 받는 장면에 의미를 둡니다. 내 방식으로 보여준 결과를 누군가 알아보는 일이 만족으로 이어질 수 있습니다. 반응이 좋더라도 그것을 계속 이어갈 조건이 갖춰졌는지는 따로 살필 부분입니다."
        : "검지와 약지가 비슷한 비율로 보이는 조합은 자기 의견을 세우는 일과 결과를 밖에 표현하는 일을 한쪽으로 고정하지 않습니다. 중요한 선택에서는 무엇을 직접 정할지와 누구의 반응을 들을지가 상황마다 달라질 수 있습니다. 두 관점을 같은 크기로 항상 잘 쓴다는 능력 판정은 아닙니다.";
    passages.push({ key: "fingers", title: "손가락의 비율에서 읽는 모습", text, observation: `이번 사진에서 검지와 약지는 ${geometry.indexRing === "similar" ? "비슷한 비율" : geometry.indexRing === "index_longer" ? "검지가 더 긴 비율" : "약지가 더 긴 비율"}로 확인됐습니다. 실제 길이가 아니라 사진 안의 비율입니다.` });
  }
  if (secondaryObservationState("fate", facts.secondaryLines?.fate) === "observed") passages.push({
    key: "fate", title: "운명선 · 일과 역할을 이어가는 방향",
    text: "일에서는 맡은 역할을 오래 이어가며 자신의 방향을 찾아가는 모습으로 읽습니다. 한 번의 눈에 띄는 성과보다 반복해 관여한 일에서 만족을 찾는 이야기입니다. 지속성이 신뢰가 될 수 있지만 익숙한 역할을 계속 맡는 일과 앞으로도 원하는 역할인지는 서로 다른 선택으로 남을 수 있습니다.",
    observation: "사진의 세로 주름과 운명선을 찾는 별도 분석에서 같은 후보를 함께 확인했습니다.",
  });
  return passages;
}

export function palmCustomerLimits(facts: PalmFacts): string[] {
  const notes: string[] = [];
  const missing = (Object.keys(PALM_LINE_NAMES) as PalmLineKey[]).filter(key => !palmPersonalLineReading(key, facts.onnxLines?.[key]));
  if (missing.length) notes.push(`${missing.map(key => PALM_LINE_NAMES[key]).join("·")}은 이번 사진에서 개인 풀이에 쓸 모양을 충분히 확인하지 못했습니다. 선이 없다는 뜻은 아닙니다.`);
  const fate = secondaryObservationState("fate", facts.secondaryLines?.fate);
  if (fate === "error") notes.push("운명선을 읽는 기능이 이번에 정상 실행되지 않았습니다. 사진이 나쁘다는 판정은 아니며 다시 시도할 수 있습니다.");
  else if (fate === "not_observed") notes.push("운명선 분석은 실행됐지만 이번 사진에서는 풀이에 사용할 후보를 찾지 못했습니다.");
  else if (fate === "unconfirmed") notes.push("운명선은 이번 사진의 관찰 근거가 충분히 확인되지 않아 개인 풀이를 보류했습니다.");
  notes.push("태양선·재물선은 현재 선을 구별하는 분석을 지원하지 않습니다. 사진에서 안 보이거나 없다는 뜻은 아닙니다.");
  if (facts.handGeometry?.status !== "observed") notes.push("개별 손가락 비율은 이번 사진에서 확인된 값이 없어 풀이에 넣지 않았습니다. 손을 펴고 손가락이 겹치지 않게 촬영하면 확인에 도움이 됩니다.");
  notes.push("손톱·구릉·세부 표식은 현재 관찰하지 않습니다. 사진에서 읽힌 특징의 전통적 상징 풀이이며 실제 성격·건강·수명·미래의 확정은 아닙니다.");
  return notes;
}
