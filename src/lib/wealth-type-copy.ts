// 재물 유형 4종의 카피 전용 데이터 파일 — 로직 없음, SajuFacts import 없음.
// 운영자가 검수 후 이 파일만 통째로 교체할 수 있어야 한다는 요구사항 때문에
// wealth-type.ts(로직)와 완전히 분리했다. 십성 원어("재성"/"식상" 등)는
// 본문에 노출하지 않는다(free-report-schema.ts의 JARGON_IN_TEXT_PATTERNS와
// 같은 원칙) — 십성 개수는 pieces.evidence의 "버는 힘/지키는 힘 숫자"로만
// 간접 노출한다. 4번째 조각(bridgeText)에는 특정 해법을 지목하지 않는다 —
// 사주는 방향, 실행 순서는 사람마다 다르다는 게 이 무료 구간의 전제다.

export type WealthTypeCode = "ACCUM" | "LEAK" | "HOLD" | "TIGHT";

export interface WealthTypeCopyEntry {
  typeName: string;
  /** 1조각: 유형명 + 한 줄 진단 */
  headline: string;
  /** 2조각: 왜 이 유형인지 — 숫자 붙기 전 고정 문장 */
  reasonTemplate: string;
  /** 3조각: 이 유형이 겪는 문제(현실 연결) */
  problemText: string;
  /** 4조각: 해법 미지목, 유료1 안내 톤 */
  bridgeText: string;
}

const COMMON_BRIDGE_TEXT =
  "이 성향이 실제 생활에서 어떻게 드러나는지는 다음 단계에서 손금과 현재의 선택을 함께 보며 이어서 살펴봅니다.";

export const WEALTH_TYPE_COPY: Record<WealthTypeCode, WealthTypeCopyEntry> = {
  ACCUM: {
    typeName: "활동·유지 균형형",
    headline: "활동·유지 균형형 — 사주에서 두 성향이 함께 보입니다.",
    reasonTemplate: "전통 해석에서 만드는 활동과 지키는 성향을 함께 읽습니다.",
    problemText:
      "실제 저축이 쌓이고 있나요? 그렇다면 그 돈을 언제 어디에 쓸지 정했는지 살펴보세요. 잔액이나 운용 상태는 아직 확인하지 않았습니다.",
    bridgeText: COMMON_BRIDGE_TEXT,
  },
  LEAK: {
    typeName: "활동 우선형",
    headline: "활동 우선형 — 사주에서는 움직이고 만들어내는 쪽이 먼저 보입니다.",
    reasonTemplate: "전통 해석에서 유지보다 활동 쪽에 무게를 둡니다. 실제 소비 규모를 뜻하지는 않습니다.",
    problemText:
      "들어온 돈의 사용처가 잘 보이나요? 모으기 어렵다면 소득이 부족한지, 지출 때문인지는 실제 숫자로 확인해야 합니다.",
    bridgeText: COMMON_BRIDGE_TEXT,
  },
  HOLD: {
    typeName: "유지 우선형",
    headline: "유지 우선형 — 사주에서는 지키고 유지하는 쪽이 먼저 보입니다.",
    reasonTemplate: "전통 해석에서 활동보다 유지 쪽에 무게를 둡니다. 실제 수익률과는 별개입니다.",
    problemText:
      "돈을 쓸 시점을 정해 두었나요? 보유한 이유와 목표를 먼저 확인해 보세요. 돈이 늘지 않거나 기회를 놓쳤다고 판단한 것은 아닙니다.",
    bridgeText: COMMON_BRIDGE_TEXT,
  },
  TIGHT: {
    typeName: "판단 보류형",
    headline: "판단 보류형 — 사주 신호만으로 실제 돈의 여력을 정하지 않습니다.",
    reasonTemplate: "전통 해석에서 활동·유지 요소가 뚜렷하지 않은 분류입니다. 소득이 적다는 뜻은 아닙니다.",
    problemText:
      "실제로 여유가 없다고 느끼나요? 그렇다면 소득·지출·목표 중 무엇을 확인할지 다음 설문에서 살펴봅니다. 불편이 없다면 문제를 만들 필요는 없습니다.",
    bridgeText: COMMON_BRIDGE_TEXT,
  },
};
