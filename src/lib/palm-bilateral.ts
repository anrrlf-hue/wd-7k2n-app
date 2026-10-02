import type { PalmFacts, OnnxLineDetail } from "@/lib/palm-facts";
import type { SajuFacts, DaeunFact, TenGodGroup } from "@/lib/saju-facts";
import { TEN_GOD_GROUP } from "@/lib/saju-facts";

export type DominantHand = "left" | "right";

export interface PalmBilateralItem {
  title: string;
  text: string;
}

export interface PalmBilateralReading {
  summary: string;
  items: PalmBilateralItem[];
  note: string;
}

export interface PalmFutureWindow {
  startAge: number;
  endAge: number;
  ageLabel: string;
  title: string;
  palmReading: string;
  sajuReading: string | null;
  combined: string;
}

export interface PalmFutureTimeline {
  currentAge: number;
  windows: PalmFutureWindow[];
  note: string;
}

function detailScore(d: OnnxLineDetail | null | undefined): number {
  if (!d?.detected) return 0;
  const depth = d.depthStrength === "강함" ? 3 : d.depthStrength === "보통" ? 2 : 1;
  const length = d.length === "김" ? 3 : d.length === "보통" ? 2 : 1;
  return depth * 2 + length;
}

function secondaryScore(
  facts: PalmFacts | null | undefined,
  key: "fate" | "sun" | "wealth",
): number {
  const signal = facts?.secondaryLines?.[key];
  if (!signal) return 0;
  const status = signal.status === "clear" ? 5 : signal.status === "faint" ? 2 : 0;
  const corroborated = key === "fate" && signal.corroborated ? 3 : 0;
  return status + corroborated + Math.round(signal.strength * 2);
}

function strongerSide(
  left: PalmFacts,
  right: PalmFacts,
  selector: (facts: PalmFacts) => number,
): "left" | "right" | "same" {
  const l = selector(left);
  const r = selector(right);
  if (Math.abs(l - r) <= 1) return "same";
  return l > r ? "left" : "right";
}

function sideLabel(side: "left" | "right" | "same"): string {
  return side === "left" ? "왼손" : side === "right" ? "오른손" : "양손";
}

