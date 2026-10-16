import type { PalmFacts, OnnxLineDetail, SecondaryPalmLineSignal } from "@/lib/palm-facts";

export const PALM_LINE_NAMES = { headLine: "두뇌선", heartLine: "감정선", lifeLine: "생명선" } as const;
export type PalmLineKey = keyof typeof PALM_LINE_NAMES;
export interface PalmCustomerPassage { key: string; title: string; text: string; observation: string }
export type SecondaryObservationState = "observed" | "not_observed" | "error" | "unsupported" | "unconfirmed";

/** Customer prose may use only a line accepted by both recognition stages. */
export function isPalmLineAccepted(facts: PalmFacts, key: PalmLineKey): boolean {
  if (facts.imageQuality !== "good" || facts.onnxLines?.modelExecuted !== true) return false;
  const line = facts.onnxLines[key];
  const feature = facts.lineFeatures.find(item => item.name === PALM_LINE_NAMES[key]);
  if (!feature?.detected || !line?.detected || !line.curve || line.attributeSupport?.curve === "not_supported") return false;
  if (key === "lifeLine" && line.anatomicalStatus !== undefined && line.anatomicalStatus !== "supported") return false;
  return true;
}

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
  if (!line?.detected || !line.curve || line.attributeSupport?.curve === "not_supported" || (key === "lifeLine" && line.anatomicalStatus !== undefined && line.anatomicalStatus !== "supported")) return null;
  const curved = line.curve === "완만한 곡선";
  const shape = curved ? "완만하게 휜" : "곧게 뻗은";
  if (key === "headLine") return `쉽게 말하면, 생각을 정리하는 방식이 ${shape} 선처럼 보입니다. 새 일을 배울 때는 작은 예를 하나 들어 보면 이해가 빠를 수 있습니다. 예를 들어 새 앱을 배울 때 설명만 읽기보다 직접 한 번 눌러 보면 감이 올 수 있습니다. 이것은 생각하는 습관에 대한 참고 풀이이며 능력을 단정하는 말은 아닙니다.`;
  if (key === "heartLine") return `쉽게 말하면, 마음을 전하는 방식이 ${shape} 선처럼 보입니다. 가까운 사람에게는 마음을 말로 전하거나 작은 행동으로 보여줄 수 있습니다. 예를 들어 친구가 힘들어할 때 해결책을 주기 전에 “많이 힘들었겠다”라고 먼저 말하면 마음이 더 잘 닿을 수 있습니다. 이것은 관계에서 보일 수 있는 한 가지 모습에 대한 참고 풀이입니다.`;
  return `쉽게 말하면, 하루를 움직이는 방식이 ${shape} 선처럼 보입니다. 익숙한 순서를 지키면 편하고, 새 일을 시작하면 생활의 리듬이 달라질 수 있습니다. 예를 들어 바쁜 날에도 잠깐 쉬는 시간을 정해 두면 다음 일을 이어가기 쉬울 수 있습니다. 이 풀이는 건강이나 수명을 예측하는 말이 아닙니다.`;
  if (key === "headLine") return curved
    ? "새로운 일을 익힐 때 설명을 그대로 외우기보다 내가 이미 아는 무엇과 비슷한지 연결하며 이해하는 쪽으로 읽습니다. 가령 처음 배운 도구를 써보다 막혔다면, 앞서 해본 다른 일의 순서를 떠올리거나 작은 예를 바꾸어 보며 뜻이 잡히는 장면입니다. 답은 받아 적었는데 아직 내 말로 설명되지 않는 답답함과, 다른 예에서 갑자기 이해가 붙는 만족을 함께 떠올릴 수 있습니다. 남이 알려준 답과 스스로 이해한 답은 같은 속도로 완성되지 않을 수 있습니다."
    : "여러 설명을 들었을 때 서로 다른 점을 한 줄로 정리하고 싶어 하는 모습으로 읽습니다. 가령 익숙한 작업에 새 방법을 권유받았다면, 좋아 보인다는 인상보다 무엇이 실제로 달라지는지 알아야 마음이 놓이는 장면입니다. 설명을 충분히 이해했다고 느끼면 스스로 결정하는 만족이 있지만, 아직 확인하지 못한 부분을 틀린 것으로 여기면 새 방법의 장점을 놓칠 수도 있습니다.";
  if (key === "heartLine") return curved
    ? "가까운 사람과 나눈 일의 감정을 말과 표정으로 주고받고 싶은 모습으로 읽습니다. 가령 만나고 돌아오는 길에 대화를 곱씹다 아쉬운 마음을 알아차렸다면, 이미 지나간 이야기라도 다시 나누고 싶어지는 장면입니다. 말로 꺼내는 것이 관계를 더 복잡하게 만들까 망설일 수도 있지만, 이야기 없이 넘어간 편안함과 서로 이해했다는 편안함은 다를 수 있습니다."
    : "애정을 그때그때 크게 말하기보다 기억해 둔 작은 일을 챙기는 모습으로 읽습니다. 가령 바쁜 날에도 상대가 부탁한 것을 잊지 않았다면, 자신에게는 그 행동이 충분한 마음의 표현일 수 있습니다. 그런데 상대가 짧은 안부를 더 원하면 이미 챙겼는데도 몰라준다는 서운함이 남을 수 있습니다. 행동에 담은 마음과 상대가 듣고 싶었던 마음이 만나는지는 별개의 일로 봅니다.";
  return curved
    ? "생활에서는 새로운 약속을 받아들이는 즐거움과 돌아와 편히 머물 곳을 함께 읽습니다. 가령 비어 있던 휴일에 하고 싶은 일이 생겼다면 밖에서 얻는 활기만큼 집에서 익숙하게 보내는 시간도 아쉬울 수 있습니다. 둘 중 하나를 고르는 사람이란 뜻보다 활동이 늘어난 하루 뒤 무엇을 남겨두어야 내 하루였다고 느끼는지 돌아보는 풀이입니다. 이 선으로 건강이나 수명을 판단하지 않습니다."
    : "생활에서는 익숙한 순서가 하루를 시작하고 마치는 느낌을 만들어 주는 쪽으로 읽습니다. 가령 갑자기 시간이 빈 날에도 평소 하던 작은 일을 먼저 끝내면 마음이 정돈되는 장면입니다. 반대로 예전 순서를 모두 지켰는데 만족이 없다면 그 순서가 지금도 내게 필요한지 살필 여지가 있습니다. 반복을 잘하는 능력이나 건강을 판정하는 것은 아니며, 건강이나 수명의 예측은 아닙니다.";
}

