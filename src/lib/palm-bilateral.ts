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

function handCharacterSummary(facts: PalmFacts): string {
  const parts: string[] = [];
  const head = facts.onnxLines?.headLine;
  const heart = facts.onnxLines?.heartLine;
  const life = facts.onnxLines?.lifeLine;
  const fateClear = Boolean(
    facts.secondaryLines?.fate.status === "clear" && facts.secondaryLines.fate.corroborated,
  );
  const sunClear = facts.secondaryLines?.sun.status === "clear";

  if (head?.detected) {
    if (head.curve === "직선에 가까움") {
      parts.push("감보다 기준과 근거를 세워 판단하는 힘이 먼저 드러납니다.");
    } else if (head.curve === "완만한 곡선") {
      parts.push("정답 하나에만 매이지 않고 상황·아이디어·직감을 함께 쓰는 편으로 읽힙니다.");
    }
    if (head.length === "김") {
      parts.push("결정을 내리기 전 맥락을 충분히 보고 한 번 정하면 쉽게 바꾸지 않는 쪽입니다.");
    } else if (head.length === "짧음") {
      parts.push("핵심을 잡으면 오래 끌기보다 빠르게 움직이는 쪽에 가깝습니다.");
    }
  }

  if (heart?.detected) {
    if (heart.curve === "완만한 곡선") {
      parts.push("관계에서는 반응과 표현이 비교적 살아 있어 사람과의 교류에서 힘을 얻기 쉽습니다.");
    } else if (heart.curve === "직선에 가까움") {
      parts.push("관계에서는 감정을 크게 드러내기보다 약속과 행동으로 마음을 보여주는 편입니다.");
    }
  }

  if (life?.detected) {
    parts.push(
      life.length === "김"
        ? "생활과 일에서는 한번 잡은 리듬을 오래 이어가는 힘이 있습니다."
        : life.length === "짧음"
          ? "생활과 일에서는 환경이 바뀌면 방식도 빠르게 바꾸는 편입니다."
          : "생활과 일에서는 안정과 변화를 상황에 맞게 조절하는 편입니다.",
    );
  }

  if (fateClear) parts.push("운명선도 확인돼 일과 진로에서 자기 방향을 만들려는 성향이 더해집니다.");
  if (sunClear) parts.push("태양선 후보가 보여 만든 결과를 밖으로 보여주고 인정받는 과정도 중요하게 작용합니다.");

  return parts.slice(0, 4).join(" ");
}

function careerReading(facts: PalmFacts): string {
  const head = facts.onnxLines?.headLine;
  const heart = facts.onnxLines?.heartLine;
  const fateClear = Boolean(
    facts.secondaryLines?.fate.status === "clear" && facts.secondaryLines.fate.corroborated,
  );
  const sunClear = facts.secondaryLines?.sun.status === "clear";
  const wealthClear = facts.secondaryLines?.wealth.status === "clear";
  const analytical = head?.detected && head.curve === "직선에 가까움";
  const creative = head?.detected && head.curve === "완만한 곡선";
  const peopleFacing = heart?.detected && heart.curve === "완만한 곡선";

  if (analytical && fateClear) {
    return "지금 손에서는 기준을 세우고 책임을 맡아 결과를 관리하는 역할이 잘 맞는 편입니다. 예를 들면 회계사·세무사·재무관리·품질관리·운영기획처럼 숫자와 기준을 다루면서도 판단권이 있는 일이 이런 성향을 잘 활용할 수 있습니다. 반대로 기준은 엄격한데 결정권은 거의 없는 환경은 오래 가면 답답함이 커질 수 있습니다.";
  }
  if (creative && sunClear) {
    return "지금 손에서는 아이디어를 실제 결과물로 만들고 밖으로 보여주는 역할에서 힘이 살아납니다. 예를 들면 브랜드·콘텐츠 기획, 마케팅, 서비스기획, 디자인·크리에이티브 직군처럼 생각을 표현과 결과로 연결하는 일이 잘 맞는 예가 될 수 있습니다. 반복 절차만 따르고 새로운 방식을 시도하기 어려운 환경은 재미가 빨리 떨어질 수 있습니다.";
  }
  if (fateClear && peopleFacing) {
    return "지금 손에서는 사람과 상황을 읽고 방향을 정하면서 직접 움직이는 역할이 잘 맞는 편입니다. 예를 들면 사업개발, 영업·컨설팅, 프로젝트 매니저, 고객전략 같은 일이 이런 강점을 쓰기 좋습니다. 정해진 절차만 반복하고 재량이 거의 없는 역할은 오래 하면 답답하게 느낄 수 있습니다.";
  }
  if (analytical) {
    return "지금 손에서는 정보를 비교하고 기준을 세워 정리하는 일이 잘 맞는 편입니다. 예를 들면 데이터·분석, 회계·세무, 운영관리, 품질관리 같은 일이 성향을 활용하기 좋습니다. 중요한 것은 직업 이름보다 스스로 판단할 기준과 책임 범위가 분명한 환경입니다.";
  }
  if (creative || sunClear) {
    return "지금 손에서는 정해진 답을 반복하기보다 새로운 방식과 표현을 만드는 일에서 힘이 살아나는 편입니다. 예를 들면 기획, 마케팅, 콘텐츠, 신사업, 서비스기획 같은 역할이 잘 맞는 예가 될 수 있습니다. 실제 적성은 경험과 관심 분야를 함께 봐야 합니다.";
  }
  if (wealthClear) {
    return "지금 손에서는 사람·거래·조건을 현실적인 결과로 연결하는 역할에 관심이 실리기 쉽습니다. 예를 들면 영업관리, 구매·유통, 사업운영, 고객관리 같은 일이 한 예가 될 수 있습니다. 직업을 하나로 정하기보다 어떤 환경에서 성과를 만드는지가 더 중요합니다.";
  }
  return "지금 손은 한 직업을 강하게 찍기보다, 맡은 일을 스스로 정리하고 끝까지 결과로 만드는 역할에서 강점을 쓰는 쪽에 가깝습니다. 예를 들면 운영·기획·프로젝트 코디네이션처럼 판단과 실행을 함께 쓰는 일이 한 예가 될 수 있습니다.";
}

