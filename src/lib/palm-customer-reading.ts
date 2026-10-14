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
    ? "새로운 일을 익힐 때 설명을 그대로 외우기보다 내가 이미 아는 무엇과 비슷한지 연결하며 이해하는 쪽으로 읽습니다. 가령 처음 배운 도구를 써보다 막혔다면, 앞서 해본 다른 일의 순서를 떠올리거나 작은 예를 바꾸어 보며 뜻이 잡히는 장면입니다. 답은 받아 적었는데 아직 내 말로 설명되지 않는 답답함과, 다른 예에서 갑자기 이해가 붙는 만족을 함께 떠올릴 수 있습니다. 남이 알려준 답과 스스로 이해한 답은 같은 속도로 완성되지 않을 수 있습니다."
    : "여러 설명을 들었을 때 서로 다른 점을 한 줄로 정리하고 싶어 하는 모습으로 읽습니다. 가령 익숙한 작업에 새 방법을 권유받았다면, 좋아 보인다는 인상보다 무엇이 실제로 달라지는지 알아야 마음이 놓이는 장면입니다. 설명을 충분히 이해했다고 느끼면 스스로 결정하는 만족이 있지만, 아직 확인하지 못한 부분을 틀린 것으로 여기면 새 방법의 장점을 놓칠 수도 있습니다. 빨리 결정하는 능력의 판정이 아니라 납득에 필요한 이유를 살피는 풀이입니다.";
  if (key === "heartLine") return curved
    ? "가까운 사람과 나눈 일의 감정을 말과 표정으로 주고받고 싶은 모습으로 읽습니다. 가령 만나고 돌아오는 길에 대화를 곱씹다 아쉬운 마음을 알아차렸다면, 이미 지나간 이야기라도 다시 나누고 싶어지는 장면입니다. 말로 꺼내는 것이 관계를 더 복잡하게 만들까 망설일 수도 있지만, 이야기 없이 넘어간 편안함과 서로 이해했다는 편안함은 다를 수 있습니다. 감정이 크다는 판정이 아니라 그 마음을 주고받는 통로에 대한 풀이입니다."
    : "애정을 그때그때 크게 말하기보다 기억해 둔 작은 일을 챙기는 모습으로 읽습니다. 가령 바쁜 날에도 상대가 부탁한 것을 잊지 않았다면, 자신에게는 그 행동이 충분한 마음의 표현일 수 있습니다. 그런데 상대가 짧은 안부를 더 원하면 이미 챙겼는데도 몰라준다는 서운함이 남을 수 있습니다. 행동에 담은 마음과 상대가 듣고 싶었던 마음이 만나는지는 별개의 일로 봅니다.";
  return curved
    ? "생활에서는 새로운 약속을 받아들이는 즐거움과 돌아와 편히 머물 곳을 함께 읽습니다. 가령 비어 있던 휴일에 하고 싶은 일이 생겼다면 밖에서 얻는 활기만큼 집에서 익숙하게 보내는 시간도 아쉬울 수 있습니다. 둘 중 하나를 고르는 사람이란 뜻보다 활동이 늘어난 하루 뒤 무엇을 남겨두어야 내 하루였다고 느끼는지 돌아보는 풀이입니다. 이 선으로 건강이나 수명을 판단하지 않습니다."
    : "생활에서는 익숙한 순서가 하루를 시작하고 마치는 느낌을 만들어 주는 쪽으로 읽습니다. 가령 갑자기 시간이 빈 날에도 평소 하던 작은 일을 먼저 끝내면 마음이 정돈되는 장면입니다. 반대로 예전 순서를 모두 지켰는데 만족이 없다면 그 순서가 지금도 내게 필요한지 살필 여지가 있습니다. 반복을 잘하는 능력이나 건강을 판정하는 것은 아니며, 건강이나 수명의 예측은 아닙니다.";
}