export function buildPalmBilateralReading(
  left: PalmFacts,
  right: PalmFacts,
  dominantHand: DominantHand,
): PalmBilateralReading {
  const items: PalmBilateralItem[] = [];
  const dominantLabel = dominantHand === "right" ? "오른손" : "왼손";
  const otherLabel = dominantHand === "right" ? "왼손" : "오른손";

  const headSide = strongerSide(left, right, (f) => detailScore(f.onnxLines?.headLine));
  const heartSide = strongerSide(left, right, (f) => detailScore(f.onnxLines?.heartLine));
  const lifeSide = strongerSide(left, right, (f) => detailScore(f.onnxLines?.lifeLine));
  const fateSide = strongerSide(left, right, (f) => secondaryScore(f, "fate"));
  const sunSide = strongerSide(left, right, (f) => secondaryScore(f, "sun"));
  const wealthSide = strongerSide(left, right, (f) => secondaryScore(f, "wealth"));

  items.push({
    title: "생각과 판단",
    text:
      headSide === "same"
        ? "두 손의 두뇌선이 비슷한 힘으로 잡혀, 생각하고 결정하는 방식의 기본 결이 비교적 일관된 편으로 읽힙니다."
        : `${sideLabel(headSide)} 두뇌선이 상대적으로 더 뚜렷합니다. 전통 손금에서는 두 손의 차이를 타고난 성향과 실제 생활에서 굳어진 판단 습관의 차이를 살펴보는 참고로 씁니다.`,
  });

  items.push({
    title: "관계와 감정",
    text:
      heartSide === "same"
        ? "감정선은 양손에서 비슷하게 잡혀, 관계에서 보이는 태도와 안쪽의 감정 기준이 크게 엇갈리지 않는 편으로 볼 수 있습니다."
        : `${sideLabel(heartSide)} 감정선이 상대적으로 더 뚜렷합니다. 감정을 느끼는 방식과 실제 관계에서 표현하는 방식 사이에 차이가 생길 수 있는 손으로 읽을 수 있습니다.`,
  });

  items.push({
    title: "생활의 지속력",
    text:
      lifeSide === "same"
        ? "생명선은 양손에서 비슷한 힘으로 이어져, 생활 리듬과 버티는 방식이 비교적 한 방향으로 유지되는 편으로 봅니다."
        : `${sideLabel(lifeSide)} 생명선이 상대적으로 더 또렷합니다. 생활 환경이 바뀌면서 에너지를 쓰는 방식이나 버티는 방식이 달라진 흔적으로 해석할 수 있습니다.`,
  });

  const workBits: string[] = [];
  if (fateSide !== "same") workBits.push(`${sideLabel(fateSide)} 운명선 흐름이 더 눈에 띕니다`);
  if (sunSide !== "same") workBits.push(`${sideLabel(sunSide)} 태양선 후보가 더 뚜렷합니다`);
  if (wealthSide !== "same") workBits.push(`${sideLabel(wealthSide)} 재물선 후보가 더 강하게 잡힙니다`);
  items.push({
    title: "일·성과·재물",
    text:
      workBits.length > 0
        ? `${workBits.join(". ")}. 일의 방향, 성과가 밖으로 드러나는 방식, 돈과 기회를 다루는 방식이 두 손에서 어떻게 달라졌는지를 함께 보는 것이 핵심입니다.`
        : "운명선·태양선·재물선 후보는 양손에서 큰 차이 없이 잡힙니다. 일과 성과, 재물의 흐름을 한 손의 선 하나보다 양손의 공통 흐름으로 보는 편이 자연스럽습니다.",
  });

  return {
    summary: `주로 쓰는 손은 ${dominantLabel}으로 입력됐습니다. ${dominantLabel}과 ${otherLabel}을 따로 단정하지 않고, 두 손에서 공통으로 남은 특징과 달라진 특징을 함께 비교했습니다.`,
    items,
    note: "손금 유파마다 양손의 의미를 다르게 보므로, 한 손을 ‘운명’으로 고정하지 않고 주로 쓰는 손과 반대손의 차이를 참고하는 방식으로 해석합니다.",
  };
}