function changeNarrative(
  innate: PalmFacts,
  current: PalmFacts,
): string {
  const changes: string[] = [];

  const compare = (
    label: string,
    innateScore: number,
    currentScore: number,
    strongerText: string,
    softerText: string,
  ) => {
    if (currentScore >= innateScore + 2) changes.push(`${label}은 현재 손에서 더 또렷해져 ${strongerText}`);
    else if (innateScore >= currentScore + 2) changes.push(`${label}은 타고난 손보다 현재 손에서 부드러워져 ${softerText}`);
  };

  compare(
    "판단의 힘",
    detailScore(innate.onnxLines?.headLine),
    detailScore(current.onnxLines?.headLine),
    "살아오면서 자기 기준과 결정력이 더 강해진 모습으로 볼 수 있습니다.",
    "예전보다 상황과 사람을 더 많이 고려하며 판단하는 쪽으로 변한 모습으로 볼 수 있습니다.",
  );
  compare(
    "감정 표현",
    detailScore(innate.onnxLines?.heartLine),
    detailScore(current.onnxLines?.heartLine),
    "관계에서 마음을 표현하고 반응하는 힘이 더 밖으로 나온 모습입니다.",
    "감정을 바로 드러내기보다 관계의 거리와 표현을 조절하는 쪽으로 변한 모습입니다.",
  );
  compare(
    "생활의 지속력",
    detailScore(innate.onnxLines?.lifeLine),
    detailScore(current.onnxLines?.lifeLine),
    "생활과 일에서 한 방향을 오래 끌고 가는 힘이 더 강해진 모습입니다.",
    "한 방식만 고집하기보다 변화에 맞춰 리듬을 바꾸는 쪽으로 변한 모습입니다.",
  );
  compare(
    "일의 방향성",
    secondaryScore(innate, "fate"),
    secondaryScore(current, "fate"),
    "일과 진로에서 스스로 방향을 잡고 책임지는 성향이 더 강해진 모습입니다.",
    "직업 자체보다 삶 전체의 균형과 선택 폭을 더 중요하게 보는 쪽으로 변한 모습입니다.",
  );
  compare(
    "성과를 드러내는 힘",
    secondaryScore(innate, "sun"),
    secondaryScore(current, "sun"),
    "결과를 밖으로 보여주고 평가받는 힘이 더 커진 모습입니다.",
    "겉으로 드러나는 평가보다 내 기준과 만족을 더 중요하게 두는 쪽으로 변한 모습입니다.",
  );

  if (changes.length === 0) {
    return "두 손의 핵심선 차이가 크지 않아, 타고난 성향과 지금 실제로 살아가는 방식의 중심축이 비교적 비슷하게 유지된 편으로 읽힙니다. 크게 바뀌었다기보다 원래 가진 성향을 현실에서 더 다듬어 쓰는 쪽에 가깝습니다.";
  }
  return changes.slice(0, 3).join(" ");
}

export function buildPalmBilateralReading(
  left: PalmFacts,
  right: PalmFacts,
  dominantHand: DominantHand,
): PalmBilateralReading {
  const current = dominantHand === "right" ? right : left;
  const innate = dominantHand === "right" ? left : right;
  const currentLabel = dominantHand === "right" ? "오른손" : "왼손";
  const innateLabel = dominantHand === "right" ? "왼손" : "오른손";

  return {
    summary:
      `주로 쓰는 손이 ${currentLabel}이므로, 이번 풀이는 ${innateLabel}을 타고난 성향·잠재력을 참고하는 손으로 먼저 보고 ${currentLabel}을 지금까지 살아오며 만들어진 현재 모습으로 이어서 봅니다. 두 손의 차이는 ‘운명이 바뀌었다’고 단정하기보다 어떤 성향이 실제 생활에서 강해지거나 조절됐는지를 보는 방식으로 해석합니다.`,
    items: [
      {
        title: `1. 타고난 나 — ${innateLabel}`,
        text: handCharacterSummary(innate),
      },
      {
        title: `2. 지금의 나 — ${currentLabel}`,
        text: handCharacterSummary(current),
      },
      {
        title: "3. 타고난 모습에서 지금까지, 무엇이 달라졌나",
        text: changeNarrative(innate, current),
      },
      {
        title: "4. 지금 강점이 살아나는 일과 직업 예시",
        text: careerReading(current),
      },
    ],
    note:
      "전통 손금에서는 비주손을 선천적 경향, 주로 쓰는 손을 후천적으로 만들어진 현재 모습에 연결해 보는 해석이 널리 쓰입니다. 다만 유파마다 기준이 다르므로 직업·성격·미래를 확정하는 진단이 아니라 두 손의 차이를 이해하는 참고 방식으로 사용합니다.",
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
  const scores: Array<{ theme: Theme; score: number }> = [
    { theme: "work", score: sum((f) => secondaryScore(f, "fate")) },
    { theme: "recognition", score: sum((f) => secondaryScore(f, "sun")) },
    { theme: "money", score: sum((f) => secondaryScore(f, "wealth")) },
    { theme: "decision", score: sum((f) => detailScore(f.onnxLines?.headLine)) },
    { theme: "stability", score: sum((f) => detailScore(f.onnxLines?.lifeLine)) },
  ];
  return scores.sort((a, b) => b.score - a.score);
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