const SHAPE_TEXT: Record<PalmFacts["handShape"], string> = {
  square: "사진에서 확인한 형태를 전통적으로 읽으면, 직접 손을 써서 달라진 모습을 볼 때 만족을 느끼는 장면을 떠올릴 수 있습니다. 가령 집에서 쓰던 물건을 손보거나 복잡하던 공간을 정리한 뒤에는, 오래 설명한 것보다 눈앞의 작은 변화가 더 뿌듯하게 남을 수 있습니다. 반대로 아직 결과가 보이지 않는 배움의 시간은 아무것도 하지 않은 것처럼 느껴질 여지가 있습니다. 바로 달라진 것이 없어도 이전에는 몰랐던 한 부분을 알아본 경험을 남겨 보면, 손에 잡히는 결과와 준비 중인 변화가 다른 모습으로 보일 수 있습니다.",
  rectangular: "사진에서 확인한 형태는 실제로 편하게 쓰는 만족과 작은 차이를 이해하는 즐거움을 함께 읽게 합니다. 가령 자주 쓸 물건을 고르며 설명을 충분히 읽었는데 손에 쥐어 보니 예상과 다르면, 좋은 기능을 안다는 것과 내 생활에 편하다는 것이 다르게 느껴질 수 있습니다. 여러 조건을 다 갖춘 것을 고르기보다 가장 자주 쓰는 한 장면에서 무엇이 편했는지 돌아보세요. 세부를 살핀 시간이 헛된 것이 아니라, 실제 쓰임을 만나야 그 차이의 의미가 더 선명해질 수 있다는 참고 풀이입니다.",
  elongated: "사진에서 확인한 형태를 전통적으로 읽으면, 생각으로 예상한 것보다 직접 처음 해 본 장면에서 감이 잡히는 모습을 떠올릴 수 있습니다. 가령 가 보지 않은 곳을 둘러보며 계획에 없던 작은 길을 찾으면, 잘 준비한 대로 움직였을 때와는 다른 즐거움이 남을 수 있습니다. 다만 처음의 새로움이 줄었을 때에도 같은 일을 계속 좋아하는지는 다른 질문입니다. 새로웠던 순간과 다시 해 보고 싶었던 순간을 나누어 기억하면, 시작의 들뜸 옆에 오래 남길 흥미가 무엇인지 돌아볼 여지가 있습니다.",
  slender: "사진에서 확인한 형태는 작은 차이를 다시 살피며 자기 느낌을 구체적으로 알아가는 모습으로 읽습니다. 가령 좋아했던 음악이나 장면을 다시 봤는데 처음에는 지나쳤던 한 부분이 마음에 남으면, 같은 것을 오래 살펴도 다른 즐거움이 생길 수 있습니다. 반대로 세부를 모두 이해하려고 하다 처음 좋았던 느낌이 멀어질 수도 있습니다. 알아낸 것을 늘리는 일과 좋아했던 마음을 더 잘 아는 일이 같은 것은 아닐 수 있어, 무엇이 자신에게 오래 남았는지 한 가지로 적어보는 참고 풀이입니다.",
  unknown: "",
};

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

