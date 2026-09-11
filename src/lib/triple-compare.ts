// 사주 × 손금 × 자기응답을 한 번에 비교하는 통합 섹션. 손금은 사주와
// 독립된 두 번째 분석이어야 한다는 원칙에 따라, 손금 자체 해석이 끝난 뒤
// 딱 한 번 나오는 별도 통합 비교 섹션으로 다룬다.
//
// 일치/차이/보완 세 가지를 모두 허용한다(사주 결과를 손금/자기응답에
// 맞춰 억지로 고치지 않는다):
//  - 일치: present한 신호가 전부 같은 방향
//  - 차이: 정확히 2개(사주+손금 또는 사주+자기응답)만 있는데 서로 다른 방향
//  - 보완: 3개(사주+손금+자기응답) 다 있는데 하나로 안 모일 때 — 단순
//    이분법(일치/차이)으로 억지로 구겨넣지 않는다
//
// classify()는 present한 신호 전부를 항상 함께 본다(과거 "3개 있다고 해놓고
// 2개만 반영" 버그 수정 버전, 그대로 유지).
//
// MBTI 재설계(이번 라운드): 이전 버전은 이 파일에 MBTI를 네 번째 boolean
// 신호로 넣어 "J=빠른 결정, F=감정적" 식으로 단순 투표에 태웠다 — 이번
// 요구사항은 그 방식을 명시적으로 금지한다. MBTI는 여기서 완전히 뺐고,
// 대신 free-report-mock.ts의 realWorldPersonalization에서 MBTI 4축 전체
// (E/I·S/N·T/F·J/P)를 6문항 직접 응답과 우선순위를 두고 조합해 "현실에서
// 어떻게 나타나는지"를 설명하는 별도 문단으로 다룬다 — 사주×손금×자기응답
// 일치/차이 판정에 강제로 끼워 넣지 않는다.
//
// 손금 신호와 사주/자기응답 신호를 짝지을 때도 실제로 비교 가능한 동일
// 의미축만 남겼다:
//   - 결정하는 방식: 두뇌선 곡률(전통적으로 사고방식과 연결) ↔ 신강약 ↔
//     자기응답 결정속도 — 세 축 모두 "판단 속도/방식"을 말한다.
//   - 관계에서 감정이 작용하는 정도: 감정선 곡률(전통적으로 감정 표현과
//     연결) ↔ 관성+인성 vs 비겁+식상 상대비교(절대 임계값 아님) ↔
//     자기응답 autonomy — 세 축 모두 "관계/타인 영향"을 말한다.
// "돈을 대하는 방식" 축은 손금에 이와 견줄 만한 실제 근거가 없어서
// 완전히 뺐다 — 억지로 비교 항목을 만들지 않는다(그 내용은 무료
// 리포트의 재물 구조/버는 방식 섹션에서 이미 충분히 다룬다).
//
// 대운 시기 결합(이번 라운드): 이 비교는 원래 시간과 무관한(원국 자체
// 성향) 비교였는데, 지금 대운(daeunAnalysis, oh-my-saju timing 기반)의
// 지배 십성 그룹이 이 축(structured/relational)과 같으면 "지금 이 시기엔
// 이 비교가 더 도드라진다"는 한 문장을 덧붙인다. 일치/차이/보완 판정
// 로직 자체는 그대로다 — 새 판정을 추가한 게 아니라 이미 나온 결론에
// 시기 맥락만 더하는 것.

import type { SajuFacts } from "@/lib/saju-facts";
import { TEN_GOD_GROUP, TEN_GOD_GROUP_AXIS } from "@/lib/saju-facts";
import type { PersonalityCheckFacts } from "@/lib/personality-check";
import type { OnnxPalmLines } from "@/lib/palm-facts";

export type CompareKind = "일치" | "차이" | "보완";

export interface CompareItem {
  topic: string;
  kind: CompareKind;
  text: string;
}

// 이번 라운드: 이 비교가 "지금 이 대운 시기"와 실제로 맞물리는지도 같은
// 문장 안에 덧붙인다. 새 비교 로직이 아니라, 이미 계산된 kind/text 뒤에
// daeunAnalysis(현재 대운의 지배 십성 그룹)가 이 축과 같은 축이면 시기를
// 언급하는 한 문장만 더하는 것뿐 — 일치/차이/보완 판정 자체는 안 바뀐다.
function currentPeriodClause(facts: SajuFacts, axis: "structured" | "relational"): string | null {
  const current = facts.daeunAnalysis?.find((d) => d.isCurrent) ?? null;
  if (!current) return null;
  const group = TEN_GOD_GROUP[current.tenGods.stem] ?? TEN_GOD_GROUP[current.tenGods.branch];
  if (!group || TEN_GOD_GROUP_AXIS[group] !== axis) return null;
  return `지금(${current.age}세부터, ${current.ganzhi} 대운)엔 이 모습이 유독 뚜렷하게 나타나는 시기예요.`;
}

function withPeriodContext(item: Omit<CompareItem, "text"> & { text: string }, facts: SajuFacts, axis: "structured" | "relational"): CompareItem {
  const clause = currentPeriodClause(facts, axis);
  return clause ? { ...item, text: `${item.text} ${clause}` } : item;
}