export function measuredPalmShape(facts: PalmFacts): PalmFacts["handShape"] | null {
  const g = facts.handGeometry;
  if (g?.status !== "observed" || !g.palmWidthToLength || Object.keys(g.fingerToPalm).length < 3 || !g.fingerToPalm.middle) return null;
  const wide = g.palmWidthToLength > 0.78, longMiddle = g.fingerToPalm.middle > 0.72;
  return wide ? longMiddle ? "rectangular" : "square" : longMiddle ? "slender" : "elongated";
}

export function palmShapeLabel(facts: PalmFacts): string {
  const shape = measuredPalmShape(facts);
  return shape ? { square: "넓은 시작점 간격 · 짧은 중지 비율", rectangular: "넓은 시작점 간격 · 긴 중지 비율", elongated: "좁은 시작점 간격 · 짧은 중지 비율", slender: "좁은 시작점 간격 · 긴 중지 비율", unknown: "확인 안 됨" }[shape]
    : "손 형태 세부 관찰값 미확인";
}

function handObservationPassage(facts: PalmFacts): PalmCustomerPassage | null {
  const geometry = facts.handGeometry;
  if (geometry?.status !== "observed" || geometry.palmWidthToLength == null || Object.keys(geometry.fingerToPalm).length < 3) return null;
  const middle = geometry.fingerToPalm.middle;
  const indexRing = geometry.indexRing === "index_longer" ? "검지가 약지보다 길게" : geometry.indexRing === "ring_longer" ? "약지가 검지보다 길게" : geometry.indexRing === "similar" ? "검지와 약지가 비슷한 길이로" : "검지와 약지의 관계는 확인하지 못한 채";
  const shape = palmShapeLabel(facts);
  const observations = [
    shape.includes("넓은") ? "손바닥이 가로로 넓게" : "손바닥이 세로로 길게",
    middle == null ? null : shape.includes("긴 중지") ? "중지가 손바닥에 비해 길게" : "중지가 손바닥에 비해 짧게",
    indexRing,
  ].filter((value): value is string => Boolean(value));
  return {
    key: "handOverview",
    title: "손 전체에서 확인한 형태",
    text: "이번 사진에서는 " + observations.join(", ") + " 보입니다. 손바닥과 손가락이 사진에 보인 범위에서 확인한 형태 관찰이며, 성격·적성·건강·미래를 판단하는 근거로 사용하지 않습니다.",
    observation: "사진에서 " + observations.join(", ") + " 보이는 모습을 확인했습니다. 손가락이 휘거나 겹친 부분은 관찰에서 제외했습니다.",
  };
}