export function palmFatePassage(facts: PalmFacts): PalmCustomerPassage | null {
  const fate = facts.secondaryLines?.fate;
  const observed = fate?.candidateObservation;
  if (secondaryObservationState("fate", fate) !== "observed" || !observed) return null;
  const position = observed.position === "middle" ? "손가락 시작점 사이의 가운데 쪽" : observed.position === "thumb_side" ? "엄지 쪽" : "새끼손가락 쪽";
  const span = observed.visibleVerticalSpan >= 0.5;
  const continuous = observed.creaseContinuity >= 0.65;
  const opening = observed.position === "middle"
    ? "일을 통해 무엇을 남기고 싶은지와 그 일을 하루하루 해내는 마음을 함께 돌아보는 상징으로 읽습니다. 능숙해진 일에서도 단지 잘한다는 이유로 계속 맡고 싶은지, 스스로 의미를 느끼는지는 다른 질문일 수 있습니다."
    : observed.position === "thumb_side"
      ? "일의 방향을 생활에서 지키고 싶은 것과 연결해 읽어볼 수 있습니다. 예를 들어 흥미로운 일을 고르는 순간에도 익숙한 하루의 리듬을 얼마나 바꿀 수 있는지가 마음에 남는 장면입니다. 편한 생활을 지키고 싶은 마음과 새 일을 경험하고 싶은 마음 중 하나가 항상 옳다는 뜻은 아닙니다."
      : "일에서 다른 사람과 주고받는 반응에 어떤 의미를 두는지 살펴보는 상징으로 읽습니다. 함께 만든 결과를 보여주었을 때 칭찬을 듣고 싶은 마음과 다음에도 같이 하고 싶은 마음은 다를 수 있습니다. 좋은 반응이 있었다는 이유만으로 그 일이 내게 오래 맞는다고 단정하지는 않습니다.";
  const extent = span && continuous
    ? "이번 사진에서 비교적 넓게 이어져 확인된 구간은 한 번의 반응보다 반복해서 손을 대는 일의 의미를 살필 때 참고할 수 있습니다. 익숙해져 쉽게 해내는 일과 앞으로도 시간을 쓰고 싶은 일을 나란히 떠올려보는 장면입니다."
    : span
      ? "후보 범위는 넓게 보이지만 연결된 주름의 지지는 그 일부에 머뭅니다. 일의 지속성이나 진로를 이 사진으로 판단하지 않고, 진행 중인 일에서 계속 이어갈 부분과 새로 확인할 부분을 구분하는 참고로 둡니다."
      : "풀이에 쓸 구간은 사진의 일부에서만 확인됩니다. 긴 경로를 확인한 것처럼 읽지 않고, 지금 해보는 일에서 흥미를 느낀 한 장면이 그 일 전체에 대한 만족과 같은지 돌아보는 정도로 둡니다.";
  const head = facts.onnxLines?.modelExecuted ? facts.onnxLines.headLine : undefined;
  const curvedRelation = observed.position === "middle"
    ? "두뇌선의 곡선 구간도 함께 확인돼, 같은 일을 이어가더라도 해결 방법은 새로 떠올리는 모습으로 연결해 읽습니다. 일 자체를 그만두고 싶은 것인지 익숙한 방법만 지겨워진 것인지 다르게 느껴지는 순간을 살펴볼 수 있습니다."
    : observed.position === "thumb_side"
      ? "두뇌선의 곡선 구간과 함께 보면, 새 일을 선택하는 것 외에도 하던 일을 다른 방식으로 해 보는 여지를 떠올릴 수 있습니다. 생활을 크게 바꾸지 않고 방법 하나만 달리했을 때 생긴 흥미가 새 환경에 대한 기대와 어떻게 다른지 돌아볼 수 있습니다."
      : "두뇌선의 곡선 구간과 함께 보면, 함께한 사람의 질문에서 새로운 방법을 떠올리는 장면으로 연결해 읽습니다. 상대의 반응이 아이디어를 넓혀 준 순간과 칭찬을 받아 마음이 놓인 순간은 다를 수 있어, 누구와 다시 해 보고 싶은지도 별도로 살펴볼 수 있습니다.";
  const straightRelation = observed.position === "middle"
    ? "두뇌선의 직선에 가까운 구간과 함께 보면, 일에서 기대한 결과가 분명할 때 마음을 놓는 모습으로 연결해 읽습니다. 남이 좋다고 한 성과와 내가 끝냈다고 느끼는 지점이 같았는지 돌아볼 수 있습니다."
    : observed.position === "thumb_side"
      ? "두뇌선의 직선에 가까운 구간과 함께 보면, 생활에 남길 시간을 구체적으로 알아야 일의 선택도 납득되는 장면을 떠올릴 수 있습니다. 좋아 보이는 일과 그 일을 하는 하루가 편안한지는 다르게 느껴질 수 있습니다."
      : "두뇌선의 직선에 가까운 구간과 함께 보면, 함께한 사람이 좋다고 말한 이유를 구체적으로 듣고 싶은 모습으로 연결해 읽습니다. 막연한 칭찬과 실제로 도움이 된 부분을 알아본 만족이 다르다는 것을 돌아볼 수 있습니다.";
  const relation = palmPersonalLineReading("headLine", head) ? head!.curve === "완만한 곡선" ? curvedRelation : straightRelation : "";
  return { key: "fate", title: "운명선 후보 · 일에 의미를 두는 방식", text: [opening, extent, relation].filter(Boolean).join(" "),
    observation: `이번 사진의 ${position}에서 두 방식이 함께 지지한 후보 구간을 확인했습니다. 사진에서 확인한 구간은 ${span ? "손바닥 가운데 길이에 비해 비교적 넓게" : "일부 범위에서만"} 보이며, 주름의 연결은 후보를 찾은 영역에서 ${continuous ? "상대적으로 넓게" : "일부만"} 확인됐습니다. 선 전체 길이나 완전한 연결 경로를 확인한 것은 아닙니다.` };
}

