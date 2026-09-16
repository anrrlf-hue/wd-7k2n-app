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
  "그런데 이걸 고치는 방법은 사람마다 다릅니다. 이미 해보신 게 무엇인지, 지금 무엇이 가장 걸리는지에 따라 순서가 완전히 달라집니다.";

export const WEALTH_TYPE_COPY: Record<WealthTypeCode, WealthTypeCopyEntry> = {
  ACCUM: {
    typeName: "쌓이는 형",
    headline: "쌓이는 형 — 들어오는 돈도, 남는 돈도 있는 결입니다.",
    reasonTemplate: "돈을 만드는 힘과 그걸 지키는 힘이 둘 다 뚜렷합니다.",
    problemText:
      "다만 이런 분들이 놓치는 건 액수가 아니라 시간입니다. 모이기는 하는데 그 돈이 그대로 멈춰 있는 경우가 많습니다.",
    bridgeText: COMMON_BRIDGE_TEXT,
  },
  LEAK: {
    typeName: "새는 형",
    headline: "새는 형 — 들어온 돈이 머무르지 않는 결입니다.",
    reasonTemplate: "돈을 만드는 힘은 뚜렷한데, 그걸 지키는 자리가 상대적으로 약합니다.",
    problemText:
      "이런 분들은 수입이 적어서 못 모으는 게 아닙니다. 들어온 돈이 어디로 갔는지 설명이 안 되는 쪽에 가깝습니다.",
    bridgeText: COMMON_BRIDGE_TEXT,
  },
  HOLD: {
    typeName: "묶어두는 형",
    headline: "묶어두는 형 — 새지 않지만 늘지도 않는 결입니다.",
    reasonTemplate: "지키는 힘은 강한데, 돈을 만드는 활동력은 상대적으로 약합니다.",
    problemText:
      "이런 분들은 돈을 잘못 쓰는 쪽이 아닙니다. 오히려 쓸 자리, 움직일 타이밍을 자꾸 미루는 쪽에 가깝습니다.",
    bridgeText: COMMON_BRIDGE_TEXT,
  },
  TIGHT: {
    typeName: "빠듯한 형",
    headline: "빠듯한 형 — 들어오는 것도 남는 것도 얇은 결입니다.",
    reasonTemplate: "돈을 만드는 힘도, 지키는 힘도 아직 크게 서 있지 않습니다.",
    problemText:
      "이런 분들은 크게 잘못한 게 없는데도 늘 여유가 없다고 느낍니다. 버는 구조 자체가 아직 얇기 때문입니다.",
    bridgeText: COMMON_BRIDGE_TEXT,
  },
};