/** A corroborated candidate is a located crease, not a validated fate line.
 * Keep its measurement in the auxiliary observation area only. */
export function palmFatePassage(facts: PalmFacts): PalmCustomerPassage | null {
  const signal = facts.secondaryLines?.fate, observed = signal?.candidateObservation;
  if (secondaryObservationState("fate", signal) !== "observed" || !observed) return null;
  const position = { middle: "가운데", thumb_side: "엄지 쪽", pinky_side: "새끼손가락 쪽" }[observed.position];
  return { key: "fate", title: "운명선 후보 관찰", text: "",
    observation: `사진의 ${position}에서 후보 주름 구간을 찾았습니다. 위치와 연결 범위만 관찰했으며 운명선 전체 경로나 개인 진로의 근거로 사용하지 않았습니다.` };
}

export function buildPalmCustomerPassages(facts: PalmFacts): PalmCustomerPassage[] {
  if (facts.imageQuality !== "good") return [];
  const passages: PalmCustomerPassage[] = [];
  const handOverview = handObservationPassage(facts);
  if (handOverview) passages.push(handOverview);
  for (const key of Object.keys(PALM_LINE_NAMES) as PalmLineKey[]) {
    const line = facts.onnxLines?.modelExecuted ? facts.onnxLines[key] : undefined;
    const text = isPalmLineAccepted(facts, key) ? palmPersonalLineReading(key, line) : null;
    if (text) passages.push({ key, title: `${PALM_LINE_NAMES[key]} · ${key === "headLine" ? "생각과 결정" : key === "heartLine" ? "마음을 주고받는 방식" : "생활과 활동 리듬"}`, text, observation: palmLineObservation(line) });
  }
  // Landmark ratios and secondary candidates have no validated interpretive
  // correspondence here. Three readable main lines retain their full stories.
  return passages;
}

export function palmCustomerLimits(facts: PalmFacts): string[] {
  const notes: string[] = [];
  const missing = (Object.keys(PALM_LINE_NAMES) as PalmLineKey[]).filter(key => !isPalmLineAccepted(facts, key));
  if (missing.length) notes.push(`${missing.map(key => PALM_LINE_NAMES[key]).join("·")}은 이번 사진에서 개인 풀이에 쓸 모양을 충분히 확인하지 못했습니다. 선이 없다는 뜻은 아닙니다.`);
  const fate = secondaryObservationState("fate", facts.secondaryLines?.fate);
  if (fate === "observed" && !facts.secondaryLines?.fate.candidateObservation) notes.push("운명선 후보는 확인됐지만 저장된 정보에 위치와 구간의 연결 범위가 없어 개인 풀이를 보류했습니다.");
  if (fate === "error") notes.push("운명선을 읽는 기능이 이번에 정상 실행되지 않았습니다. 사진이 나쁘다는 판정은 아니며 다시 시도할 수 있습니다.");
  else if (fate === "not_observed") notes.push("운명선 분석은 실행됐지만 이번 사진에서는 풀이에 사용할 후보를 찾지 못했습니다.");
  else if (fate === "unconfirmed") notes.push("운명선은 이번 사진의 관찰 근거가 충분히 확인되지 않아 개인 풀이를 보류했습니다.");
  const candidate = palmFatePassage(facts);
  if (candidate) notes.push(candidate.observation);
  if (facts.handGeometry?.status === "observed") notes.push("손가락 비율은 사진의 투영값으로, 성향을 읽는 근거에는 쓰지 않았습니다.");
  notes.push("태양선·재물선은 현재 선을 구별하는 분석을 지원하지 않습니다. 사진에서 안 보이거나 없다는 뜻은 아닙니다.");
  if (facts.handGeometry?.status !== "observed") notes.push("개별 손가락 비율은 이번 사진에서 확인된 값이 없어 풀이에 넣지 않았습니다. 손을 펴고 손가락이 겹치지 않게 촬영하면 확인에 도움이 됩니다.");
  notes.push("손톱·구릉·세부 표식은 현재 관찰하지 않습니다. 사진에서 읽힌 특징의 전통적 상징 풀이이며 실제 성격·건강·수명·미래의 확정은 아닙니다.");
  return notes;
}