function parseAgeRange(value: string | null | undefined): { start: number; end: number } | null {
  if (!value) return null;
  const nums = value.match(/\d+/g)?.map(Number) ?? [];
  if (nums.length === 0) return null;
  if (nums.length === 1) return { start: nums[0], end: nums[0] + 9 };
  return { start: Math.min(nums[0], nums[1]), end: Math.max(nums[0], nums[1]) };
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

const GROUP_TEXT: Record<TenGodGroup, string> = {
  비겁: "독립·경쟁·협업에서 자기 기준을 세우는 흐름",
  식상: "실행·표현·성과를 밖으로 만드는 흐름",
  재성: "고객·거래·수입과 현실 결과가 중요해지는 흐름",
  관성: "직책·계약·책임과 공식적인 변화가 중요해지는 흐름",
  인성: "준비·학습·정보·도움이 다음 선택의 기반이 되는 흐름",
};

function daeunReadingForWindow(facts: SajuFacts, startAge: number, endAge: number): string | null {
  const matching: DaeunFact[] = facts.daeunList.filter((d) => {
    const range = parseAgeRange(d.ageRange);
    return range ? overlaps(startAge, endAge, range.start, range.end) : false;
  });
  if (matching.length === 0) return null;

  const groups = new Set<TenGodGroup>();
  for (const d of matching) {
    const stem = TEN_GOD_GROUP[d.stemTenGod];
    const branch = TEN_GOD_GROUP[d.branchTenGod];
    if (stem) groups.add(stem);
    if (branch) groups.add(branch);
  }
  if (groups.size === 0) return null;
  return [...groups].slice(0, 2).map((g) => GROUP_TEXT[g]).join(", ");
}

type Theme = "work" | "recognition" | "money" | "decision" | "stability";

function themeScores(left: PalmFacts, right: PalmFacts): Array<{ theme: Theme; score: number }> {
  const hands = [left, right];
  const sum = (fn: (f: PalmFacts) => number) => hands.reduce((acc, h) => acc + fn(h), 0);
  return [
    { theme: "work", score: sum((f) => secondaryScore(f, "fate")) },
    { theme: "recognition", score: sum((f) => secondaryScore(f, "sun")) },
    { theme: "money", score: sum((f) => secondaryScore(f, "wealth")) },
    { theme: "decision", score: sum((f) => detailScore(f.onnxLines?.headLine)) },
    { theme: "stability", score: sum((f) => detailScore(f.onnxLines?.lifeLine)) },
  ].sort((a, b) => b.score - a.score);
}

const THEME_TITLE: Record<Theme, string> = {
  work: "일의 방향을 다시 잡는 구간",
  recognition: "성과를 밖으로 보여주는 구간",
  money: "일의 결과를 돈과 연결하는 구간",
  decision: "판단 기준이 더 중요해지는 구간",
  stability: "생활 기반을 다지고 이어가는 구간",
};

const THEME_TEXT: Record<Theme, string> = {
  work: "양손의 운명선 흐름을 중심으로 보면, 직업 이름 자체보다 어떤 방식으로 일할지와 자기 결정권이 중요해지는 쪽으로 읽습니다.",
  recognition: "태양선 후보가 확인되는 손에서는 만든 결과를 숨기기보다 보여주고 평가받는 과정이 중요해지는 흐름으로 봅니다.",
  money: "재물선 후보와 두뇌선을 함께 보면, 우연한 횡재보다 판단·거래·보상 구조를 통해 돈의 흐름을 만드는 쪽으로 읽는 편이 자연스럽습니다.",
  decision: "두뇌선의 길이와 방향이 중심이 되는 손에서는 새로운 선택이 생길수록 남의 답보다 자기 기준을 정리하는 과정이 중요해집니다.",
  stability: "생명선의 흐름을 중심으로 보면, 큰 변화 자체보다 생활 리듬과 기반을 유지하면서 오래 가져갈 수 있는 선택이 중요해지는 구간으로 봅니다.",
};

export function buildPalmFutureTimeline(
  facts: SajuFacts,
  left: PalmFacts,
  right: PalmFacts,
): PalmFutureTimeline {
  const currentAge = facts.currentAge;
  const ranked = themeScores(left, right).filter((x) => x.score > 0);
  const fallback: Theme[] = ["decision", "work", "money", "recognition", "stability"];
  const themes = ranked.length > 0 ? ranked.map((x) => x.theme) : fallback;

  const windows: PalmFutureWindow[] = [];
  for (let i = 0; i < 4; i++) {
    const startAge = currentAge + 1 + i * 5;
    const endAge = startAge + 4;
    const theme = themes[i % themes.length] ?? fallback[i];
    const sajuReading = daeunReadingForWindow(facts, startAge, endAge);
    const palmReading = THEME_TEXT[theme];
    const combined = sajuReading
      ? `손금에서는 ${THEME_TITLE[theme]}으로 읽히고, 사주 대운에서는 ${sajuReading}이 겹칩니다. 두 체계가 같은 사건을 보장한다는 뜻은 아니며, 이 나이대에서 무엇을 관찰할지 좁혀보는 참고로 사용합니다.`
      : `손금에서는 ${THEME_TITLE[theme]}으로 읽힙니다. 사주 대운에서 같은 구간을 확정할 자료가 부족해 손금 쪽 큰 흐름만 보여줍니다.`;

    windows.push({
      startAge,
      endAge,
      ageLabel: `${startAge}~${endAge}세`,
      title: THEME_TITLE[theme],
      palmReading,
      sajuReading,
      combined,
    });
  }

  return {
    currentAge,
    windows,
    note: "과거는 제외하고 현재 만 나이 이후만 표시합니다. 손금에서 한두 살 단위의 정확한 사건을 계산하는 것이 아니라, 전통 손금의 큰 연령 구간을 5년 폭으로 보고 생년월일에서 계산된 실제 나이·사주 대운과 함께 해석합니다.",
  };
}