export function buildPalmCustomerPassages(facts: PalmFacts): PalmCustomerPassage[] {
  if (facts.imageQuality !== "good") return [];
  const passages: PalmCustomerPassage[] = [];
  for (const key of Object.keys(PALM_LINE_NAMES) as PalmLineKey[]) {
    const line = facts.onnxLines?.modelExecuted ? facts.onnxLines[key] : undefined;
    const text = palmPersonalLineReading(key, line);
    if (text) passages.push({ key, title: `${PALM_LINE_NAMES[key]} · ${key === "headLine" ? "생각과 결정" : key === "heartLine" ? "마음을 주고받는 방식" : "생활과 활동 리듬"}`, text, observation: palmLineObservation(line) });
  }
  const measuredShape = measuredPalmShape(facts);
  if (measuredShape) {
    passages.push({ key: "handShape", title: "손 형태에서 읽는 기질", text: SHAPE_TEXT[measuredShape], observation: "사진에서 손가락이 시작되는 부분의 간격, 손목에서 중지 시작점까지의 거리, 중지 길이를 함께 봤습니다. 손바닥 바깥 너비를 직접 잰 값은 아닙니다." });
  }
  const geometry = facts.handGeometry;
  if (geometry?.status === "observed" && geometry.indexRing) {
    const text = geometry.indexRing === "index_longer"
      ? "확인한 손가락 비율은 자기 바람을 선택 안에 남기고 싶은 모습으로 읽습니다. 가령 여럿이 먹을 메뉴를 고를 때 먼저 남의 의견을 듣고도 내가 원했던 것은 말하지 않았다면, 모두 즐거웠는데 혼자 조금 아쉬울 수 있습니다. 자기 의견을 말하는 일을 전체를 내 뜻대로 정하는 일과 같게 보지 않아도 됩니다. 원하는 것 하나를 말하고 상대의 생각도 듣는 선택은 내가 참여한 느낌과 함께 고른 즐거움이 같이 남을 여지를 줍니다."
      : geometry.indexRing === "ring_longer"
        ? "확인한 손가락 비율은 생각한 것을 밖으로 보여 주고 그 표현이 어떻게 닿았는지 듣는 장면에 의미를 둡니다. 가령 취미로 만든 것을 보여 줬을 때 잘했다는 말은 기쁘지만, 내가 담고 싶었던 뜻을 알아본 이야기는 다른 만족으로 남을 수 있습니다. 더 좋은 반응을 얻으려고 표현을 늘리기 전에 어느 부분이 기억에 남았는지 물어보면, 관심을 받은 것과 자신의 뜻이 전해진 것을 다르게 알아볼 여지가 있습니다. 실제 표현 능력을 측정한 말은 아닙니다."
        : "검지와 약지의 비슷한 비율은 직접 고르는 마음과 밖으로 보여 주고 싶은 마음을 한쪽으로 고정하지 않게 합니다. 가령 친구들과 시간을 보낼 때는 내가 좋아하는 활동을 고르고 싶다가도 함께 만든 것을 보여 줄 때에는 누가 어떻게 봤는지가 더 마음에 남을 수 있습니다. 늘 두 마음을 균형 있게 쓴다는 뜻이 아니라 같은 사람에게도 만족의 이유가 달라질 수 있다는 참고입니다. 선택하기 전 원했던 것과 끝난 뒤 좋았던 것을 나란히 떠올려볼 수 있습니다.";
    passages.push({ key: "fingers", title: "손가락의 비율에서 읽는 모습", text, observation: `이번 사진에서 검지와 약지는 ${geometry.indexRing === "similar" ? "비슷한 비율" : geometry.indexRing === "index_longer" ? "검지가 더 긴 비율" : "약지가 더 긴 비율"}로 확인됐습니다. 실제 길이가 아니라 사진 안의 비율입니다.` });
  }
  const fate = palmFatePassage(facts);
  if (fate) passages.push(fate);
  return passages;
}

export function palmCustomerLimits(facts: PalmFacts): string[] {
  const notes: string[] = [];
  const missing = (Object.keys(PALM_LINE_NAMES) as PalmLineKey[]).filter(key => !palmPersonalLineReading(key, facts.onnxLines?.[key]));
  if (missing.length) notes.push(`${missing.map(key => PALM_LINE_NAMES[key]).join("·")}은 이번 사진에서 개인 풀이에 쓸 모양을 충분히 확인하지 못했습니다. 선이 없다는 뜻은 아닙니다.`);
  const fate = secondaryObservationState("fate", facts.secondaryLines?.fate);
  if (fate === "observed" && !facts.secondaryLines?.fate.candidateObservation) notes.push("운명선 후보는 확인됐지만 저장된 정보에 위치와 구간의 연결 범위가 없어 개인 풀이를 보류했습니다.");
  if (fate === "error") notes.push("운명선을 읽는 기능이 이번에 정상 실행되지 않았습니다. 사진이 나쁘다는 판정은 아니며 다시 시도할 수 있습니다.");
  else if (fate === "not_observed") notes.push("운명선 분석은 실행됐지만 이번 사진에서는 풀이에 사용할 후보를 찾지 못했습니다.");
  else if (fate === "unconfirmed") notes.push("운명선은 이번 사진의 관찰 근거가 충분히 확인되지 않아 개인 풀이를 보류했습니다.");
  notes.push("태양선·재물선은 현재 선을 구별하는 분석을 지원하지 않습니다. 사진에서 안 보이거나 없다는 뜻은 아닙니다.");
  if (facts.handGeometry?.status !== "observed") notes.push("개별 손가락 비율은 이번 사진에서 확인된 값이 없어 풀이에 넣지 않았습니다. 손을 펴고 손가락이 겹치지 않게 촬영하면 확인에 도움이 됩니다.");
  notes.push("손톱·구릉·세부 표식은 현재 관찰하지 않습니다. 사진에서 읽힌 특징의 전통적 상징 풀이이며 실제 성격·건강·수명·미래의 확정은 아닙니다.");
  return notes;
}