function classify(signals: (boolean | null)[]): CompareKind | null {
  const present = signals.filter((s): s is boolean => s !== null);
  if (present.length < 2) return null;
  const unanimous = present.every((s) => s === present[0]);
  if (unanimous) return "일치";
  return present.length === 2 ? "차이" : "보완";
}

function decisionAxis(
  facts: SajuFacts,
  palm: OnnxPalmLines | null,
  check: PersonalityCheckFacts | null,
): CompareItem | null {
  const sajuFast = facts.dayStrength === "strong";
  const palmFast = palm?.headLine.detected ? palm.headLine.curve === "직선에 가까움" : null;
  const selfFast = check ? check.levels.speed === "왼쪽" : null;

  const kind = classify([sajuFast, palmFast, selfFast]);
  if (!kind) return null;

  let text: string;
  if (kind === "일치") {
    text =
      palmFast !== null && selfFast !== null
        ? "타고난 결정 속도, 손에 보이는 두뇌선, 본인이 답한 결정 속도가 모두 같은 방향을 가리켜요 — 세 군데서 같은 모습이 겹쳐 나온 흔치 않은 경우예요."
        : palmFast !== null
          ? "손에 보이는 두뇌선이 타고난 결정 속도와 같은 방향이에요."
          : "본인이 답한 결정 속도가 타고난 결정 속도와 같은 방향이에요 — 서로 다른 방식으로 같은 결을 보여준 셈이에요.";
  } else if (kind === "차이") {
    text =
      palmFast !== null
        ? "손에 보이는 두뇌선은 타고난 결정 속도와 다른 결을 보여줘요. 타고난 결과 지금 습관이 다를 수 있다는 뜻이에요."
        : "본인이 답한 결정 속도가 타고난 결정 속도와 달라요. 둘 중 하나가 틀렸다는 뜻은 아니에요 — 결정 속도가 상황(금액 크기·되돌리기 어려움)에 따라 달라지는지 돌아볼 만해요.";
  } else {
    text =
      "타고난 결정 속도와 손에 보이는 두뇌선, 본인이 답한 결정 속도가 정확히 하나로 겹치진 않아요. 두뇌선은 평소 사고방식의 결을, 자기응답은 실제 체감 속도를 보여줘요 — 상황에 따라 둘 다 나오는 사람일 수 있어요.";
  }

  return withPeriodContext({ topic: "결정하는 방식", kind, text }, facts, "structured");
}

function relationEmotionAxis(
  facts: SajuFacts,
  palm: OnnxPalmLines | null,
  check: PersonalityCheckFacts | null,
): CompareItem | null {
  // 절대 임계값(예: ">=3") 대신 상대 비교로 — "관계/도움을 통해 움직이는
  // 힘"과 "스스로 밀어붙이는 힘" 중 어느 쪽이 이 사람 안에서 구조적으로
  // 더 큰지만 본다.
  const sajuRelational = facts.officerStarCount + facts.resourceStarCount > facts.peerStarCount + facts.outputStarCount;
  const palmRelational = palm?.heartLine.detected ? palm.heartLine.curve === "완만한 곡선" : null;
  const selfRelational = check ? check.levels.autonomy === "오른쪽" : null;

  const kind = classify([sajuRelational, palmRelational, selfRelational]);
  if (!kind) return null;

  let text: string;
  if (kind === "일치") {
    text =
      palmRelational !== null && selfRelational !== null
        ? "타고난 대인관계 구조, 손에 보이는 감정선, 본인이 답한 성향이 같은 방향이에요 — 세 군데서 같은 결이 겹쳐 나왔어요."
        : palmRelational !== null
          ? "손에 보이는 감정선이 타고난 대인관계 구조와 같은 방향이에요."
          : "본인이 답한 성향이 타고난 대인관계 구조와 같은 방향이에요.";
  } else if (kind === "차이") {
    text =
      palmRelational !== null
        ? "손에 보이는 감정선은 타고난 대인관계 구조와 다른 결을 보여줘요."
        : "본인이 답한 성향이 타고난 대인관계 구조와 달라요. 돈이 걸린 결정일 때 유독 누군가에게 먼저 물어보는지, 아니면 오히려 더 혼자 판단하게 되는지 돌아볼 만해요.";
  } else {
    text =
      "타고난 대인관계 구조와 손에 보이는 감정선, 본인이 답한 성향이 정확히 겹치진 않아요. 감정선은 관계에서 감정이 작용하는 결을, 자기응답은 실제 의사결정 습관을 보여줘요 — 둘 다 이 사람의 진짜 모습일 수 있어요.";
  }

  return withPeriodContext({ topic: "관계에서 감정이 작용하는 정도", kind, text }, facts, "relational");
}

/** 사주 × 손금 × 자기응답(6문항) 통합 비교. 진짜로 비교 가능한 축(결정
 * 방식, 관계·감정)만 넣는다 — 견줄 손금 근거가 없는 축은 애초에 만들지
 * 않는다. MBTI는 여기 들어오지 않는다(free-report-mock.ts의
 * realWorldPersonalization에서 별도로 다룬다). */
export function buildTripleCompare(
  facts: SajuFacts,
  palm: OnnxPalmLines | null,
  check: PersonalityCheckFacts | null,
): CompareItem[] {
  return [decisionAxis(facts, palm, check), relationEmotionAxis(facts, palm, check)].filter(
    (x): x is CompareItem => x !== null,
  );
}
